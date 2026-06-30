import {
  engine,
  Entity,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform,
  Billboard,
  BillboardMode,
  MeshRenderer,
  ColliderLayer,
  Material,
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'
import { handlePlotClick, getWateringStatus, removeCropModel, removeSoilIcons, removeSoilTimerText } from '../game/actions'
import { playerState } from '../game/gameState'
import { SHOPINGCART_ICON, COINS_ICON } from '../data/imagePaths'
import { playSound } from './sfxSystem'
import { CROP_DATA, CROP_NAMES, CropType } from '../data/cropData'
import { formatTime } from './growthSystem'
import { tutorialState } from '../game/tutorialState'
import { MAILBOX_FEATURE_ENABLED } from '../game/featureFlags'
import { isVisiting } from '../services/visitService'
import { ALL_FERTILIZER_TYPES } from '../data/fertilizerData'
import { requestVisitorWaterPlot, visitorWaterCallbacks } from '../services/socialService'
import { playWateringVfx } from './wateringVfxSystem'
import { BUY_PLOT_GROUPS, LEVEL_PLOT_GROUPS } from '../data/plotGroupData'
import { setNpcSpawnPositionOverride } from './npcSystem'
import {
  initFarmInstances,
  getFarmEntity,
  getCurrentFarmEntity,
  getFarmSlotSoils,
  getFarmSpawnPositions,
  getEntityWorldPosition,
  hideFarmInstance,
  revealFarmInstance,
  setCurrentFarmSlot,
  getCurrentFarmSlotId,
} from './farmInstances'

const SOIL_MODEL             = 'assets/scene/Models/Soil01/Soil01.glb'
const SOIL_TRANSPARENT_MODEL = 'assets/scene/Models/Soil01Trasnparent/Soil01Trasnparent.glb'

export const farmSlotSoils: Entity[][] = getFarmSlotSoils()
export const FARM_SPAWN_POSITIONS = getFarmSpawnPositions()

const visitSessionWateredPlots = new Set<number>()

const soilEntities: Entity[] = []
const plotGroupSignEntities = new Map<string, Entity>()

let forSaleSignEntity: Entity | null = null
let computerEntity: Entity | null = null
let truckEntity: Entity | null = null
let compostBinEntity: Entity | null = null
let compostBinOriginalScale: { x: number; y: number; z: number } | null = null

function collectNpcSpawnPositionsForSlot(slotId: number): Map<string, ReturnType<typeof Vector3.create>> {
  const suffixMap = [
    ['Spawn01', 'NPCSpawn01'],
    ['Spawn01_2', 'NPCSpawn01_2'],
    ['Spawn01_3', 'NPCSpawn01_3'],
    ['Spawn01_4', 'NPCSpawn01_4'],
    ['Spawn01_5', 'NPCSpawn01_5'],
  ] as const

  const positions = new Map<string, ReturnType<typeof Vector3.create>>()
  for (const [suffix, entityName] of suffixMap) {
    const entity = getFarmEntity(slotId, entityName)
    if (!entity) continue
    const worldPos = getEntityWorldPosition(entity)
    positions.set(suffix, Vector3.create(worldPos.x, worldPos.y, worldPos.z))
  }
  return positions
}

export function hideFarmSlot(slotId: number): void {
  hideFarmInstance(slotId)
  console.log(`[MultiFarm] Farm ${slotId + 1} hidden`)
}

export function revealFarmSlot(slotId: number): void {
  revealFarmInstance(slotId)
  console.log(`[MultiFarm] Farm ${slotId + 1} revealed`)
}

export function clearVisitSessionWater(): void {
  visitSessionWateredPlots.clear()
}

export function initVisitorWaterFeedback(): void {
  visitorWaterCallbacks.onWaterResult = (data) => {
    const entity = soilEntities.find((candidate) => PlotState.get(candidate).plotIndex === data.plotIndex)
    if (!entity) return

    PlotState.getMutable(entity).isWatering = false
    if (!data.success) visitSessionWateredPlots.delete(data.plotIndex)
    updatePlotHoverText(entity)
  }
}

const COMPUTER_ICON_Y = 3.2
const COMPUTER_ICON_SIZE = 1.2
const TRUCK_ICON_Y = 3.5
const TRUCK_ICON_SIZE = 1.4

function spawnVisualIcon(parent: Entity, y: number, size: number, src: string): void {
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent,
    position: Vector3.create(0, y, 0),
    scale: Vector3.create(size, size, size),
  })
  Billboard.create(entity, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(entity)
  Material.setPbrMaterial(entity, {
    texture: Material.Texture.Common({ src }),
    emissiveTexture: Material.Texture.Common({ src }),
    emissiveIntensity: 0.9,
    emissiveColor: Color4.White(),
    alphaTest: 0.1,
    transparencyMode: 2,
  })
}

function enablePointerOnGltf(entity: Entity): void {
  const gltf = GltfContainer.getOrNull(entity)
  if (!gltf) return
  GltfContainer.createOrReplace(entity, {
    src: gltf.src,
    visibleMeshesCollisionMask: (gltf.visibleMeshesCollisionMask ?? 0) | ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: (gltf.invisibleMeshesCollisionMask ?? 0) | ColliderLayer.CL_POINTER,
  })
}

function wirePlotGroupSigns(): void {
  plotGroupSignEntities.clear()

  for (const def of BUY_PLOT_GROUPS) {
    if (!def.signName) continue
    const signEntity = getCurrentFarmEntity(def.signName)
    if (!signEntity) continue

    enablePointerOnGltf(signEntity)
    const parts = ['Expand Farm', '+3 plots', `${def.coinCost} coins`]
    if (def.requiredLevel > 0) parts.push(`Lv ${def.requiredLevel}+`)
    const hoverText = parts.join('  •  ')

    pointerEventsSystem.onPointerDown(
      { entity: signEntity, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        playerState.activePlotGroupName = def.groupName
        playSound('menu')
        playerState.activeMenu = 'plotGroupUnlock'
      },
    )

    plotGroupSignEntities.set(def.groupName, signEntity)
  }
}

function wireLocalFarmInteractives(): void {
  computerEntity = getCurrentFarmEntity('Computer.glb')
  if (computerEntity) {
    spawnVisualIcon(computerEntity, COMPUTER_ICON_Y, COMPUTER_ICON_SIZE, SHOPINGCART_ICON)
    enablePointerOnGltf(computerEntity)
    pointerEventsSystem.onPointerDown(
      { entity: computerEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Shop', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'shop' },
    )
  }

  truckEntity = getCurrentFarmEntity('Truck01.glb')
  if (truckEntity) {
    spawnVisualIcon(truckEntity, TRUCK_ICON_Y, TRUCK_ICON_SIZE, COINS_ICON)
    enablePointerOnGltf(truckEntity)
    pointerEventsSystem.onPointerDown(
      { entity: truckEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'Sell Crops', maxDistance: 10 } },
      () => { if (isVisiting()) return; playSound('truck'); playerState.activeMenu = 'sell' },
    )
  }

  forSaleSignEntity = getCurrentFarmEntity('For Sale Sign')
  if (forSaleSignEntity) {
    pointerEventsSystem.onPointerDown(
      { entity: forSaleSignEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'Expand Farm (10000 coins)', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'unlock' },
    )
  }

  const boombox = getCurrentFarmEntity('Boombox')
  if (boombox) {
    enablePointerOnGltf(boombox)
    pointerEventsSystem.onPointerDown(
      { entity: boombox, opts: { button: InputAction.IA_POINTER, hoverText: 'Change Music', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'jukebox' },
    )
  }

  const mailbox = getCurrentFarmEntity('Mailbox')
  if (mailbox && MAILBOX_FEATURE_ENABLED) {
    enablePointerOnGltf(mailbox)
    pointerEventsSystem.onPointerDown(
      { entity: mailbox, opts: { button: InputAction.IA_POINTER, hoverText: 'Mailbox & Neighbours', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'mailbox' },
    )
  }

  compostBinEntity = getCurrentFarmEntity('CompostBin.glb')
  if (compostBinEntity) {
    const scale = Transform.get(compostBinEntity).scale
    compostBinOriginalScale = { x: scale.x, y: scale.y, z: scale.z }
    enablePointerOnGltf(compostBinEntity)
    pointerEventsSystem.onPointerDown(
      { entity: compostBinEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'Compost Bin', maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        if (!playerState.compostBinUnlocked) return
        playSound('menu')
        playerState.activeMenu = 'compost'
      },
    )
  }

  wirePlotGroupSigns()
}

export function setupEntities(): void {
  initFarmInstances()
  console.log(`[Setup] Farm instances ready: ${farmSlotSoils.map((soils, index) => `Farm${index + 1}=${soils.length}`).join(', ')}`)
}

export function removeForSaleSign(): void {
  if (!forSaleSignEntity) return
  pointerEventsSystem.removeOnPointerDown(forSaleSignEntity)
  engine.removeEntity(forSaleSignEntity)
  forSaleSignEntity = null
}

export function removeForSaleSign2(): void {
  hidePlotGroupSign('PlotGroup_Buy_A')
}

export function removeForSaleSign3(): void {
  hidePlotGroupSign('PlotGroup_Buy_B')
}

export function unlockExpansion1Plots(): void {
  unlockPlotGroupByName('PlotGroup_Buy_A')
}

export function unlockExpansion2Plots(): void {
  unlockPlotGroupByName('PlotGroup_Buy_B')
}

export function unlockFarmerPlots(): void {
  for (const entity of soilEntities) {
    const plot = PlotState.get(entity)
    if (plot.plotIndex < 12) continue
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  }
}

export function unlockPlotGroupByName(groupName: string): void {
  const groupEntity = getCurrentFarmEntity(groupName)
  if (!groupEntity) {
    console.log(`CozyFarm: Group '${groupName}' not found, skipping unlock`)
    return
  }

  let count = 0
  for (const entity of soilEntities) {
    const transform = Transform.getOrNull(entity)
    if (!transform || transform.parent !== groupEntity) continue
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 1) GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    count++
  }

  console.log(`CozyFarm: Unlocked group '${groupName}' — ${count} plots`)
}

export function hidePlotGroupSign(groupName: string): void {
  const signEntity = plotGroupSignEntities.get(groupName)
  if (!signEntity) return
  pointerEventsSystem.removeOnPointerDown(signEntity)
  Transform.getMutable(signEntity).scale = Vector3.Zero()
}

export function checkLevelGroupUnlocks(playerLevel: number, unlockedGroups: string[]): string[] {
  const newlyUnlocked: string[] = []
  for (const def of LEVEL_PLOT_GROUPS) {
    if (playerLevel < def.requiredLevel) continue
    if (unlockedGroups.includes(def.groupName)) continue
    unlockPlotGroupByName(def.groupName)
    newlyUnlocked.push(def.groupName)
  }
  return newlyUnlocked
}

export function unlockSoilsPhase1(): void {
  for (const entity of soilEntities) {
    const plot = PlotState.get(entity)
    if (plot.plotIndex < 1 || plot.plotIndex >= 3) continue
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  }
}

export function unlockSoilsPhase2(): void {
  for (const entity of soilEntities) {
    const plot = PlotState.get(entity)
    if (plot.plotIndex < 3 || plot.plotIndex >= 6) continue
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  }
}

export function unlockSoilsAll6(): void {
  for (const entity of soilEntities) {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 6) continue
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  }
}

function handleVisitorPlotClick(entity: Entity): void {
  const plot = PlotState.get(entity)
  if (plot.cropType === -1 || plot.isReady || plot.isWatering || plot.isPlanting) return

  const targetFarm = playerState.viewingFarm
  if (!targetFarm) return
  if (playerState.visitorSessionWaterCount >= 5) return
  if (visitSessionWateredPlots.has(plot.plotIndex)) return

  visitSessionWateredPlots.add(plot.plotIndex)
  PlotState.getMutable(entity).isWatering = true
  playWateringVfx(entity)
  playSound('wateringcan')
  requestVisitorWaterPlot(targetFarm, plot.plotIndex)
}

export function registerPlotPointerEvent(entity: Entity): void {
  const plot = PlotState.get(entity)
  const visiting = isVisiting()

  let hoverText = 'Plant'

  if (visiting) {
    if (!plot.isUnlocked) hoverText = 'Locked'
    else if (plot.cropType !== -1 && !plot.isReady) {
      hoverText = visitSessionWateredPlots.has(plot.plotIndex) ? 'Watered' : 'Water Crop'
    } else {
      hoverText = 'Visiting'
    }
  } else if (!plot.isUnlocked) {
    hoverText = 'Locked'
  } else if (plot.cropType !== -1) {
    if (plot.isReady) {
      hoverText = plot.isRotten ? 'Harvest (Rotten — Organic Waste)' : 'Harvest'
    } else {
      const { canWater } = getWateringStatus(plot, Date.now())
      if (canWater) {
        hoverText = 'Water'
      } else {
        const cropName = CROP_NAMES[plot.cropType as CropType] ?? 'Crop'
        if (plot.growthStarted) {
          const def = CROP_DATA.get(plot.cropType as CropType)!
          const tutorialOnionGrowMs = 30_000
          const effectiveGrowTimeMs =
            tutorialState.active && plot.cropType === CropType.Onion
              ? tutorialOnionGrowMs
              : def.growTimeMs
          const remaining = effectiveGrowTimeMs - (Date.now() - plot.plantedAt)
          const hasFerts = plot.fertilizerType === -1 &&
            ALL_FERTILIZER_TYPES.some((fertilizer) => (playerState.fertilizers.get(fertilizer) ?? 0) > 0)
          hoverText = hasFerts
            ? `${cropName} - ${formatTime(remaining)} (Click to Fertilize)`
            : `${cropName} - ${formatTime(remaining)}`
        } else {
          hoverText = cropName
        }
      }
    }
  }

  pointerEventsSystem.onPointerDown(
    { entity, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 8 } },
    () => {
      if (isVisiting()) {
        handleVisitorPlotClick(entity)
        return
      }
      handlePlotClick(entity)
    },
  )
}

export function refreshAllPlotHoverTexts(): void {
  for (const entity of soilEntities) updatePlotHoverText(entity)
}

export function updatePlotHoverText(entity: Entity): void {
  pointerEventsSystem.removeOnPointerDown(entity)
  registerPlotPointerEvent(entity)
}

export function applyPlotUnlockVisual(entity: Entity): void {
  const plot = PlotState.get(entity)
  if (plot.plotIndex >= 1) GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  updatePlotHoverText(entity)
}

export function getSoilEntities(): Entity[] {
  return soilEntities
}

export function getComputerEntity(): Entity | null {
  return computerEntity
}

export function getTruckEntity(): Entity | null {
  return truckEntity
}

export function getCompostBinEntity(): Entity | null {
  return compostBinEntity
}

export function setupFarmSlotEntities(slotId: number): void {
  const effectiveSlotId = slotId >= 0 ? slotId : 0
  setCurrentFarmSlot(effectiveSlotId)

  soilEntities.length = 0
  for (const entity of farmSlotSoils[effectiveSlotId] ?? []) soilEntities.push(entity)

  for (const [index, entity] of soilEntities.entries()) {
    if (!PlotState.has(entity)) {
      PlotState.create(entity, {
        cropType: -1,
        growthStage: 0,
        plantedAt: 0,
        waterCount: 0,
        isUnlocked: index < 1,
        plotIndex: index,
        isRotten: false,
        fertilizerType: -1,
      })
    }
    if (index >= 1) GltfContainer.createOrReplace(entity, { src: SOIL_TRANSPARENT_MODEL })
    registerPlotPointerEvent(entity)
  }

  wireLocalFarmInteractives()

  const npcSpawns = collectNpcSpawnPositionsForSlot(effectiveSlotId)
  setNpcSpawnPositionOverride(npcSpawns.size > 0 ? npcSpawns : null)

  console.log(`[MultiFarm] Slot ${getCurrentFarmSlotId()} wired, soils=${soilEntities.length}`)
}

export function resetSoilPlots(): void {
  for (const [index, entity] of soilEntities.entries()) {
    const plot = PlotState.getMutable(entity)
    if (plot.cropType !== -1) removeCropModel(entity)
    removeSoilIcons(entity)
    removeSoilTimerText(entity)
    plot.cropType = -1
    plot.growthStage = 0
    plot.plantedAt = 0
    plot.waterCount = 0
    plot.isUnlocked = index === 0
    plot.growthStarted = false
    plot.isReady = false
    plot.justHarvested = false
    plot.isPlanting = false
    plot.isWatering = false
    plot.isRotten = false
    plot.fertilizerType = -1
    GltfContainer.createOrReplace(entity, { src: index >= 1 ? SOIL_TRANSPARENT_MODEL : SOIL_MODEL })
  }
}

export function setCompostBinVisible(visible: boolean): void {
  if (!compostBinEntity) return
  const transform = Transform.getMutable(compostBinEntity)
  if (visible) {
    const scale = compostBinOriginalScale ?? { x: 3, y: 3, z: 3 }
    transform.scale = Vector3.create(scale.x, scale.y, scale.z)
  } else {
    transform.scale = Vector3.Zero()
  }
}
