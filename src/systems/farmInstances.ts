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

// Tracks slots whose anchor entity wasn't found at init time (Creator Hub timing issue).
// A retry ECS system resolves them on the next tick and repositions the affected clones.
const missingAnchorSlots = new Set<number>()

export function getEntityWorldPosition(entity: Entity): { x: number; y: number; z: number } {
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
  const copy = { ...value }
  if (typeof component.createOrReplace === 'function') component.createOrReplace(target, copy)
  else if (typeof component.create === 'function') component.create(target, copy)
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
    missingAnchorSlots.add(slotId)
    const fallback = slotId === 0
      ? { x: 0, y: 0, z: 0 }
      : { x: baseAnchor.x + slotId * 32, y: baseAnchor.y, z: baseAnchor.z }
    console.error(`[FarmInstances] Anchor '${FARM_ANCHOR_NAMES[slotId]}' not found, using fallback — will retry next tick`)
    return fallback
  }
  return getEntityWorldPosition(anchorEntity)
}

function buildSpawnPositions(): void {
  const baseSpawn = { x: 8, y: 1, z: 8 }
  // Always do a fresh entity lookup so a deferred retry picks up corrected positions.
  const baseAnchorEntity = engine.getEntityOrNullByName(FARM_ANCHOR_NAMES[0])
  const freshBase = baseAnchorEntity ? getEntityWorldPosition(baseAnchorEntity) : baseAnchor
  const offset = {
    x: baseSpawn.x - freshBase.x,
    y: baseSpawn.y - freshBase.y,
    z: baseSpawn.z - freshBase.z,
  }

  for (let slotId = 0; slotId < MAX_FARM_SLOTS; slotId++) {
    const anchorEntity = engine.getEntityOrNullByName(FARM_ANCHOR_NAMES[slotId])
    const anchor = anchorEntity
      ? getEntityWorldPosition(anchorEntity)
      : (farmInstances[slotId]?.anchor ?? { x: freshBase.x + slotId * 32, y: freshBase.y, z: freshBase.z })
    farmSpawnPositionsStore[slotId] = {
      x: anchor.x + offset.x,
      y: anchor.y + offset.y,
      z: anchor.z + offset.z,
    }
  }
}

// Resolves any anchors that were missing at init time, repositions the affected farm
// clones, and rebuilds spawn positions. Runs as a short-lived ECS system in Creator Hub.
function retryMissingAnchors(): void {
  if (missingAnchorSlots.size === 0) return

  // Fix baseAnchor first — slot 0 must be correct before computing offsets for others.
  if (missingAnchorSlots.has(0)) {
    const e = engine.getEntityOrNullByName(FARM_ANCHOR_NAMES[0])
    if (e) {
      baseAnchor = getEntityWorldPosition(e)
      if (farmInstances[0]) farmInstances[0].anchor = baseAnchor
      missingAnchorSlots.delete(0)
      console.log(`[FarmInstances] Resolved 'position_farm_1' on retry`)
    }
  }

  const rootTransform = Transform.getOrNull(farmInstances[0]?.root)
  const rootPos = rootTransform?.position ?? { x: 0, y: 0, z: 0 }

  for (const slotId of [...missingAnchorSlots]) {
    const e = engine.getEntityOrNullByName(FARM_ANCHOR_NAMES[slotId])
    if (!e) continue

    const anchor = getEntityWorldPosition(e)
    const dx = anchor.x - baseAnchor.x
    const dy = anchor.y - baseAnchor.y
    const dz = anchor.z - baseAnchor.z

    const instance = farmInstances[slotId]
    if (!instance) { missingAnchorSlots.delete(slotId); continue }

    const t = Transform.getMutableOrNull(instance.root)
    if (t) {
      t.position = Vector3.create(rootPos.x + dx, rootPos.y + dy, rootPos.z + dz)
    }
    instance.anchor = anchor
    missingAnchorSlots.delete(slotId)
    console.log(
      `[FarmInstances] Resolved '${FARM_ANCHOR_NAMES[slotId]}' on retry — slot ${slotId} repositioned to ` +
      `(${(rootPos.x + dx).toFixed(1)}, ${(rootPos.y + dy).toFixed(1)}, ${(rootPos.z + dz).toFixed(1)})`,
    )
  }

  buildSpawnPositions()
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

  // If any anchor entities weren't found (Creator Hub loads composites lazily),
  // retry on subsequent ECS ticks so farm clones land at correct world positions.
  if (missingAnchorSlots.size > 0) {
    let attempts = 0
    engine.addSystem(
      function anchorRetry(_dt: number) {
        attempts++
        retryMissingAnchors()
        if (missingAnchorSlots.size === 0 || attempts >= 10) {
          engine.removeSystem(anchorRetry)
          if (missingAnchorSlots.size > 0) {
            const names = [...missingAnchorSlots].map((id) => FARM_ANCHOR_NAMES[id]).join(', ')
            console.error(`[FarmInstances] Could not resolve anchors after retries: ${names}`)
          }
        }
      },
      0,
      'farmAnchorRetry',
    )
  }
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
