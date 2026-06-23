import { engine, InputModifier } from '@dcl/sdk/ecs'

export function setupInputModifierSystem() {
  // Remove any InputModifier that may have been left from a previous load.
  // Named so it can self-remove after running once.
  function clearInputModifier() {
    InputModifier.deleteFrom(engine.PlayerEntity)
    engine.removeSystem(clearInputModifier)
  }
  engine.addSystem(clearInputModifier)
}
