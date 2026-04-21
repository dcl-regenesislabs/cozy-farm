import { Entity } from '@dcl/sdk/ecs'
import { CropType } from '../data/cropData'
import type { MailboxReward } from '../shared/farmMessages'

export type MenuType = 'none' | 'plant' | 'shop' | 'sell' | 'unlock' | 'farmer' | 'npcDialog' | 'inventory' | 'stats' | 'quests' | 'farm' | 'jukebox' | 'expansion1' | 'expansion2' | 'mailbox' | 'leaderboard'

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
  totalLikesReceived: 0,
  mailbox: [] as MailboxReward[],
  // Visit mode — null means viewing own farm, address means visiting someone else
  viewingFarm: null as string | null,
}
