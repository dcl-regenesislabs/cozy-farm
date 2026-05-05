import { engine, Entity, GltfContainer, Transform, Billboard, BillboardMode, MeshRenderer, Material, TextShape } from '@dcl/sdk/ecs'
import { spawnHarvestVfx, spawnOrganicWasteVfx, spawnFertilizerVfx } from '../systems/harvestVfxSystem'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PlotState, cropChildEntities, soilIconEntities } from '../components/farmComponents'
import { CropType, CROP_DATA } from '../data/cropData'
import { FertilizerType, ALL_FERTILIZER_TYPES } from '../data/fertilizerData'
import { CROP_MODELS } from '../data/modelPaths'
import { CROP_HARVEST_IMAGES, WATERINGCAN_ICON, WATER_ICON, WATER_DRY_ICON, HAND_ICON, ORGANIC_WASTE_ICON, FERTILIZER_ICON_SRCS } from '../data/imagePaths'
import { playerState } from './gameState'
import { updatePlotHoverText, setCompostBinVisible } from '../systems/interactionSetup'
import { playSeedVfx } from '../systems/seedVfxSystem'
import { playWateringVfx } from '../systems/wateringVfxSystem'
import { addXp, XP_PLANT, XP_WATER, XP_HARVEST_TIER1, XP_HARVEST_TIER2, XP_HARVEST_TIER3 } from '../systems/levelingSystem'
import { onHarvestCrop, onWater, onPlant, onSell, onFertilize } from './questState'
import { spawnDog } from '../systems/dogSystem'
import { onTutorialAction } from '../systems/tutorialSystem'
import { playSound } from '../systems/sfxSystem'
import { BEAUTY_OBJECTS } from '../data/beautyObjectData'
import { placeOrnamentInNextSlot, isOrnamentPlaced, hasEmptySlot } from '../systems/beautySpotSystem'

/** Create or update the crop child entity on a soil plot */
export function setCropModel(soilEntity: Entity, modelSrc: string) {
  let child = cropChildEntities.get(soilEntity)
  if (!child) {
    child = engine.addEntity()
    Transform.create(child, { parent: soilEntity })
    cropChildEntities.set(soilEntity, child)
  }
  GltfContainer.createOrReplace(child, { src: modelSrc })
}

/** Remove the crop child entity from a soil plot */
export function removeCropModel(soilEntity: Entity) {
  const child = cropChildEntities.get(soilEntity)
  if (child) {
    engine.removeEntity(child)
    cropChildEntities.delete(soilEntity)
  }
}

const ROT_CROP_MODEL = 'assets/scene/Models/RotCrop/RotCrop.glb'

/** Swap the crop model to the rotten variant */
export function applyRotVisual(soilEntity: Entity) {
  setCropModel(soilEntity, ROT_CROP_MODEL)
}

/** No-op — model is cleaned up by removeCropModel in resetPlot */
export function clearRotVisual(_soilEntity: Entity) {}

// ---------------------------------------------------------------------------
// Soil icon display — sizes and positions to tune here
// ---------------------------------------------------------------------------
const CROP_IMG_Y        = 2.0   // y for the crop image sprite
const CROP_IMG_SIZE     = 0.45  // size of the crop image sprite
const WATER_DOT_Y       = 1.45  // y for the water dot row
const WATER_DOT_SIZE    = 0.20  // size of each water dot icon
const WATER_DOT_SPACING = 0.24  // horizontal spacing between dots (centre to centre)
const ACTION_ICON_Y        = 0.85  // y for the watering-can / hand icon
const ACTION_ICON_SIZE     = 0.75  // size of the action icon (tune here to make it bigger/smaller)
const HARVEST_ICON_Y       = 1.5   // y used for hand icon after harvest
const TIMER_TEXT_Y         = 3.5   // y for the countdown text — raised above VFX models (watering can, seed anim)
const FERTILIZER_BADGE_Y   = 2.8   // y for the persistent fertilizer type icon
const FERTILIZER_BADGE_SIZE = 0.32 // size of the fertilizer badge icon

/** Create a single billboard sprite plane parented to soilEntity */
function makeIconSprite(parent: Entity, x: number, y: number, src: string, size: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(x, y, 0),
    scale: Vector3.create(size, size, size),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture:          Material.Texture.Common({ src }),
    emissiveTexture:  Material.Texture.Common({ src }),
    emissiveIntensity: 0.9,
    emissiveColor:    Color4.White(),
    alphaTest:        0.1,
    transparencyMode: 2,
  })
  return e
}

export type SoilIconState = {
  cropType:          number   // -1 = empty
  waterCount:        number
  wateringsRequired: number
  canWater:          boolean
  isReady:           boolean
  isPlanting:        boolean
  justHarvested:     boolean
  isRotten?:         boolean
  fertilizerType?:   number   // -1 or undefined = none applied
}

// Debounce: only rebuild sprites when state actually changes
const lastSoilIconState = new Map<Entity, string>()
function soilStateHash(s: SoilIconState): string {
  return `${s.cropType}|${s.waterCount}|${s.wateringsRequired}|${s.canWater}|${s.isReady}|${s.isPlanting}|${s.justHarvested}|${s.isRotten ?? false}|${s.fertilizerType ?? -1}`
}

// Internal remove — does NOT clear the hash (used inside setSoilIconDisplay)
function clearSoilSprites(soilEntity: Entity) {
  const children = soilIconEntities.get(soilEntity)
  if (children) {
    for (const e of children) engine.removeEntity(e)
    soilIconEntities.delete(soilEntity)
  }
}

/** Create or replace the icon sprites above a soil plot (debounced — only rebuilds on change) */
export function setSoilIconDisplay(soilEntity: Entity, state: SoilIconState) {
  const hash = soilStateHash(state)
  if (lastSoilIconState.get(soilEntity) === hash) return  // nothing changed
  lastSoilIconState.set(soilEntity, hash)

  clearSoilSprites(soilEntity)

  const sprites: Entity[] = []

  if (state.isPlanting) {
    // 3D VFX is playing — show no 2D icons at all
  } else if (state.justHarvested) {
    sprites.push(makeIconSprite(soilEntity, 0, HARVEST_ICON_Y, HAND_ICON, ACTION_ICON_SIZE))
  } else if (state.isReady) {
    // Rotten: show organic waste (soil) icon; normal: show hand icon
    const readyIcon = state.isRotten ? ORGANIC_WASTE_ICON : HAND_ICON
    sprites.push(makeIconSprite(soilEntity, 0, HARVEST_ICON_Y, readyIcon, ACTION_ICON_SIZE))
  } else if (state.cropType !== -1) {
    // Crop image (row 1)
    const cropSrc = CROP_HARVEST_IMAGES[state.cropType as CropType]
    sprites.push(makeIconSprite(soilEntity, 0, CROP_IMG_Y, cropSrc, CROP_IMG_SIZE))

    // Water dot row (row 2) — only when we have waterings to show
    if (state.wateringsRequired > 1 || state.waterCount > 0) {
      const total = state.wateringsRequired
      const filled = Math.min(state.waterCount, total)
      const startX = -((total - 1) * WATER_DOT_SPACING) / 2
      for (let i = 0; i < total; i++) {
        const src = i < filled ? WATER_ICON : WATER_DRY_ICON
        sprites.push(makeIconSprite(soilEntity, startX + i * WATER_DOT_SPACING, WATER_DOT_Y, src, WATER_DOT_SIZE))
      }
    }

    // Fertilizer badge — small icon above crop image when a fertilizer is active
    const fType = state.fertilizerType ?? -1
    if (fType !== -1) {
      const fertIconSrc = FERTILIZER_ICON_SRCS[fType]
      if (fertIconSrc) sprites.push(makeIconSprite(soilEntity, 0, FERTILIZER_BADGE_Y, fertIconSrc, FERTILIZER_BADGE_SIZE))
    }

    // Watering can icon (row 3) — only when player can water right now
    if (state.canWater) {
      sprites.push(makeIconSprite(soilEntity, 0, ACTION_ICON_Y, WATERINGCAN_ICON, ACTION_ICON_SIZE))
    }
  }

  if (sprites.length > 0) {
    soilIconEntities.set(soilEntity, sprites)
  }
}

/** Remove all icon sprites and clear the debounce hash for a soil plot */
export function removeSoilIcons(soilEntity: Entity) {
  clearSoilSprites(soilEntity)
  lastSoilIconState.delete(soilEntity)
}

// ---------------------------------------------------------------------------
// Timer text — separate entity so it updates every frame without recreating sprites
// ---------------------------------------------------------------------------
const timerTextEntities = new Map<Entity, Entity>()

/** Create or update the countdown text above a soil plot */
export function setSoilTimerText(soilEntity: Entity, text: string) {
  let child = timerTextEntities.get(soilEntity)
  if (!child) {
    child = engine.addEntity()
    Transform.create(child, {
      parent: soilEntity,
      position: Vector3.create(0, TIMER_TEXT_Y, 0),
    })
    Billboard.create(child, { billboardMode: BillboardMode.BM_ALL })
    TextShape.create(child, {
      text,
      fontSize: 3,
      textColor: { r: 1, g: 1, b: 1, a: 1 },
      outlineWidth: 0.15,
      outlineColor: { r: 0, g: 0, b: 0 },
    })
    timerTextEntities.set(soilEntity, child)
  } else {
    TextShape.getMutable(child).text = text
  }
}

/** Remove the countdown text from a soil plot */
export function removeSoilTimerText(soilEntity: Entity) {
  const child = timerTextEntities.get(soilEntity)
  if (child) {
    engine.removeEntity(child)
    timerTextEntities.delete(soilEntity)
  }
}

function hasFertilizersAvailable(): boolean {
  return ALL_FERTILIZER_TYPES.some((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
}

export function handlePlotClick(entity: Entity) {
  const plot = PlotState.get(entity)

  if (!plot.isUnlocked) return

  // Block all input while a VFX animation is in progress
  if (plot.isPlanting || plot.isWatering) return

  if (plot.justHarvested) {
    // Click after harvest → clear the plot immediately
    clearPlot(entity)
    return
  }

  if (plot.cropType === -1) {
    // Empty plot -> open plant menu
    playSound('menu')
    playerState.activePlotEntity = entity
    playerState.activeMenu = 'plant'
  } else if (plot.isReady) {
    // Ready to harvest
    harvestCrop(entity)
  } else {
    const { canWater } = getWateringStatus(plot, Date.now())
    if (canWater) {
      // Can water → water it (no fertilizer interrupt)
      waterCrop(entity)
    } else if (plot.growthStarted && plot.fertilizerType === -1 && hasFertilizersAvailable()) {
      // Crop is growing, no fertilizer applied yet, player has some → offer fertilize
      playerState.activePlotEntity = entity
      playerState.activeMenu = 'fertilize'
    }
    // else: nothing to do (watering window not open, already fertilized)
  }
}

export function plantSeed(entity: Entity, cropType: CropType): boolean {
  const seedCount = playerState.seeds.get(cropType) ?? 0
  if (seedCount <= 0) return false

  const plot = PlotState.getMutable(entity)
  if (plot.cropType !== -1) return false

  playerState.seeds.set(cropType, seedCount - 1)

  plot.cropType = cropType
  plot.growthStage = 0  // no model yet — appears after first quarter of grow time
  plot.plantedAt = 0    // not started yet — needs first watering
  plot.waterCount = 0
  plot.growthStarted = false
  plot.isReady = false
  plot.isRotten = false
  plot.fertilizerType = -1  // applied at first watering, not at planting
  plot.justHarvested = false
  plot.isPlanting = true  // blocked until seed VFX finishes

  setSoilIconDisplay(entity, {
    cropType, waterCount: 0, wateringsRequired: CROP_DATA.get(cropType)!.wateringsRequired,
    canWater: false, isReady: false, isPlanting: true, justHarvested: false,
  })
  playSeedVfx(entity, cropType)
  playSound('seeds')
  addXp(XP_PLANT)
  playerState.totalSeedPlanted += 1
  onPlant()
  onTutorialAction('plant')

  updatePlotHoverText(entity)
  // Only close the plant menu if no callback (e.g. progression event) opened a new dialog
  if (playerState.activeMenu === 'plant') playerState.activeMenu = 'none'
  playerState.activePlotEntity = null
  return true
}

/**
 * Returns whether a plot can be watered right now, and when the next window opens.
 *
 * Rules:
 *  - Water 0 (planting water): always available before growth starts.
 *  - Water k (k ≥ 1): available only within the window [k/N … (k+1)/N] of growTimeMs.
 *  - Missing a window permanently loses that watering (lower yield at harvest).
 */
export function getWateringStatus(
  plot: { cropType: number; isReady: boolean; isPlanting: boolean; growthStarted: boolean; waterCount: number; plantedAt: number; fertilizerType?: number },
  now: number
): { canWater: boolean; nextWindowInMs: number | null } {
  if (plot.cropType === -1 || plot.isReady || plot.isPlanting) {
    return { canWater: false, nextWindowInMs: null }
  }

  // Planting water — always available before growth has started
  if (!plot.growthStarted) {
    return { canWater: plot.waterCount === 0, nextWindowInMs: null }
  }

  const def = CROP_DATA.get(plot.cropType as CropType)!
  const N = def.wateringsRequired
  // WaterSaver fertilizer reduces waterings required by 1 (min 1)
  const effectiveN = (plot.fertilizerType === FertilizerType.WaterSaver) ? Math.max(1, N - 1) : N

  // Single-water crops: nothing left to do after the planting water
  if (effectiveN <= 1) return { canWater: false, nextWindowInMs: null }

  const elapsed = now - plot.plantedAt
  let windowsOpened = 0
  let inOpenWindow = false
  let nextWindowInMs: number | null = null

  for (let k = 1; k < effectiveN; k++) {
    const windowStart = (k / effectiveN) * def.growTimeMs
    const windowEnd   = ((k + 1) / effectiveN) * def.growTimeMs

    if (elapsed >= windowStart) {
      windowsOpened++
      if (elapsed < windowEnd) inOpenWindow = true
    } else if (nextWindowInMs === null) {
      nextWindowInMs = windowStart - elapsed
    }
  }

  const canWater = inOpenWindow && plot.waterCount < 1 + windowsOpened
  return { canWater, nextWindowInMs }
}

export function waterCrop(entity: Entity): boolean {
  const plot = PlotState.getMutable(entity)
  if (plot.cropType === -1 || plot.isReady || plot.isPlanting) return false

  const { canWater } = getWateringStatus(plot, Date.now())
  if (!canWater) return false

  plot.waterCount += 1
  plot.isWatering = true

  // First watering starts the growth timer
  if (!plot.growthStarted) {
    plot.growthStarted = true
    plot.plantedAt = Date.now()
  }

  playWateringVfx(entity)
  playSound('wateringcan')
  addXp(XP_WATER)
  playerState.totalWaterCount += 1
  onWater()
  onTutorialAction('water')
  return true
}

export function harvestCrop(entity: Entity, targetInventory?: Map<CropType, number>): boolean {
  const plot = PlotState.getMutable(entity)
  if (!plot.isReady) return false

  const savedFertilizerType = plot.fertilizerType

  // Reset plot state (common to both rotten and normal paths)
  function resetPlot() {
    plot.cropType = -1
    plot.growthStage = 0
    plot.plantedAt = 0
    plot.waterCount = 0
    plot.growthStarted = false
    plot.isReady = false
    plot.isRotten = false
    plot.fertilizerType = -1
    plot.justHarvested = true
    removeCropModel(entity)
    removeSoilTimerText(entity)
    setSoilIconDisplay(entity, {
      cropType: -1, waterCount: 0, wateringsRequired: 0,
      canWater: false, isReady: false, isPlanting: false, justHarvested: true,
    })
  }

  // Rotten crop — yield organic waste, no XP
  if (plot.isRotten) {
    clearRotVisual(entity)
    playerState.organicWaste += 1
    spawnOrganicWasteVfx(Transform.get(entity).position)
    resetPlot()
    playSound('harvest')
    return true
  }

  // Normal harvest
  const cropType = plot.cropType as CropType
  const def = CROP_DATA.get(cropType)!

  // Yield based on watering completeness
  const waterRatio = plot.waterCount / def.wateringsRequired
  const yieldMultiplier = waterRatio >= 1 ? 1.0 : waterRatio >= 0.5 ? 0.75 : 0.5
  const baseYield = Math.floor(Math.random() * (def.yieldMax - def.yieldMin + 1)) + def.yieldMin
  let finalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier))

  // YieldBoost fertilizer: +50% harvest yield
  if (savedFertilizerType === FertilizerType.YieldBoost) {
    finalYield = Math.ceil(finalYield * 1.5)
  }

  const inventory = targetInventory ?? playerState.harvested
  const current = inventory.get(cropType) ?? 0
  inventory.set(cropType, current + finalYield)

  // Floating sprite VFX — one sprite per harvested item (capped at 5)
  spawnHarvestVfx(Transform.get(entity).position, cropType, Math.min(finalYield, 5))
  playSound('harvest')

  const harvestXp = def.tier === 1 ? XP_HARVEST_TIER1 : def.tier === 2 ? XP_HARVEST_TIER2 : XP_HARVEST_TIER3
  addXp(harvestXp)
  playerState.totalCropsHarvested += finalYield
  onHarvestCrop(cropType, finalYield)
  onTutorialAction('harvest')

  resetPlot()
  return true
}

function clearPlot(entity: Entity) {
  const plot = PlotState.getMutable(entity)
  plot.justHarvested = false
  removeSoilIcons(entity)
  removeSoilTimerText(entity)
  updatePlotHoverText(entity)
}

/** Apply a fertilizer to a growing crop (3rd step after plant → water). */
export function applyFertilizer(entity: Entity, fertilizerType: FertilizerType): boolean {
  const plot = PlotState.getMutable(entity)
  if (!plot.growthStarted || plot.isReady || plot.fertilizerType !== -1) return false

  const current = playerState.fertilizers.get(fertilizerType) ?? 0
  if (current <= 0) return false

  playerState.fertilizers.set(fertilizerType, current - 1)
  plot.fertilizerType = fertilizerType
  spawnFertilizerVfx(Transform.get(entity).position, fertilizerType)
  lastSoilIconState.delete(entity)  // force icon rebuild next tick
  updatePlotHoverText(entity)
  onFertilize()
  return true
}

export function buySeed(cropType: CropType, quantity: number): boolean {
  const def = CROP_DATA.get(cropType)!
  const totalCost = def.seedCost * quantity
  if (playerState.coins < totalCost) return false

  playerState.coins -= totalCost
  const current = playerState.seeds.get(cropType) ?? 0
  playerState.seeds.set(cropType, current + quantity)
  onTutorialAction('buy_seeds')
  return true
}

export function sellCrop(cropType: CropType, quantity: number): boolean {
  const available = playerState.harvested.get(cropType) ?? 0
  const toSell = Math.min(quantity, available)
  if (toSell <= 0) return false

  const def = CROP_DATA.get(cropType)!
  playerState.harvested.set(cropType, available - toSell)
  playerState.coins += def.sellPrice * toSell
  playerState.totalSellCount += toSell
  playerState.totalCoinsEarned += def.sellPrice * toSell
  onSell(toSell)
  onTutorialAction('sell')
  return true
}


/**
 * Purchase a beauty ornament and place it in the next empty slot.
 * Returns true on success. Fails if: already placed, no empty slot, or insufficient coins.
 */
export function buyOrnament(objectId: number): boolean {
  const def = BEAUTY_OBJECTS.get(objectId)
  if (!def) return false
  if (isOrnamentPlaced(objectId)) return false
  if (!hasEmptySlot()) return false
  if (playerState.coins < def.price) return false

  playerState.coins -= def.price
  placeOrnamentInNextSlot(objectId)
  console.log(`CozyFarm: Bought ornament "${def.name}" (id=${objectId}, beauty=${def.beautyValue})`)
  return true
}

export const COMPOST_BIN_PRICE = 300

let onBuyCompostBinCb: (() => void) | null = null
export function setOnBuyCompostBin(cb: () => void): void { onBuyCompostBinCb = cb }

/** Purchase the compost bin for 300 coins. Unlocks composting and the 3D bin interaction. */
export function buyCompostBin(): boolean {
  if (playerState.compostBinUnlocked) return false
  if (playerState.coins < COMPOST_BIN_PRICE) return false
  playerState.coins -= COMPOST_BIN_PRICE
  playerState.compostBinUnlocked = true
  setCompostBinVisible(true)
  const cb = onBuyCompostBinCb
  onBuyCompostBinCb = null
  cb?.()
  return true
}

/** Purchase the dog companion for 500 coins. No-op if already owned or insufficient coins. */
export function buyDog() {
  if (playerState.dogOwned) return
  if (playerState.coins < 500) return
  playerState.coins   -= 500
  playerState.dogOwned = true
  spawnDog()
  console.log('CozyFarm Dog: purchased and spawned')
}
