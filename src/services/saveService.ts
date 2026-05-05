import { engine, executeTask, GltfContainer } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA } from '../data/cropData'
import { FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { CROP_MODELS } from '../data/modelPaths'
import { playerState } from '../game/gameState'
import { tutorialState } from '../game/tutorialState'
import { room, FarmStatePayload, CropCount, FertilizerCount, PlotSaveState, PlayerRegistryResponse, BeautyLeaderboardResponse } from '../shared/farmMessages'
import { calculateBeautyScore } from '../game/beautyScore'
import { getBeautySlots, applyBeautySlots } from '../systems/beautySpotSystem'
import { setCropModel, setSoilIconDisplay, applyRotVisual } from '../game/actions'
import { isPlotRotten } from '../game/rotUtils'
import {
  unlockExpansion1Plots, unlockExpansion2Plots,
  removeForSaleSign2, removeForSaleSign3,
  applyPlotUnlockVisual,
} from '../systems/interactionSetup'
import { questProgressMap, QuestStatus } from '../game/questState'
import { musicState } from '../game/musicState'
import { playSong, setMuted, setMusicVolume } from '../systems/musicSystem'
import { catchUpAnimalProduction, initAnimalSystem } from '../systems/animalSystem'
import { removeForSaleSign, unlockFarmerPlots } from '../systems/interactionSetup'
import { spawnFarmer } from '../systems/farmerSystem'

// ---------------------------------------------------------------------------
// Auto-save interval
// ---------------------------------------------------------------------------
const AUTO_SAVE_INTERVAL_MS = 60_000
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let farmLoaded = false

// ---------------------------------------------------------------------------
// Serialize helpers: Map<CropType, number> → CropCount[]
// ---------------------------------------------------------------------------
function mapToArray(map: Map<CropType, number>): CropCount[] {
  const result: CropCount[] = []
  map.forEach((count, cropType) => {
    if (count > 0) result.push({ cropType, count })
  })
  return result
}

function arrayToMap(arr: CropCount[]): Map<CropType, number> {
  const map = new Map<CropType, number>()
  for (const { cropType, count } of arr) {
    map.set(cropType as CropType, count)
  }
  return map
}

function fertMapToArray(map: Map<FertilizerType, number>): FertilizerCount[] {
  const result: FertilizerCount[] = []
  map.forEach((count, fertilizerType) => {
    if (count > 0) result.push({ fertilizerType, count })
  })
  return result
}

function fertArrayToMap(arr: FertilizerCount[]): Map<FertilizerType, number> {
  const map = new Map<FertilizerType, number>()
  for (const { fertilizerType, count } of arr) {
    map.set(fertilizerType as FertilizerType, count)
  }
  return map
}

// ---------------------------------------------------------------------------
// Collect current PlotState from ECS
// ---------------------------------------------------------------------------
function collectPlotStates(): PlotSaveState[] {
  const states: PlotSaveState[] = []
  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    const plot = PlotState.get(entity)
    states.push({
      plotIndex:     plot.plotIndex,
      isUnlocked:    plot.isUnlocked,
      cropType:      plot.cropType,
      plantedAt:     plot.plantedAt,
      waterCount:    plot.waterCount,
      growthStarted:  plot.growthStarted,
      growthStage:    plot.growthStage,
      isReady:        plot.isReady,
      isRotten:       plot.isRotten,
      fertilizerType: plot.fertilizerType,
    })
  }
  return states
}

// ---------------------------------------------------------------------------
// Build the full payload from current playerState + ECS
// ---------------------------------------------------------------------------
export function buildSavePayload(): FarmStatePayload {
  const plotStates = collectPlotStates()
  const payload: FarmStatePayload = {
    wallet:   playerState.wallet,
    coins:    playerState.coins,
    seeds:    mapToArray(playerState.seeds),
    harvested: mapToArray(playerState.harvested),
    xp:       playerState.xp,
    level:    playerState.level,
    cropsUnlocked:      playerState.cropsUnlocked,
    expansion1Unlocked: playerState.expansion1Unlocked,
    expansion2Unlocked: playerState.expansion2Unlocked,
    farmerHired:        playerState.farmerHired,
    farmerSeeds:     mapToArray(playerState.farmerSeeds),
    farmerInventory: mapToArray(playerState.farmerInventory),
    workerOutstandingWages: playerState.workerOutstandingWages,
    workerUnpaidDays: playerState.workerUnpaidDays,
    workerLastWageProcessedAt: playerState.workerLastWageProcessedAt,
    dogOwned:        playerState.dogOwned,
    totalCropsHarvested: playerState.totalCropsHarvested,
    totalWaterCount:     playerState.totalWaterCount,
    totalSeedPlanted:    playerState.totalSeedPlanted,
    totalSellCount:      playerState.totalSellCount,
    totalCoinsEarned:    playerState.totalCoinsEarned,
    tutorialComplete:    !tutorialState.active && tutorialState.step === 'complete',
    tutorialStep:        tutorialState.step,
    tutorialSeedsBought: tutorialState.seedsBought,
    tutorialHarvestMore: tutorialState.harvestMoreCount,
    claimedRewards:      playerState.claimedRewards,
    plotStates,
    questProgress:       Array.from(questProgressMap.values()).map((qp) => ({
      id: qp.id, current: qp.current, status: qp.status,
    })),
    musicSongId:         musicState.currentSongId,
    musicMuted:          musicState.muted,
    musicVolume:         musicState.volume,
    organicWaste:            playerState.organicWaste,
    fertilizers:             fertMapToArray(playerState.fertilizers),
    compostWasteCount:       playerState.compostWasteCount,
    compostLastCollectedAt:  playerState.compostLastCollectedAt,
    chickenCoopUnlocked:     playerState.chickenCoopUnlocked,
    grainCount:              playerState.grainCount,
    eggsCount:               playerState.eggsCount,
    chickenLastProducedAt:   playerState.chickenLastProducedAt,
    totalEggsCollected:      playerState.totalEggsCollected,
    pigPenUnlocked:          playerState.pigPenUnlocked,
    vegetableScraps:         playerState.vegetableScraps,
    manureCount:             playerState.manureCount,
    pigLastProducedAt:       playerState.pigLastProducedAt,
    totalManureCollected:    playerState.totalManureCollected,
    beautyScore:         0,
    beautySlots:         getBeautySlots(),
    totalLikesReceived:  playerState.totalLikesReceived,
    mailbox:             playerState.mailbox,
  }
  payload.beautyScore = calculateBeautyScore(payload)
  playerState.beautyScore = payload.beautyScore
  return payload
}

// ---------------------------------------------------------------------------
// Apply a loaded payload to playerState + ECS PlotState components
// ---------------------------------------------------------------------------
function applyPayload(payload: FarmStatePayload): void {
  // ── Economy + inventory ──────────────────────────────────────────────────
  playerState.coins     = payload.coins
  playerState.seeds     = arrayToMap(payload.seeds)
  playerState.harvested = arrayToMap(payload.harvested)

  // ── Progression ───────────────────────────────────────────────────────────
  playerState.xp    = payload.xp
  playerState.level = payload.level

  // ── Unlocks ───────────────────────────────────────────────────────────────
  playerState.cropsUnlocked      = payload.cropsUnlocked
  playerState.expansion1Unlocked = payload.expansion1Unlocked
  playerState.expansion2Unlocked = payload.expansion2Unlocked

  if (payload.expansion1Unlocked) {
    unlockExpansion1Plots()
    removeForSaleSign2()
  }
  if (payload.expansion2Unlocked) {
    unlockExpansion2Plots()
    removeForSaleSign3()
  }

  // ── Farmer ────────────────────────────────────────────────────────────────
  playerState.farmerHired      = payload.farmerHired
  playerState.farmerSeeds      = arrayToMap(payload.farmerSeeds)
  playerState.farmerInventory  = arrayToMap(payload.farmerInventory)
  playerState.workerOutstandingWages = payload.workerOutstandingWages ?? 0
  playerState.workerUnpaidDays = payload.workerUnpaidDays ?? 0
  playerState.workerLastWageProcessedAt = payload.workerLastWageProcessedAt ?? 0

  if (payload.cropsUnlocked) {
    removeForSaleSign()
    unlockFarmerPlots()
    spawnFarmer()
  }

  // ── Dog ───────────────────────────────────────────────────────────────────
  playerState.dogOwned = payload.dogOwned

  // ── Lifetime stats ────────────────────────────────────────────────────────
  playerState.totalCropsHarvested = payload.totalCropsHarvested
  playerState.totalWaterCount     = payload.totalWaterCount
  playerState.totalSeedPlanted    = payload.totalSeedPlanted
  playerState.totalSellCount      = payload.totalSellCount
  playerState.totalCoinsEarned    = payload.totalCoinsEarned
  playerState.totalLikesReceived  = payload.totalLikesReceived ?? 0
  playerState.mailbox             = payload.mailbox ?? []
  playerState.mailboxSeenCount    = playerState.mailbox.length

  // ── Tutorial state ────────────────────────────────────────────────────────
  // Restore progress so players resume mid-tutorial after disconnect.
  // Once tutorialComplete=true, the tutorial won't activate again.
  tutorialState.active           = !payload.tutorialComplete
  tutorialState.step             = payload.tutorialStep as typeof tutorialState.step
  tutorialState.seedsBought      = payload.tutorialSeedsBought
  tutorialState.harvestMoreCount = payload.tutorialHarvestMore
  playerState.claimedRewards     = payload.claimedRewards ?? []

  // ── Quest progress ────────────────────────────────────────────────────────
  for (const saved of payload.questProgress ?? []) {
    const qp = questProgressMap.get(saved.id)
    if (qp) {
      qp.current = saved.current
      qp.status  = saved.status as QuestStatus
    }
  }

  // ── Jukebox preferences ───────────────────────────────────────────────────
  if (payload.musicSongId) playSong(payload.musicSongId as typeof musicState.currentSongId)
  setMuted(payload.musicMuted ?? false)
  setMusicVolume(payload.musicVolume ?? 0.42)

  // ── Fertilizer system ─────────────────────────────────────────────────────
  playerState.organicWaste       = payload.organicWaste ?? 0
  playerState.fertilizers        = fertArrayToMap(payload.fertilizers ?? [])
  playerState.compostWasteCount  = payload.compostWasteCount ?? 0
  playerState.compostLastCollectedAt = payload.compostLastCollectedAt ?? 0

  // Offline compost progression: award fertilizers produced while player was away
  if (playerState.compostWasteCount > 0 && playerState.compostLastCollectedAt > 0) {
    const now = Date.now()
    const cyclesDone = Math.min(
      Math.floor((now - playerState.compostLastCollectedAt) / 300_000),
      playerState.compostWasteCount
    )
    if (cyclesDone > 0) {
      for (let i = 0; i < cyclesDone; i++) {
        const fert = randomFertilizer()
        playerState.fertilizers.set(fert, (playerState.fertilizers.get(fert) ?? 0) + 1)
      }
      playerState.compostWasteCount      -= cyclesDone
      playerState.compostLastCollectedAt  = now
    }
  }

  // ── Animal system ─────────────────────────────────────────────────────────
  playerState.chickenCoopUnlocked   = payload.chickenCoopUnlocked ?? false
  playerState.grainCount            = payload.grainCount ?? 0
  playerState.eggsCount             = payload.eggsCount ?? 0
  playerState.chickenLastProducedAt = payload.chickenLastProducedAt ?? 0
  playerState.totalEggsCollected    = payload.totalEggsCollected ?? 0
  playerState.pigPenUnlocked        = payload.pigPenUnlocked ?? false
  playerState.vegetableScraps       = payload.vegetableScraps ?? 0
  playerState.manureCount           = payload.manureCount ?? 0
  playerState.pigLastProducedAt     = payload.pigLastProducedAt ?? 0
  playerState.totalManureCollected  = payload.totalManureCollected ?? 0

  // ── Restore in-progress plots ─────────────────────────────────────────────
  restorePlotStates(payload.plotStates)

  playerState.beautyScore = payload.beautyScore ?? 0
  playerState.beautySlots = payload.beautySlots ?? [0, 0, 0]
  applyBeautySlots(playerState.beautySlots)

  // ── Animal offline catch-up then start the runtime system ─────────────────
  catchUpAnimalProduction()
  initAnimalSystem()

  farmLoaded = true
  console.log(`[SaveService] Farm loaded — coins: ${payload.coins}, level: ${payload.level}`)
}

// ---------------------------------------------------------------------------
// Restore PlotState ECS components from saved data
// ---------------------------------------------------------------------------
export function restorePlotStates(savedPlots: PlotSaveState[]): void {
  // Build an index: plotIndex → soil entity
  const entityByIndex = new Map<number, ReturnType<typeof engine.addEntity>>()
  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    const plot = PlotState.get(entity)
    entityByIndex.set(plot.plotIndex, entity)
  }

  const now = Date.now()

  for (const saved of savedPlots) {
    const entity = entityByIndex.get(saved.plotIndex)
    if (!entity) continue

    const mutable = PlotState.getMutable(entity)

    mutable.isUnlocked = saved.isUnlocked
    if (saved.isUnlocked) applyPlotUnlockVisual(entity)

    // Nothing else to restore for empty plots
    if (saved.cropType === -1) continue

    const def = CROP_DATA.get(saved.cropType as CropType)
    if (!def) continue

    mutable.cropType       = saved.cropType
    mutable.plantedAt      = saved.plantedAt
    mutable.waterCount     = saved.waterCount
    mutable.growthStarted  = saved.growthStarted
    mutable.isReady        = saved.isReady
    mutable.isRotten       = saved.isRotten ?? false
    mutable.fertilizerType = saved.fertilizerType ?? -1

    // Compute effective grow time (same logic as growthSystem)
    let effectiveGrowTimeMs = def.growTimeMs
    if (saved.fertilizerType === FertilizerType.GrowthBoost) {
      effectiveGrowTimeMs = Math.floor(def.growTimeMs * 0.75)
    }

    // Recalculate actual current stage based on elapsed time, not the saved stage
    // (crop may have progressed further while player was offline)
    if (saved.growthStarted && !saved.isReady) {
      const elapsed  = now - saved.plantedAt
      const progress = elapsed / effectiveGrowTimeMs

      let stage: number
      if (progress >= 0.75)      stage = 3
      else if (progress >= 0.5)  stage = 2
      else if (progress >= 0.25) stage = 1
      else                       stage = 0

      mutable.growthStage = stage
      if (stage > 0) setCropModel(entity, CROP_MODELS[saved.cropType as CropType][stage - 1])

      // If crop finished growing while offline → mark ready + check rot
      if (progress >= 1.0) {
        mutable.isReady = true
        const rotten = isPlotRotten(saved.plantedAt, saved.cropType, mutable.fertilizerType, effectiveGrowTimeMs, now)
        mutable.isRotten = rotten
        if (rotten) applyRotVisual(entity)
        setSoilIconDisplay(entity, {
          cropType: saved.cropType, waterCount: saved.waterCount,
          wateringsRequired: def.wateringsRequired,
          canWater: false, isReady: true, isPlanting: false, justHarvested: false,
          isRotten: rotten,
        })
      }
    } else if (saved.isReady) {
      // Was already ready when player left — restore stage 3 model, check rot
      mutable.growthStage = 3
      setCropModel(entity, CROP_MODELS[saved.cropType as CropType][2])
      const rotten = saved.isRotten || isPlotRotten(saved.plantedAt, saved.cropType, mutable.fertilizerType, effectiveGrowTimeMs, now)
      mutable.isRotten = rotten
      if (rotten) applyRotVisual(entity)
      setSoilIconDisplay(entity, {
        cropType: saved.cropType, waterCount: saved.waterCount,
        wateringsRequired: def.wateringsRequired,
        canWater: false, isReady: true, isPlanting: false, justHarvested: false,
        isRotten: rotten,
      })
    }
    // else: planted but not watered yet → stage 0, no model needed
  }
}

// ---------------------------------------------------------------------------
// Send save to server
// ---------------------------------------------------------------------------
export function saveFarm(): void {
  if (!farmLoaded) return    // don't save before the first load completes
  const payload = buildSavePayload()
  void room.send('playerSaveFarm', payload)
}

function applyWorkerServerState(data: {
  coinsDelta: number
  workerOutstandingWages: number
  workerUnpaidDays: number
  workerLastWageProcessedAt: number
}): void {
  playerState.coins = Math.max(0, playerState.coins + data.coinsDelta)
  playerState.workerOutstandingWages = data.workerOutstandingWages
  playerState.workerUnpaidDays = data.workerUnpaidDays
  playerState.workerLastWageProcessedAt = data.workerLastWageProcessedAt
}

export function requestPayWorkerWages(): void {
  void room.send('payWorkerWages', {})
}

function applyDebugWorkerState(data: {
  coins: number
  cropsUnlocked: boolean
  farmerHired: boolean
  farmerSeeds: CropCount[]
  workerOutstandingWages: number
  workerUnpaidDays: number
  workerLastWageProcessedAt: number
}): void {
  playerState.coins = data.coins
  playerState.cropsUnlocked = data.cropsUnlocked
  playerState.farmerHired = data.farmerHired
  playerState.farmerSeeds = arrayToMap(data.farmerSeeds)
  playerState.workerOutstandingWages = data.workerOutstandingWages
  playerState.workerUnpaidDays = data.workerUnpaidDays
  playerState.workerLastWageProcessedAt = data.workerLastWageProcessedAt

  if (data.cropsUnlocked) {
    removeForSaleSign()
    unlockFarmerPlots()
    spawnFarmer()
  }
}

export function requestDebugWorkerAction(action: string, amount = 0): void {
  void room.send('debugWorkerAction', { action, amount })
}

// ---------------------------------------------------------------------------
// Schedule auto-save every 60s
// ---------------------------------------------------------------------------
function scheduleAutoSave(): void {
  if (autoSaveTimer !== null) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveFarm()
    scheduleAutoSave()
  }, AUTO_SAVE_INTERVAL_MS)
}

// ---------------------------------------------------------------------------
// Pause / resume auto-save (used by visitService during farm visits)
// ---------------------------------------------------------------------------
export function pauseAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

export function resumeAutoSave(): void {
  if (autoSaveTimer === null) scheduleAutoSave()
}

// ---------------------------------------------------------------------------
// Callbacks for visit mode — wired by visitService after initSaveService
// ---------------------------------------------------------------------------
export const visitCallbacks = {
  onOtherFarmLoaded: null as ((requester: string, address: string, payload: FarmStatePayload) => void) | null,
  onOtherFarmError:  null as ((requester: string, address: string, reason: string) => void) | null,
}

export const registryCallbacks = {
  onRegistryLoaded: null as ((data: PlayerRegistryResponse) => void) | null,
}

export const leaderboardCallbacks = {
  onBeautyLeaderboardLoaded: null as ((data: BeautyLeaderboardResponse) => void) | null,
}

// ---------------------------------------------------------------------------
// Entry point — call once from index.ts (client side only)
// onLoaded is called after the first farm state is applied (use it to start
// systems that depend on restored state, e.g. initTutorialSystem)
// ---------------------------------------------------------------------------
export function initSaveService(onLoaded?: () => void): void {
  // Listen for server → client farm state
  room.onMessage('farmStateLoaded', (payload) => {
    // Filter: only apply if this is our own wallet.
    // If wallet is not yet set (preview / guest mode), accept the first response and adopt its wallet.
    if (playerState.wallet && payload.wallet !== playerState.wallet) return
    if (!playerState.wallet) {
      playerState.wallet = payload.wallet
      console.log(`[SaveService] wallet adopted from server payload: ${payload.wallet}`)
    }
    applyPayload(payload)
    onLoaded?.()
  })

  // Visit mode — other farm loaded
  room.onMessage('otherFarmLoaded', (data) => {
    visitCallbacks.onOtherFarmLoaded?.(data.requester, data.address, data.payload)
  })
  room.onMessage('otherFarmError', (data) => {
    visitCallbacks.onOtherFarmError?.(data.requester, data.address, data.reason)
  })
  room.onMessage('playerRegistryLoaded', (data) => {
    registryCallbacks.onRegistryLoaded?.(data)
  })
  room.onMessage('beautyLeaderboardLoaded', (data) => {
    if (data.requester !== playerState.wallet) return
    leaderboardCallbacks.onBeautyLeaderboardLoaded?.(data)
  })
  room.onMessage('workerStatusUpdated', (data) => {
    if (data.requester !== playerState.wallet) return
    applyWorkerServerState(data)
  })
  room.onMessage('workerWagePaymentResult', (data) => {
    if (data.requester !== playerState.wallet) return
    applyWorkerServerState(data)
  })
  room.onMessage('debugWorkerStateUpdated', (data) => {
    if (data.requester !== playerState.wallet) return
    applyDebugWorkerState(data)
  })

  // Ask server to load our farm (wallet must already be set in playerState)
  executeTask(async () => {
    void room.send('playerLoadFarm', {})
  })

  scheduleAutoSave()
  console.log('[SaveService] Initialized')
}
