// ---------------------------------------------------------------------------
// Animal system — data definitions
// ---------------------------------------------------------------------------

export enum AnimalType {
  Chicken = 0,
  Pig     = 1,
}

export interface AnimalDefinition {
  type:              AnimalType
  name:              string
  modelSrc:          string
  unlockLevel:       number
  // Production
  cycleDurationMs:   number   // how often one unit of product is ready
  maxStockpile:      number   // max units waiting to collect
  grainPerCycle:     number   // grain consumed per production cycle
  // Product
  productName:       string
  productSellPrice:  number   // coins per unit
  productYieldMin:   number
  productYieldMax:   number
  // XP
  xpPerCollect:      number
}

export const ANIMAL_DATA: Map<AnimalType, AnimalDefinition> = new Map([
  [AnimalType.Chicken, {
    type:             AnimalType.Chicken,
    name:             'Chicken Coop',
    modelSrc:         'assets/scene/Models/Animals/Chicken01.glb',
    unlockLevel:      8,
    cycleDurationMs:  6 * 60 * 60 * 1000,  // 6 hours
    maxStockpile:     12,
    grainPerCycle:    1,
    productName:      'Egg',
    productSellPrice: 30,
    productYieldMin:  1,
    productYieldMax:  2,
    xpPerCollect:     5,
  }],
  [AnimalType.Pig, {
    type:             AnimalType.Pig,
    name:             'Pig Pen',
    modelSrc:         'assets/scene/Models/Animals/Pig01.glb',
    unlockLevel:      12,
    cycleDurationMs:  8 * 60 * 60 * 1000,  // 8 hours
    maxStockpile:     5,
    grainPerCycle:    1,                    // veggie scraps used first; grain fallback
    productName:      'Manure',
    productSellPrice: 0,                    // not sold — used as compost input
    productYieldMin:  1,
    productYieldMax:  1,
    xpPerCollect:     10,
  }],
])

// ---------------------------------------------------------------------------
// Grain shop
// ---------------------------------------------------------------------------
export const GRAIN_BUY_PRICE   = 15   // coins per 1 grain
export const GRAIN_BULK_COUNT  = 5
export const GRAIN_BULK_PRICE  = 65   // coins for 5 (saves 10 coins)

// ---------------------------------------------------------------------------
// Veggie scrap drop chance per crop harvest
// ---------------------------------------------------------------------------
export const VEGGIE_SCRAP_CHANCE = 0.30   // 30 %

// ---------------------------------------------------------------------------
// Model paths
// ---------------------------------------------------------------------------
// Buildings (always visible in scene — gallinero / corral)
export const CHICKEN_COOP_MODEL = 'assets/scene/Models/ChickenCoop/ChickenCoop.glb'
export const PIG_PEN_MODEL      = 'assets/scene/Models/PigPen/PigPen.glb'

// Animals (spawned as wanderers only after unlock)
export const CHICKEN_MODEL = 'assets/scene/Models/Animals/Chicken01.glb'
export const PIG_MODEL     = 'assets/scene/Models/Animals/Pig01.glb'

// ---------------------------------------------------------------------------
// Wander constants (used by animalSystem)
// ---------------------------------------------------------------------------
export const CHICKEN_WANDER_RADIUS = 3.5   // metres around the coop centre
export const PIG_WANDER_RADIUS     = 2.5
export const ANIMAL_WALK_SPEED     = 0.9   // units / second
export const ANIMAL_PAUSE_MIN      = 3.0   // seconds idle between steps
export const ANIMAL_PAUSE_MAX      = 8.0
export const ANIMAL_SCALE_CHICKEN  = 0.55
export const ANIMAL_SCALE_PIG      = 0.65

// Wander centre — matches Creator Hub building positions
export const CHICKEN_COOP_CENTRE = { x: 8.27,  y: 0, z: 6.22 }
export const PIG_PEN_CENTRE      = { x: 42,    y: 0, z: 7.25 }

// Teaser positions — behind the house
export const CHICKEN_TEASER_POS  = { x: 27.12, y: 0, z: 57.25 }
export const PIG_TEASER_POS      = { x: 29.12, y: 0, z: 57.25 }
