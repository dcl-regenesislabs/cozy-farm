import {
  engine, Entity,
  GltfContainer, Animator,
  Transform,
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { getEntityWorldPosition } from './farmInstances'

// ---------------------------------------------------------------------------
// Tutorial Compass Arrow
//
// Uses assets/scene/Models/PathArrow/PathArrow.glb — parented to the player
// so it moves for free.  Each frame: one rotation write to point at target.
// ---------------------------------------------------------------------------

const GLB_PATH    = 'assets/scene/Models/PathArrow/PathArrow.glb'
const ANIM_CLIP   = 'Cube.008Action'

const FLOOR_LIFT  = 0.05   // local Y above player origin
const ARRIVE_DIST = 1.8    // hide when within this distance of target

const SHOW_SCALE = Vector3.create(1, 1, 1)
const HIDE_SCALE = Vector3.create(0, 0, 0)

let compassRoot: Entity | null = null
let guideTarget: Entity | null = null

export function initTutorialArrow() {
  if (compassRoot !== null) return
  compassRoot = engine.addEntity()

  Transform.create(compassRoot, {
    parent:   engine.PlayerEntity,
    position: Vector3.create(0, FLOOR_LIFT, 0),
    scale:    HIDE_SCALE,
  })

  GltfContainer.create(compassRoot, { src: GLB_PATH })

  Animator.create(compassRoot, {
    states: [{
      clip:    ANIM_CLIP,
      playing: true,
      loop:    true,
      speed:   1,
    }],
  })

  engine.addSystem(compassSystem, 10, 'tutorialCompassSystem')
}

export function setArrowTarget(entity: Entity | null) {
  guideTarget = entity
  if (!entity && compassRoot) {
    Transform.getMutable(compassRoot).scale = HIDE_SCALE
  }
}

// ── Per-frame: one rotation write only ───────────────────────────────────────
function compassSystem(_dt: number) {
  if (!guideTarget || !compassRoot) return

  const playerT = Transform.getOrNull(engine.PlayerEntity)
  if (!playerT) return

  // Use world position so the arrow works correctly even when the target
  // entity is nested inside a parent with an offset (Farm 2/3 slots).
  const targetWorld = getEntityWorldPosition(guideTarget as Entity)

  const dx   = targetWorld.x - playerT.position.x
  const dz   = targetWorld.z - playerT.position.z
  const dist = Math.sqrt(dx * dx + dz * dz)

  const t = Transform.getMutable(compassRoot)

  if (dist < ARRIVE_DIST) {
    t.scale = HIDE_SCALE
    return
  }

  // World-space angle to target
  const worldAngle = Math.atan2(dx, dz) * (180 / Math.PI)

  // Extract player's world Y so we can compute the correct local rotation
  const q = playerT.rotation
  const playerYAngle = Math.atan2(
    2 * (q.y * q.w + q.x * q.z),
    1 - 2 * (q.y * q.y + q.x * q.x),
  ) * (180 / Math.PI)

  t.rotation = Quaternion.fromEulerDegrees(0, worldAngle - playerYAngle, 0)
  t.scale    = SHOW_SCALE
}
