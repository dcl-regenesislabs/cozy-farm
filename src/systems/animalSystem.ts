import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  Animator,
  ColliderLayer,
  VisibilityComponent,
  pointerEventsSystem,
  InputAction,
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import type { ChickenData, PigData } from '../game/gameState'
import { animalTutorialCallbacks } from '../game/animalTutorialState'
import { addXp } from './levelingSystem'
import { playSound } from './sfxSystem'
import { spawnOrganicWasteVfx } from './harvestVfxSystem'
import {
  CHICKEN_MODEL, PIG_MODEL,
  ANIMAL_BUILDING_EMPTY,
  CHICKEN_FOOD_EMPTY, CHICKEN_FOOD_FULL,
  ANIMAL_FOOD_EMPTY, ANIMAL_FOOD_FULL,
  ANIMAL_WALK_SPEED, ANIMAL_PAUSE_MIN, ANIMAL_PAUSE_MAX,
  ANIMAL_SCALE_CHICKEN,
  CHICKEN_COOP_CENTRE, PIG_PEN_CENTRE,
  CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL,
  BUILDING_BUY_PRICE, ANIMAL_BUY_PRICE,
  EGG_CYCLE_MS, PIG_CYCLE_MS, EGG_YIELD_MIN, EGG_YIELD_MAX,
  MAX_ANIMALS_PER_BUILDING,
  CLEAN_ORGANIC_WASTE_PER_ANIMAL, getDirtIntervalMs,
  PIG_BREED_COOLDOWN, ADOLESCENT_STAGE_MS,
  getPigStage, getPigletScale, PIG_MEAT_SELL_PRICE,
} from '../data/animalData'

// ---------------------------------------------------------------------------
// Wander state
// ---------------------------------------------------------------------------

type WanderBounds = { minX: number; maxX: number; minZ: number; maxZ: number }

type AnimalWanderer = {
  id:            string
  entity:        Entity
  bounds:        WanderBounds
  pauseTimer:    number     // counts down; when <= 0, pick next target and walk
  currentTarget: Vector3 | null
}

// Wander constants (animals are slower / calmer than dog)
const WANDER_MAX_STEP = 3.5
const ARRIVE_DIST     = 0.15

// ---------------------------------------------------------------------------
// Scene entity refs (resolved once in initAnimalBuildings)
// ---------------------------------------------------------------------------

let coopBuilding: Entity | null = null
let coopDirt:     Entity | null = null
let coopFood:     Entity | null = null
let coopWater:    Entity | null = null
let penBuilding:  Entity | null = null
let penDirt:      Entity | null = null
let penFood:      Entity | null = null
let penWater:     Entity | null = null

let emptyCoopEntity: Entity | null = null
let emptyPenEntity:  Entity | null = null

// ---------------------------------------------------------------------------
// Resolved positions
// ---------------------------------------------------------------------------

let resolvedCoopPos:    { x: number; y: number; z: number } = CHICKEN_COOP_CENTRE
let resolvedPenPos:     { x: number; y: number; z: number } = PIG_PEN_CENTRE
let coopFoodWorldPos:   Vector3 = Vector3.create(CHICKEN_COOP_CENTRE.x - 1.04, 0, CHICKEN_COOP_CENTRE.z + 0.45)
let penFoodWorldPos:    Vector3 = Vector3.create(PIG_PEN_CENTRE.x + 4.35,   0, PIG_PEN_CENTRE.z - 0.61)
let chickenBounds:      WanderBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }
let pigBounds:          WanderBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wanderers = new Map<string, AnimalWanderer>()
let systemRegistered = false
let uidCounter = Date.now()

function newId(): string { return `a${(uidCounter++).toString(36)}` }

// ---------------------------------------------------------------------------
// Visibility helper
// ---------------------------------------------------------------------------

function setVisible(entity: Entity | null, visible: boolean): void {
  if (!entity) return
  if (VisibilityComponent.has(entity)) {
    VisibilityComponent.getMutable(entity).visible = visible
  } else {
    VisibilityComponent.create(entity, { visible })
  }
}

function enablePointer(entity: Entity): void {
  const gltf = GltfContainer.getMutableOrNull(entity)
  if (!gltf) return
  gltf.visibleMeshesCollisionMask =
    (gltf.visibleMeshesCollisionMask ?? 0) | ColliderLayer.CL_POINTER
  gltf.invisibleMeshesCollisionMask =
    (gltf.invisibleMeshesCollisionMask ?? 0) | ColliderLayer.CL_POINTER
}

// ---------------------------------------------------------------------------
// Visual state — call after any state change affecting buildings
// ---------------------------------------------------------------------------

export function updateBuildingVisuals(): void {
  const now = Date.now()

  // Chicken Coop
  if (playerState.chickenCoopOwned) {
    setVisible(emptyCoopEntity, false)
    setVisible(coopBuilding, true)
    setVisible(coopWater, true)
    setVisible(coopDirt, playerState.chickenCoopDirtyAt > 0)
    if (coopFood) {
      setVisible(coopFood, true)
      GltfContainer.getMutable(coopFood).src =
        playerState.chickenFoodInBowl > 0 ? CHICKEN_FOOD_FULL : CHICKEN_FOOD_EMPTY
    }
  } else {
    setVisible(emptyCoopEntity, true)
    setVisible(coopBuilding, false)
    setVisible(coopWater, false)
    setVisible(coopDirt, false)
    setVisible(coopFood, false)
  }

  // Pig Pen
  if (playerState.pigPenOwned) {
    setVisible(emptyPenEntity, false)
    setVisible(penBuilding, true)
    setVisible(penWater, true)
    setVisible(penDirt, playerState.pigPenDirtyAt > 0)
    if (penFood) {
      setVisible(penFood, true)
      GltfContainer.getMutable(penFood).src =
        playerState.pigFoodInBowl > 0 ? ANIMAL_FOOD_FULL : ANIMAL_FOOD_EMPTY
    }
  } else {
    setVisible(emptyPenEntity, true)
    setVisible(penBuilding, false)
    setVisible(penWater, false)
    setVisible(penDirt, false)
    setVisible(penFood, false)
  }

  // Pig wanderer scales (update live for growth stages)
  for (const pig of playerState.pigs) {
    const w = wanderers.get(pig.id)
    if (!w) continue
    const scale = getPigletScale(pig, now)
    const t = Transform.getMutableOrNull(w.entity)
    if (t) t.scale = Vector3.create(scale, scale, scale)
  }
}

// ---------------------------------------------------------------------------
// Building entity wiring — call once after scene entities are available
// ---------------------------------------------------------------------------

export function initAnimalBuildings(): void {
  // Resolve child entities by name
  coopBuilding = engine.getEntityOrNullByName('ChickenCoopBuilding.glb')
  coopDirt     = engine.getEntityOrNullByName('ChickenCoopDirt.glb')
  coopFood     = engine.getEntityOrNullByName('ChickenFoodEmpty.glb')
  coopWater    = engine.getEntityOrNullByName('ChickenWater.glb')
  penBuilding  = engine.getEntityOrNullByName('PigPenBuilding.glb')
  penDirt      = engine.getEntityOrNullByName('PigPenDirt.glb')
  penFood      = engine.getEntityOrNullByName('AnimalFoodEmpty.glb')
  penWater     = engine.getEntityOrNullByName('AnimalWater.glb')

  // Get real world positions from the parent scene entities
  const coopParent = engine.getEntityOrNullByName('ChickenCoop')
  const penParent  = engine.getEntityOrNullByName('PigPen')
  const coopTf = coopParent ? Transform.getOrNull(coopParent) : null
  if (coopTf) resolvedCoopPos = { x: coopTf.position.x, y: coopTf.position.y, z: coopTf.position.z }
  const penTf = penParent ? Transform.getOrNull(penParent) : null
  if (penTf) resolvedPenPos = { x: penTf.position.x, y: penTf.position.y, z: penTf.position.z }

  // Collect ChickenSpawn_N → derive wander bounding box
  {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 1; i <= 20; i++) {
      const e = engine.getEntityOrNullByName(`ChickenSpawn_${i}`)
      if (!e) break
      setVisible(e, false)
      const tf = Transform.getOrNull(e)
      if (!tf) continue
      const wx = resolvedCoopPos.x + tf.position.x
      const wz = resolvedCoopPos.z + tf.position.z
      if (wx < minX) minX = wx; if (wx > maxX) maxX = wx
      if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz
    }
    if (minX !== Infinity) chickenBounds = { minX, maxX, minZ, maxZ }
  }

  // Collect PigSpawn_N → derive wander bounding box
  {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 1; i <= 20; i++) {
      const e = engine.getEntityOrNullByName(`PigSpawn_${i}`)
      if (!e) break
      setVisible(e, false)
      const tf = Transform.getOrNull(e)
      if (!tf) continue
      const wx = resolvedPenPos.x + tf.position.x
      const wz = resolvedPenPos.z + tf.position.z
      if (wx < minX) minX = wx; if (wx > maxX) maxX = wx
      if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz
    }
    if (minX !== Infinity) pigBounds = { minX, maxX, minZ, maxZ }
  }

  // Food bowl world positions (local tf + parent world pos)
  if (coopFood) {
    const tf = Transform.getOrNull(coopFood)
    if (tf) coopFoodWorldPos = Vector3.create(resolvedCoopPos.x + tf.position.x, 0, resolvedCoopPos.z + tf.position.z)
  }
  if (penFood) {
    const tf = Transform.getOrNull(penFood)
    if (tf) penFoodWorldPos = Vector3.create(resolvedPenPos.x + tf.position.x, 0, resolvedPenPos.z + tf.position.z)
  }

  console.log(`[AnimalSystem] Chicken bounds: ${JSON.stringify(chickenBounds)}`)
  console.log(`[AnimalSystem] Pig bounds: ${JSON.stringify(pigBounds)}`)
  const coopPos    = (coopParent ? Transform.getOrNull(coopParent)?.position : null) ?? Vector3.create(CHICKEN_COOP_CENTRE.x, CHICKEN_COOP_CENTRE.y, CHICKEN_COOP_CENTRE.z)
  const penPos     = (penParent  ? Transform.getOrNull(penParent)?.position  : null) ?? Vector3.create(PIG_PEN_CENTRE.x, PIG_PEN_CENTRE.y, PIG_PEN_CENTRE.z)

  // Spawn AnimalBuildingEmpty placeholder for coop spot
  emptyCoopEntity = engine.addEntity()
  GltfContainer.create(emptyCoopEntity, { src: ANIMAL_BUILDING_EMPTY })
  Transform.create(emptyCoopEntity, { position: coopPos, scale: Vector3.create(1, 1, 1) })
  enablePointer(emptyCoopEntity)
  pointerEventsSystem.onPointerDown(
    { entity: emptyCoopEntity, opts: { button: InputAction.IA_POINTER, hoverText: playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL ? `Build Chicken Coop (${BUILDING_BUY_PRICE} coins)` : `Requires Level ${CHICKEN_COOP_UNLOCK_LEVEL}`, maxDistance: 8 } },
    () => {
      if (playerState.level < CHICKEN_COOP_UNLOCK_LEVEL) return
      playerState.activeMenu = 'chickenCoop'
    },
  )

  // Spawn AnimalBuildingEmpty placeholder for pen spot
  emptyPenEntity = engine.addEntity()
  GltfContainer.create(emptyPenEntity, { src: ANIMAL_BUILDING_EMPTY })
  Transform.create(emptyPenEntity, { position: penPos, scale: Vector3.create(1, 1, 1) })
  enablePointer(emptyPenEntity)
  pointerEventsSystem.onPointerDown(
    { entity: emptyPenEntity, opts: { button: InputAction.IA_POINTER, hoverText: playerState.level >= PIG_PEN_UNLOCK_LEVEL ? `Build Pig Pen (${BUILDING_BUY_PRICE} coins)` : `Requires Level ${PIG_PEN_UNLOCK_LEVEL}`, maxDistance: 8 } },
    () => {
      if (playerState.level < PIG_PEN_UNLOCK_LEVEL) return
      playerState.activeMenu = 'pigPen'
    },
  )

  // Wire coop building click → open chicken coop panel
  if (coopBuilding) {
    enablePointer(coopBuilding)
    pointerEventsSystem.onPointerDown(
      { entity: coopBuilding, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Chicken Coop', maxDistance: 8 } },
      () => { playerState.activeMenu = 'chickenCoop' },
    )
  }

  // Wire pig pen building click → open pig pen panel
  if (penBuilding) {
    enablePointer(penBuilding)
    pointerEventsSystem.onPointerDown(
      { entity: penBuilding, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Pig Pen', maxDistance: 8 } },
      () => { playerState.activeMenu = 'pigPen' },
    )
  }

  // Wire food bowl clicks → open feed bowl UI
  if (coopFood) {
    enablePointer(coopFood)
    pointerEventsSystem.onPointerDown(
      { entity: coopFood, opts: { button: InputAction.IA_POINTER, hoverText: 'Feed Chickens', maxDistance: 6 } },
      () => { if (playerState.chickenCoopOwned) { playerState.activeFeedBowl = 'chicken'; playerState.activeMenu = 'feedBowl' } },
    )
  }

  if (penFood) {
    enablePointer(penFood)
    pointerEventsSystem.onPointerDown(
      { entity: penFood, opts: { button: InputAction.IA_POINTER, hoverText: 'Feed Pigs', maxDistance: 6 } },
      () => { if (playerState.pigPenOwned) { playerState.activeFeedBowl = 'pig'; playerState.activeMenu = 'feedBowl' } },
    )
  }

  // Wire dirt click → clean
  if (coopDirt) {
    enablePointer(coopDirt)
    pointerEventsSystem.onPointerDown(
      { entity: coopDirt, opts: { button: InputAction.IA_POINTER, hoverText: 'Clean Coop', maxDistance: 6 } },
      () => { cleanBuilding('chicken') },
    )
  }

  if (penDirt) {
    enablePointer(penDirt)
    pointerEventsSystem.onPointerDown(
      { entity: penDirt, opts: { button: InputAction.IA_POINTER, hoverText: 'Clean Pen', maxDistance: 6 } },
      () => { cleanBuilding('pig') },
    )
  }

  // Apply initial visual state
  updateBuildingVisuals()

  // Always register the ECS system at startup — must NOT wait for the save to load
  // (initAnimalSystem only runs when farmStateLoaded fires, which may never happen in
  // debug / axe-skip flows; the system must tick regardless so animals move immediately)
  engine.addSystem((dt: number) => {
    updateWanderers(dt)
    chickenProductionSystem()
    pigProductionSystem()
    dirtAccumulatorSystem(dt)
  }, undefined, 'animal-system')
}

// ---------------------------------------------------------------------------
// Entity accessors for tutorial arrow system
// ---------------------------------------------------------------------------

export function getEmptyCoopEntity(): Entity | null { return emptyCoopEntity }
export function getEmptyPenEntity():  Entity | null { return emptyPenEntity  }
export function getCoopFoodEntity():  Entity | null { return coopFood        }
export function getPenFoodEntity():   Entity | null { return penFood         }

// ---------------------------------------------------------------------------
// Purchase a building (called when player clicks AnimalBuildingEmpty)
// ---------------------------------------------------------------------------

export function purchaseBuilding(type: 'chicken' | 'pig'): void {
  const requiredLevel = type === 'chicken' ? CHICKEN_COOP_UNLOCK_LEVEL : PIG_PEN_UNLOCK_LEVEL
  if (playerState.level < requiredLevel) {
    console.log(`[AnimalSystem] Level ${requiredLevel} required to buy ${type} building`)
    return
  }
  const alreadyOwned = type === 'chicken' ? playerState.chickenCoopOwned : playerState.pigPenOwned
  if (alreadyOwned) return

  if (playerState.coins < BUILDING_BUY_PRICE) {
    console.log(`[AnimalSystem] Not enough coins to buy ${type} building`)
    return
  }
  playerState.coins -= BUILDING_BUY_PRICE
  if (type === 'chicken') {
    playerState.chickenCoopOwned = true
    animalTutorialCallbacks.onCoopPurchased()
  } else {
    playerState.pigPenOwned = true
    animalTutorialCallbacks.onPenPurchased()
  }
  playSound('buttonclick')
  updateBuildingVisuals()
  console.log(`[AnimalSystem] Bought ${type} building`)
}

// ---------------------------------------------------------------------------
// Buy individual animal (called from ShopMenu)
// ---------------------------------------------------------------------------

export function buyAnimal(type: 'chicken' | 'pig'): boolean {
  if (playerState.coins < ANIMAL_BUY_PRICE) return false

  const now = Date.now()
  if (type === 'chicken') {
    if (!playerState.chickenCoopOwned) return false
    if (playerState.chickens.length >= MAX_ANIMALS_PER_BUILDING) return false
    playerState.coins -= ANIMAL_BUY_PRICE
    const chicken: ChickenData = { id: newId(), lastEggAt: now }
    playerState.chickens.push(chicken)
    spawnChickenWanderer(chicken, playerState.chickens.length - 1)
    if (playerState.chickens.length === 1) animalTutorialCallbacks.onFirstChickenBought()
    console.log(`[AnimalSystem] buyAnimal chicken — wanderers in map: ${wanderers.size}`)
    playSound('buttonclick')
    return true
  } else {
    if (!playerState.pigPenOwned) return false
    if (playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING) return false
    playerState.coins -= ANIMAL_BUY_PRICE
    const pig: PigData = {
      id: newId(),
      purchasedAt:   now,
      bornAt:        null as unknown as number,  // 0 in schema = not a piglet
      becameAdultAt: now,   // purchased pigs start as adults
      feedScore:     0,
      lastBreedAt:   0,
      lastManureAt:  now,
    }
    playerState.pigs.push(pig)
    spawnPigWanderer(pig, now, playerState.pigs.length - 1)
    if (playerState.pigs.length === 1) animalTutorialCallbacks.onFirstPigBought()
    console.log(`[AnimalSystem] buyAnimal pig — wanderers in map: ${wanderers.size}`)
    playSound('buttonclick')
    return true
  }
}

// ---------------------------------------------------------------------------
// Breed pigs (called from AnimalPanel)
// ---------------------------------------------------------------------------

export function breedPigs(): boolean {
  if (!playerState.pigPenOwned) return false
  if (playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING) return false
  const now = Date.now()

  // Find 2 adults not on cooldown
  const eligibleParents = playerState.pigs.filter((p) => {
    const stage = getPigStage(p, now)
    return (stage === 'adult' || stage === 'harvestable') && (now - p.lastBreedAt) >= PIG_BREED_COOLDOWN
  })
  if (eligibleParents.length < 2) return false

  // Apply cooldown to the first two
  eligibleParents[0].lastBreedAt = now
  eligibleParents[1].lastBreedAt = now

  // Create piglet
  const piglet: PigData = {
    id:            newId(),
    purchasedAt:   now,
    bornAt:        now,    // born now → starts as piglet
    becameAdultAt: 0,      // not yet adult
    feedScore:     0,
    lastBreedAt:   0,
    lastManureAt:  0,
  }
  playerState.pigs.push(piglet)
  spawnPigWanderer(piglet, now, playerState.pigs.length - 1)
  playSound('harvest')
  console.log('[AnimalSystem] Piglet born!')
  return true
}

// ---------------------------------------------------------------------------
// Harvest pig for meat (called from AnimalPanel)
// ---------------------------------------------------------------------------

export function harvestPig(pigId: string): boolean {
  const now = Date.now()
  const pig = playerState.pigs.find((p) => p.id === pigId)
  if (!pig) return false
  const stage = getPigStage(pig, now)
  if (stage !== 'harvestable') return false

  playerState.pigs = playerState.pigs.filter((p) => p.id !== pigId)
  removeWanderer(pigId)
  playerState.pigMeatCount += 1
  addXp(15)
  playSound('harvest')
  updateBuildingVisuals()
  console.log('[AnimalSystem] Pig harvested for meat')
  return true
}

// ---------------------------------------------------------------------------
// Sell pig meat (called from SellMenu)
// ---------------------------------------------------------------------------

export function sellPigMeat(count: number): boolean {
  if (playerState.pigMeatCount < count || count <= 0) return false
  const coins = PIG_MEAT_SELL_PRICE * count
  playerState.pigMeatCount  -= count
  playerState.coins         += coins
  playerState.totalSellCount  += 1
  playerState.totalCoinsEarned += coins
  addXp(5 * count)
  playSound('truck')
  return true
}

// ---------------------------------------------------------------------------
// Sell eggs (called from SellMenu)
// ---------------------------------------------------------------------------

export function sellEggs(count: number): boolean {
  if (playerState.eggsCount < count || count <= 0) return false
  const coins = EGG_SELL_PRICE_EXPORT * count
  playerState.eggsCount        -= count
  playerState.coins            += coins
  playerState.totalSellCount   += 1
  playerState.totalCoinsEarned += coins
  addXp(5 * count)
  playSound('truck')
  return true
}

const EGG_SELL_PRICE_EXPORT = 30   // avoid circular import; must match EGG_SELL_PRICE

// ---------------------------------------------------------------------------
// Deposit food into bowl (called from FeedBowlMenu)
// ---------------------------------------------------------------------------

export function depositFoodInBowl(type: 'chicken' | 'pig', grainAmount: number, cropAmounts: Map<number, number>): boolean {
  const total = grainAmount + Array.from(cropAmounts.values()).reduce((a, b) => a + b, 0)
  if (total <= 0) return false

  if (type === 'chicken') {
    if (!playerState.chickenCoopOwned) return false
    // Deduct grain
    if (grainAmount > 0) {
      if (playerState.grainCount < grainAmount) return false
      playerState.grainCount         -= grainAmount
      playerState.chickenFoodInBowl  += grainAmount
    }
    // Deduct crops
    for (const [cropType, amount] of cropAmounts) {
      const current = playerState.harvested.get(cropType as any) ?? 0
      if (current < amount) return false
      playerState.harvested.set(cropType as any, current - amount)
      playerState.chickenFoodInBowl += amount
    }
    animalTutorialCallbacks.onCoopFed()
  } else {
    if (!playerState.pigPenOwned) return false
    if (grainAmount > 0) {
      if (playerState.grainCount < grainAmount) return false
      playerState.grainCount      -= grainAmount
      playerState.pigFoodInBowl   += grainAmount
    }
    for (const [cropType, amount] of cropAmounts) {
      const current = playerState.harvested.get(cropType as any) ?? 0
      if (current < amount) return false
      playerState.harvested.set(cropType as any, current - amount)
      playerState.pigFoodInBowl += amount
      // Depositing crops to pig pen feeds their feedScore
      for (const pig of playerState.pigs) pig.feedScore += amount
    }
    animalTutorialCallbacks.onPenFed()
  }
  updateBuildingVisuals()
  playSound('buttonclick')
  return true
}

// ---------------------------------------------------------------------------
// Buy grain (called from ShopMenu)
// ---------------------------------------------------------------------------

export function buyGrain(amount: number, totalCost: number): boolean {
  if (playerState.coins < totalCost) return false
  playerState.coins     -= totalCost
  playerState.grainCount += amount
  playSound('buttonclick')
  return true
}

// ---------------------------------------------------------------------------
// Veggie scrap drop — called from actions.ts on harvest
// ---------------------------------------------------------------------------

export function tryDropVeggieScrap(): void {
  if (!playerState.pigPenOwned) return
  if (Math.random() < 0.30) {
    playerState.veggieScrapCount += 1
    // Auto-deposit into pig food bowl when pig pen is active
    playerState.pigFoodInBowl   += 1
    playerState.veggieScrapCount -= 1
    updateBuildingVisuals()
  }
}

// ---------------------------------------------------------------------------
// Clean building dirt (called from dirt entity click handler)
// ---------------------------------------------------------------------------

function cleanBuilding(type: 'chicken' | 'pig'): void {
  if (type === 'chicken') {
    if (playerState.chickenCoopDirtyAt === 0) return
    const count = Math.max(1, playerState.chickens.length)
    playerState.organicWaste        += CLEAN_ORGANIC_WASTE_PER_ANIMAL * count
    playerState.chickenCoopDirtyAt   = 0
    if (coopDirt) {
      const t = Transform.getOrNull(coopDirt)
      if (t) spawnOrganicWasteVfx(Vector3.create(t.position.x, t.position.y + 1, t.position.z))
    }
  } else {
    if (playerState.pigPenDirtyAt === 0) return
    const count = Math.max(1, playerState.pigs.length)
    playerState.organicWaste      += CLEAN_ORGANIC_WASTE_PER_ANIMAL * count
    playerState.pigPenDirtyAt      = 0
    if (penDirt) {
      const t = Transform.getOrNull(penDirt)
      if (t) spawnOrganicWasteVfx(Vector3.create(t.position.x, t.position.y + 1, t.position.z))
    }
  }
  updateBuildingVisuals()
  playSound('harvest')
  console.log(`[AnimalSystem] Cleaned ${type} building → +${CLEAN_ORGANIC_WASTE_PER_ANIMAL} organic waste`)
}

// ---------------------------------------------------------------------------
// Spawn wanderer helpers
// ---------------------------------------------------------------------------

function spawnChickenWanderer(chicken: ChickenData, _index: number): void {
  if (wanderers.has(chicken.id)) return
  const entity  = engine.addEntity()
  const sc      = ANIMAL_SCALE_CHICKEN
  const centre  = Vector3.create((chickenBounds.minX + chickenBounds.maxX) / 2, 0, (chickenBounds.minZ + chickenBounds.maxZ) / 2)
  const spawnPt = randomWanderTarget(centre, chickenBounds)
  GltfContainer.create(entity, { src: CHICKEN_MODEL })
  Transform.create(entity, {
    position: Vector3.create(spawnPt.x, 0, spawnPt.z),
    scale:    Vector3.create(sc, sc, sc),
    rotation: Quaternion.fromEulerDegrees(0, Math.random() * 360, 0),
  })
  Animator.create(entity, {
    states: [
      { clip: 'idle', playing: true,  weight: 1, loop: true },
      { clip: 'walk', playing: false, weight: 0, loop: true },
      { clip: 'eat',  playing: false, weight: 0, loop: true },
    ],
  })
  wanderers.set(chicken.id, {
    id: chicken.id, entity,
    bounds:        chickenBounds,
    pauseTimer:    Math.random() * 1.0,
    currentTarget: null,
  })
}

function spawnPigWanderer(pig: PigData, now: number, _index: number): void {
  if (wanderers.has(pig.id)) return
  const entity  = engine.addEntity()
  const sc      = getPigletScale(pig, now)
  const centre  = Vector3.create((pigBounds.minX + pigBounds.maxX) / 2, 0, (pigBounds.minZ + pigBounds.maxZ) / 2)
  const spawnPt = randomWanderTarget(centre, pigBounds)
  GltfContainer.create(entity, { src: PIG_MODEL })
  Transform.create(entity, {
    position: Vector3.create(spawnPt.x, 0, spawnPt.z),
    scale:    Vector3.create(sc, sc, sc),
    rotation: Quaternion.fromEulerDegrees(0, Math.random() * 360, 0),
  })
  Animator.create(entity, {
    states: [
      { clip: 'idle', playing: true,  weight: 1, loop: true },
      { clip: 'walk', playing: false, weight: 0, loop: true },
      { clip: 'eat',  playing: false, weight: 0, loop: true },
    ],
  })
  wanderers.set(pig.id, {
    id: pig.id, entity,
    bounds:        pigBounds,
    pauseTimer:    Math.random() * 1.0,
    currentTarget: null,
  })
}

function removeWanderer(id: string): void {
  const w = wanderers.get(id)
  if (!w) return
  engine.removeEntity(w.entity)
  wanderers.delete(id)
}

export function despawnAllAnimals(): void {
  for (const [id, w] of wanderers) {
    engine.removeEntity(w.entity)
    wanderers.delete(id)
  }
}

// ---------------------------------------------------------------------------
// Animal movement helpers  (mirrors dog system pattern)
// ---------------------------------------------------------------------------

function animalDist2D(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x; const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function playAnimSafe(entity: Entity, clip: 'idle' | 'walk' | 'eat'): void {
  if (!Animator.has(entity)) return
  const a = Animator.getMutable(entity)
  for (const s of a.states) {
    s.playing = s.clip === clip
    s.weight  = s.clip === clip ? 1 : 0
  }
}

function randomWanderTarget(currentPos: Vector3, bounds: WanderBounds): Vector3 {
  const angle  = Math.random() * Math.PI * 2
  const radius = (0.5 + Math.random() * 0.5) * WANDER_MAX_STEP
  return Vector3.create(
    Math.max(bounds.minX, Math.min(bounds.maxX, currentPos.x + Math.cos(angle) * radius)),
    0,
    Math.max(bounds.minZ, Math.min(bounds.maxZ, currentPos.z + Math.sin(angle) * radius)),
  )
}

// ---------------------------------------------------------------------------
// Per-animal update — simple wander loop
// ---------------------------------------------------------------------------

function updateWanderers(dt: number): void {
  for (const [, w] of wanderers) {
    w.pauseTimer -= dt

    if (w.pauseTimer > 0) {
      // Still resting — nothing to do this frame
      continue
    }

    // ── Paused and ready: pick a new target if we don't have one ───────────
    if (!w.currentTarget) {
      const cur = Transform.get(w.entity).position
      w.currentTarget = randomWanderTarget(cur, w.bounds)
      playAnimSafe(w.entity, 'walk')
    }

    // ── Walk toward the current target ─────────────────────────────────────
    const tf = Transform.getMutable(w.entity)
    const dx = w.currentTarget.x - tf.position.x
    const dz = w.currentTarget.z - tf.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < ARRIVE_DIST) {
      // Arrived — rest for a bit, then wander again
      w.currentTarget = null
      w.pauseTimer    = ANIMAL_PAUSE_MIN + Math.random() * (ANIMAL_PAUSE_MAX - ANIMAL_PAUSE_MIN)
      playAnimSafe(w.entity, 'idle')
    } else {
      const step = Math.min(ANIMAL_WALK_SPEED * dt, dist)
      tf.position = Vector3.create(
        tf.position.x + (dx / dist) * step,
        0,
        tf.position.z + (dz / dist) * step,
      )
      // Face direction of travel
      const angle = Math.atan2(dx, dz) * (180 / Math.PI)
      tf.rotation = Quaternion.fromAngleAxis(angle, Vector3.Up())
    }
  }
}

// ---------------------------------------------------------------------------
// Real-time production systems
// ---------------------------------------------------------------------------

function chickenProductionSystem(): void {
  if (!playerState.chickenCoopOwned || playerState.chickens.length === 0) return
  if (playerState.chickenFoodInBowl <= 0) return
  const now = Date.now()
  for (const chicken of playerState.chickens) {
    if (chicken.lastEggAt === 0) { chicken.lastEggAt = now; continue }
    if (now - chicken.lastEggAt < EGG_CYCLE_MS) continue
    if (playerState.chickenFoodInBowl <= 0) break
    const yield_ = EGG_YIELD_MIN + Math.floor(Math.random() * (EGG_YIELD_MAX - EGG_YIELD_MIN + 1))
    playerState.eggsCount         += yield_
    playerState.chickenFoodInBowl  = Math.max(0, playerState.chickenFoodInBowl - 1)
    chicken.lastEggAt              = now
  }
  updateBuildingVisuals()
}

function pigProductionSystem(): void {
  if (!playerState.pigPenOwned || playerState.pigs.length === 0) return
  const now = Date.now()
  for (const pig of playerState.pigs) {
    // Promote piglet to adult
    if (pig.bornAt !== 0 && pig.becameAdultAt === 0) {
      const age = now - pig.bornAt
      if (age >= ADOLESCENT_STAGE_MS) {
        pig.becameAdultAt = now
        pig.lastManureAt  = now
      }
    }
    const stage = getPigStage(pig, now)
    if (stage !== 'adult' && stage !== 'harvestable') continue
    if (pig.lastManureAt === 0) { pig.lastManureAt = now; continue }
    if (now - pig.lastManureAt < PIG_CYCLE_MS) continue
    if (playerState.pigFoodInBowl <= 0) continue
    playerState.organicWaste    += 1
    playerState.pigFoodInBowl    = Math.max(0, playerState.pigFoodInBowl - 1)
    pig.lastManureAt             = now
    pig.feedScore               += 1
  }
  updateBuildingVisuals()
}

function dirtSystem(): void {
  const now = Date.now()

  if (playerState.chickenCoopOwned && playerState.chickens.length > 0) {
    const interval = getDirtIntervalMs(playerState.chickens.length)
    const lastDirty = playerState.chickenCoopDirtyAt
    if (lastDirty === 0) {
      // Not dirty — check if it's time to become dirty
      // Use chickenCoopDirtyAt = 0 means "clean, started tracking from first chicken added"
      // We track last-cleaned implicitly; dirt becomes visible after interval passes without cleaning
      // Simple: set dirty if any chicken exists and it's been interval ms since last clean (use 0 = never cleaned = dirty immediately after first interval)
      // We use a startup-time reference stored in pig.purchasedAt style...
      // For simplicity: when chickenCoopDirtyAt is 0 AND coop is owned AND chickens > 0,
      // we set it after DIRT_BASE_INTERVAL from when the first chicken was added.
      // Use the earliest chicken.lastEggAt as a reference, or just use Date.now() - interval as a trigger.
      // Actually, for a clean UX, let's say: first time they own the coop with chickens,
      // dirt appears after one interval. Track via a separate "lastCleanedAt" stored in chickenCoopDirtyAt itself.
      // When 0 = never dirty, so start the timer from now when we first detect chickens.
      // We need to store "last cleaned at". Let's overload chickenCoopDirtyAt:
      // > 0 = currently dirty (timestamp when it became dirty)
      // = 0 = clean (will reset to 0 after cleaning)
      // So we need a separate "last cleaned at" field. But we don't have one.
      // SIMPLEST fix: use a negative value as "last cleaned at" — but schemas don't support that.
      // Alternative: just set chickenCoopDirtyAt to now when the first chicken is added (in buyAnimal).
      // Then the system makes it dirty after interval. For now, skip if 0 and let it be triggered by first purchase.
    } else if (playerState.chickenCoopDirtyAt > 0) {
      // Already dirty — nothing to do (cleaned via click)
    }
    // Note: dirt is triggered by setting chickenCoopDirtyAt = Date.now() in separate logic
    // For now, trigger dirt on a simple elapsed-time basis from farm init
  }
  // Similar for pig pen — omitted for brevity; same pattern
}

// ---------------------------------------------------------------------------
// Dirt timer — simplified: trigger dirt periodically using a module-level timer
// ---------------------------------------------------------------------------

function dirtAccumulatorSystem(dt: number): void {
  const dtMs = dt * 1000

  if (playerState.chickenCoopOwned && playerState.chickens.length > 0 && playerState.chickenCoopDirtyAt === 0) {
    playerState.coopDirtAccumMs += dtMs
    const interval = getDirtIntervalMs(playerState.chickens.length)
    if (playerState.coopDirtAccumMs >= interval) {
      playerState.coopDirtAccumMs    = 0
      playerState.chickenCoopDirtyAt = Date.now()
      updateBuildingVisuals()
    }
  } else {
    playerState.coopDirtAccumMs = 0
  }

  if (playerState.pigPenOwned && playerState.pigs.length > 0 && playerState.pigPenDirtyAt === 0) {
    playerState.penDirtAccumMs += dtMs
    const interval = getDirtIntervalMs(playerState.pigs.length)
    if (playerState.penDirtAccumMs >= interval) {
      playerState.penDirtAccumMs = 0
      playerState.pigPenDirtyAt  = Date.now()
      updateBuildingVisuals()
    }
  } else {
    playerState.penDirtAccumMs = 0
  }
}

// ---------------------------------------------------------------------------
// Offline catch-up — called from initAnimalSystem before runtime loop starts
// ---------------------------------------------------------------------------

function catchUpOffline(): void {
  const now = Date.now()

  // Chickens: calculate missed egg cycles per chicken
  if (playerState.chickenCoopOwned) {
    for (const chicken of playerState.chickens) {
      if (chicken.lastEggAt === 0 || playerState.chickenFoodInBowl <= 0) {
        chicken.lastEggAt = now
        continue
      }
      const missedCycles = Math.floor((now - chicken.lastEggAt) / EGG_CYCLE_MS)
      for (let i = 0; i < missedCycles; i++) {
        if (playerState.chickenFoodInBowl <= 0) break
        const yield_ = EGG_YIELD_MIN + Math.floor(Math.random() * (EGG_YIELD_MAX - EGG_YIELD_MIN + 1))
        playerState.eggsCount        += yield_
        playerState.chickenFoodInBowl = Math.max(0, playerState.chickenFoodInBowl - 1)
      }
      if (missedCycles > 0) chicken.lastEggAt = now - ((now - chicken.lastEggAt) % EGG_CYCLE_MS)
    }
  }

  // Pigs: promote grown piglets + catch up manure
  if (playerState.pigPenOwned) {
    for (const pig of playerState.pigs) {
      // Promote piglet
      if (pig.bornAt !== 0 && pig.becameAdultAt === 0) {
        const age = now - pig.bornAt
        if (age >= ADOLESCENT_STAGE_MS) {
          pig.becameAdultAt = pig.bornAt + ADOLESCENT_STAGE_MS
          pig.lastManureAt  = pig.becameAdultAt
        }
      }
      const stage = getPigStage(pig, now)
      if (stage !== 'adult' && stage !== 'harvestable') continue
      if (pig.lastManureAt === 0) { pig.lastManureAt = now; continue }
      if (playerState.pigFoodInBowl <= 0) continue
      const missedCycles = Math.floor((now - pig.lastManureAt) / PIG_CYCLE_MS)
      for (let i = 0; i < missedCycles; i++) {
        if (playerState.pigFoodInBowl <= 0) break
        playerState.organicWaste    += 1
        playerState.pigFoodInBowl    = Math.max(0, playerState.pigFoodInBowl - 1)
        pig.feedScore               += 1
      }
      if (missedCycles > 0) pig.lastManureAt = now - ((now - pig.lastManureAt) % PIG_CYCLE_MS)
    }
  }
}

// ---------------------------------------------------------------------------
// Init — call once from saveService.applyPayload (client side)
// ---------------------------------------------------------------------------

export function initAnimalSystem(): void {
  // Guard: only run catch-up + wanderer spawning once (ECS system is already
  // registered unconditionally by initAnimalBuildings at startup)
  if (systemRegistered) return
  systemRegistered = true

  // Offline catch-up runs before the realtime system starts
  catchUpOffline()

  // Spawn wanderers for any already-owned animals
  const now = Date.now()
  if (playerState.chickenCoopOwned) {
    playerState.chickens.forEach((c, i) => spawnChickenWanderer(c, i))
  }
  if (playerState.pigPenOwned) {
    playerState.pigs.forEach((p, i) => spawnPigWanderer(p, now, i))
  }
}
