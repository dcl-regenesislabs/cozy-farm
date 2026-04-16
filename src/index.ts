import { executeTask, engine } from '@dcl/sdk/ecs'
import { getUserData } from '~system/UserIdentity'
import { setupUi } from './ui'
import { setupEntities, unlockSoilsPhase1, unlockSoilsPhase2, unlockSoilsAll6, getSoilEntities, getComputerEntity, getTruckEntity } from './systems/interactionSetup'
import './systems/growthSystem'
import './systems/dogSystem'
import './systems/seedVfxSystem'
import './systems/wateringVfxSystem'
import './systems/farmerSystem'
import './systems/harvestVfxSystem'
import './systems/levelRewardSystem'
import './systems/xpFloatSystem'
import { initNpcSystem, getNpcEntity } from './systems/npcSystem'
import { MAYOR_DEF, REGULAR_NPC_ROSTER } from './data/npcData'
import { playerState } from './game/gameState'
import { initTutorialSystem } from './systems/tutorialSystem'
import { tutorialCallbacks } from './game/tutorialState'
import { setupInputModifierSystem } from './systems/inputModifierSystem'
import { setupMusicSystem } from './systems/musicSystem'
import { setupSfxSystem } from './systems/sfxSystem'

// Seconds between each regular NPC arrival once the tutorial is complete
const NPC_SPAWN_INTERVAL = 30

export function main() {
  setupUi()
  setupEntities()
  setupSfxSystem()
  setupMusicSystem()
  setupInputModifierSystem()

  // Wire soil-unlock callbacks BEFORE initTutorialSystem runs.
  // This resolves the circular dep: tutorialSystem → interactionSetup → actions → tutorialSystem.
  tutorialCallbacks.unlockSoilsPhase1  = unlockSoilsPhase1
  tutorialCallbacks.unlockSoilsPhase2  = unlockSoilsPhase2
  tutorialCallbacks.unlockSoilsAll6    = unlockSoilsAll6
  tutorialCallbacks.getFirstSoilEntity = () => getSoilEntities()[0] ?? null
  tutorialCallbacks.getComputerEntity  = () => getComputerEntity()
  tutorialCallbacks.getTruckEntity     = () => getTruckEntity()
  tutorialCallbacks.getMayorEntity     = () => getNpcEntity('mayorchen')

  // Fetch player identity for the TopHud — userId drives the native avatarTexture
  executeTask(async () => {
    try {
      const result = await getUserData({})
      if (!result?.data) return
      playerState.displayName = result.data.displayName ?? ''
      playerState.userId      = result.data.userId ?? ''
    } catch (_) {
      // Silently ignore — preview or guest mode may have no profile
    }
  })

  // Spawn Mayor IMMEDIATELY as the tutorial guide.
  // When he departs (after tutorial completes), start the regular NPC rotation.
  initNpcSystem(MAYOR_DEF, () => {
    let nextIndex = 0
    let timer     = 3  // 3-second grace period after Mayor departs before first regular NPC arrives

    engine.addSystem((dt: number) => {
      if (nextIndex >= REGULAR_NPC_ROSTER.length) return
      timer -= dt
      if (timer > 0) return
      initNpcSystem(REGULAR_NPC_ROSTER[nextIndex])
      nextIndex++
      timer = NPC_SPAWN_INTERVAL
    })

    console.log('CozyFarm: Mayor departed — regular NPC rotation started')
  })

  // Start the tutorial (shows welcome dialog; Mayor is already walking in)
  initTutorialSystem()
}
