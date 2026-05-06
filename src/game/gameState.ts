import { Entity } from '@dcl/sdk/ecs'
import { CropType } from '../data/cropData'
import { FertilizerType } from '../data/fertilizerData'
import type { MailboxReward } from '../shared/farmMessages'

export type MenuType = 'none' | 'plant' | 'fertilize' | 'shop' | 'sell' | 'unlock' | 'farmer' | 'npcDialog' | 'inventory' | 'stats' | 'quests' | 'farm' | 'jukebox' | 'expansion1' | 'expansion2' | 'mailbox' | 'compost' | 'leaderboard' | 'animals' | 'plotGroupUnlock'

export const playerState = {
  coins: 0,
  seeds: new Map<CropType, number>(),
  harvested: new Map<CropType, number>(),
  activeMenu: 'none' as MenuType,
  activePlotEntity: null as Entity | null,
  cropsUnlocked: false,
  expansion1Unlocked: false,
  expansion2Unlocked: false,
  farmerHired: false,
  farmerSeeds: new Map<CropType, number>(),
  farmerInventory: new Map<CropType, number>(),
  workerOutstandingWages: 0,
  workerUnpaidDays: 0,
  workerLastWageProcessedAt: 0,
  // Leveling
  xp: 0,
  level: 1,
  // Player identity (populated async from getUserData)
  wallet: '',         // lowercase wallet address — used as server-side key
  userId: '',         // DCL userId (for avatar texture)
  avatarUrl: '',
  displayName: '',
  // Dog companion
  dogOwned: false,
  // Lifetime counters (for quests + profile stats)
  totalCropsHarvested: 0,
  totalWaterCount: 0,
  totalSeedPlanted: 0,
  totalSellCount: 0,
  totalCoinsEarned: 0,
  // Level rewards — stores level numbers the player has manually claimed
  claimedRewards: [] as number[],
  // Beauty score — cached after each save/load, read by StatsPanel
  beautyScore: 0,
  // Beauty decoration slots — 3 entries, each holds an objectId (0 = empty)
  beautySlots: [0, 0, 0] as number[],
  totalLikesReceived: 0,
  mailbox: [] as MailboxReward[],
  mailboxSeenCount: 0,
  socialToastText: '',
  socialToastExpiresAt: 0,
  // Visit mode — null means viewing own farm, address means visiting someone else
  viewingFarm: null as string | null,
  // Fertilizer system
  organicWaste: 0,
  fertilizers: new Map<FertilizerType, number>(),
  compostWasteCount: 0,
  compostLastCollectedAt: 0,
  // Animal system
  chickenCoopUnlocked: false,
  grainCount: 0,
  eggsCount: 0,
  chickenLastProducedAt: 0,
  totalEggsCollected: 0,
  pigPenUnlocked: false,
  vegetableScraps: 0,
  manureCount: 0,
  pigLastProducedAt: 0,
  totalManureCollected: 0,
  compostBinUnlocked: false,
  // Progression events (Level 5 Mayor return, etc.)
  rotSystemUnlocked: false,
  progressionEventStep: '',
  // NPC scheduling
  lastNpcVisitAt: 0,
  npcScheduleIndex: 0,
  viewingFarmDisplayName: '',
  // Tracks how many plots this visitor has watered in the current visit session (max 5)
  visitorSessionWaterCount: 0,
  // Runtime-only: compost bin uses 12s tutorial cycle during the Level 5 event
  tutorialCompostCycle: false,
  // Plot group unlock tracking
  unlockedPlotGroups: [] as string[],      // group names purchased via coins
  activePlotGroupName: '',                  // set before opening 'plotGroupUnlock' menu
}
