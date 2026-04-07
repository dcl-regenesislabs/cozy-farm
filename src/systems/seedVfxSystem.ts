import { engine, Entity, GltfContainer, Transform, Animator } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { CropType } from '../data/cropData'
import { setSoilIconDisplay } from '../game/actions'
import { CROP_DATA } from '../data/cropData'

// ─── Animation duration ───────────────────────────────────────────────────────
// 63 frames at 24 fps = 2625 ms. +75 ms buffer so the last frame fully plays.
const VFX_DURATION_MS = 2700

// ─── Per-crop seed data ───────────────────────────────────────────────────────
// Each crop has its own GLB and a pair of animation clips (Blender duplicates
// the action when the file is exported, appending .001, .002, etc.).
// The first clip drives transform (translate/rotate/scale); the second drives
// shape-keys.  Both are started together so the full effect plays.
type SeedDef = { model: string; clips: string[] }

const SEED_DATA: Record<CropType, SeedDef> = {
  [CropType.Onion]:     { model: 'assets/scene/Models/SeedOnion/SeedOnion.glb',         clips: ['SeedAction',       'SeedAction'    ] },
  [CropType.Garlic]:    { model: 'assets/scene/Models/SeedGarlic/SeedGarlic.glb',       clips: ['SeedAction.001',   'SeedAction.002'] },
  [CropType.Potato]:    { model: 'assets/scene/Models/SeedPotato/SeedPotato.glb',       clips: ['SeedAction.003',   'SeedAction.004'] },
  [CropType.Carrot]:    { model: 'assets/scene/Models/SeedCarrot/SeedCarrot.glb',       clips: ['SeedAction.005',   'SeedAction.006'] },
  [CropType.Corn]:      { model: 'assets/scene/Models/SeedCorn/SeedCorn.glb',           clips: ['SeedAction.007',   'SeedAction.008'] },
  [CropType.Tomato]:    { model: 'assets/scene/Models/SeedTomato/SeedTomato.glb',       clips: ['SeedAction.009',   'SeedAction.010'] },
  [CropType.Pumpkin]:   { model: 'assets/scene/Models/SeedPumpkin/SeedPumpkin.glb',     clips: ['SeedAction.011',   'SeedAction.012'] },
  [CropType.Lavender]:  { model: 'assets/scene/Models/SeedLavender/SeedLavender.glb',   clips: ['SeedAction.013',   'SeedAction.014'] },
  [CropType.Sunflower]: { model: 'assets/scene/Models/SeedSunflower/SeedSunflower.glb', clips: ['SeedAction.015',   'SeedAction.016'] },
}

// ─── Internal tracking ────────────────────────────────────────────────────────
type VfxEntry = { soilEntity: Entity; elapsedMs: number }
const activeVfx = new Map<Entity, VfxEntry>()

// ─── Public API ───────────────────────────────────────────────────────────────
/** Spawn the seed-planting VFX for the given crop. Clears isPlanting when done. */
export function playSeedVfx(soilEntity: Entity, cropType: CropType) {
  const def = SEED_DATA[cropType]
  const vfxEntity = engine.addEntity()

  Transform.create(vfxEntity, { parent: soilEntity })
  GltfContainer.create(vfxEntity, { src: def.model })
  Animator.create(vfxEntity, {
    states: def.clips.map((clip) => ({ clip, playing: true, loop: false, shouldReset: true })),
  })

  activeVfx.set(vfxEntity, { soilEntity, elapsedMs: 0 })
}

// ─── System ───────────────────────────────────────────────────────────────────
function seedVfxSystem(dt: number) {
  for (const [vfxEntity, entry] of activeVfx) {
    entry.elapsedMs += dt * 1000

    if (entry.elapsedMs < VFX_DURATION_MS) continue

    // Animation is done — tear down
    engine.removeEntity(vfxEntity)
    activeVfx.delete(vfxEntity)

    const plot = PlotState.getMutable(entry.soilEntity)
    plot.isPlanting = false
    const def = CROP_DATA.get(plot.cropType as CropType)!
    setSoilIconDisplay(entry.soilEntity, {
      cropType: plot.cropType, waterCount: 0, wateringsRequired: def.wateringsRequired,
      canWater: true, isReady: false, isPlanting: false, justHarvested: false,
    })
  }
}

engine.addSystem(seedVfxSystem, 2, 'seedVfxSystem')
