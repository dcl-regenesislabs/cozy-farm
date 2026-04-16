import { executeTask, engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getUserData } from '~system/UserIdentity'
import { PlayerIdentityData } from '@dcl/sdk/ecs'
import { setupUi } from './ui'
import { setupEntities, unlockSoilsPhase1, unlockSoilsPhase2, unlockSoilsAll6 } from './systems/interactionSetup'
import './systems/growthSystem'
import './systems/dogSystem'
import './systems/seedVfxSystem'
import './systems/wateringVfxSystem'
import './systems/farmerSystem'
import './systems/harvestVfxSystem'
import './systems/levelRewardSystem'
import './systems/xpFloatSystem'
import { initNpcSystem } from './systems/npcSystem'
import { MAYOR_DEF, REGULAR_NPC_ROSTER } from './data/npcData'
import { playerState } from './game/gameState'
import { initTutorialSystem } from './systems/tutorialSystem'
import { tutorialCallbacks } from './game/tutorialState'
import { setupFarmServer } from './server/farmServer'
import { initSaveService } from './services/saveService'

// Seconds between each regular NPC arrival once the tutorial is complete
const NPC_SPAWN_INTERVAL = 30

export function main() {
  // ── Server branch ─────────────────────────────────────────────────────────
  if (isServer()) {
    setupFarmServer()
    return
  }

  // ── Client branch ─────────────────────────────────────────────────────────
  setupUi()
  setupEntities()

  // Wire soil-unlock callbacks BEFORE initTutorialSystem runs.
  // This resolves the circular dep: tutorialSystem → interactionSetup → actions → tutorialSystem.
  tutorialCallbacks.unlockSoilsPhase1 = unlockSoilsPhase1
  tutorialCallbacks.unlockSoilsPhase2 = unlockSoilsPhase2
  tutorialCallbacks.unlockSoilsAll6   = unlockSoilsAll6

  // Fetch player identity: wallet address (for save system) + display name + avatar
  executeTask(async () => {
    try {
      // Wallet address comes from the ECS PlayerIdentityData component
      const identity = PlayerIdentityData.getOrNull(engine.PlayerEntity)
      if (identity?.address) {
        playerState.wallet = identity.address.toLowerCase()
      }

      const result = await getUserData({})
      if (result?.data) {
        playerState.displayName = result.data.displayName ?? ''
        const face = result.data.avatar?.snapshots?.face256
        if (face) playerState.avatarUrl = face

        // Fallback: getUserData also exposes the wallet
        if (!playerState.wallet && result.data.userId) {
          playerState.wallet = result.data.userId.toLowerCase()
        }
      }
    } catch (_) {
      // Silently ignore — preview or guest mode has no profile
    }

    // Init save service after wallet is set.
    // Tutorial and NPC systems start inside onLoaded so they see the
    // restored state (tutorialComplete, tutorialStep, etc.) before firing.
    initSaveService(() => {
      initTutorialSystem()

      // Spawn Mayor as tutorial guide (or normal NPC if tutorial is already done).
      // When he departs, start the regular NPC rotation.
      initNpcSystem(MAYOR_DEF, () => {
        let nextIndex = 0
        let timer     = 0

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
    })
  })
}
