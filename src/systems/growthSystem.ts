import { engine, Entity } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA } from '../data/cropData'
import { FertilizerType } from '../data/fertilizerData'
import { CROP_MODELS } from '../data/modelPaths'
import { setCropModel, removeCropModel, setSoilIconDisplay, removeSoilTimerText, setSoilTimerText, getWateringStatus, removeSoilIcons, applyRotVisual } from '../game/actions'
import { updatePlotHoverText } from './interactionSetup'
import { tutorialState } from '../game/tutorialState'
import { isPlotRotten } from '../game/rotUtils'

/** Onion grow time during the tutorial — 30 seconds so it doesn't feel like a wait */
const TUTORIAL_ONION_GROW_MS = 30_000

/** Tracks when justHarvested plots should auto-clear (timestamp in ms) */
const harvestClearTimers = new Map<Entity, number>()

/** Tracks last known canWater state per entity to detect changes */
const prevCanWater = new Map<Entity, boolean>()
/** Tracks last hover text update time to refresh the timer display (~60s) */
const lastHoverUpdateAt = new Map<Entity, number>()

export function formatTime(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const totalSeconds = Math.ceil(ms / 1000)
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0)   return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}


function growthSystem(_dt: number) {
  const now = Date.now()

  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    const plot = PlotState.get(entity)

    // Auto-clear the "just harvested" interstitial after 2 seconds
    if (plot.justHarvested) {
      let clearAt = harvestClearTimers.get(entity)
      if (!clearAt) {
        clearAt = now + 2000
        harvestClearTimers.set(entity, clearAt)
      }
      if (now >= clearAt) {
        harvestClearTimers.delete(entity)
        prevCanWater.delete(entity)
        lastHoverUpdateAt.delete(entity)
        PlotState.getMutable(entity).justHarvested = false
        removeSoilIcons(entity)
        updatePlotHoverText(entity)
      }
      continue
    }
    harvestClearTimers.delete(entity)

    // Skip empty plots
    if (plot.cropType === -1) continue

    // Skip plots waiting for first watering
    if (!plot.growthStarted) continue

    const def = CROP_DATA.get(plot.cropType as CropType)!
    // During the tutorial, onion seeds grow in 30 s instead of the normal time
    let effectiveGrowTimeMs =
      tutorialState.active && plot.cropType === CropType.Onion
        ? TUTORIAL_ONION_GROW_MS
        : def.growTimeMs
    // GrowthBoost fertilizer reduces grow time by 25%
    if (plot.fertilizerType === FertilizerType.GrowthBoost) {
      effectiveGrowTimeMs = Math.floor(effectiveGrowTimeMs * 0.75)
    }

    // For already-ready plots: only check for rot, then skip growth updates
    if (plot.isReady) {
      if (!plot.isRotten && isPlotRotten(plot.plantedAt, plot.cropType, plot.fertilizerType, effectiveGrowTimeMs, now)) {
        const mutable = PlotState.getMutable(entity)
        mutable.isRotten = true
        applyRotVisual(entity)
        setSoilIconDisplay(entity, {
          cropType: plot.cropType, waterCount: plot.waterCount,
          wateringsRequired: def.wateringsRequired,
          canWater: false, isReady: true, isPlanting: false, justHarvested: false,
          isRotten: true,
        })
        updatePlotHoverText(entity)
      }
      continue
    }
    const elapsed = now - plot.plantedAt
    const progress = elapsed / effectiveGrowTimeMs

    // Stages: 0=no model (0-25%), 1=sprout01 (25-50%), 2=sprout02 (50-75%), 3=sprout03 (75-100%+)
    let targetStage: number
    if (progress >= 0.75) {
      targetStage = 3
    } else if (progress >= 0.5) {
      targetStage = 2
    } else if (progress >= 0.25) {
      targetStage = 1
    } else {
      targetStage = 0
    }

    // Update model on stage transition
    if (targetStage !== plot.growthStage) {
      const mutable = PlotState.getMutable(entity)
      mutable.growthStage = targetStage

      if (targetStage === 0) {
        removeCropModel(entity)
      } else {
        setCropModel(entity, CROP_MODELS[plot.cropType as CropType][targetStage - 1])
      }
    }

    // Mark as ready once growth is complete
    if (progress >= 1.0) {
      const mutable = PlotState.getMutable(entity)
      mutable.isReady = true
      // Check for immediate rot (edge case: crop grew and rotted in same frame)
      if (isPlotRotten(plot.plantedAt, plot.cropType, plot.fertilizerType, effectiveGrowTimeMs, now)) {
        mutable.isRotten = true
        applyRotVisual(entity)
      }
      setSoilIconDisplay(entity, {
        cropType: plot.cropType, waterCount: plot.waterCount,
        wateringsRequired: def.wateringsRequired,
        canWater: false, isReady: true, isPlanting: false, justHarvested: false,
        isRotten: mutable.isRotten,
      })
      removeSoilTimerText(entity)
      prevCanWater.delete(entity)
      lastHoverUpdateAt.delete(entity)
      updatePlotHoverText(entity)
      continue
    }

    // Update icon display (debounced — only rebuilds sprites when state changes)
    const { canWater } = getWateringStatus(plot, now)
    setSoilIconDisplay(entity, {
      cropType: plot.cropType, waterCount: plot.waterCount,
      wateringsRequired: def.wateringsRequired,
      canWater, isReady: false, isPlanting: false, justHarvested: false,
    })

    // Update timer text every frame (cheap — just updates TextShape content)
    setSoilTimerText(entity, formatTime(effectiveGrowTimeMs - elapsed))

    // Refresh hover text when canWater changes, or on a timer based on remaining time
    // (sub-minute: every second so the countdown feels live; otherwise every 60s)
    const wasCanWater = prevCanWater.get(entity)
    const lastUpdate = lastHoverUpdateAt.get(entity) ?? 0
    const remaining = effectiveGrowTimeMs - elapsed
    const updateInterval = remaining < 60_000 ? 1_000 : 60_000
    if (wasCanWater !== canWater || now - lastUpdate > updateInterval) {
      prevCanWater.set(entity, canWater)
      lastHoverUpdateAt.set(entity, now)
      updatePlotHoverText(entity)
    }
  }
}

engine.addSystem(growthSystem, 1, 'growthSystem')
