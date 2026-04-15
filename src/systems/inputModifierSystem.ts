import { engine, InputModifier } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'

/**
 * Suppresses the mobile joystick while any menu is open.
 *
 * InputModifier must be applied to engine.PlayerEntity to affect the player.
 * disableAll: true tells the renderer to suppress ALL movement input,
 * which prevents the joystick from appearing on mobile entirely.
 */

let menuWasOpen = false

export function setupInputModifierSystem() {
  engine.addSystem(() => {
    const menuOpen = playerState.activeMenu !== 'none'

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
