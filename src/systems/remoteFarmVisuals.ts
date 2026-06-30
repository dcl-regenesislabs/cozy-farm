import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  Animator,
  VisibilityComponent,
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { BEAUTY_OBJECTS } from '../data/beautyObjectData'
import {
  ANIMAL_BUILDING_EMPTY,
  ANIMAL_FOOD_EMPTY,
  ANIMAL_FOOD_FULL,
  ANIMAL_PAUSE_MAX,
  ANIMAL_PAUSE_MIN,
  ANIMAL_SCALE_CHICKEN,
  ANIMAL_WALK_SPEED,
  CHICKEN_FOOD_EMPTY,
  CHICKEN_FOOD_FULL,
  CHICKEN_MODEL,
  PIG_MODEL,
  getPigletScale,
} from '../data/animalData'

import { getFarmEntity, getEntityWorldPosition } from './farmInstances'

import type { PlotSaveState, ChickenDataPayload, PigDataPayload } from '../shared/farmMessages'

type FarmSlotVisual = {
  slotId: number
  wallet: string
  plotStates: PlotSaveState[]
  beautySlots: number[]
  chickenCoopOwned: boolean
  chickens: ChickenDataPayload[]
  chickenFoodInBowl: number
  chickenCoopDirtyAt: number
  pigPenOwned: boolean
  pigs: PigDataPayload[]
  pigFoodInBowl: number
  pigPenDirtyAt: number
  compostBinUnlocked: boolean
}

const remoteBeautyModels = new Map<number, Entity[]>()
const remoteChickenEntities = new Map<number, Entity[]>()
const remotePigEntities = new Map<number, Entity[]>()
const remoteChickenStates = new Map<number, RemoteAnimalState[]>()
const remotePigStates = new Map<number, RemoteAnimalState[]>()
// Placeholder buildings shown when the remote player hasn't bought the coop/pen yet
const remoteEmptyCoopEntities = new Map<number, Entity>()
const remoteEmptyPenEntities  = new Map<number, Entity>()
let remoteAnimalSystemRegistered = false

type WanderBounds = { minX: number; maxX: number; minZ: number; maxZ: number }

type RemoteAnimalState = {
  entity: Entity
  bounds: WanderBounds
  pauseTimer: number
  currentTarget: { x: number; z: number } | null
}

function setVisible(entity: Entity | null, visible: boolean): void {
  if (!entity) return
  if (VisibilityComponent.has(entity)) VisibilityComponent.getMutable(entity).visible = visible
  else VisibilityComponent.create(entity, { visible })
}

function getOrCreateArray(map: Map<number, Entity[]>, slotId: number): Entity[] {
  const existing = map.get(slotId)
  if (existing) return existing
  const created: Entity[] = []
  map.set(slotId, created)
  return created
}

function getOrCreateStateArray(map: Map<number, RemoteAnimalState[]>, slotId: number): RemoteAnimalState[] {
  const existing = map.get(slotId)
  if (existing) return existing
  const created: RemoteAnimalState[] = []
  map.set(slotId, created)
  return created
}

function ensureRemoteAnimalSystem(): void {
  if (remoteAnimalSystemRegistered) return
  remoteAnimalSystemRegistered = true
  engine.addSystem((dt) => {
    updateRemoteAnimalStates(dt, remoteChickenStates)
    updateRemoteAnimalStates(dt, remotePigStates)
  }, 0, 'remote-animal-wander-system')
}

function updateRemoteAnimalStates(dt: number, statesMap: Map<number, RemoteAnimalState[]>): void {
  for (const states of statesMap.values()) {
    for (const state of states) {
      state.pauseTimer -= dt

      if (state.pauseTimer > 0) continue

      if (!state.currentTarget) {
        const current = Transform.getOrNull(state.entity)?.position
        if (!current) continue
        state.currentTarget = randomWanderTarget(current, state.bounds)
        playRemoteAnim(state.entity, 'walk')
      }

      const transform = Transform.getMutableOrNull(state.entity)
      if (!transform || !state.currentTarget) continue

      const dx = state.currentTarget.x - transform.position.x
      const dz = state.currentTarget.z - transform.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 0.15) {
        state.currentTarget = null
        state.pauseTimer = ANIMAL_PAUSE_MIN + Math.random() * (ANIMAL_PAUSE_MAX - ANIMAL_PAUSE_MIN)
        playRemoteAnim(state.entity, 'idle')
        continue
      }

      const step = Math.min(ANIMAL_WALK_SPEED * dt, dist)
      transform.position = Vector3.create(
        transform.position.x + (dx / dist) * step,
        transform.position.y,
        transform.position.z + (dz / dist) * step,
      )
      transform.rotation = Quaternion.fromEulerDegrees(0, Math.atan2(dx, dz) * (180 / Math.PI), 0)
    }
  }
}

function playRemoteAnim(entity: Entity, clip: 'idle' | 'walk' | 'eat'): void {
  if (!Animator.has(entity)) return
  const animator = Animator.getMutable(entity)
  for (const state of animator.states) {
    state.playing = state.clip === clip
    state.weight = state.clip === clip ? 1 : 0
  }
}

function randomWanderTarget(currentPos: Vector3, bounds: WanderBounds): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2
  const radius = (0.5 + Math.random() * 0.5) * 3.5
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, currentPos.x + Math.cos(angle) * radius)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, currentPos.z + Math.sin(angle) * radius)),
  }
}

function getSpawnMarkersAndBounds(slotId: number, prefix: string): { markers: Entity[]; bounds: WanderBounds | null } {
  const markers: Entity[] = []
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (let i = 1; i <= 20; i++) {
    const marker = getFarmEntity(slotId, `${prefix}_${i}`)
    if (!marker) break
    setVisible(marker, false)
    markers.push(marker)
    const pos = getEntityWorldPosition(marker)
    if (pos.x < minX) minX = pos.x
    if (pos.x > maxX) maxX = pos.x
    if (pos.z < minZ) minZ = pos.z
    if (pos.z > maxZ) maxZ = pos.z
  }

  if (markers.length === 0 || minX === Infinity) {
    return { markers, bounds: null }
  }

  return {
    markers,
    bounds: { minX, maxX, minZ, maxZ },
  }
}

function syncBeauty(slotId: number, beautySlots: number[]): void {
  const models = getOrCreateArray(remoteBeautyModels, slotId)

  for (let i = 0; i < 3; i++) {
    const spot = getFarmEntity(slotId, `BeautySpot_${i + 1}`)
    if (spot) setVisible(spot, false)

    const objectId = beautySlots[i] ?? 0
    const existing = models[i]
    if (existing && objectId === 0) {
      engine.removeEntity(existing)
      models[i] = 0 as unknown as Entity
      continue
    }

    const definition = BEAUTY_OBJECTS.get(objectId)
    if (!spot || !definition) continue

    // Use world position without parent so the ornament doesn't inherit
    // the BeautySpot entity's rotation (same approach as beautySpotSystem.ts).
    const worldPos = getEntityWorldPosition(spot)

    if (!existing) {
      const entity = engine.addEntity()
      Transform.create(entity, {
        position: Vector3.create(worldPos.x, 0, worldPos.z),
        rotation: Quaternion.Identity(),
      })
      GltfContainer.create(entity, { src: definition.modelPath })
      models[i] = entity
    } else {
      const t = Transform.getMutableOrNull(existing)
      if (t) {
        t.position = Vector3.create(worldPos.x, 0, worldPos.z)
        t.rotation = Quaternion.Identity()
      }
      GltfContainer.createOrReplace(existing, { src: definition.modelPath })
    }
  }
}

function getOrCreateEmptyBuilding(
  map: Map<number, Entity>,
  slotId: number,
  parentName: string,
): Entity {
  const existing = map.get(slotId)
  if (existing) return existing
  const parent = getFarmEntity(slotId, parentName)
  const entity = engine.addEntity()
  GltfContainer.create(entity, { src: ANIMAL_BUILDING_EMPTY })
  Transform.create(entity, {
    parent:   parent ?? undefined,
    position: Vector3.Zero(),
    scale:    Vector3.create(1, 1, 1),
  })
  map.set(slotId, entity)
  return entity
}

function syncBuildingVisuals(slotId: number, visual: FarmSlotVisual): void {
  // Chicken Coop — show real building or empty placeholder
  setVisible(getFarmEntity(slotId, 'ChickenCoopBuilding.glb'), visual.chickenCoopOwned)
  setVisible(getFarmEntity(slotId, 'ChickenWater.glb'), visual.chickenCoopOwned)
  setVisible(getFarmEntity(slotId, 'ChickenCoopDirt.glb'), visual.chickenCoopOwned && visual.chickenCoopDirtyAt > 0)
  const emptyCoopRemote = getOrCreateEmptyBuilding(remoteEmptyCoopEntities, slotId, 'ChickenCoop')
  setVisible(emptyCoopRemote, !visual.chickenCoopOwned)

  const chickenFood = getFarmEntity(slotId, 'ChickenFoodEmpty.glb')
  setVisible(chickenFood, visual.chickenCoopOwned)
  if (chickenFood && GltfContainer.has(chickenFood)) {
    GltfContainer.getMutable(chickenFood).src =
      visual.chickenFoodInBowl > 0 ? CHICKEN_FOOD_FULL : CHICKEN_FOOD_EMPTY
  }

  // Pig Pen — show real building or empty placeholder
  setVisible(getFarmEntity(slotId, 'PigPenBuilding.glb'), visual.pigPenOwned)
  setVisible(getFarmEntity(slotId, 'AnimalWater.glb'), visual.pigPenOwned)
  setVisible(getFarmEntity(slotId, 'PigPenDirt.glb'), visual.pigPenOwned && visual.pigPenDirtyAt > 0)
  const emptyPenRemote = getOrCreateEmptyBuilding(remoteEmptyPenEntities, slotId, 'PigPen')
  setVisible(emptyPenRemote, !visual.pigPenOwned)

  const pigFood = getFarmEntity(slotId, 'AnimalFoodEmpty.glb')
  setVisible(pigFood, visual.pigPenOwned)
  if (pigFood && GltfContainer.has(pigFood)) {
    GltfContainer.getMutable(pigFood).src =
      visual.pigFoodInBowl > 0 ? ANIMAL_FOOD_FULL : ANIMAL_FOOD_EMPTY
  }

  setVisible(getFarmEntity(slotId, 'CompostBin.glb'), visual.compostBinUnlocked)
}

function syncAmbientAnimals(
  slotId: number,
  markers: Entity[],
  bounds: WanderBounds | null,
  targetCount: number,
  src: string,
  entitiesMap: Map<number, Entity[]>,
  statesMap: Map<number, RemoteAnimalState[]>,
  scaleResolver: (index: number) => number,
): void {
  const entities = getOrCreateArray(entitiesMap, slotId)
  const states = getOrCreateStateArray(statesMap, slotId)

  while (entities.length > targetCount) {
    const entity = entities.pop()
    states.pop()
    if (entity) engine.removeEntity(entity)
  }

  if (!bounds || markers.length === 0) return

  for (let index = 0; index < targetCount; index++) {
    const marker = markers[index % markers.length]
    const markerPos = getEntityWorldPosition(marker)
    const jitterX = ((index % 3) - 1) * 0.35
    const jitterZ = (Math.floor(index / 3) % 2) * 0.35
    const scale = scaleResolver(index)

    let entity = entities[index]
    let state = states[index]

    if (!entity || !state) {
      entity = engine.addEntity()
      entities[index] = entity
      GltfContainer.create(entity, { src })
      Transform.create(entity, {
        position: Vector3.create(markerPos.x + jitterX, markerPos.y, markerPos.z + jitterZ),
        rotation: Quaternion.fromEulerDegrees(0, (index * 57) % 360, 0),
        scale: Vector3.create(scale, scale, scale),
      })
      Animator.create(entity, {
        states: [
          { clip: 'idle', playing: true, weight: 1, loop: true },
          { clip: 'walk', playing: false, weight: 0, loop: true },
          { clip: 'eat', playing: false, weight: 0, loop: true },
        ],
      })
      state = {
        entity,
        bounds,
        pauseTimer: Math.random() * 1.0,
        currentTarget: null,
      }
      states[index] = state
    } else {
      GltfContainer.createOrReplace(entity, { src })
      const transform = Transform.getMutable(entity)
      if (!state.currentTarget) {
        transform.position = Vector3.create(markerPos.x + jitterX, markerPos.y, markerPos.z + jitterZ)
      }
      transform.scale = Vector3.create(scale, scale, scale)
      state.bounds = bounds
    }
  }
}

// Called immediately when another player's slot is revealed, before their
// farmSlotVisualUpdated arrives. Hides all buildings so nothing shows incorrectly
// in the window between slot reveal and the first visual update message.
export function hideRemoteSlotBuildings(slotId: number): void {
  const names = [
    'ChickenCoopBuilding.glb', 'ChickenWater.glb', 'ChickenCoopDirt.glb',
    'ChickenFoodEmpty.glb', 'PigPenBuilding.glb', 'AnimalWater.glb',
    'PigPenDirt.glb', 'AnimalFoodEmpty.glb', 'CompostBin.glb',
  ]
  for (const name of names) setVisible(getFarmEntity(slotId, name), false)
  for (let i = 1; i <= 20; i++) {
    setVisible(getFarmEntity(slotId, `ChickenSpawn_${i}`), false)
    setVisible(getFarmEntity(slotId, `PigSpawn_${i}`), false)
  }
}

// Remove all dynamically created entities for a farm slot (called on disconnect).
// hideFarmSlot only zeroes the clone scale; standalone entities must be removed here.
export function clearRemoteFarmSlot(slotId: number): void {
  // Beauty ornaments
  const beautyModels = remoteBeautyModels.get(slotId)
  if (beautyModels) {
    for (const entity of beautyModels) {
      if (entity) engine.removeEntity(entity)
    }
    remoteBeautyModels.delete(slotId)
  }

  // Chickens
  const chickens = remoteChickenEntities.get(slotId)
  if (chickens) {
    for (const entity of chickens) {
      if (entity) engine.removeEntity(entity)
    }
    remoteChickenEntities.delete(slotId)
    remoteChickenStates.delete(slotId)
  }

  // Pigs
  const pigs = remotePigEntities.get(slotId)
  if (pigs) {
    for (const entity of pigs) {
      if (entity) engine.removeEntity(entity)
    }
    remotePigEntities.delete(slotId)
    remotePigStates.delete(slotId)
  }

  // Empty building placeholders
  const emptyCoop = remoteEmptyCoopEntities.get(slotId)
  if (emptyCoop) { engine.removeEntity(emptyCoop); remoteEmptyCoopEntities.delete(slotId) }
  const emptyPen = remoteEmptyPenEntities.get(slotId)
  if (emptyPen) { engine.removeEntity(emptyPen); remoteEmptyPenEntities.delete(slotId) }

  console.log(`[RemoteFarmVisuals] Cleared all dynamic entities for slot ${slotId}`)
}

export function renderRemoteFarmVisual(slotId: number, visual: FarmSlotVisual): void {
  ensureRemoteAnimalSystem()
  syncBeauty(slotId, visual.beautySlots)
  syncBuildingVisuals(slotId, visual)

  const chickenArea = getSpawnMarkersAndBounds(slotId, 'ChickenSpawn')
  const pigArea = getSpawnMarkersAndBounds(slotId, 'PigSpawn')

  syncAmbientAnimals(
    slotId,
    chickenArea.markers,
    chickenArea.bounds,
    visual.chickens.length,
    CHICKEN_MODEL,
    remoteChickenEntities,
    remoteChickenStates,
    () => ANIMAL_SCALE_CHICKEN,
  )

  syncAmbientAnimals(
    slotId,
    pigArea.markers,
    pigArea.bounds,
    visual.pigs.length,
    PIG_MODEL,
    remotePigEntities,
    remotePigStates,
    (index) => getPigletScale(visual.pigs[index] as any, Date.now()),
  )
}
