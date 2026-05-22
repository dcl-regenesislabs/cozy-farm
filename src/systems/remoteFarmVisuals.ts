import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  VisibilityComponent,
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { BEAUTY_OBJECTS } from '../data/beautyObjectData'
import {
  ANIMAL_BUILDING_EMPTY,
  ANIMAL_FOOD_EMPTY,
  ANIMAL_FOOD_FULL,
  ANIMAL_SCALE_CHICKEN,
  CHICKEN_FOOD_EMPTY,
  CHICKEN_FOOD_FULL,
  CHICKEN_MODEL,
  PIG_MODEL,
  getPigletScale,
} from '../data/animalData'
import { getFarmEntity, getEntityWorldPosition } from './farmInstances'
import type { FarmSlotVisual } from '../shared/farmMessages'

const remoteBeautyModels = new Map<number, Entity[]>()
const remoteChickenEntities = new Map<number, Entity[]>()
const remotePigEntities = new Map<number, Entity[]>()
// Placeholder buildings shown when the remote player hasn't bought the coop/pen yet
const remoteEmptyCoopEntities = new Map<number, Entity>()
const remoteEmptyPenEntities  = new Map<number, Entity>()

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

function syncStaticAnimals(
  slotId: number,
  markers: (Entity | null)[],
  targetCount: number,
  src: string,
  entitiesMap: Map<number, Entity[]>,
  scaleResolver: (index: number) => number,
): void {
  const entities = getOrCreateArray(entitiesMap, slotId)

  while (entities.length > targetCount) {
    const entity = entities.pop()
    if (entity) engine.removeEntity(entity)
  }

  for (let index = 0; index < targetCount; index++) {
    const marker = markers[index % Math.max(1, markers.length)]
    if (!marker) continue

    const jitterX = ((index % 3) - 1) * 0.35
    const jitterZ = (Math.floor(index / 3) % 2) * 0.35
    const scale = scaleResolver(index)

    let entity = entities[index]
    if (!entity) {
      entity = engine.addEntity()
      entities[index] = entity
      GltfContainer.create(entity, { src })
      Transform.create(entity, {
        parent: marker,
        position: Vector3.create(jitterX, 0, jitterZ),
        rotation: Quaternion.fromEulerDegrees(0, (index * 57) % 360, 0),
        scale: Vector3.create(scale, scale, scale),
      })
    } else {
      GltfContainer.createOrReplace(entity, { src })
      const transform = Transform.getMutable(entity)
      transform.parent = marker
      transform.position = Vector3.create(jitterX, 0, jitterZ)
      transform.scale = Vector3.create(scale, scale, scale)
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
}

export function renderRemoteFarmVisual(slotId: number, visual: FarmSlotVisual): void {
  syncBeauty(slotId, visual.beautySlots)
  syncBuildingVisuals(slotId, visual)

  const chickenMarkers = [1, 2, 3, 4].map((index) => getFarmEntity(slotId, `ChickenSpawn_${index}`))
  const pigMarkers = [1, 2, 3, 4].map((index) => getFarmEntity(slotId, `PigSpawn_${index}`))

  syncStaticAnimals(
    slotId,
    chickenMarkers,
    visual.chickens.length,
    CHICKEN_MODEL,
    remoteChickenEntities,
    () => ANIMAL_SCALE_CHICKEN,
  )

  syncStaticAnimals(
    slotId,
    pigMarkers,
    visual.pigs.length,
    PIG_MODEL,
    remotePigEntities,
    (index) => getPigletScale(visual.pigs[index] as any, Date.now()),
  )
}
