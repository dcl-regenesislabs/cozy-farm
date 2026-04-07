import { executeTask } from '@dcl/sdk/ecs'
import { getUserData } from '~system/UserIdentity'
import { setupUi } from './ui'
import { setupEntities } from './systems/interactionSetup'
import './systems/growthSystem'
import './systems/seedVfxSystem'
import './systems/wateringVfxSystem'
import './systems/farmerSystem'
import './systems/harvestVfxSystem'
import './systems/levelRewardSystem'
import './systems/xpFloatSystem'
import { engine } from '@dcl/sdk/ecs'
import { initNpcSystem } from './systems/npcSystem'
import { NPC_ROSTER } from './data/npcData'
import { playerState } from './game/gameState'

// Seconds between each NPC arrival. All 6 will be in the scene after 5 × 30s = 2.5 min.
const NPC_SPAWN_INTERVAL = 30

export function main() {
  setupUi()
  setupEntities()

  // Fetch player avatar and display name for the TopHud
  executeTask(async () => {
    try {
      const result = await getUserData({})
      if (result?.data) {
        playerState.displayName = result.data.displayName ?? ''
        const face = result.data.avatar?.snapshots?.face256
        if (face) playerState.avatarUrl = face
      }
    } catch (_) {
      // Silently ignore — preview or guest mode has no profile
    }
  })

  // Spawn NPCs one at a time, NPC_SPAWN_INTERVAL seconds apart.
  // They stay and wander until the player claims their quest.
  let nextIndex = 0
  let timer     = 0  // spawn first NPC immediately

  engine.addSystem((dt: number) => {
    if (nextIndex >= NPC_ROSTER.length) return
    timer -= dt
    if (timer > 0) return
    initNpcSystem(NPC_ROSTER[nextIndex])
    nextIndex++
    timer = NPC_SPAWN_INTERVAL
  })
}
