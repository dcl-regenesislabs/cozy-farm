import {
  engine,
  Entity,
  Transform,
  Material,
  MeshRenderer,
  Tween,
  EasingFunction,
  TweenSequence,
  TweenStateStatus,
  TweenState,
  Billboard,
  BillboardMode,
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { CropType } from '../data/cropData'
import { FertilizerType } from '../data/fertilizerData'
import { ORGANIC_WASTE_ICON, FERTILIZER_ICON_SRCS } from '../data/imagePaths'

// ─── Texture paths ────────────────────────────────────────────────────────────

const CROP_TEXTURES: Record<CropType, string> = {
  [CropType.Onion]:     'assets/scene/Images/OnionTexture.png',
  [CropType.Potato]:    'assets/scene/Images/PotatoTexture.png',
  [CropType.Garlic]:    'assets/scene/Images/GarlicTexture.png',
  [CropType.Tomato]:    'assets/scene/Images/TomatoTexture.png',
  [CropType.Carrot]:    'assets/scene/Images/CarrotTexture.png',
  [CropType.Corn]:      'assets/scene/Images/CornTexture.png',
  [CropType.Lavender]:  'assets/scene/Images/LavanderTexture.png',
  [CropType.Pumpkin]:   'assets/scene/Images/PumpkinTexture.png',
  [CropType.Sunflower]: 'assets/scene/Images/SunflowerTexture.png',
}

// ─── Timing ───────────────────────────────────────────────────────────────────

const RISE_DURATION  = 900   // ms — float up phase
const FADE_DURATION  = 500   // ms — fade out phase (via scale-to-zero trick)
const TOTAL_DURATION = RISE_DURATION + FADE_DURATION
const SPRITE_SIZE    = 0.4   // world-unit width/height of the quad
const RISE_HEIGHT    = 1.8   // how many units the sprite floats up
const SPREAD         = 0.45  // random horizontal spread radius

// ─── Tracking ─────────────────────────────────────────────────────────────────

type Entry = { entity: Entity; elapsed: number; phase: 'rising' | 'fading' }
const active: Entry[] = []

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Spawns `count` floating crop sprites above `worldPos`.
 * Each sprite rises then shrinks away, staggered slightly.
 */
export function spawnHarvestVfx(worldPos: Vector3, cropType: CropType, count: number) {
  const texture = CROP_TEXTURES[cropType]
  if (!texture) return

  for (let i = 0; i < count; i++) {
    // Small random offset so sprites fan out instead of stacking
    const offsetX = (Math.random() - 0.5) * SPREAD * 2
    const offsetZ = (Math.random() - 0.5) * SPREAD * 2
    const startPos = Vector3.create(
      worldPos.x + offsetX,
      worldPos.y + 0.6,
      worldPos.z + offsetZ
    )
    const endPos = Vector3.create(startPos.x, startPos.y + RISE_HEIGHT, startPos.z)

    const e = engine.addEntity()

    Transform.create(e, {
      position: startPos,
      scale: Vector3.create(SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE),
    })

    // Always face the camera
    Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })

    // Flat quad
    MeshRenderer.setPlane(e)

    // PBR with the crop texture, alpha blended so edges are transparent
    Material.setPbrMaterial(e, {
      texture: Material.Texture.Common({ src: texture }),
      emissiveTexture: Material.Texture.Common({ src: texture }),
      emissiveIntensity: 0.8,
      emissiveColor: Color4.White(),
      alphaTest: 0.1,
      transparencyMode: 2,  // AlphaBlend
    })

    // Tween: rise up over RISE_DURATION ms
    Tween.create(e, {
      mode: Tween.Mode.Move({
        start: startPos,
        end: endPos,
      }),
      duration: RISE_DURATION,
      easingFunction: EasingFunction.EF_EASEOUTQUAD,
    })

    // Chain: after rising, scale to zero over FADE_DURATION ms
    TweenSequence.create(e, {
      sequence: [
        {
          mode: Tween.Mode.Scale({
            start: Vector3.create(SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE),
            end: Vector3.Zero(),
          }),
          duration: FADE_DURATION,
          easingFunction: EasingFunction.EF_EASEINQUAD,
        },
      ],
    })

    active.push({ entity: e, elapsed: 0, phase: 'rising' })
  }
}

/**
 * Spawns a single floating organic waste sprite above `worldPos`.
 * Same rise-then-shrink animation as normal harvest VFX.
 */
export function spawnOrganicWasteVfx(worldPos: Vector3) {
  const e = engine.addEntity()

  const startPos = Vector3.create(worldPos.x, worldPos.y + 0.6, worldPos.z)
  const endPos   = Vector3.create(startPos.x, startPos.y + RISE_HEIGHT, startPos.z)

  Transform.create(e, {
    position: startPos,
    scale: Vector3.create(SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture:          Material.Texture.Common({ src: ORGANIC_WASTE_ICON }),
    emissiveTexture:  Material.Texture.Common({ src: ORGANIC_WASTE_ICON }),
    emissiveIntensity: 0.8,
    emissiveColor:    Color4.White(),
    alphaTest:        0.1,
    transparencyMode: 2,
  })
  Tween.create(e, {
    mode: Tween.Mode.Move({ start: startPos, end: endPos }),
    duration: RISE_DURATION,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })
  TweenSequence.create(e, {
    sequence: [{
      mode: Tween.Mode.Scale({
        start: Vector3.create(SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE),
        end: Vector3.Zero(),
      }),
      duration: FADE_DURATION,
      easingFunction: EasingFunction.EF_EASEINQUAD,
    }],
  })
  active.push({ entity: e, elapsed: 0, phase: 'rising' })
}

/**
 * Spawns a single large fertilizer icon that rises then shrinks away —
 * "buff applied" feedback when the player fertilizes a growing crop.
 */
export function spawnFertilizerVfx(worldPos: Vector3, fertilizerType: FertilizerType) {
  const texture = FERTILIZER_ICON_SRCS[fertilizerType]
  if (!texture) return

  const BUFF_SIZE      = 1.0
  const BUFF_RISE      = 1400
  const BUFF_FADE      = 600
  const BUFF_HEIGHT    = 1.4

  const startPos = Vector3.create(worldPos.x, worldPos.y + 0.8, worldPos.z)
  const endPos   = Vector3.create(startPos.x, startPos.y + BUFF_HEIGHT, startPos.z)

  const e = engine.addEntity()
  Transform.create(e, { position: startPos, scale: Vector3.create(BUFF_SIZE, BUFF_SIZE, BUFF_SIZE) })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture:           Material.Texture.Common({ src: texture }),
    emissiveTexture:   Material.Texture.Common({ src: texture }),
    emissiveIntensity: 1.0,
    emissiveColor:     Color4.White(),
    alphaTest:         0.1,
    transparencyMode:  2,
  })
  Tween.create(e, {
    mode: Tween.Mode.Move({ start: startPos, end: endPos }),
    duration: BUFF_RISE,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })
  TweenSequence.create(e, {
    sequence: [{
      mode: Tween.Mode.Scale({
        start: Vector3.create(BUFF_SIZE, BUFF_SIZE, BUFF_SIZE),
        end: Vector3.Zero(),
      }),
      duration: BUFF_FADE,
      easingFunction: EasingFunction.EF_EASEINQUAD,
    }],
  })
  active.push({ entity: e, elapsed: 0, phase: 'rising' })
}

// ─── Cleanup system ───────────────────────────────────────────────────────────

function harvestVfxSystem(dt: number) {
  for (let i = active.length - 1; i >= 0; i--) {
    const entry = active[i]
    entry.elapsed += dt * 1000

    if (entry.elapsed >= TOTAL_DURATION) {
      engine.removeEntity(entry.entity)
      active.splice(i, 1)
    }
  }
}

engine.addSystem(harvestVfxSystem, 4, 'harvestVfxSystem')
