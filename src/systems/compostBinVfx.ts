import { engine, Entity, Transform, Billboard, BillboardMode, MeshRenderer, Material, TextShape } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import { HAND_ICON, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { formatTime } from './growthSystem'
import { getCompostBinEntity } from './interactionSetup'

const COMPOST_CYCLE_MS = 300_000   // 5 min per waste unit

// World-space heights above the bin origin (not relative — bin has scale 3 so child-relative
// positions would be hidden inside the model; use absolute world coords instead)
const ICON_WORLD_Y  = 2.0
const TIMER_WORLD_Y = 3.5
const ICON_SIZE     = 1.2

let iconEntity:  Entity | null = null
let timerEntity: Entity | null = null
let lastHash = ''

// Cache the bin's world position once (it's a static scene object)
let cachedBinPos: { x: number; y: number; z: number } | null = null

function getBinWorldPos(bin: Entity): { x: number; y: number; z: number } | null {
  if (cachedBinPos) return cachedBinPos
  const t = Transform.getOrNull(bin)
  if (!t) return null
  // FarmParent has identity transform, so bin's local pos = world pos
  cachedBinPos = { x: t.position.x, y: t.position.y, z: t.position.z }
  return cachedBinPos
}

function makeSprite(worldPos: { x: number; y: number; z: number }, size: number, src: string): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(worldPos.x, worldPos.y, worldPos.z),
    scale:    Vector3.create(size, size, size),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture:           Material.Texture.Common({ src }),
    emissiveTexture:   Material.Texture.Common({ src }),
    emissiveIntensity: 0.9,
    emissiveColor:     Color4.White(),
    alphaTest:         0.1,
    transparencyMode:  2,
  })
  return e
}

function makeTimerText(worldPos: { x: number; y: number; z: number }): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(worldPos.x, worldPos.y, worldPos.z),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  TextShape.create(e, {
    text:         '',
    fontSize:     3,
    textColor:    { r: 1, g: 1, b: 1, a: 1 },
    outlineWidth: 0.15,
    outlineColor: { r: 0, g: 0, b: 0 },
  })
  return e
}

function compostBinVfxSystem(_dt: number) {
  const bin = getCompostBinEntity()
  if (!bin) return

  const binPos = getBinWorldPos(bin)
  if (!binPos) return

  const now          = Date.now()
  const wasteInBin   = playerState.compostWasteCount
  const lastCollected = playerState.compostLastCollectedAt

  const timeElapsed = (lastCollected > 0 && wasteInBin > 0) ? now - lastCollected : 0
  const cyclesDone  = Math.min(Math.floor(timeElapsed / COMPOST_CYCLE_MS), wasteInBin)
  const nextCycleMs = (wasteInBin > cyclesDone && lastCollected > 0)
    ? COMPOST_CYCLE_MS - (timeElapsed % COMPOST_CYCLE_MS)
    : null

  const mode: 'empty' | 'working' | 'ready' =
    cyclesDone > 0 ? 'ready'
    : wasteInBin > 0 ? 'working'
    : 'empty'

  // Rebuild icon sprite only when mode changes
  const iconHash = mode
  if (iconHash !== lastHash) {
    lastHash = iconHash
    if (iconEntity !== null) {
      engine.removeEntity(iconEntity)
      iconEntity = null
    }
    const iconPos = { x: binPos.x, y: binPos.y + ICON_WORLD_Y, z: binPos.z }
    if (mode === 'ready') {
      iconEntity = makeSprite(iconPos, ICON_SIZE, HAND_ICON)
    } else if (mode === 'working') {
      iconEntity = makeSprite(iconPos, ICON_SIZE, ORGANIC_WASTE_ICON)
    }
  }

  // Timer text — update every frame when working, remove otherwise
  const timerPos = { x: binPos.x, y: binPos.y + TIMER_WORLD_Y, z: binPos.z }
  if (mode === 'working' && nextCycleMs !== null) {
    if (!timerEntity) {
      timerEntity = makeTimerText(timerPos)
    }
    TextShape.getMutable(timerEntity).text = formatTime(nextCycleMs)
  } else {
    if (timerEntity !== null) {
      engine.removeEntity(timerEntity)
      timerEntity = null
    }
  }
}

export function initCompostBinVfx() {
  engine.addSystem(compostBinVfxSystem, 2, 'compostBinVfxSystem')
}
