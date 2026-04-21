import { engine } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { removeCropModel } from '../game/actions'
import { playerState } from '../game/gameState'
import { room, FarmStatePayload, PlotSaveState } from '../shared/farmMessages'
import {
  restorePlotStates,
  pauseAutoSave, resumeAutoSave,
  visitCallbacks, registryCallbacks,
} from './saveService'

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let ownPlotSnapshot: PlotSaveState[] | null = null
let pendingVisitAddress: string | null = null
let visitedPayload: FarmStatePayload | null = null

export function getVisitedPayload(): FarmStatePayload | null {
  return visitedPayload
}

// UI callbacks — wired by UI components that need visit events
export const visitUiCallbacks = {
  onOtherFarmError: null as ((address: string) => void) | null,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isVisiting(): boolean {
  return playerState.viewingFarm !== null
}

export function requestOtherFarm(address: string, displayName = ''): void {
  pendingVisitAddress = address.toLowerCase()
  playerState.viewingFarmDisplayName = displayName
  void room.send('loadOtherFarm', { address: pendingVisitAddress })
}

export function requestPlayerRegistry(page: number): void {
  void room.send('loadPlayerRegistry', { page })
}

export function enterVisitMode(address: string, payload: FarmStatePayload): void {
  visitedPayload = payload
  ownPlotSnapshot = snapshotOwnPlots()

  // Clear existing crop models before applying visited data
  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    removeCropModel(entity)
  }

  restorePlotStates(payload.plotStates)

  playerState.viewingFarm = address
  playerState.activeMenu  = 'none'
  pauseAutoSave()
}

export function exitVisitMode(): void {
  if (!ownPlotSnapshot) return

  // Clear visited crop models
  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    removeCropModel(entity)
  }

  restorePlotStates(ownPlotSnapshot)

  playerState.viewingFarm = null
  playerState.viewingFarmDisplayName = ''
  resumeAutoSave()
  ownPlotSnapshot = null
  pendingVisitAddress = null
  visitedPayload = null
}

// ---------------------------------------------------------------------------
// Handlers called from saveService message listeners
// ---------------------------------------------------------------------------

export function handleOtherFarmLoaded(
  requester: string, address: string, payload: FarmStatePayload
): void {
  if (requester !== playerState.wallet) return
  if (address !== pendingVisitAddress) return
  enterVisitMode(address, payload)
}

export function handleOtherFarmError(
  requester: string, address: string, _reason: string
): void {
  if (requester !== playerState.wallet) return
  pendingVisitAddress = null
  visitUiCallbacks.onOtherFarmError?.(address)
}

// ---------------------------------------------------------------------------
// Wire callbacks — called once from index.ts after initSaveService
// ---------------------------------------------------------------------------

export function initVisitService(): void {
  visitCallbacks.onOtherFarmLoaded = handleOtherFarmLoaded
  visitCallbacks.onOtherFarmError  = handleOtherFarmError
  registryCallbacks.onRegistryLoaded = null  // wired per-panel in MailboxMenu
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function snapshotOwnPlots(): PlotSaveState[] {
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
