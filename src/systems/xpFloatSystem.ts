import {
  engine,
  TextShape,
  Transform,
  Billboard,
  BillboardMode,
  Tween,
  EasingFunction,
} from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { onXpAdded } from './levelingSystem'

// ---------------------------------------------------------------------------
// Pending removal queue — entities scheduled to be cleaned up
// ---------------------------------------------------------------------------

type FloatEntry = { entity: ReturnType<typeof engine.addEntity>; removeAt: number }
const floatQueue: FloatEntry[] = []

function xpFloatCleanupSystem(_dt: number) {
  const now = Date.now()
  for (let i = floatQueue.length - 1; i >= 0; i--) {
    if (now >= floatQueue[i].removeAt) {
      engine.removeEntity(floatQueue[i].entity)
      floatQueue.splice(i, 1)
    }
  }
}

engine.addSystem(xpFloatCleanupSystem)

// ---------------------------------------------------------------------------
// Spawn a floating "+N XP" label above the player
// ---------------------------------------------------------------------------

export function spawnXpFloat(amount: number): void {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return

  const px = playerTransform.position.x
  const py = playerTransform.position.y
  const pz = playerTransform.position.z

  const entity = engine.addEntity()

  Transform.create(entity, {
    position: Vector3.create(px, py + 2.8, pz),
  })

  Billboard.create(entity, { billboardMode: BillboardMode.BM_Y })

  TextShape.create(entity, {
    text:         `+${amount} XP`,
    fontSize:     4,
    textColor:    Color4.create(0.25, 1, 0.35, 1),
    outlineWidth: 0.18,
    outlineColor: Color4.create(0, 0.2, 0, 1),
  })

  // Float upward 2.5 units over 2 seconds
  Tween.create(entity, {
    mode: Tween.Mode.Move({
      start: Vector3.create(px, py + 2.8, pz),
      end:   Vector3.create(px, py + 5.3, pz),
    }),
    duration: 2000,
    easingFunction: EasingFunction.EF_EASEQUART,
  })

  floatQueue.push({ entity, removeAt: Date.now() + 2100 })
}

// Register — whenever XP is awarded, spawn the float
onXpAdded(spawnXpFloat)
