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
import './systems/levelUpVfxSystem'
import './systems/mailboxIndicatorSystem'
import { initNpcSystem, getNpcEntity, getActiveNpcCount } from './systems/npcSystem'
import { MAYOR_DEF, REGULAR_NPC_ROSTER, NPC_SCHEDULE } from './data/npcData'
import { playerState } from './game/gameState'
import { initTutorialSystem } from './systems/tutorialSystem'
import { tutorialCallbacks, tutorialState } from './game/tutorialState'
import { progressionEventState, progressionEventCallbacks } from './game/progressionEventState'
import { initProgressionEventsSystem, getProgressionEventMayorClickHandler, setOnProgressionEventComplete } from './systems/progressionEventsSystem'
import { initAnimalTutorialSystem, setOnChickenTutorialComplete, setOnPigTutorialComplete, triggerChickenTutorial, triggerPigTutorial, getChickenTutorialMayorClickHandler, getPigTutorialMayorClickHandler } from './systems/animalTutorialSystem'
import { animalTutorialState, animalTutorialCallbacks } from './game/animalTutorialState'
import { setupFarmServer } from './server/farmServer'
import { initSaveService } from './services/saveService'
import { initVisitService } from './services/visitService'
import { initSocialService } from './services/socialService'
import { getActiveQuestForNpc, hasOnlyBlockedQuestsForNpc } from './game/questState'
import { setupInputModifierSystem } from './systems/inputModifierSystem'
import { setupMusicSystem } from './systems/musicSystem'
import { setupSfxSystem } from './systems/sfxSystem'
import { initCompostBinVfx } from './systems/compostBinVfx'
import { initBeautySpotSystem } from './systems/beautySpotSystem'
import { initAnimalBuildings } from './systems/animalSystem'
import { onLevelUp } from './systems/levelingSystem'
import { recomputeStartupBadges } from './game/badgeSystem'

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
      recomputeStartupBadges()
      initTutorialSystem()

      initProgressionEventsSystem()
      progressionEventCallbacks.onMayorClicked = getProgressionEventMayorClickHandler()

      // Animal tutorial system — must come after save loads (animalTutorialState is set in applyPayload)
      initAnimalTutorialSystem(startRegularNpcRotation)
      setOnChickenTutorialComplete(startRegularNpcRotation)
      setOnPigTutorialComplete(startRegularNpcRotation)

      // Show a 4-second HUD banner whenever the player levels up.
      onLevelUp((newLevel) => {
        console.log('CozyFarm: Level up toast →', newLevel)
        playerState.levelUpToastText      = `Level Up! Now Level ${newLevel}`
        playerState.levelUpToastExpiresAt = Date.now() + 4000

        // Animal tutorial triggers (skip if another modal tutorial is mid-flow)
        if (
          newLevel === 8 &&
          !animalTutorialState.chickenActive &&
          animalTutorialState.chickenStep === '' &&
          !progressionEventState.active
        ) {
          triggerChickenTutorial(startRegularNpcRotation)
        }
        if (
          newLevel === 12 &&
          !animalTutorialState.pigActive &&
          animalTutorialState.pigStep === '' &&
          !progressionEventState.active
        ) {
          triggerPigTutorial(startRegularNpcRotation)
        }
      })

      // After the progression event (Level 5 Mayor return) is done, start NPC rotation
      setOnProgressionEventComplete(() => startRegularNpcRotation())

      // Wire animal tutorial Mayor click handlers
      animalTutorialCallbacks.onMayorClicked = () => {
        if (animalTutorialState.chickenActive) getChickenTutorialMayorClickHandler()()
        else if (animalTutorialState.pigActive) getPigTutorialMayorClickHandler()()
      }

      // ── NPC Scheduling ─────────────────────────────────────────────────────

      function getAllEligibleNpcs() {
        return [
          ...REGULAR_NPC_ROSTER,
          ...(playerState.rotSystemUnlocked ? [MAYOR_DEF] : []),
        ].filter((npc) =>
          playerState.level >= (NPC_SCHEDULE[npc.id]?.minLevel ?? 1) &&
          !hasOnlyBlockedQuestsForNpc(npc.id)
        )
      }

      // Spawn the next eligible NPC that has a pending quest — one at a time.
      function spawnPendingQuestNpcs() {
        if (getActiveNpcCount() > 0) return   // already someone in the scene
        for (const npc of getAllEligibleNpcs()) {
          if (getNpcEntity(npc.id) !== null) continue
          const result = getActiveQuestForNpc(npc.id)
          if (result && (result.qp.status === 'available' || result.qp.status === 'active')) {
            initNpcSystem(npc, () => onNpcDeparted(npc.id))
            return   // one at a time
          }
        }
      }

      function onNpcDeparted(npcId: string) {
        playerState.lastNpcVisitAt = Date.now()
        // Immediately spawn any NPCs whose quests are now available or active.
        spawnPendingQuestNpcs()
        // If nobody is left, fall back to the chit-chat rotation.
        if (getActiveNpcCount() === 0) {
          playerState.npcScheduleIndex++
          scheduleNextChitchatVisit()
        }
      }

      // Schedule a time-gapped social visit for an NPC with no pending quest.
      function scheduleNextChitchatVisit() {
        const eligible = getAllEligibleNpcs().filter((npc) => {
          const result = getActiveQuestForNpc(npc.id)
          return !result || result.qp.status === 'completed'
        })
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
          // Guard: NPC may have been spawned with a quest while the timer was running.
          if (getNpcEntity(nextNpc.id) !== null) return
          initNpcSystem(nextNpc, () => onNpcDeparted(nextNpc.id))
        })

        console.log(`CozyFarm: Next chit-chat NPC (${nextNpc.name}) in ${Math.round(t)}s`)
      }

      function startRegularNpcRotation() {
        // Spawn all NPCs with available/active quests immediately; fall back to rotation otherwise.
        spawnPendingQuestNpcs()
        if (getActiveNpcCount() === 0) {
          scheduleNextChitchatVisit()
        }
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
      } else if (animalTutorialState.chickenActive || animalTutorialState.pigActive) {
        // Animal tutorial in progress — Mayor spawned by initAnimalTutorialSystem (resume path)
        // Rotation starts when Mayor departs via setOnChickenTutorialComplete / setOnPigTutorialComplete
      } else {
        startRegularNpcRotation()
      }
    })
  })
}
