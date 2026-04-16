import { Entity } from '@dcl/sdk/ecs'
import { CropType } from '../data/cropData'

export type MenuType = 'none' | 'plant' | 'shop' | 'sell' | 'unlock' | 'farmer' | 'npcDialog' | 'inventory' | 'stats' | 'quests' | 'farm' | 'jukebox'

export const playerState = {
  coins: 0,
  seeds: new Map<CropType, number>(),
  harvested: new Map<CropType, number>(),
  activeMenu: 'none' as MenuType,
  activePlotEntity: null as Entity | null,
  cropsUnlocked: false,
  farmerHired: false,
  farmerSeeds: new Map<CropType, number>(),
  farmerInventory: new Map<CropType, number>(),
  // Leveling
  xp: 0,
  level: 1,
  // Player identity (populated async from getUserData)
  userId: '',
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
}
