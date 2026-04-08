import { engine, Entity } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA } from '../data/cropData'
import { CROP_MODELS } from '../data/modelPaths'
import { setCropModel, removeCropModel, setSoilIconDisplay, removeSoilTimerText, setSoilTimerText, getWateringStatus, removeSoilIcons } from '../game/actions'
import { updatePlotHoverText } from './interactionSetup'
import { tutorialState } from '../game/tutorialState'

/** Onion grow time during the tutorial — 30 seconds so it doesn't feel like a wait */
const TUTORIAL_ONION_GROW_MS = 30_000

/** Tracks when justHarvested plots should auto-clear (timestamp in ms) */
const harvestClearTimers = new Map<Entity, number>()

function formatTime(ms: number): string {
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
        PlotState.getMutable(entity).justHarvested = false
        removeSoilIcons(entity)
        updatePlotHoverText(entity)
      }
      continue
    }
    harvestClearTimers.delete(entity)  // clean up if plot was cleared by manual click first

    // Skip empty plots
    if (plot.cropType === -1) continue

    // Skip plots waiting for first watering
    if (!plot.growthStarted) continue

    // Skip plots already signalled ready (icons stay as HandIcon)
    if (plot.isReady) continue

    const def = CROP_DATA.get(plot.cropType as CropType)!
    // During the tutorial, onion seeds grow in 30 s instead of the normal time
    const effectiveGrowTimeMs =
      tutorialState.active && plot.cropType === CropType.Onion
        ? TUTORIAL_ONION_GROW_MS
        : def.growTimeMs
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
      setSoilIconDisplay(entity, {
        cropType: plot.cropType, waterCount: plot.waterCount,
        wateringsRequired: def.wateringsRequired,
        canWater: false, isReady: true, isPlanting: false, justHarvested: false,
      })
      removeSoilTimerText(entity)
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
  }
}

engine.addSystem(growthSystem, 1, 'growthSystem')
