import { Storage } from '@dcl/sdk/server'
import type { FarmStatePayload, PlotSaveState, CropCount, FertilizerCount, QuestProgressSave, PlayerEntry, MailboxReward } from '../../shared/farmMessages'
import { calculateBeautyScore } from '../../game/beautyScore'
import { WORKER_DAILY_WAGE, WORKER_DAY_MS } from '../../shared/worker'
import { CROP_DATA, CropType } from '../../data/cropData'
import { QUEST_DEFINITIONS } from '../../data/questData'
import { XP_HARVEST_TIER1, XP_HARVEST_TIER2, XP_HARVEST_TIER3, XP_PLANT, XP_TABLE, XP_WATER } from '../../shared/leveling'

// ---------------------------------------------------------------------------
// Storage keys + schema version
// ---------------------------------------------------------------------------
const FARM_KEY = 'farm_v1'
const SCHEMA_VERSION = 4
const LIKE_COOLDOWN_MS = 24 * 60 * 60 * 1000
const LIKE_LEDGER_TTL_MS = 14 * LIKE_COOLDOWN_MS
const WATER_LEDGER_TTL_MS = 7 * 24 * 60 * 60 * 1000
const VISITOR_WATER_DAILY_LIMIT = 5
const WORKER_OFFLINE_ACTION_MS = 8_000
const WORKER_OFFLINE_MAX_ACTIONS = 500_000

function mergeStringArrays(existing: string[], incoming: string[]): string[] {
  const merged = new Set([...existing, ...incoming])
  return Array.from(merged)
}

type LikeLedgerEntry = {
  visitorAddress: string
  lastLikedAt:    number
}

type VisitorWaterLedgerEntry = {
  visitorAddress: string
  plotIndex:      number
  cropPlantedAt:  number
  wateredAt:      number
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
  cropsUnlocked:       boolean
  expansion1Unlocked:  boolean
  expansion2Unlocked:  boolean
  unlockedPlotGroups:  string[]
  farmerHired:         boolean
  farmerSeeds:      CropCount[]
  farmerInventory:  CropCount[]
  workerOutstandingWages: number
  workerUnpaidDays:       number
  workerLastWageProcessedAt: number
  workerLastSimulatedAt: number
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
  organicWaste:            number
  fertilizers:             FertilizerCount[]
  compostWasteCount:       number
  compostLastCollectedAt:  number
  // Animal system
  chickenCoopUnlocked:     boolean
  grainCount:              number
  eggsCount:               number
  chickenLastProducedAt:   number
  totalEggsCollected:      number
  pigPenUnlocked:          boolean
  vegetableScraps:         number
  manureCount:             number
  pigLastProducedAt:       number
  totalManureCollected:    number
  compostBinUnlocked:      boolean
  rotSystemUnlocked:       boolean
  progressionEventStep:    string
  lastNpcVisitAt:          number
  npcScheduleIndex:        number
  beautyScore:    number
  beautySlots:    number[]
  totalLikesReceived: number
  mailbox:        MailboxReward[]
  likeLedger:     LikeLedgerEntry[]
  waterLedger:    VisitorWaterLedgerEntry[]
  updatedAt:      number
}

// ---------------------------------------------------------------------------
// Default state for a brand-new player (matches economy.md Phase 1)
// ---------------------------------------------------------------------------
export function emptyFarm(wallet: string): FarmSaveV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet,
    coins: 0,
    seeds: [],
    harvested: [],
    xp: 0,
    level: 1,
    cropsUnlocked:      false,
    expansion1Unlocked: false,
    expansion2Unlocked: false,
    unlockedPlotGroups: [],
    farmerHired:        false,
    farmerSeeds: [],
    farmerInventory: [],
    workerOutstandingWages: 0,
    workerUnpaidDays: 0,
    workerLastWageProcessedAt: 0,
    workerLastSimulatedAt: 0,
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
    organicWaste:            0,
    fertilizers:             [],
    compostWasteCount:       0,
    compostLastCollectedAt:  0,
    chickenCoopUnlocked:     false,
    grainCount:              0,
    eggsCount:               0,
    chickenLastProducedAt:   0,
    totalEggsCollected:      0,
    pigPenUnlocked:          false,
    vegetableScraps:         0,
    manureCount:             0,
    pigLastProducedAt:       0,
    totalManureCollected:    0,
    compostBinUnlocked:      false,
    rotSystemUnlocked:       false,
    progressionEventStep:    '',
    lastNpcVisitAt:          0,
    npcScheduleIndex:        0,
    beautyScore:    0,
    beautySlots:    [0, 0, 0],
    totalLikesReceived: 0,
    mailbox:        [],
    likeLedger:     [],
    waterLedger:    [],
    updatedAt:      Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Normalize a single PlotSaveState entry (handles missing fields from older saves)
// ---------------------------------------------------------------------------
function normalizePlotSave(raw: Partial<PlotSaveState>): PlotSaveState {
  const safeInt  = (v: unknown, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback
  const safeBool = (v: unknown, fallback = false): boolean =>
    typeof v === 'boolean' ? v : fallback
  return {
    plotIndex:      safeInt((raw as any).plotIndex),
    isUnlocked:     safeBool((raw as any).isUnlocked),
    cropType:       safeInt((raw as any).cropType, -1),
    plantedAt:      safeInt((raw as any).plantedAt),
    waterCount:     safeInt((raw as any).waterCount),
    growthStarted:  safeBool((raw as any).growthStarted),
    growthStage:    safeInt((raw as any).growthStage),
    isReady:        safeBool((raw as any).isReady),
    isRotten:       safeBool((raw as any).isRotten, false),
    fertilizerType: safeInt((raw as any).fertilizerType, -1),
  }
}

// ---------------------------------------------------------------------------
// Normalize data coming from Storage (handles missing fields on schema bumps)
// ---------------------------------------------------------------------------
function normalizeFarm(raw: unknown, wallet: string): FarmSaveV1 {
  const maybe = raw as Partial<FarmSaveV1> | null
  if (!maybe || (maybe.schemaVersion ?? 0) < 3) return emptyFarm(wallet)

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
    cropsUnlocked:       safeBool(maybe.cropsUnlocked),
    expansion1Unlocked:  safeBool(maybe.expansion1Unlocked),
    expansion2Unlocked:  safeBool(maybe.expansion2Unlocked),
    unlockedPlotGroups:  safeArray<string>((maybe as any).unlockedPlotGroups),
    farmerHired:         safeBool(maybe.farmerHired),
    farmerSeeds:      safeArray<CropCount>(maybe.farmerSeeds),
    farmerInventory:  safeArray<CropCount>(maybe.farmerInventory),
    workerOutstandingWages: safeInt(maybe.workerOutstandingWages, 0),
    workerUnpaidDays:       safeInt(maybe.workerUnpaidDays, 0),
    workerLastWageProcessedAt: safeInt(maybe.workerLastWageProcessedAt, 0),
    workerLastSimulatedAt: safeInt(maybe.workerLastSimulatedAt, safeInt(maybe.updatedAt, Date.now())),
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
    plotStates:          safeArray<Partial<PlotSaveState>>(maybe.plotStates).map(normalizePlotSave),
    questProgress:       safeArray<QuestProgressSave>(maybe.questProgress),
    musicSongId:         safeStr(maybe.musicSongId, 'a_la_fresca'),
    musicMuted:          safeBool(maybe.musicMuted),
    musicVolume:         typeof maybe.musicVolume === 'number' ? maybe.musicVolume : 0.42,
    organicWaste:            safeInt((maybe as any).organicWaste, 0),
    fertilizers:             safeArray<FertilizerCount>((maybe as any).fertilizers),
    compostWasteCount:       safeInt((maybe as any).compostWasteCount, 0),
    compostLastCollectedAt:  safeInt((maybe as any).compostLastCollectedAt, 0),
    chickenCoopUnlocked:     safeBool((maybe as any).chickenCoopUnlocked),
    grainCount:              safeInt((maybe as any).grainCount, 0),
    eggsCount:               safeInt((maybe as any).eggsCount, 0),
    chickenLastProducedAt:   safeInt((maybe as any).chickenLastProducedAt, 0),
    totalEggsCollected:      safeInt((maybe as any).totalEggsCollected, 0),
    pigPenUnlocked:          safeBool((maybe as any).pigPenUnlocked),
    vegetableScraps:         safeInt((maybe as any).vegetableScraps, 0),
    manureCount:             safeInt((maybe as any).manureCount, 0),
    pigLastProducedAt:       safeInt((maybe as any).pigLastProducedAt, 0),
    totalManureCollected:    safeInt((maybe as any).totalManureCollected, 0),
    compostBinUnlocked:      safeBool((maybe as any).compostBinUnlocked, false),
    rotSystemUnlocked:       safeBool((maybe as any).rotSystemUnlocked, false),
    progressionEventStep:    safeStr((maybe as any).progressionEventStep, ''),
    lastNpcVisitAt:          safeInt((maybe as any).lastNpcVisitAt, 0),
    npcScheduleIndex:        safeInt((maybe as any).npcScheduleIndex, 0),
    beautyScore:         safeInt(maybe.beautyScore, 0),
    beautySlots:         safeArray<number>(maybe.beautySlots).slice(0, 3).concat([0, 0, 0]).slice(0, 3),
    totalLikesReceived:  safeInt(maybe.totalLikesReceived, 0),
    mailbox:             safeArray<MailboxReward>(maybe.mailbox),
    likeLedger:          safeArray<LikeLedgerEntry>(maybe.likeLedger)
      .filter((entry) => typeof entry?.visitorAddress === 'string')
      .map((entry) => ({
        visitorAddress: entry.visitorAddress.toLowerCase(),
        lastLikedAt:    safeInt(entry.lastLikedAt, 0),
      })),
    waterLedger:         safeArray<VisitorWaterLedgerEntry>(maybe.waterLedger)
      .filter((entry) => typeof entry?.visitorAddress === 'string')
      .map((entry) => ({
        visitorAddress: entry.visitorAddress.toLowerCase(),
        plotIndex:      safeInt(entry.plotIndex, 0),
        cropPlantedAt:  safeInt(entry.cropPlantedAt, 0),
        wateredAt:      safeInt(entry.wateredAt, 0),
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
    unlockedPlotGroups:  save.unlockedPlotGroups,
    farmerHired:         save.farmerHired,
    farmerSeeds:         save.farmerSeeds,
    farmerInventory:     save.farmerInventory,
    workerOutstandingWages: save.workerOutstandingWages,
    workerUnpaidDays:       save.workerUnpaidDays,
    workerLastWageProcessedAt: save.workerLastWageProcessedAt,
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
    organicWaste:            save.organicWaste,
    fertilizers:             save.fertilizers,
    compostWasteCount:       save.compostWasteCount,
    compostLastCollectedAt:  save.compostLastCollectedAt,
    chickenCoopUnlocked:     save.chickenCoopUnlocked,
    grainCount:              save.grainCount,
    eggsCount:               save.eggsCount,
    chickenLastProducedAt:   save.chickenLastProducedAt,
    totalEggsCollected:      save.totalEggsCollected,
    pigPenUnlocked:          save.pigPenUnlocked,
    vegetableScraps:         save.vegetableScraps,
    manureCount:             save.manureCount,
    pigLastProducedAt:       save.pigLastProducedAt,
    totalManureCollected:    save.totalManureCollected,
    compostBinUnlocked:      save.compostBinUnlocked,
    rotSystemUnlocked:       save.rotSystemUnlocked,
    progressionEventStep:    save.progressionEventStep,
    lastNpcVisitAt:          save.lastNpcVisitAt,
    npcScheduleIndex:        save.npcScheduleIndex,
    beautyScore:         save.beautyScore,
    beautySlots:         save.beautySlots,
    totalLikesReceived:  save.totalLikesReceived,
    mailbox:             save.mailbox,
  }
}

function addCropCount(counts: CropCount[], cropType: CropType, amount: number): void {
  if (amount <= 0) return
  const existing = counts.find((entry) => entry.cropType === cropType)
  if (existing) existing.count += amount
  else counts.push({ cropType, count: amount })
}

function consumeWorkerSeed(farm: FarmSaveV1): CropType | null {
  const seed = farm.farmerSeeds.find((entry) => entry.count > 0)
  if (!seed) return null
  seed.count -= 1
  if (seed.count <= 0) {
    farm.farmerSeeds = farm.farmerSeeds.filter((entry) => entry.count > 0)
  }
  return seed.cropType as CropType
}

function addFarmXp(farm: FarmSaveV1, amount: number): void {
  if (amount <= 0) return
  farm.xp += amount
  while (farm.level < XP_TABLE.length && farm.xp >= XP_TABLE[farm.level]) {
    farm.level += 1
  }
}

function updateQuestWaterProgress(farm: FarmSaveV1): void {
  for (const def of QUEST_DEFINITIONS) {
    const progress = farm.questProgress.find((entry) => entry.id === def.id)
    if (!progress || progress.status !== 'active' || def.type !== 'water_total') continue
    progress.current = Math.min(progress.current + 1, def.target)
    if (progress.current >= def.target) progress.status = 'claimable'
  }
}

function updateQuestPlantProgress(farm: FarmSaveV1): void {
  for (const def of QUEST_DEFINITIONS) {
    const progress = farm.questProgress.find((entry) => entry.id === def.id)
    if (!progress || progress.status !== 'active' || def.type !== 'plant_total') continue
    progress.current = Math.min(progress.current + 1, def.target)
    if (progress.current >= def.target) progress.status = 'claimable'
  }
}

function updateQuestHarvestProgress(farm: FarmSaveV1, cropType: CropType, amount: number): void {
  for (const def of QUEST_DEFINITIONS) {
    const progress = farm.questProgress.find((entry) => entry.id === def.id)
    if (!progress || progress.status !== 'active') continue

    if (def.type === 'harvest_total') {
      progress.current = Math.min(progress.current + amount, def.target)
    } else if (def.type === 'harvest_crop' && def.cropType === cropType) {
      progress.current = Math.min(progress.current + amount, def.target)
    } else {
      continue
    }

    if (progress.current >= def.target) progress.status = 'claimable'
  }
}

function syncOfflinePlotState(plot: PlotSaveState, at: number): void {
  if (plot.cropType === -1) {
    plot.growthStage = 0
    plot.isReady = false
    return
  }

  const def = CROP_DATA.get(plot.cropType as CropType)
  if (!def) {
    plot.cropType = -1
    plot.plantedAt = 0
    plot.waterCount = 0
    plot.growthStarted = false
    plot.growthStage = 0
    plot.isReady = false
    return
  }

  if (!plot.growthStarted || plot.plantedAt <= 0) {
    plot.growthStage = 0
    plot.isReady = false
    return
  }

  const elapsed = Math.max(0, at - plot.plantedAt)
  const progress = elapsed / def.growTimeMs
  plot.growthStage =
    progress >= 0.75 ? 3 :
    progress >= 0.5 ? 2 :
    progress >= 0.25 ? 1 : 0
  plot.isReady = progress >= 1
  if (plot.isReady) plot.growthStage = 3
}

function getOfflineWateringStatus(
  plot: PlotSaveState,
  at: number
): { canWater: boolean; nextWindowInMs: number | null } {
  if (plot.cropType === -1 || plot.isReady) {
    return { canWater: false, nextWindowInMs: null }
  }

  if (!plot.growthStarted) {
    return { canWater: plot.waterCount === 0, nextWindowInMs: null }
  }

  const def = CROP_DATA.get(plot.cropType as CropType)
  if (!def) return { canWater: false, nextWindowInMs: null }

  if (def.wateringsRequired <= 1) {
    return { canWater: false, nextWindowInMs: null }
  }

  const elapsed = at - plot.plantedAt
  let windowsOpened = 0
  let inOpenWindow = false
  let nextWindowInMs: number | null = null

  for (let k = 1; k < def.wateringsRequired; k++) {
    const windowStart = (k / def.wateringsRequired) * def.growTimeMs
    const windowEnd = ((k + 1) / def.wateringsRequired) * def.growTimeMs

    if (elapsed >= windowStart) {
      windowsOpened += 1
      if (elapsed < windowEnd) inOpenWindow = true
    } else if (nextWindowInMs === null) {
      nextWindowInMs = windowStart - elapsed
    }
  }

  return {
    canWater: inOpenWindow && plot.waterCount < 1 + windowsOpened,
    nextWindowInMs,
  }
}

// ---------------------------------------------------------------------------
// FarmProgressStore — cache + dirty-set pattern
// ---------------------------------------------------------------------------
export class FarmProgressStore {
  private cache = new Map<string, FarmSaveV1>()
  private dirty = new Set<string>()

  private getOfflineWorkerActiveUntil(farm: FarmSaveV1, now: number): number {
    if (!farm.farmerHired || farm.workerUnpaidDays >= 2) return farm.workerLastSimulatedAt
    if (farm.workerLastWageProcessedAt <= 0 || farm.workerLastWageProcessedAt > now) return farm.workerLastSimulatedAt

    let simulatedCoins = farm.coins
    let simulatedUnpaidDays = farm.workerUnpaidDays
    let checkpoint = farm.workerLastWageProcessedAt
    const elapsedDays = Math.floor((now - checkpoint) / WORKER_DAY_MS)

    for (let day = 0; day < elapsedDays; day++) {
      checkpoint += WORKER_DAY_MS
      if (simulatedCoins >= WORKER_DAILY_WAGE) {
        simulatedCoins -= WORKER_DAILY_WAGE
      } else {
        simulatedUnpaidDays += 1
        if (simulatedUnpaidDays >= 2) return checkpoint
      }
    }

    return now
  }

  private pickOfflineWorkerTask(
    farm: FarmSaveV1,
    workerPlots: PlotSaveState[],
    at: number
  ): { action: 'harvest' | 'water' | 'plant'; plot: PlotSaveState } | null {
    for (const plot of workerPlots) {
      if (plot.isReady) return { action: 'harvest', plot }
    }

    for (const plot of workerPlots) {
      if (getOfflineWateringStatus(plot, at).canWater) return { action: 'water', plot }
    }

    if (!farm.farmerSeeds.some((entry) => entry.count > 0)) return null
    for (const plot of workerPlots) {
      if (plot.cropType === -1) return { action: 'plant', plot }
    }

    return null
  }

  private getNextOfflineWorkerEventAt(workerPlots: PlotSaveState[], at: number): number | null {
    let nextAt: number | null = null

    for (const plot of workerPlots) {
      if (plot.cropType === -1 || !plot.growthStarted || plot.plantedAt <= 0) continue

      const def = CROP_DATA.get(plot.cropType as CropType)
      if (!def) continue

      const readyAt = plot.plantedAt + def.growTimeMs
      if (!plot.isReady && readyAt > at) {
        nextAt = nextAt === null ? readyAt : Math.min(nextAt, readyAt)
      }

      const { nextWindowInMs } = getOfflineWateringStatus(plot, at)
      if (nextWindowInMs !== null && nextWindowInMs > 0) {
        const waterAt = at + nextWindowInMs
        nextAt = nextAt === null ? waterAt : Math.min(nextAt, waterAt)
      }
    }

    return nextAt
  }

  private applyOfflineWorkerTask(
    farm: FarmSaveV1,
    task: { action: 'harvest' | 'water' | 'plant'; plot: PlotSaveState },
    at: number
  ): boolean {
    const plot = task.plot

    if (task.action === 'harvest') {
      if (!plot.isReady || plot.cropType === -1) return false
      const cropType = plot.cropType as CropType
      const def = CROP_DATA.get(cropType)
      if (!def) return false

      const waterRatio = plot.waterCount / def.wateringsRequired
      const yieldMultiplier = waterRatio >= 1 ? 1 : waterRatio >= 0.5 ? 0.75 : 0.5
      const baseYield = Math.floor(Math.random() * (def.yieldMax - def.yieldMin + 1)) + def.yieldMin
      const finalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier))

      addCropCount(farm.farmerInventory, cropType, finalYield)
      farm.totalCropsHarvested += finalYield
      addFarmXp(
        farm,
        def.tier === 1 ? XP_HARVEST_TIER1 : def.tier === 2 ? XP_HARVEST_TIER2 : XP_HARVEST_TIER3
      )
      updateQuestHarvestProgress(farm, cropType, finalYield)

      plot.cropType = -1
      plot.plantedAt = 0
      plot.waterCount = 0
      plot.growthStarted = false
      plot.growthStage = 0
      plot.isReady = false
      return true
    }

    if (task.action === 'water') {
      if (plot.cropType === -1 || plot.isReady) return false
      if (!getOfflineWateringStatus(plot, at).canWater) return false

      plot.waterCount += 1
      if (!plot.growthStarted) {
        plot.growthStarted = true
        plot.plantedAt = at
      }

      farm.totalWaterCount += 1
      addFarmXp(farm, XP_WATER)
      updateQuestWaterProgress(farm)
      syncOfflinePlotState(plot, at)
      return true
    }

    if (plot.cropType !== -1) return false
    const cropType = consumeWorkerSeed(farm)
    if (cropType === null) return false

    plot.cropType = cropType
    plot.plantedAt = 0
    plot.waterCount = 0
    plot.growthStarted = false
    plot.growthStage = 0
    plot.isReady = false
    farm.totalSeedPlanted += 1
    addFarmXp(farm, XP_PLANT)
    updateQuestPlantProgress(farm)
    return true
  }

  private reconcileOfflineWorker(farm: FarmSaveV1, now = Date.now()): boolean {
    if (!farm.farmerHired) {
      if (farm.workerLastSimulatedAt !== 0) {
        farm.workerLastSimulatedAt = 0
        farm.updatedAt = now
        return true
      }
      return false
    }

    const start = Math.max(0, Math.min(farm.workerLastSimulatedAt, now))
    if (start <= 0) {
      farm.workerLastSimulatedAt = now
      farm.updatedAt = now
      return true
    }

    if (farm.workerLastWageProcessedAt <= 0 || farm.workerLastWageProcessedAt > now) {
      if (farm.workerLastSimulatedAt !== now) {
        farm.workerLastSimulatedAt = now
        farm.updatedAt = now
        return true
      }
      return false
    }

    const activeUntil = Math.min(now, this.getOfflineWorkerActiveUntil(farm, now))
    const workerPlots = farm.plotStates
      .filter((plot) => plot.isUnlocked && plot.plotIndex >= 12)
      .sort((a, b) => a.plotIndex - b.plotIndex)

    let changed = false
    let cursor = start
    let actions = 0

    while (cursor < activeUntil && actions < WORKER_OFFLINE_MAX_ACTIONS) {
      for (const plot of workerPlots) syncOfflinePlotState(plot, cursor)

      const task = this.pickOfflineWorkerTask(farm, workerPlots, cursor)
      if (task) {
        changed = this.applyOfflineWorkerTask(farm, task, cursor) || changed
        cursor = Math.min(activeUntil, cursor + WORKER_OFFLINE_ACTION_MS)
        actions += 1
        continue
      }

      const nextEventAt = this.getNextOfflineWorkerEventAt(workerPlots, cursor)
      if (nextEventAt === null || nextEventAt > activeUntil) break
      cursor = nextEventAt
    }

    for (const plot of workerPlots) syncOfflinePlotState(plot, activeUntil)

    if (actions >= WORKER_OFFLINE_MAX_ACTIONS) {
      console.log(`[Server] Worker offline reconcile hit action cap for ${farm.wallet}`)
    }

    if (farm.workerLastSimulatedAt !== now) {
      farm.workerLastSimulatedAt = now
      changed = true
    }

    if (changed) farm.updatedAt = now
    return changed
  }

  private settleWorkerWages(farm: FarmSaveV1, now = Date.now()): boolean {
    if (!farm.farmerHired) {
      let changed = false
      if (farm.workerOutstandingWages !== 0) { farm.workerOutstandingWages = 0; changed = true }
      if (farm.workerUnpaidDays !== 0) { farm.workerUnpaidDays = 0; changed = true }
      if (farm.workerLastWageProcessedAt !== 0) { farm.workerLastWageProcessedAt = 0; changed = true }
      if (farm.workerLastSimulatedAt !== 0) { farm.workerLastSimulatedAt = 0; changed = true }
      if (changed) farm.updatedAt = now
      return changed
    }

    if (farm.workerLastWageProcessedAt <= 0 || farm.workerLastWageProcessedAt > now) {
      farm.workerLastWageProcessedAt = now
      farm.updatedAt = now
      return true
    }

    const elapsedDays = Math.floor((now - farm.workerLastWageProcessedAt) / WORKER_DAY_MS)
    if (elapsedDays <= 0) return false

    for (let day = 0; day < elapsedDays; day++) {
      if (farm.coins >= WORKER_DAILY_WAGE) {
        farm.coins -= WORKER_DAILY_WAGE
      } else {
        farm.workerOutstandingWages += WORKER_DAILY_WAGE
        farm.workerUnpaidDays += 1
      }
    }

    farm.workerLastWageProcessedAt += elapsedDays * WORKER_DAY_MS
    farm.updatedAt = now
    return true
  }

  async load(address: string): Promise<FarmSaveV1> {
    const key = address.toLowerCase()
    let farm = this.cache.get(key)
    if (!farm) {
      const raw = await Storage.player.get<unknown>(key, FARM_KEY)
      farm = normalizeFarm(raw, key)
      this.cache.set(key, farm)
      // Always write canonical format on first load
      this.dirty.add(key)
      if (this.reconcileOfflineWorker(farm)) this.dirty.add(key)
    }

    if (this.settleWorkerWages(farm)) this.dirty.add(key)
    return farm
  }

  get(address: string): FarmSaveV1 | null {
    return this.cache.get(address.toLowerCase()) ?? null
  }

  applyPayload(address: string, payload: FarmStatePayload): void {
    const key = address.toLowerCase()
    const existing = this.cache.get(key) ?? emptyFarm(key)
    const farmerHired = existing.farmerHired || payload.farmerHired
    const hiredNow = !existing.farmerHired && farmerHired
    const workerLastWageProcessedAt = hiredNow
      ? Math.max(0, payload.workerLastWageProcessedAt || Date.now())
      : existing.workerLastWageProcessedAt
    const workerLastSimulatedAt = farmerHired ? Date.now() : 0
    const workerOutstandingWages = hiredNow ? 0 : existing.workerOutstandingWages
    const workerUnpaidDays = hiredNow ? 0 : existing.workerUnpaidDays

    const updated: FarmSaveV1 = {
      schemaVersion:       SCHEMA_VERSION,
      wallet:              key,
      coins:               payload.coins,
      seeds:               payload.seeds,
      harvested:           payload.harvested,
      xp:                  payload.xp,
      level:               payload.level,
      cropsUnlocked:       existing.cropsUnlocked || payload.cropsUnlocked,
      expansion1Unlocked:  existing.expansion1Unlocked || payload.expansion1Unlocked,
      expansion2Unlocked:  existing.expansion2Unlocked || payload.expansion2Unlocked,
      unlockedPlotGroups:  mergeStringArrays(existing.unlockedPlotGroups, payload.unlockedPlotGroups ?? []),
      farmerHired,
      farmerSeeds:         payload.farmerSeeds,
      farmerInventory:     payload.farmerInventory,
      workerOutstandingWages,
      workerUnpaidDays,
      workerLastWageProcessedAt: farmerHired ? workerLastWageProcessedAt : 0,
      workerLastSimulatedAt,
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
      organicWaste:            payload.organicWaste ?? 0,
      fertilizers:             payload.fertilizers ?? [],
      compostWasteCount:       payload.compostWasteCount ?? 0,
      compostLastCollectedAt:  payload.compostLastCollectedAt ?? 0,
      chickenCoopUnlocked:     existing.chickenCoopUnlocked || (payload.chickenCoopUnlocked ?? false),
      grainCount:              payload.grainCount ?? 0,
      eggsCount:               payload.eggsCount ?? 0,
      chickenLastProducedAt:   payload.chickenLastProducedAt ?? 0,
      totalEggsCollected:      payload.totalEggsCollected ?? 0,
      pigPenUnlocked:          existing.pigPenUnlocked || (payload.pigPenUnlocked ?? false),
      vegetableScraps:         payload.vegetableScraps ?? 0,
      manureCount:             payload.manureCount ?? 0,
      pigLastProducedAt:       payload.pigLastProducedAt ?? 0,
      totalManureCollected:    payload.totalManureCollected ?? 0,
      compostBinUnlocked:      payload.compostBinUnlocked ?? existing.compostBinUnlocked,
      rotSystemUnlocked:       payload.rotSystemUnlocked ?? existing.rotSystemUnlocked,
      progressionEventStep:    payload.progressionEventStep ?? '',
      lastNpcVisitAt:          payload.lastNpcVisitAt ?? 0,
      npcScheduleIndex:        payload.npcScheduleIndex ?? 0,
      // Always recalculate on server — client value is advisory, server is authoritative
      beautyScore:         calculateBeautyScore(payload),
      beautySlots:         (payload.beautySlots ?? [0, 0, 0]).slice(0, 3).concat([0, 0, 0]).slice(0, 3),
      totalLikesReceived:  existing.totalLikesReceived,
      mailbox:             existing.mailbox,
      likeLedger:          existing.likeLedger,
      waterLedger:         existing.waterLedger,
      updatedAt:           Date.now(),
    }

    // Sanity guard: never allow coins to drop below 0
    updated.coins = Math.max(0, updated.coins)

    this.cache.set(key, updated)
    this.dirty.add(key)

    // Keep existing reference up-to-date for any in-flight code that holds it
    Object.assign(existing, updated)
  }

  async payWorkerWages(address: string): Promise<{
    success: boolean
    reason: string
    coinsDelta: number
    workerOutstandingWages: number
    workerUnpaidDays: number
    workerLastWageProcessedAt: number
  }> {
    const key = address.toLowerCase()
    const farm = await this.load(key)

    if (!farm.farmerHired) {
      return {
        success: false,
        reason: 'worker_not_hired',
        coinsDelta: 0,
        workerOutstandingWages: farm.workerOutstandingWages,
        workerUnpaidDays: farm.workerUnpaidDays,
        workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
      }
    }

    if (farm.workerOutstandingWages <= 0) {
      return {
        success: false,
        reason: 'no_debt',
        coinsDelta: 0,
        workerOutstandingWages: 0,
        workerUnpaidDays: farm.workerUnpaidDays,
        workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
      }
    }

    if (farm.coins < farm.workerOutstandingWages) {
      return {
        success: false,
        reason: 'insufficient_coins',
        coinsDelta: 0,
        workerOutstandingWages: farm.workerOutstandingWages,
        workerUnpaidDays: farm.workerUnpaidDays,
        workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
      }
    }

    const coinsDelta = -farm.workerOutstandingWages
    farm.coins += coinsDelta
    farm.workerOutstandingWages = 0
    farm.workerUnpaidDays = 0
    farm.updatedAt = Date.now()
    this.dirty.add(key)

    return {
      success: true,
      reason: 'ok',
      coinsDelta,
      workerOutstandingWages: farm.workerOutstandingWages,
      workerUnpaidDays: farm.workerUnpaidDays,
      workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
    }
  }

  async debugWorkerAction(address: string, action: string, amount: number): Promise<{
    success: boolean
    reason: string
    coins: number
    cropsUnlocked: boolean
    farmerHired: boolean
    farmerSeeds: CropCount[]
    workerOutstandingWages: number
    workerUnpaidDays: number
    workerLastWageProcessedAt: number
  }> {
    const key = address.toLowerCase()
    const farm = await this.load(key)
    const now = Date.now()
    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0

    switch (action) {
      case 'setup': {
        farm.cropsUnlocked = true
        farm.farmerHired = true
        farm.coins = Math.max(farm.coins, 5000)
        farm.workerOutstandingWages = 0
        farm.workerUnpaidDays = 0
        farm.workerLastWageProcessedAt = now
        farm.workerLastSimulatedAt = now
        farm.farmerSeeds = [{ cropType: CropType.Onion, count: 20 }]
        break
      }

      case 'add_coins': {
        farm.coins += safeAmount
        break
      }

      case 'set_coins': {
        farm.coins = safeAmount
        break
      }

      case 'load_seeds': {
        const existing = farm.farmerSeeds.find((seed) => seed.cropType === CropType.Onion)
        if (existing) existing.count += Math.max(1, safeAmount || 20)
        else farm.farmerSeeds.push({ cropType: CropType.Onion, count: Math.max(1, safeAmount || 20) })
        break
      }

      case 'clear_seeds': {
        farm.farmerSeeds = []
        break
      }

      case 'advance_days': {
        if (!farm.farmerHired) {
          farm.farmerHired = true
          farm.workerLastWageProcessedAt = now
        }
        if (farm.workerLastWageProcessedAt <= 0) farm.workerLastWageProcessedAt = now
        farm.workerLastWageProcessedAt -= Math.max(1, safeAmount || 1) * WORKER_DAY_MS
        this.settleWorkerWages(farm, now)
        break
      }

      case 'clear_debt': {
        farm.workerOutstandingWages = 0
        farm.workerUnpaidDays = 0
        if (farm.farmerHired && farm.workerLastWageProcessedAt <= 0) {
          farm.workerLastWageProcessedAt = now
        }
        break
      }

      case 'simulate_offline': {
        // Rewind workerLastSimulatedAt by `amount` hours so the next load triggers reconciliation
        const hoursBack = Math.max(1, safeAmount || 4)
        if (farm.farmerHired) {
          farm.workerLastSimulatedAt = Math.max(0, now - hoursBack * 60 * 60 * 1000)
        }
        break
      }

      default:
        return {
          success: false,
          reason: 'unknown_action',
          coins: farm.coins,
          cropsUnlocked: farm.cropsUnlocked,
          farmerHired: farm.farmerHired,
          farmerSeeds: farm.farmerSeeds,
          workerOutstandingWages: farm.workerOutstandingWages,
          workerUnpaidDays: farm.workerUnpaidDays,
          workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
        }
    }

    farm.coins = Math.max(0, farm.coins)
    farm.updatedAt = now
    this.dirty.add(key)

    return {
      success: true,
      reason: action,
      coins: farm.coins,
      cropsUnlocked: farm.cropsUnlocked,
      farmerHired: farm.farmerHired,
      farmerSeeds: farm.farmerSeeds,
      workerOutstandingWages: farm.workerOutstandingWages,
      workerUnpaidDays: farm.workerUnpaidDays,
      workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
    }
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

  async waterFarmByVisitor(
    targetAddress: string,
    visitorAddress: string,
    visitorName: string,
    plotIndex: number,
  ): Promise<{ success: boolean; reason: string; reward: MailboxReward | null }> {
    const target  = targetAddress.toLowerCase()
    const visitor = visitorAddress.toLowerCase()

    if (!target || !visitor || target === visitor) {
      return { success: false, reason: 'invalid_request', reward: null }
    }

    const farm = await this.load(target)
    const now  = Date.now()

    farm.waterLedger = farm.waterLedger.filter((e) => now - e.wateredAt <= WATER_LEDGER_TTL_MS)

    const plotState = farm.plotStates.find((p) => p.plotIndex === plotIndex)
    if (!plotState || plotState.cropType === -1) {
      return { success: false, reason: 'no_crop', reward: null }
    }
    if (plotState.isReady) {
      return { success: false, reason: 'crop_ready', reward: null }
    }

    const cropPlantedAt = plotState.plantedAt

    const alreadyWatered = farm.waterLedger.some(
      (e) => e.visitorAddress === visitor && e.plotIndex === plotIndex && e.cropPlantedAt === cropPlantedAt,
    )
    if (alreadyWatered) {
      return { success: false, reason: 'already_watered_this_cycle', reward: null }
    }

    const DAY_MS = 24 * 60 * 60 * 1000
    const dailyCount = farm.waterLedger.filter(
      (e) => e.visitorAddress === visitor && now - e.wateredAt < DAY_MS,
    ).length
    if (dailyCount >= VISITOR_WATER_DAILY_LIMIT) {
      return { success: false, reason: 'daily_limit_reached', reward: null }
    }

    const rewardAmount = 1 + Math.floor(Math.random() * 2)
    const reward: MailboxReward = {
      id:          `water:${now}:${visitor.slice(2, 10)}:${plotIndex}`,
      type:        'seeds',
      reason:      'visit_water',
      amount:      rewardAmount,
      cropType:    plotState.cropType,
      fromAddress: visitor,
      fromName:    visitorName || visitor.slice(0, 8),
      createdAt:   now,
    }

    farm.waterLedger.push({ visitorAddress: visitor, plotIndex, cropPlantedAt, wateredAt: now })
    farm.mailbox.unshift(reward)
    farm.updatedAt = now
    this.dirty.add(target)

    return { success: true, reason: 'ok', reward }
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

    // Apply rewards server-side immediately so they survive a client disconnect
    farm.coins = Math.max(0, farm.coins + coins)
    for (const [cropType, count] of seedTotals) {
      const existing = farm.seeds.find((s) => s.cropType === cropType)
      if (existing) existing.count += count
      else farm.seeds.push({ cropType, count })
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
