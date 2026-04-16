import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

// ---------------------------------------------------------------------------
// Plot save state — one entry per active plot
// ---------------------------------------------------------------------------
const PlotSaveSchema = Schemas.Map({
  plotIndex:    Schemas.Int,
  cropType:     Schemas.Int,       // -1 = empty
  plantedAt:    Schemas.Number,    // Date.now() timestamp (ms)
  waterCount:   Schemas.Int,
  growthStarted: Schemas.Boolean,
  growthStage:  Schemas.Int,
  isReady:      Schemas.Boolean,
})

// ---------------------------------------------------------------------------
// Seed / harvested crop pair — used in both directions
// ---------------------------------------------------------------------------
const CropCountSchema = Schemas.Map({
  cropType: Schemas.Int,
  count:    Schemas.Int,
})

// ---------------------------------------------------------------------------
// Full farm state payload — sent server → client on load, client → server on save
// ---------------------------------------------------------------------------
const FarmStateSchema = Schemas.Map({
  wallet:   Schemas.String,   // lowercase wallet address — client uses this to filter

  // Economy
  coins: Schemas.Int,

  // Inventory
  seeds:     Schemas.Array(CropCountSchema),
  harvested: Schemas.Array(CropCountSchema),

  // Progression
  xp:    Schemas.Int,
  level: Schemas.Int,

  // Unlocks
  cropsUnlocked: Schemas.Boolean,

  // Farmer / worker
  farmerHired:      Schemas.Boolean,
  farmerSeeds:      Schemas.Array(CropCountSchema),
  farmerInventory:  Schemas.Array(CropCountSchema),

  // Dog
  dogOwned: Schemas.Boolean,

  // Lifetime stats (for quests + profile)
  totalCropsHarvested: Schemas.Int,
  totalWaterCount:     Schemas.Int,
  totalSeedPlanted:    Schemas.Int,
  totalSellCount:      Schemas.Int,
  totalCoinsEarned:    Schemas.Int,

  // Tutorial
  tutorialComplete:       Schemas.Boolean,
  tutorialStep:           Schemas.String,
  tutorialSeedsBought:    Schemas.Int,
  tutorialHarvestMore:    Schemas.Int,

  // Active plots
  plotStates: Schemas.Array(PlotSaveSchema),
})

// ---------------------------------------------------------------------------
// Message registry
// ---------------------------------------------------------------------------
const FarmMessages = {
  /** Client → Server: ask the server to load this player's farm */
  playerLoadFarm: Schemas.Map({}),

  /** Server → Client: full farm state response */
  farmStateLoaded: FarmStateSchema,

  /** Client → Server: persist current farm state */
  playerSaveFarm: FarmStateSchema,
}

export const room = registerMessages(FarmMessages)

// ---------------------------------------------------------------------------
// Re-export types so other modules can use them without re-importing Schemas
// ---------------------------------------------------------------------------
export type PlotSaveState = {
  plotIndex:     number
  cropType:      number
  plantedAt:     number
  waterCount:    number
  growthStarted: boolean
  growthStage:   number
  isReady:       boolean
}

export type CropCount = {
  cropType: number
  count:    number
}

export type FarmStatePayload = {
  wallet:   string
  coins:    number
  seeds:    CropCount[]
  harvested: CropCount[]
  xp:       number
  level:    number
  cropsUnlocked:    boolean
  farmerHired:      boolean
  farmerSeeds:      CropCount[]
  farmerInventory:  CropCount[]
  dogOwned: boolean
  totalCropsHarvested: number
  totalWaterCount:     number
  totalSeedPlanted:    number
  totalSellCount:      number
  totalCoinsEarned:    number
  tutorialComplete:    boolean
  tutorialStep:        string
  tutorialSeedsBought: number
  tutorialHarvestMore: number
  plotStates: PlotSaveState[]
}
