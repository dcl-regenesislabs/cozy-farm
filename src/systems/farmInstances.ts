import {
  engine,
  Entity,
  Name,
  Transform,
  GltfContainer,
  Material,
  MeshCollider,
  MeshRenderer,
  Billboard,
  TextShape,
  VisibilityComponent,
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'

const FARM_PARENT_NAME = 'FarmParent'
const FARM_ANCHOR_NAMES = [
  'position_farm_1',
  'position_farm_2',
  'position_farm_3',
  'position_farm_4',
  'position_farm_5',
  'position_farm_6',
  'position_farm_7',
  'position_farm_8',
] as const

export const MAX_FARM_SLOTS = FARM_ANCHOR_NAMES.length

export type FarmInstance = {
  slotId: number
  root: Entity
  namedEntities: Map<string, Entity>
  soilEntities: Entity[]
  anchor: { x: number; y: number; z: number }
  originalScale: { x: number; y: number; z: number }
}

const farmInstances: FarmInstance[] = []
const farmSlotSoilsStore: Entity[][] = Array.from({ length: MAX_FARM_SLOTS }, () => [])
const farmSpawnPositionsStore: { x: number; y: number; z: number }[] = Array.from(
  { length: MAX_FARM_SLOTS },
  () => ({ x: 8, y: 1, z: 8 }),
)

let initialized = false
let currentFarmSlotId = 0
let baseAnchor = { x: 0, y: 0, z: 0 }

function getEntityWorldPosition(entity: Entity): { x: number; y: number; z: number } {
  let x = 0
  let y = 0
  let z = 0
  let current: Entity | null = entity

  for (let depth = 0; depth < 24 && current; depth++) {
    const transform = Transform.getOrNull(current)
    if (!transform) break
    x += transform.position.x
    y += transform.position.y
    z += transform.position.z
    current = (transform.parent as Entity | undefined) ?? null
  }

  return { x, y, z }
}

function cloneIfPresent(component: any, source: Entity, target: Entity): void {
  const value = component.getOrNull?.(source)
  if (!value) return
  if (typeof component.createOrReplace === 'function') component.createOrReplace(target, value)
  else if (typeof component.create === 'function') component.create(target, value)
}

function getSoilSortIndex(name: string): number {
  if (name === 'Soil01.glb') return 0
  const match = name.match(/^Soil01\.glb_(\d+)$/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Math.max(0, parseInt(match[1], 10) - 1)
}

function buildChildrenMap(): Map<number, Entity[]> {
  const childrenOf = new Map<number, Entity[]>()
  for (const [entity] of engine.getEntitiesWith(Transform)) {
    const transform = Transform.get(entity)
    const parent = transform.parent as number | undefined
    if (!parent) continue
    const children = childrenOf.get(parent) ?? []
    children.push(entity)
    childrenOf.set(parent, children)
  }
  return childrenOf
}

function registerNamedEntity(map: Map<string, Entity>, entity: Entity): void {
  const name = Name.getOrNull(entity)?.value
  if (!name) return
  map.set(name, entity)
}

function collectSoils(namedEntities: Map<string, Entity>): Entity[] {
  return [...namedEntities.entries()]
    .filter(([name]) => name === 'Soil01.glb' || /^Soil01\.glb_\d+$/.test(name))
    .sort((a, b) => getSoilSortIndex(a[0]) - getSoilSortIndex(b[0]))
    .map(([, entity]) => entity)
}

function collectTemplateEntities(root: Entity, childrenOf: Map<number, Entity[]>): Map<string, Entity> {
  const namedEntities = new Map<string, Entity>()
  const queue: Entity[] = [root]

  while (queue.length > 0) {
    const current = queue.shift()!
    registerNamedEntity(namedEntities, current)
    const children = childrenOf.get(current as unknown as number) ?? []
    queue.push(...children)
  }

  return namedEntities
}

function cloneEntityTree(
  source: Entity,
  cloneParent: Entity | null,
  namedEntities: Map<string, Entity>,
  childrenOf: Map<number, Entity[]>,
): Entity {
  const clone = engine.addEntity()
  const sourceTransform = Transform.getOrNull(source)
  const sourceName = Name.getOrNull(source)?.value

  if (sourceTransform) {
    Transform.create(clone, {
      parent: cloneParent ?? undefined,
      position: Vector3.create(sourceTransform.position.x, sourceTransform.position.y, sourceTransform.position.z),
      rotation: Quaternion.create(
        sourceTransform.rotation.x,
        sourceTransform.rotation.y,
        sourceTransform.rotation.z,
        sourceTransform.rotation.w,
      ),
      scale: Vector3.create(sourceTransform.scale.x, sourceTransform.scale.y, sourceTransform.scale.z),
    })
  }

  if (sourceName) Name.createOrReplace(clone, { value: sourceName })
  cloneIfPresent(GltfContainer, source, clone)
  cloneIfPresent(Material, source, clone)
  cloneIfPresent(MeshCollider, source, clone)
  cloneIfPresent(MeshRenderer, source, clone)
  cloneIfPresent(Billboard, source, clone)
  cloneIfPresent(TextShape, source, clone)
  cloneIfPresent(VisibilityComponent, source, clone)

  if (sourceName) namedEntities.set(sourceName, clone)

  const children = childrenOf.get(source as unknown as number) ?? []
  for (const child of children) {
    cloneEntityTree(child, clone, namedEntities, childrenOf)
  }

  return clone
}

function resolveAnchor(slotId: number): { x: number; y: number; z: number } {
  const anchorEntity = engine.getEntityOrNullByName(FARM_ANCHOR_NAMES[slotId])
  if (!anchorEntity) {
    const fallback = slotId === 0
      ? { x: 0, y: 0, z: 0 }
      : { x: baseAnchor.x + slotId * 32, y: baseAnchor.y, z: baseAnchor.z }
    console.error(`[FarmInstances] Anchor '${FARM_ANCHOR_NAMES[slotId]}' not found, using fallback`)
    return fallback
  }
  return getEntityWorldPosition(anchorEntity)
}

function buildSpawnPositions(): void {
  const baseSpawn = { x: 8, y: 1, z: 8 }
  const offset = {
    x: baseSpawn.x - baseAnchor.x,
    y: baseSpawn.y - baseAnchor.y,
    z: baseSpawn.z - baseAnchor.z,
  }

  for (let slotId = 0; slotId < MAX_FARM_SLOTS; slotId++) {
    const anchor = farmInstances[slotId]?.anchor ?? resolveAnchor(slotId)
    farmSpawnPositionsStore[slotId] = {
      x: anchor.x + offset.x,
      y: anchor.y + offset.y,
      z: anchor.z + offset.z,
    }
  }
}

export function initFarmInstances(): void {
  if (initialized) return

  const root = engine.getEntityOrNullByName(FARM_PARENT_NAME)
  if (!root) {
    throw new Error(`[FarmInstances] '${FARM_PARENT_NAME}' not found in scene`)
  }

  const childrenOf = buildChildrenMap()
  const rootTransform = Transform.get(root)
  baseAnchor = resolveAnchor(0)

  const slot0NamedEntities = collectTemplateEntities(root, childrenOf)
  const slot0: FarmInstance = {
    slotId: 0,
    root,
    namedEntities: slot0NamedEntities,
    soilEntities: collectSoils(slot0NamedEntities),
    anchor: baseAnchor,
    originalScale: {
      x: rootTransform.scale.x,
      y: rootTransform.scale.y,
      z: rootTransform.scale.z,
    },
  }

  farmInstances[0] = slot0
  farmSlotSoilsStore[0] = slot0.soilEntities

  for (let slotId = 1; slotId < MAX_FARM_SLOTS; slotId++) {
    const anchor = resolveAnchor(slotId)
    const offset = {
      x: anchor.x - baseAnchor.x,
      y: anchor.y - baseAnchor.y,
      z: anchor.z - baseAnchor.z,
    }

    const namedEntities = new Map<string, Entity>()
    const clonedRoot = cloneEntityTree(root, null, namedEntities, childrenOf)
    const clonedRootTransform = Transform.getMutable(clonedRoot)
    clonedRootTransform.position = Vector3.create(
      rootTransform.position.x + offset.x,
      rootTransform.position.y + offset.y,
      rootTransform.position.z + offset.z,
    )
    clonedRootTransform.rotation = Quaternion.create(
      rootTransform.rotation.x,
      rootTransform.rotation.y,
      rootTransform.rotation.z,
      rootTransform.rotation.w,
    )
    clonedRootTransform.scale = Vector3.Zero()

    const instance: FarmInstance = {
      slotId,
      root: clonedRoot,
      namedEntities,
      soilEntities: collectSoils(namedEntities),
      anchor,
      originalScale: {
        x: rootTransform.scale.x,
        y: rootTransform.scale.y,
        z: rootTransform.scale.z,
      },
    }

    farmInstances[slotId] = instance
    farmSlotSoilsStore[slotId] = instance.soilEntities
  }

  buildSpawnPositions()
  initialized = true
  console.log(`[FarmInstances] Initialized ${farmInstances.length} farm instances from template '${FARM_PARENT_NAME}'`)
}

export function getFarmInstance(slotId: number): FarmInstance | null {
  return farmInstances[slotId] ?? null
}

export function getFarmInstances(): FarmInstance[] {
  return farmInstances
}

export function getFarmEntity(slotId: number, name: string): Entity | null {
  return farmInstances[slotId]?.namedEntities.get(name) ?? null
}

export function getCurrentFarmEntity(name: string): Entity | null {
  return getFarmEntity(currentFarmSlotId, name)
}

export function getFarmSlotSoils(): Entity[][] {
  return farmSlotSoilsStore
}

export function getFarmSpawnPositions(): { x: number; y: number; z: number }[] {
  return farmSpawnPositionsStore
}

export function getFarmAnchor(slotId: number): { x: number; y: number; z: number } | null {
  return farmInstances[slotId]?.anchor ?? null
}

export function getFarmOffset(slotId: number): { x: number; y: number; z: number } {
  const anchor = farmInstances[slotId]?.anchor ?? baseAnchor
  return {
    x: anchor.x - baseAnchor.x,
    y: anchor.y - baseAnchor.y,
    z: anchor.z - baseAnchor.z,
  }
}

export function getCurrentFarmOffset(): { x: number; y: number; z: number } {
  return getFarmOffset(currentFarmSlotId)
}

export function setCurrentFarmSlot(slotId: number): void {
  currentFarmSlotId = Math.max(0, Math.min(MAX_FARM_SLOTS - 1, slotId))
}

export function getCurrentFarmSlotId(): number {
  return currentFarmSlotId
}

export function hideFarmInstance(slotId: number): void {
  const instance = farmInstances[slotId]
  if (!instance) return
  const transform = Transform.getMutableOrNull(instance.root)
  if (!transform) return
  transform.scale = Vector3.Zero()
}

export function revealFarmInstance(slotId: number): void {
  const instance = farmInstances[slotId]
  if (!instance) return
  const transform = Transform.getMutableOrNull(instance.root)
  if (!transform) return
  transform.scale = Vector3.create(
    instance.originalScale.x,
    instance.originalScale.y,
    instance.originalScale.z,
  )
}
