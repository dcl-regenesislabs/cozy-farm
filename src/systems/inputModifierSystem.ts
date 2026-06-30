import { engine, InputModifier } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'

let menuWasOpen = false

export function setupInputModifierSystem() {
  engine.addSystem(() => {
    const menuOpen =
      !playerState.menuInputLockDisabled &&
      playerState.activeMenu !== 'none'

    if (menuOpen === menuWasOpen) return
    menuWasOpen = menuOpen

    if (menuOpen) {
      InputModifier.createOrReplace(engine.PlayerEntity, {
        mode: {
          $case: 'standard',
          standard: { disableAll: true },
        },
      })
    } else {
      InputModifier.deleteFrom(engine.PlayerEntity)
    }
  })
}
