import {
  engine, Entity, Transform, GltfContainer, MeshRenderer, MeshCollider, ColliderLayer,
  Material, InputAction, pointerEventsSystem,
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
// Flat horizontal rotation for a plane lying on the ground (world-space, no parent)
const FLAT = Quaternion.fromAngleAxis(-90, Vector3.create(1, 0, 0))
import { BeautySpotState } from '../components/farmComponents'
import { BEAUTY_OBJECTS, RARITY_LABEL } from '../data/beautyObjectData'
import { playSound } from './sfxSystem'
import { isVisiting } from '../services/visitService'

// Scene-editor entity names — place these 3 objects in Creator Hub
const SPOT_NAMES = ['BeautySpot_1', 'BeautySpot_2', 'BeautySpot_3']

const PAD_RADIUS = 0.9
const PAD_HEIGHT = 0.08

const COLOR_EMPTY    = Color4.create(0.85, 0.65, 0.05, 0.85)
const COLOR_OCCUPIED = Color4.create(0.3,  0.9,  0.3,  0.85)

const spotEntities:  Entity[] = []
const padEntities:   Entity[] = []
const modelEntities: Entity[] = []

// ---------------------------------------------------------------------------
// Flat horizontal cylinder — created as a ROOT entity (no parent) so it
// always lies flat on the ground regardless of the spot parent's rotation.
// ---------------------------------------------------------------------------
function buildPlaceholderVisual(parent: Entity, slotIndex: number): void {
  const parentPos = Transform.getOrNull(parent)?.position ?? Vector3.Zero()

  const pad = engine.addEntity()
  Transform.create(pad, {
    // No parent — absolute world coordinates, guaranteed horizontal
    position: Vector3.create(parentPos.x, 0.04, parentPos.z),
    scale:    Vector3.create(PAD_RADIUS * 2, PAD_HEIGHT, PAD_RADIUS * 2),
  })
  MeshRenderer.setCylinder(pad)
  Material.setPbrMaterial(pad, {
    albedoColor:       COLOR_EMPTY,
    emissiveColor:     COLOR_EMPTY,
    emissiveIntensity: 1.2,
  })
  padEntities[slotIndex] = pad
}

// ---------------------------------------------------------------------------
// Show / hide the 3D model for a slot
// ---------------------------------------------------------------------------
function updateSlotModel(slotIndex: number, objectId: number): void {
  const parent = spotEntities[slotIndex]
  if (!parent) return

  const prev = modelEntities[slotIndex]
  if (prev) {
    engine.removeEntity(prev)
    modelEntities[slotIndex] = 0 as unknown as Entity
  }

  if (objectId === 0) return

  const def = BEAUTY_OBJECTS.get(objectId)
  if (!def) return

  const model = engine.addEntity()
  Transform.create(model, { parent, position: Vector3.create(0, 0, 0) })
  GltfContainer.create(model, { src: def.modelPath })
  modelEntities[slotIndex] = model
}

// ---------------------------------------------------------------------------
// Refresh pad color and hover text for a slot
// ---------------------------------------------------------------------------
function refreshSpotVisual(slotIndex: number): void {
  const spot = spotEntities[slotIndex]
  const pad  = padEntities[slotIndex]
  if (!spot || !pad) return

  const state  = BeautySpotState.get(spot)
  const def    = BEAUTY_OBJECTS.get(state.objectId)
  const isEmpty = state.objectId === 0

  Material.setPbrMaterial(pad, {
    albedoColor:       isEmpty ? COLOR_EMPTY : COLOR_OCCUPIED,
    emissiveColor:     isEmpty ? COLOR_EMPTY : COLOR_OCCUPIED,
    emissiveIntensity: isEmpty ? 1.2 : 1.8,
    alphaTest:         0.1,
    transparencyMode:  2,
  })

  const hoverText = isEmpty
    ? `Beauty Slot ${slotIndex + 1} — Empty`
    : `${def?.name} [${RARITY_LABEL[def?.rarity ?? 'common']}] · ${def?.beautyValue} beauty pts`

  pointerEventsSystem.removeOnPointerDown(spot)
  pointerEventsSystem.onPointerDown(
    { entity: spot, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 6 } },
    () => { if (isVisiting()) return; playSound('menu') }
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function applyBeautySlots(slots: number[]): void {
  for (let i = 0; i < spotEntities.length; i++) {
    const entity = spotEntities[i]
    if (!entity) continue
    const objectId = slots[i] ?? 0
    BeautySpotState.getMutable(entity).objectId = objectId
    updateSlotModel(i, objectId)
    refreshSpotVisual(i)
  }
}

export function placeOrnamentInNextSlot(objectId: number): number {
  for (let i = 0; i < spotEntities.length; i++) {
    const entity = spotEntities[i]
    if (!entity) continue
    if (BeautySpotState.get(entity).objectId === 0) {
      BeautySpotState.getMutable(entity).objectId = objectId
      updateSlotModel(i, objectId)
      refreshSpotVisual(i)
      return i
    }
  }
  return -1
}

export function getBeautySlots(): number[] {
  return spotEntities.map((e) => (e ? BeautySpotState.get(e).objectId : 0))
}

export function isOrnamentPlaced(objectId: number): boolean {
  return spotEntities.some((e) => e && BeautySpotState.get(e).objectId === objectId)
}

export function hasEmptySlot(): boolean {
  return spotEntities.some((e) => e && BeautySpotState.get(e).objectId === 0)
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
export function initBeautySpotSystem(): void {
  let found = 0
  for (let i = 0; i < SPOT_NAMES.length; i++) {
    const entity = engine.getEntityOrNullByName(SPOT_NAMES[i])
    if (!entity) {
      console.error(`CozyFarm BeautySpots: "${SPOT_NAMES[i]}" not found in scene`)
      continue
    }

    BeautySpotState.create(entity, { slotIndex: i, objectId: 0 })
    spotEntities[i]  = entity
    modelEntities[i] = 0 as unknown as Entity

    // Hide the Creator Hub placeholder shape — only the code-created pad is visible
    MeshRenderer.deleteFrom(entity)
    MeshCollider.setCylinder(entity, ColliderLayer.CL_POINTER)
    buildPlaceholderVisual(entity, i)
    refreshSpotVisual(i)
    found++
  }

  console.log(`CozyFarm: Beauty spot system initialized (${found}/3 spots found)`)
}
