import { executeTask, engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getUserData } from '~system/UserIdentity'
import { PlayerIdentityData } from '@dcl/sdk/ecs'
import { setupUi } from './ui'
import { setupEntities, unlockSoilsPhase1, unlockSoilsPhase2, unlockSoilsAll6, getSoilEntities, getComputerEntity, getTruckEntity, initVisitorWaterFeedback, resetSoilPlots, setCompostBinVisible } from './systems/interactionSetup'
import './systems/growthSystem'
import './systems/dogSystem'
import './systems/seedVfxSystem'
import './systems/wateringVfxSystem'
import './systems/farmerSystem'
import './systems/harvestVfxSystem'
import './systems/levelRewardSystem'
import './systems/xpFloatSystem'
import './systems/mailboxIndicatorSystem'
import { initNpcSystem, getNpcEntity } from './systems/npcSystem'
import { MAYOR_DEF, REGULAR_NPC_ROSTER, NPC_SCHEDULE } from './data/npcData'
import { playerState } from './game/gameState'
import { initTutorialSystem } from './systems/tutorialSystem'
import { tutorialCallbacks, tutorialState } from './game/tutorialState'
import { progressionEventState, progressionEventCallbacks } from './game/progressionEventState'
import { initProgressionEventsSystem, getProgressionEventMayorClickHandler, setOnProgressionEventComplete } from './systems/progressionEventsSystem'
import { setupFarmServer } from './server/farmServer'
import { initSaveService } from './services/saveService'
import { initVisitService } from './services/visitService'
import { initSocialService } from './services/socialService'
import { getActiveQuestForNpc } from './game/questState'
import { setupInputModifierSystem } from './systems/inputModifierSystem'
import { setupMusicSystem } from './systems/musicSystem'
import { setupSfxSystem } from './systems/sfxSystem'
import { initCompostBinVfx } from './systems/compostBinVfx'
import { initBeautySpotSystem } from './systems/beautySpotSystem'
import { initAnimalSystem, catchUpAnimalProduction, unlockChickenCoop, unlockPigPen } from './systems/animalSystem'
import { initAnimalBuildings } from './systems/interactionSetup'
import { onLevelUp } from './systems/levelingSystem'

// First NPC visit delay (seconds) — gives player a moment to settle in
const FIRST_NPC_DELAY_S = 300
// Gap between NPC visits (seconds, randomised per visit)
const NPC_VISIT_GAP_MIN_S = 600
const NPC_VISIT_GAP_MAX_S = 900

export function main() {
  // ── Server branch ─────────────────────────────────────────────────────────
  if (isServer()) {
    setupFarmServer()
    return
  }

  // ── Client branch ─────────────────────────────────────────────────────────
  setupUi()
  setupEntities()
  initBeautySpotSystem()
  setupSfxSystem()
  setupMusicSystem()
  setupInputModifierSystem()
  initVisitService()
  initCompostBinVfx()
  initSocialService()
  initVisitorWaterFeedback()
  initAnimalBuildings()

  // Level-gated animal unlocks
  onLevelUp((newLevel: number) => {
    if (newLevel === 8)  unlockChickenCoop()
    if (newLevel === 12) unlockPigPen()
  })

  // Wire soil-unlock callbacks BEFORE initTutorialSystem runs.
  // This resolves the circular dep: tutorialSystem → interactionSetup → actions → tutorialSystem.
  tutorialCallbacks.unlockSoilsPhase1  = unlockSoilsPhase1
  tutorialCallbacks.unlockSoilsPhase2  = unlockSoilsPhase2
  tutorialCallbacks.unlockSoilsAll6    = unlockSoilsAll6
  tutorialCallbacks.getFirstSoilEntity = () => getSoilEntities()[0] ?? null
  tutorialCallbacks.getComputerEntity  = () => getComputerEntity()
  tutorialCallbacks.getTruckEntity     = () => getTruckEntity()
  tutorialCallbacks.getMayorEntity     = () => getNpcEntity('mayorchen')
  tutorialCallbacks.resetSoilPlots     = () => { resetSoilPlots(); setCompostBinVisible(false) }

  // Fetch player identity: wallet (save system) + userId (avatar texture) + displayName
  executeTask(async () => {
    try {
      // Wallet address from ECS PlayerIdentityData (available immediately)
      const identity = PlayerIdentityData.getOrNull(engine.PlayerEntity)
      if (identity?.address) {
        playerState.wallet = identity.address.toLowerCase()
      }

      const result = await getUserData({})
      if (result?.data) {
        playerState.displayName = result.data.displayName ?? ''
        playerState.userId      = result.data.userId ?? ''
        const face = result.data.avatar?.snapshots?.face256
        if (face) playerState.avatarUrl = face

        // Fallback: userId also serves as wallet if PlayerIdentityData wasn't ready
        if (!playerState.wallet && result.data.userId) {
          playerState.wallet = result.data.userId.toLowerCase()
        }
      }
    } catch (_) {
      // Silently ignore — preview or guest mode may have no profile
    }

    // Init save service after wallet is set.
    // Tutorial and NPC systems start inside onLoaded so they see the
    // restored state (tutorialComplete, tutorialStep, etc.) before firing.
    initSaveService(() => {
      initTutorialSystem()

      initProgressionEventsSystem()
      progressionEventCallbacks.onMayorClicked = getProgressionEventMayorClickHandler()

      // After the progression event (Level 5 Mayor return) is done, start NPC rotation
      setOnProgressionEventComplete(() => startRegularNpcRotation())

      // ── NPC Scheduling ─────────────────────────────────────────────────────

      function onNpcDeparted() {
        playerState.lastNpcVisitAt = Date.now()
        playerState.npcScheduleIndex++
        scheduleNextNpcVisit()
      }

      function scheduleNextNpcVisit() {
        const allNpcs = [
          ...REGULAR_NPC_ROSTER,
          ...(playerState.rotSystemUnlocked ? [MAYOR_DEF] : []),
        ]
        const eligible = allNpcs.filter(
          (npc) => playerState.level >= (NPC_SCHEDULE[npc.id]?.minLevel ?? 1)
        )
        if (eligible.length === 0) return

        const nextNpc = eligible[playerState.npcScheduleIndex % eligible.length]

        const timeSinceLast = playerState.lastNpcVisitAt > 0
          ? (Date.now() - playerState.lastNpcVisitAt) / 1000
          : 0
        const baseDelay = playerState.lastNpcVisitAt === 0
          ? FIRST_NPC_DELAY_S
          : NPC_VISIT_GAP_MIN_S + Math.random() * (NPC_VISIT_GAP_MAX_S - NPC_VISIT_GAP_MIN_S)
        let t = Math.max(0, baseDelay - timeSinceLast)

        engine.addSystem(function npcScheduler(dt: number) {
          t -= dt
          if (t > 0) return
          engine.removeSystem(npcScheduler)
          initNpcSystem(nextNpc, onNpcDeparted)
        })

        console.log(`CozyFarm: Next NPC (${nextNpc.name}) in ${Math.round(t)}s`)
      }

      function startRegularNpcRotation() {
        // If player reconnected with an active quest NPC, spawn that NPC immediately
        const allNpcs = [
          ...REGULAR_NPC_ROSTER,
          ...(playerState.rotSystemUnlocked ? [MAYOR_DEF] : []),
        ]
        const activeQuestNpc = allNpcs.find((npc) => {
          const result = getActiveQuestForNpc(npc.id)
          return result && result.qp.status === 'active'
        })

        if (activeQuestNpc) {
          initNpcSystem(activeQuestNpc, onNpcDeparted)
          return
        }

        scheduleNextNpcVisit()
        console.log('CozyFarm: Regular NPC rotation started')
      }

      // Dev reset: re-spawn Mayor and restart tutorial from welcome step
      tutorialCallbacks.onResetComplete = () => initNpcSystem(MAYOR_DEF, startRegularNpcRotation)

      if (tutorialState.active) {
        // Tutorial in progress — spawn Mayor as guide; rotation starts after he departs
        initNpcSystem(MAYOR_DEF, startRegularNpcRotation)
      } else if (progressionEventState.active) {
        // Progression event in progress — Mayor already spawned by initProgressionEventsSystem
        // Rotation will start when Mayor departs (wired via the onDespawned callback inside that system)
      } else {
        startRegularNpcRotation()
      }
    })
  })
}
