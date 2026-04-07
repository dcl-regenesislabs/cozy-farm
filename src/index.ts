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
import { initNpcSystem } from './systems/npcSystem'
import { NPC_ROSTER } from './data/npcData'
import { playerState } from './game/gameState'

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

  // All NPCs share the same single spawn cluster in the scene.
  // Spawn only one physical NPC (Rosa) — quests for all 6 are available via the Quest panel.
  // To spawn multiple NPCs simultaneously you need separate spawn clusters per NPC.
  initNpcSystem(NPC_ROSTER[0])
}
