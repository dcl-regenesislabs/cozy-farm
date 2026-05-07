// ---------------------------------------------------------------------------
// Animal system — data definitions
// ---------------------------------------------------------------------------

export enum AnimalType {
  Chicken = 0,
  Pig     = 1,
}

// ---------------------------------------------------------------------------
// Per-animal save data
// ---------------------------------------------------------------------------

export type ChickenData = {
  id:          string
  lastEggAt:   number   // timestamp — individual production timer
}

export type PigData = {
  id:              string
  purchasedAt:     number         // when bought (adults start here)
  bornAt:          number | null  // non-null only for pen-born piglets
  becameAdultAt:   number | null  // set when piglet crosses 72h mark
  feedScore:       number         // increments per feeding → scale 0.65–0.85
  lastBreedAt:     number         // cooldown timestamp (0 = never bred)
}

// ---------------------------------------------------------------------------
// Pig growth stages (derived at runtime from PigData, never saved)
// ---------------------------------------------------------------------------

export type PigStage = 'piglet' | 'adolescent' | 'adult' | 'harvestable'

export const PIGLET_STAGE_MS     =  1 * 24 * 60 * 60 * 1000  // 0–24h → piglet
export const ADOLESCENT_STAGE_MS =  3 * 24 * 60 * 60 * 1000  // 24–72h → adolescent
export const PIG_HARVEST_AGE_MS  =  7 * 24 * 60 * 60 * 1000  // 7 days as adult → harvestable
export const PIG_BREED_COOLDOWN  = 24 * 60 * 60 * 1000       // 24h between breeds per pig

export function getPigStage(pig: PigData, now = Date.now()): PigStage {
  if (pig.bornAt !== null && pig.becameAdultAt === null) {
    const age = now - pig.bornAt
    if (age < PIGLET_STAGE_MS)     return 'piglet'
    if (age < ADOLESCENT_STAGE_MS) return 'adolescent'
    return 'adult'   // will be promoted to adult next tick
  }
  const adultAt = pig.becameAdultAt ?? pig.purchasedAt
  if (now - adultAt >= PIG_HARVEST_AGE_MS) return 'harvestable'
  return 'adult'
}

export function getPigScale(feedScore: number): number {
  const t = Math.min(1, feedScore / 50)
  return 0.65 + t * 0.20   // 0.65 → 0.85
}

export function getPigletScale(pig: PigData, now = Date.now()): number {
  const stage = getPigStage(pig, now)
  if (stage === 'piglet')      return 0.35
  if (stage === 'adolescent')  return 0.50
  return getPigScale(pig.feedScore)
}

// ---------------------------------------------------------------------------
// Building constants
// ---------------------------------------------------------------------------

export const MAX_ANIMALS_PER_BUILDING = 5
export const BUILDING_BUY_PRICE       = 500   // coins to buy the coop/pen
export const ANIMAL_BUY_PRICE         = 500   // coins per individual animal
export const PIG_MEAT_SELL_PRICE      = 150   // coins per pig meat
export const EGG_SELL_PRICE           = 30    // coins per egg
export const EGG_CYCLE_MS             = 6 * 60 * 60 * 1000  // 6h per chicken
export const PIG_CYCLE_MS             = 8 * 60 * 60 * 1000  // 8h per adult pig
export const EGG_YIELD_MIN            = 1
export const EGG_YIELD_MAX            = 2

// ---------------------------------------------------------------------------
// Grain shop (player inventory → bowl)
// ---------------------------------------------------------------------------

export const GRAIN_BUY_PRICE  = 15   // coins per 1 grain
export const GRAIN_BULK_COUNT = 5
export const GRAIN_BULK_PRICE = 65   // coins for 5 (saves 10 coins)

// ---------------------------------------------------------------------------
// Dirt mechanic
// ---------------------------------------------------------------------------

export const DIRT_BASE_INTERVAL_MS       = 12 * 60 * 60 * 1000  // 12h with 1 animal
export const CLEAN_ORGANIC_WASTE_PER_ANIMAL = 10

// Dirt appears sooner with more animals: interval = BASE / count
export function getDirtIntervalMs(animalCount: number): number {
  return DIRT_BASE_INTERVAL_MS / Math.max(1, animalCount)
}

// ---------------------------------------------------------------------------
// Model paths
// ---------------------------------------------------------------------------

export const CHICKEN_MODEL           = 'assets/scene/Models/Animals/Chicken01.glb'
export const PIG_MODEL               = 'assets/scene/Models/Animals/Pig01.glb'
export const CHICKEN_COOP_BUILDING   = 'assets/scene/Models/ChickenCoopBuilding/ChickenCoopBuilding.glb'
export const CHICKEN_COOP_DIRT       = 'assets/scene/Models/ChickenCoopDirt/ChickenCoopDirt.glb'
export const CHICKEN_FOOD_EMPTY      = 'assets/scene/Models/ChickenFoodEmpty/ChickenFoodEmpty.glb'
export const CHICKEN_FOOD_FULL       = 'assets/scene/Models/ChickenFoodFull/ChickenFoodFull.glb'
export const CHICKEN_WATER           = 'assets/scene/Models/ChickenWater/ChickenWater.glb'
export const CHICKEN_AREA            = 'assets/scene/Models/ChickenArea/ChickenArea.glb'
export const PIG_PEN_BUILDING        = 'assets/scene/Models/PigPenBuilding/PigPenBuilding.glb'
export const PIG_PEN_DIRT            = 'assets/scene/Models/PigPenDirt/PigPenDirt.glb'
export const ANIMAL_FOOD_EMPTY       = 'assets/scene/Models/AnimalFoodEmpty/AnimalFoodEmpty.glb'
export const ANIMAL_FOOD_FULL        = 'assets/scene/Models/AnimalFoodFull/AnimalFoodFull.glb'
export const ANIMAL_WATER            = 'assets/scene/Models/AnimalWater/AnimalWater.glb'
export const PIG_AREA                = 'assets/scene/Models/PigArea/PigArea.glb'
export const ANIMAL_BUILDING_EMPTY   = 'assets/scene/Models/AnimalBuildingEmpty/AnimalBuildingEmpty.glb'

// ---------------------------------------------------------------------------
// Wander constants (used by animalSystem)
// ---------------------------------------------------------------------------

export const ANIMAL_WALK_SPEED     = 1.2   // units / second
export const ANIMAL_PAUSE_MIN      = 2.0   // seconds idle between steps
export const ANIMAL_PAUSE_MAX      = 5.0
export const ANIMAL_SCALE_CHICKEN  = 0.55

// Wander centres — actual world positions from scene composite
export const CHICKEN_COOP_CENTRE = { x: 54.16, y: 0, z: 6.39 }
export const PIG_PEN_CENTRE      = { x: 65.30, y: 0, z: 6.27 }

// Walkable polygons — local-space (XZ) offsets from each building's centre.
// Vertices extracted directly from ChickenArea.glb / PigArea.glb meshes.
// Ordered counter-clockwise; used for point-in-polygon rejection sampling.
export const CHICKEN_WALK_POLY: [number, number][] = [
  [-4.99, -5.01], [ 1.27, -5.01], [ 1.27, -3.33], [-0.63, -3.33],
  [-0.63, -1.55], [ 0.34, -1.55], [ 0.34,  2.47], [ 4.88,  2.47],
  [ 4.88,  4.96], [-4.99,  4.96],
]

export const PIG_WALK_POLY: [number, number][] = [
  [-3.59, -5.00], [ 5.02, -5.00], [ 5.02,  5.00],
  [-5.13,  5.00], [-5.13,  1.62], [-3.59,  1.62],
]

// Level requirements (for UI display + purchase gate)
export const CHICKEN_COOP_UNLOCK_LEVEL = 8
export const PIG_PEN_UNLOCK_LEVEL      = 12
