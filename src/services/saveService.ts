import { engine, executeTask, GltfContainer } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA } from '../data/cropData'
import { CROP_MODELS } from '../data/modelPaths'
import { playerState } from '../game/gameState'
import { tutorialState } from '../game/tutorialState'
import { room, FarmStatePayload, CropCount, PlotSaveState, PlayerRegistryResponse, BeautyLeaderboardResponse } from '../shared/farmMessages'
import { calculateBeautyScore } from '../game/beautyScore'
import { setCropModel, setSoilIconDisplay } from '../game/actions'
import {
  unlockExpansion1Plots, unlockExpansion2Plots,
  removeForSaleSign2, removeForSaleSign3,
  applyPlotUnlockVisual,
} from '../systems/interactionSetup'
import { questProgressMap, QuestStatus } from '../game/questState'
import { musicState } from '../game/musicState'
import { playSong, setMuted, setMusicVolume } from '../systems/musicSystem'

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
      growthStarted: plot.growthStarted,
      growthStage:   plot.growthStage,
      isReady:       plot.isReady,
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
    dogOwned:        playerState.dogOwned,
    totalCropsHarvested: playerState.totalCropsHarvested,
    totalWaterCount:     playerState.totalWaterCount,
    totalSeedPlanted:    playerState.totalSeedPlanted,
    totalSellCount:      playerState.totalSellCount,
    totalCoinsEarned:    playerState.totalCoinsEarned,
    tutorialComplete:    !tutorialState.active || tutorialState.step === 'complete',
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
    beautyScore:         0,
  }
  payload.beautyScore = calculateBeautyScore(payload)
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

  // ── Dog ───────────────────────────────────────────────────────────────────
  playerState.dogOwned = payload.dogOwned

  // ── Lifetime stats ────────────────────────────────────────────────────────
  playerState.totalCropsHarvested = payload.totalCropsHarvested
  playerState.totalWaterCount     = payload.totalWaterCount
  playerState.totalSeedPlanted    = payload.totalSeedPlanted
  playerState.totalSellCount      = payload.totalSellCount
  playerState.totalCoinsEarned    = payload.totalCoinsEarned

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

  // ── Restore in-progress plots ─────────────────────────────────────────────
  restorePlotStates(payload.plotStates)

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

    mutable.cropType      = saved.cropType
    mutable.plantedAt     = saved.plantedAt
    mutable.waterCount    = saved.waterCount
    mutable.growthStarted = saved.growthStarted
    mutable.isReady       = saved.isReady

    // Recalculate actual current stage based on elapsed time, not the saved stage
    // (crop may have progressed further while player was offline)
    if (saved.growthStarted && !saved.isReady) {
      const elapsed  = now - saved.plantedAt
      const progress = elapsed / def.growTimeMs

      let stage: number
      if (progress >= 0.75)      stage = 3
      else if (progress >= 0.5)  stage = 2
      else if (progress >= 0.25) stage = 1
      else                       stage = 0

      mutable.growthStage = stage
      if (stage > 0) setCropModel(entity, CROP_MODELS[saved.cropType as CropType][stage - 1])

      // If crop finished growing while offline → mark ready
      if (progress >= 1.0) {
        mutable.isReady = true
        const { canWater: _ } = { canWater: false }
        setSoilIconDisplay(entity, {
          cropType: saved.cropType, waterCount: saved.waterCount,
          wateringsRequired: def.wateringsRequired,
          canWater: false, isReady: true, isPlanting: false, justHarvested: false,
        })
      }
    } else if (saved.isReady) {
      // Was already ready when player left — restore stage 3 model
      mutable.growthStage = 3
      setCropModel(entity, CROP_MODELS[saved.cropType as CropType][2])
      setSoilIconDisplay(entity, {
        cropType: saved.cropType, waterCount: saved.waterCount,
        wateringsRequired: def.wateringsRequired,
        canWater: false, isReady: true, isPlanting: false, justHarvested: false,
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
    // Filter: only apply if this is our own wallet
    if (payload.wallet !== playerState.wallet) return
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
    leaderboardCallbacks.onBeautyLeaderboardLoaded?.(data)
  })

  // Ask server to load our farm (wallet must already be set in playerState)
  executeTask(async () => {
    void room.send('playerLoadFarm', {})
  })

  scheduleAutoSave()
  console.log('[SaveService] Initialized')
}
