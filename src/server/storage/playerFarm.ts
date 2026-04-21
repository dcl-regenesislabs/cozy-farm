import { Storage } from '@dcl/sdk/server'
import type { FarmStatePayload, PlotSaveState, CropCount, QuestProgressSave, PlayerEntry, MailboxReward } from '../../shared/farmMessages'
import { calculateBeautyScore } from '../../game/beautyScore'

// ---------------------------------------------------------------------------
// Storage keys + schema version
// ---------------------------------------------------------------------------
const FARM_KEY = 'farm_v1'
const SCHEMA_VERSION = 2
const LIKE_COOLDOWN_MS = 24 * 60 * 60 * 1000
const LIKE_LEDGER_TTL_MS = 14 * LIKE_COOLDOWN_MS

type LikeLedgerEntry = {
  visitorAddress: string
  lastLikedAt:    number
}

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
  beautyScore:    number
  totalLikesReceived: number
  mailbox:        MailboxReward[]
  likeLedger:     LikeLedgerEntry[]
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
    beautyScore:    0,
    totalLikesReceived: 0,
    mailbox:        [],
    likeLedger:     [],
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
    beautyScore:         safeInt(maybe.beautyScore, 0),
    totalLikesReceived:  safeInt(maybe.totalLikesReceived, 0),
    mailbox:             safeArray<MailboxReward>(maybe.mailbox),
    likeLedger:          safeArray<LikeLedgerEntry>(maybe.likeLedger)
      .filter((entry) => typeof entry?.visitorAddress === 'string')
      .map((entry) => ({
        visitorAddress: entry.visitorAddress.toLowerCase(),
        lastLikedAt:    safeInt(entry.lastLikedAt, 0),
      })),
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
    beautyScore:         save.beautyScore,
    totalLikesReceived:  save.totalLikesReceived,
    mailbox:             save.mailbox,
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
      // Always recalculate on server — client value is advisory, server is authoritative
      beautyScore:         calculateBeautyScore(payload),
      totalLikesReceived:  existing.totalLikesReceived,
      mailbox:             existing.mailbox,
      likeLedger:          existing.likeLedger,
      updatedAt:           Date.now(),
    }

    // Sanity guard: never allow coins to drop below 0
    updated.coins = Math.max(0, updated.coins)

    this.cache.set(key, updated)
    this.dirty.add(key)

    // Keep existing reference up-to-date for any in-flight code that holds it
    Object.assign(existing, updated)
  }

  async likeFarm(targetAddress: string, visitorAddress: string, visitorName: string): Promise<{
    success: boolean
    reason: string
    likeCount: number
    rewardCoins: number
  }> {
    const target  = targetAddress.toLowerCase()
    const visitor = visitorAddress.toLowerCase()
    if (!target || !visitor) {
      return { success: false, reason: 'invalid_request', likeCount: 0, rewardCoins: 0 }
    }
    if (target === visitor) {
      const ownFarm = await this.load(target)
      return {
        success: false,
        reason: 'cannot_like_own_farm',
        likeCount: ownFarm.totalLikesReceived,
        rewardCoins: 0,
      }
    }

    const farm = await this.load(target)
    const now  = Date.now()
    farm.likeLedger = farm.likeLedger.filter((entry) => now - entry.lastLikedAt <= LIKE_LEDGER_TTL_MS)

    const existing = farm.likeLedger.find((entry) => entry.visitorAddress === visitor)
    if (existing && now - existing.lastLikedAt < LIKE_COOLDOWN_MS) {
      return {
        success: false,
        reason: 'already_liked_today',
        likeCount: farm.totalLikesReceived,
        rewardCoins: 0,
      }
    }

    const rewardCoins = 10 + Math.floor(Math.random() * 16)
    if (existing) existing.lastLikedAt = now
    else farm.likeLedger.push({ visitorAddress: visitor, lastLikedAt: now })

    farm.totalLikesReceived += 1
    farm.mailbox.unshift({
      id:          `like:${now}:${visitor.slice(2, 10)}`,
      type:        'coins',
      reason:      'like',
      amount:      rewardCoins,
      cropType:    -1,
      fromAddress: visitor,
      fromName:    visitorName || visitor.slice(0, 8),
      createdAt:   now,
    })
    farm.updatedAt = now
    this.dirty.add(target)

    return {
      success: true,
      reason: 'ok',
      likeCount: farm.totalLikesReceived,
      rewardCoins,
    }
  }

  async collectMailbox(address: string): Promise<{
    rewards: MailboxReward[]
    coins: number
    seeds: CropCount[]
  }> {
    const key = address.toLowerCase()
    const farm = await this.load(key)
    const rewards = [...farm.mailbox]
    const seedTotals = new Map<number, number>()
    let coins = 0

    for (const reward of rewards) {
      if (reward.type === 'coins') {
        coins += reward.amount
        continue
      }
      if (reward.type === 'seeds' && reward.cropType >= 0) {
        seedTotals.set(reward.cropType, (seedTotals.get(reward.cropType) ?? 0) + reward.amount)
      }
    }

    farm.mailbox = []
    farm.updatedAt = Date.now()
    this.dirty.add(key)

    return {
      rewards,
      coins,
      seeds: [...seedTotals.entries()].map(([cropType, count]) => ({ cropType, count })),
    }
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

// ---------------------------------------------------------------------------
// Scene-scoped (global) player registry — list of all players who have saved
// ---------------------------------------------------------------------------
const REGISTRY_KEY       = 'player_registry'
const REGISTRY_PAGE_SIZE = 10
const REGISTRY_MAX       = 1000

type RegistryEntry = { address: string; level: number; displayName: string; beautyScore: number; updatedAt: number }

export async function updatePlayerRegistry(address: string, level: number, displayName: string, beautyScore = 0): Promise<void> {
  const normalized = address.toLowerCase()
  const raw = (await Storage.get<RegistryEntry[]>(REGISTRY_KEY)) ?? []
  const filtered = Array.isArray(raw) ? raw.filter((e) => e.address !== normalized) : []
  filtered.unshift({ address: normalized, level, displayName, beautyScore, updatedAt: Date.now() })
  if (filtered.length > REGISTRY_MAX) filtered.length = REGISTRY_MAX
  await Storage.set(REGISTRY_KEY, filtered)
}

export async function loadBeautyLeaderboard(
  requesterAddress: string,
  topN = 20,
): Promise<{ entries: { rank: number; address: string; displayName: string; beautyScore: number }[]; currentRank: number; currentScore: number }> {
  const fetched = await Storage.get<RegistryEntry[]>(REGISTRY_KEY)
  const raw = Array.isArray(fetched) ? fetched : []

  // Sort by beauty score descending, then by updatedAt as tiebreaker
  const sorted = [...raw].sort((a, b) => {
    const diff = (b.beautyScore ?? 0) - (a.beautyScore ?? 0)
    return diff !== 0 ? diff : b.updatedAt - a.updatedAt
  })

  const normalized = requesterAddress.toLowerCase()
  let currentRank  = 0
  let currentScore = 0

  const allRanked = sorted.map((entry, idx) => {
    if (entry.address === normalized) {
      currentRank  = idx + 1
      currentScore = entry.beautyScore ?? 0
    }
    return {
      rank:        idx + 1,
      address:     entry.address,
      displayName: entry.displayName ?? '',
      beautyScore: entry.beautyScore ?? 0,
    }
  })

  return { entries: allRanked.slice(0, topN), currentRank, currentScore }
}

export async function loadPlayerRegistryPage(
  page: number
): Promise<{ players: PlayerEntry[]; totalPages: number }> {
  const fetched = await Storage.get<RegistryEntry[]>(REGISTRY_KEY)
  const raw = Array.isArray(fetched) ? fetched : []
  console.log(`[PlayerFarm] registry raw length: ${raw.length}`)
  const totalPages = Math.max(1, Math.ceil(raw.length / REGISTRY_PAGE_SIZE))
  const safePage   = Math.max(0, Math.min(page, totalPages - 1))
  const slice      = raw.slice(safePage * REGISTRY_PAGE_SIZE, (safePage + 1) * REGISTRY_PAGE_SIZE)
  return {
    players: slice.map(({ address, level, displayName }) => ({ address, level, displayName: displayName ?? '' })),
    totalPages,
  }
}
