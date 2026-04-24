import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

// ---------------------------------------------------------------------------
// Plot save state — one entry per active plot
// ---------------------------------------------------------------------------
const PlotSaveSchema = Schemas.Map({
  plotIndex:    Schemas.Int,
  isUnlocked:   Schemas.Boolean,
  cropType:     Schemas.Int,       // -1 = empty
  plantedAt:    Schemas.Number,    // Date.now() timestamp (ms)
  waterCount:   Schemas.Int,
  growthStarted: Schemas.Boolean,
  growthStage:  Schemas.Int,
  isReady:      Schemas.Boolean,
})

// ---------------------------------------------------------------------------
// Quest progress entry — one per quest definition
// ---------------------------------------------------------------------------
const QuestProgressSaveSchema = Schemas.Map({
  id:      Schemas.String,
  current: Schemas.Int,
  status:  Schemas.String,   // 'available' | 'active' | 'claimable' | 'completed'
})

// ---------------------------------------------------------------------------
// Seed / harvested crop pair — used in both directions
// ---------------------------------------------------------------------------
const CropCountSchema = Schemas.Map({
  cropType: Schemas.Int,
  count:    Schemas.Int,
})

const MailboxRewardSchema = Schemas.Map({
  id:          Schemas.String,
  type:        Schemas.String,
  reason:      Schemas.String,
  amount:      Schemas.Int,
  cropType:    Schemas.Int,
  fromAddress: Schemas.String,
  fromName:    Schemas.String,
  createdAt:   Schemas.Int64,
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
  cropsUnlocked:      Schemas.Boolean,
  expansion1Unlocked: Schemas.Boolean,
  expansion2Unlocked: Schemas.Boolean,

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

  // Level rewards claimed
  claimedRewards: Schemas.Array(Schemas.Int),

  // Active plots
  plotStates: Schemas.Array(PlotSaveSchema),

  // Quest progress
  questProgress: Schemas.Array(QuestProgressSaveSchema),

  // Jukebox preferences
  musicSongId: Schemas.String,
  musicMuted:  Schemas.Boolean,
  musicVolume: Schemas.Number,

  // Beauty score — calculated on save, stored for leaderboard
  beautyScore: Schemas.Int,
  // Beauty decoration slots — 3 slots, each holds an objectId (0 = empty)
  beautySlots: Schemas.Array(Schemas.Int),
  totalLikesReceived: Schemas.Int,
  mailbox: Schemas.Array(MailboxRewardSchema),
})

// ---------------------------------------------------------------------------
// Player registry entry — used in the Farmers Directory
// ---------------------------------------------------------------------------
const PlayerEntrySchema = Schemas.Map({
  address:     Schemas.String,
  level:       Schemas.Int,
  displayName: Schemas.String,
})

// ---------------------------------------------------------------------------
// Leaderboard entry — used in the Beauty Leaderboard
// ---------------------------------------------------------------------------
const LeaderboardEntrySchema = Schemas.Map({
  rank:         Schemas.Int,
  address:      Schemas.String,
  displayName:  Schemas.String,
  beautyScore:  Schemas.Int,
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

  /** Client → Server: fetch a page of known players */
  loadPlayerRegistry: Schemas.Map({ page: Schemas.Int }),

  /** Server → Client: paginated player list */
  playerRegistryLoaded: Schemas.Map({
    players:    Schemas.Array(PlayerEntrySchema),
    totalPages: Schemas.Int,
    page:       Schemas.Int,
  }),

  /** Client → Server: request the beauty leaderboard (top N farms) */
  loadBeautyLeaderboard: Schemas.Map({}),

  /** Server → Client: beauty leaderboard response */
  beautyLeaderboardLoaded: Schemas.Map({
    requester:      Schemas.String, // filter on client — same pattern as farmStateLoaded
    entries:        Schemas.Array(LeaderboardEntrySchema),
    currentRank:    Schemas.Int,   // 0 = not ranked
    currentScore:   Schemas.Int,
  }),

  /** Client → Server: load another player's farm for viewing */
  loadOtherFarm: Schemas.Map({ address: Schemas.String }),

  /** Server → Client: another player's farm payload */
  otherFarmLoaded: Schemas.Map({
    requester: Schemas.String,
    address:   Schemas.String,
    payload:   FarmStateSchema,
  }),

  /** Server → Client: error loading another player's farm */
  otherFarmError: Schemas.Map({
    requester: Schemas.String,
    address:   Schemas.String,
    reason:    Schemas.String,
  }),

  socialLikeFarm: Schemas.Map({
    targetWallet: Schemas.String,
  }),

  socialLikeResult: Schemas.Map({
    requester:    Schemas.String,
    targetWallet: Schemas.String,
    success:      Schemas.Boolean,
    reason:       Schemas.String,
    likeCount:    Schemas.Int,
    rewardCoins:  Schemas.Int,
  }),

  collectMailbox: Schemas.Map({}),

  mailboxCollected: Schemas.Map({
    requester: Schemas.String,
    success:   Schemas.Boolean,
    coins:     Schemas.Int,
    seeds:     Schemas.Array(CropCountSchema),
    rewards:   Schemas.Array(MailboxRewardSchema),
  }),

  socialOwnerRewardReceived: Schemas.Map({
    ownerWallet: Schemas.String,
    reward: Schemas.Map({
      id:          Schemas.String,
      type:        Schemas.String,
      reason:      Schemas.String,
      amount:      Schemas.Int,
      cropType:    Schemas.Int,
      fromAddress: Schemas.String,
      fromName:    Schemas.String,
      createdAt:   Schemas.Int64,
    }),
    totalLikesReceived: Schemas.Int,
    notificationText:   Schemas.String,
  }),

  /** Client → Server: visitor requests to water a plot on the farm they are visiting */
  visitorWaterPlot: Schemas.Map({
    targetWallet: Schemas.String,
    plotIndex:    Schemas.Int,
  }),

  /** Server → Client (visitor): result of a visitor water attempt */
  visitorWaterResult: Schemas.Map({
    requester:    Schemas.String,
    targetWallet: Schemas.String,
    plotIndex:    Schemas.Int,
    success:      Schemas.Boolean,
    reason:       Schemas.String,
  }),

  /** Server → Client (owner): notification that a visitor watered a crop */
  socialOwnerWaterReceived: Schemas.Map({
    ownerWallet:      Schemas.String,
    reward: Schemas.Map({
      id:          Schemas.String,
      type:        Schemas.String,
      reason:      Schemas.String,
      amount:      Schemas.Int,
      cropType:    Schemas.Int,
      fromAddress: Schemas.String,
      fromName:    Schemas.String,
      createdAt:   Schemas.Int64,
    }),
    notificationText: Schemas.String,
  }),
}

export const room = registerMessages(FarmMessages)

// ---------------------------------------------------------------------------
// Re-export types so other modules can use them without re-importing Schemas
// ---------------------------------------------------------------------------
export type PlotSaveState = {
  plotIndex:     number
  isUnlocked:    boolean
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

export type MailboxReward = {
  id:          string
  type:        string
  reason:      string
  amount:      number
  cropType:    number
  fromAddress: string
  fromName:    string
  createdAt:   number
}

export type QuestProgressSave = {
  id:      string
  current: number
  status:  string
}

export type PlayerEntry = {
  address:     string
  level:       number
  displayName: string
}

export type LeaderboardEntry = {
  rank:        number
  address:     string
  displayName: string
  beautyScore: number
}

export type BeautyLeaderboardResponse = {
  requester:    string
  entries:      LeaderboardEntry[]
  currentRank:  number
  currentScore: number
}

export type PlayerRegistryResponse = {
  players:    PlayerEntry[]
  totalPages: number
  page:       number
}

export type FarmStatePayload = {
  wallet:   string
  coins:    number
  seeds:    CropCount[]
  harvested: CropCount[]
  xp:       number
  level:    number
  cropsUnlocked:      boolean
  expansion1Unlocked: boolean
  expansion2Unlocked: boolean
  farmerHired:        boolean
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
  claimedRewards: number[]
  plotStates:     PlotSaveState[]
  questProgress:  QuestProgressSave[]
  musicSongId:    string
  musicMuted:     boolean
  musicVolume:    number
  beautyScore:    number
  beautySlots:    number[]
  totalLikesReceived: number
  mailbox: MailboxReward[]
}
