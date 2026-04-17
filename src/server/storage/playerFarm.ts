import { Storage } from '@dcl/sdk/server'
import type { FarmStatePayload, PlotSaveState, CropCount, QuestProgressSave } from '../../shared/farmMessages'

// ---------------------------------------------------------------------------
// Storage keys + schema version
// ---------------------------------------------------------------------------
const FARM_KEY = 'farm_v1'
const SCHEMA_VERSION = 2

// ---------------------------------------------------------------------------
// Persisted type — what actually goes into Storage
// ---------------------------------------------------------------------------
export type FarmSaveV1 = {
  schemaVersion: number
  wallet:        string
  coins:         number
  seeds:         CropCount[]
  harvested:     CropCount[]
  xp:            number
  level:         number
  cropsUnlocked:      boolean
  expansion1Unlocked: boolean
  expansion2Unlocked: boolean
  farmerHired:        boolean
  farmerSeeds:      CropCount[]
  farmerInventory:  CropCount[]
  dogOwned:         boolean
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
  updatedAt:      number
}

// ---------------------------------------------------------------------------
// Default state for a brand-new player (matches economy.md Phase 1)
// ---------------------------------------------------------------------------
function emptyFarm(wallet: string): FarmSaveV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet,
    coins: 0,
    seeds: [],
    harvested: [],
    xp: 0,
    level: 1,
    cropsUnlocked: false,
    expansion1Unlocked: false,
    expansion2Unlocked: false,
    farmerHired: false,
    farmerSeeds: [],
    farmerInventory: [],
    dogOwned: false,
    totalCropsHarvested: 0,
    totalWaterCount: 0,
    totalSeedPlanted: 0,
    totalSellCount: 0,
    totalCoinsEarned: 0,
    tutorialComplete: false,
    tutorialStep: 'welcome',
    tutorialSeedsBought: 0,
    tutorialHarvestMore: 0,
    claimedRewards: [],
    plotStates:     [],
    questProgress:  [],
    musicSongId:    'a_la_fresca',
    musicMuted:     false,
    musicVolume:    0.42,
    updatedAt:      Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Normalize data coming from Storage (handles missing fields on schema bumps)
// ---------------------------------------------------------------------------
function normalizeFarm(raw: unknown, wallet: string): FarmSaveV1 {
  const maybe = raw as Partial<FarmSaveV1> | null
  if (!maybe || maybe.schemaVersion !== SCHEMA_VERSION) return emptyFarm(wallet)

  const safeInt    = (v: unknown, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback
  const safeBool   = (v: unknown, fallback = false): boolean =>
    typeof v === 'boolean' ? v : fallback
  const safeStr    = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : fallback
  const safeArray  = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

  return {
    schemaVersion: SCHEMA_VERSION,
    wallet:        safeStr(maybe.wallet, wallet),
    coins:         safeInt(maybe.coins, 0),
    seeds:         safeArray<CropCount>(maybe.seeds),
    harvested:     safeArray<CropCount>(maybe.harvested),
    xp:            safeInt(maybe.xp),
    level:         Math.max(1, safeInt(maybe.level, 1)),
    cropsUnlocked:      safeBool(maybe.cropsUnlocked),
    expansion1Unlocked: safeBool(maybe.expansion1Unlocked),
    expansion2Unlocked: safeBool(maybe.expansion2Unlocked),
    farmerHired:        safeBool(maybe.farmerHired),
    farmerSeeds:      safeArray<CropCount>(maybe.farmerSeeds),
    farmerInventory:  safeArray<CropCount>(maybe.farmerInventory),
    dogOwned:         safeBool(maybe.dogOwned),
    totalCropsHarvested: safeInt(maybe.totalCropsHarvested),
    totalWaterCount:     safeInt(maybe.totalWaterCount),
    totalSeedPlanted:    safeInt(maybe.totalSeedPlanted),
    totalSellCount:      safeInt(maybe.totalSellCount),
    totalCoinsEarned:    safeInt(maybe.totalCoinsEarned),
    tutorialComplete:    safeBool(maybe.tutorialComplete),
    tutorialStep:        safeStr(maybe.tutorialStep, 'welcome'),
    tutorialSeedsBought: safeInt(maybe.tutorialSeedsBought),
    tutorialHarvestMore: safeInt(maybe.tutorialHarvestMore),
    claimedRewards:      safeArray<number>(maybe.claimedRewards),
    plotStates:          safeArray<PlotSaveState>(maybe.plotStates),
    questProgress:       safeArray<QuestProgressSave>(maybe.questProgress),
    musicSongId:         safeStr(maybe.musicSongId, 'a_la_fresca'),
    musicMuted:          safeBool(maybe.musicMuted),
    musicVolume:         typeof maybe.musicVolume === 'number' ? maybe.musicVolume : 0.42,
    updatedAt:           safeInt(maybe.updatedAt, Date.now()),
  }
}

// ---------------------------------------------------------------------------
// Convert storage record → wire payload (same shape, just drops schemaVersion)
// ---------------------------------------------------------------------------
export function farmSaveToPayload(save: FarmSaveV1): FarmStatePayload {
  return {
    wallet:              save.wallet,
    coins:               save.coins,
    seeds:               save.seeds,
    harvested:           save.harvested,
    xp:                  save.xp,
    level:               save.level,
    cropsUnlocked:       save.cropsUnlocked,
    expansion1Unlocked:  save.expansion1Unlocked,
    expansion2Unlocked:  save.expansion2Unlocked,
    farmerHired:         save.farmerHired,
    farmerSeeds:         save.farmerSeeds,
    farmerInventory:     save.farmerInventory,
    dogOwned:            save.dogOwned,
    totalCropsHarvested: save.totalCropsHarvested,
    totalWaterCount:     save.totalWaterCount,
    totalSeedPlanted:    save.totalSeedPlanted,
    totalSellCount:      save.totalSellCount,
    totalCoinsEarned:    save.totalCoinsEarned,
    tutorialComplete:    save.tutorialComplete,
    tutorialStep:        save.tutorialStep,
    tutorialSeedsBought: save.tutorialSeedsBought,
    tutorialHarvestMore: save.tutorialHarvestMore,
    claimedRewards:      save.claimedRewards,
    plotStates:          save.plotStates,
    questProgress:       save.questProgress,
    musicSongId:         save.musicSongId,
    musicMuted:          save.musicMuted,
    musicVolume:         save.musicVolume,
  }
}

// ---------------------------------------------------------------------------
// FarmProgressStore — cache + dirty-set pattern
// ---------------------------------------------------------------------------
export class FarmProgressStore {
  private cache = new Map<string, FarmSaveV1>()
  private dirty = new Set<string>()

  async load(address: string): Promise<FarmSaveV1> {
    const key = address.toLowerCase()
    const cached = this.cache.get(key)
    if (cached) return cached

    const raw = await Storage.player.get<unknown>(key, FARM_KEY)
    const farm = normalizeFarm(raw, key)
    this.cache.set(key, farm)
    // Always write canonical format on first load
    this.dirty.add(key)
    return farm
  }

  get(address: string): FarmSaveV1 | null {
    return this.cache.get(address.toLowerCase()) ?? null
  }

  applyPayload(address: string, payload: FarmStatePayload): void {
    const key = address.toLowerCase()
    const existing = this.cache.get(key) ?? emptyFarm(key)

    const updated: FarmSaveV1 = {
      schemaVersion:       SCHEMA_VERSION,
      wallet:              key,
      coins:               payload.coins,
      seeds:               payload.seeds,
      harvested:           payload.harvested,
      xp:                  payload.xp,
      level:               payload.level,
      cropsUnlocked:       payload.cropsUnlocked,
      expansion1Unlocked:  payload.expansion1Unlocked,
      expansion2Unlocked:  payload.expansion2Unlocked,
      farmerHired:         payload.farmerHired,
      farmerSeeds:         payload.farmerSeeds,
      farmerInventory:     payload.farmerInventory,
      dogOwned:            payload.dogOwned,
      totalCropsHarvested: payload.totalCropsHarvested,
      totalWaterCount:     payload.totalWaterCount,
      totalSeedPlanted:    payload.totalSeedPlanted,
      totalSellCount:      payload.totalSellCount,
      totalCoinsEarned:    payload.totalCoinsEarned,
      tutorialComplete:    payload.tutorialComplete,
      tutorialStep:        payload.tutorialStep,
      tutorialSeedsBought: payload.tutorialSeedsBought,
      tutorialHarvestMore: payload.tutorialHarvestMore,
      claimedRewards:      payload.claimedRewards,
      plotStates:          payload.plotStates,
      questProgress:       payload.questProgress,
      musicSongId:         payload.musicSongId,
      musicMuted:          payload.musicMuted,
      musicVolume:         payload.musicVolume,
      updatedAt:           Date.now(),
    }

    // Sanity guard: never allow coins to drop below 0
    updated.coins = Math.max(0, updated.coins)

    this.cache.set(key, updated)
    this.dirty.add(key)

    // Keep existing reference up-to-date for any in-flight code that holds it
    Object.assign(existing, updated)
  }

  async save(address: string): Promise<void> {
    const key = address.toLowerCase()
    const state = this.cache.get(key)
    if (!state) return
    await Storage.player.set(key, FARM_KEY, state)
    this.dirty.delete(key)
  }

  async saveDirty(): Promise<void> {
    const addresses = [...this.dirty]
    if (!addresses.length) return
    await Promise.all(addresses.map((addr) => this.save(addr)))
  }

  async saveAndEvict(address: string): Promise<void> {
    const key = address.toLowerCase()
    await this.save(key)
    this.cache.delete(key)
    this.dirty.delete(key)
  }
}

export function createFarmProgressStore(): FarmProgressStore {
  return new FarmProgressStore()
}
