import { engine, Entity, GltfContainer, Transform, Animator } from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'

const WATERING_MODEL = 'assets/scene/Models/WateringCan/WateringCan.glb'
const WATERING_CLIP  = 'WateringCanAction'

// Exact GLB duration: 3333 ms (3.3333s from accessor max). +200 ms buffer.
const VFX_DURATION_MS = 3533

// Snap to one of four Y-axis orientations so it feels varied without being chaotic
const Y_ROTATIONS = [0, 90, 180, 270]

// ─── Internal tracking ────────────────────────────────────────────────────────
type VfxEntry = { soilEntity: Entity; startedAt: number }
const activeVfx = new Map<Entity, VfxEntry>()

// ─── Public API ───────────────────────────────────────────────────────────────
/** Spawn the watering-can VFX on a soil plot. Clears isWatering when done. */
export function playWateringVfx(soilEntity: Entity) {
  const randomY = Y_ROTATIONS[Math.floor(Math.random() * Y_ROTATIONS.length)]
  const vfxEntity = engine.addEntity()

  Transform.create(vfxEntity, {
    parent: soilEntity,
    rotation: Quaternion.fromEulerDegrees(0, randomY, 0),
  })
  GltfContainer.create(vfxEntity, { src: WATERING_MODEL })
  Animator.create(vfxEntity, {
    states: [{ clip: WATERING_CLIP, playing: true, loop: false, shouldReset: true }],
  })

  activeVfx.set(vfxEntity, { soilEntity, startedAt: Date.now() })
}

// ─── System ───────────────────────────────────────────────────────────────────
function wateringVfxSystem(_dt: number) {
  const now = Date.now()
  for (const [vfxEntity, entry] of activeVfx) {
    if (now - entry.startedAt < VFX_DURATION_MS) continue

    engine.removeEntity(vfxEntity)
    activeVfx.delete(vfxEntity)

    const plot = PlotState.getMutable(entry.soilEntity)
    plot.isWatering = false
    // growthSystem picks up on the next frame and refreshes the timer billboard
  }
}

engine.addSystem(wateringVfxSystem, 3, 'wateringVfxSystem')
