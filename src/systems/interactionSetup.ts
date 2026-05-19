import { engine, Entity, GltfContainer, InputAction, pointerEventsSystem, Transform, Billboard, BillboardMode, MeshRenderer, MeshCollider, ColliderLayer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'
import { handlePlotClick, getWateringStatus, removeCropModel, removeSoilIcons, removeSoilTimerText } from '../game/actions'
import { playerState } from '../game/gameState'
import { SHOPINGCART_ICON, COINS_ICON } from '../data/imagePaths'
import { skipTutorial, resetFarm } from './tutorialSystem'
import { playSound } from './sfxSystem'
import { CROP_DATA, CROP_NAMES, CropType } from '../data/cropData'
import { formatTime } from './growthSystem'
import { tutorialState } from '../game/tutorialState'
import { isVisiting } from '../services/visitService'
import { ALL_FERTILIZER_TYPES } from '../data/fertilizerData'
import { requestVisitorWaterPlot, visitorWaterCallbacks } from '../services/socialService'
import { playWateringVfx } from './wateringVfxSystem'
import { PLOT_GROUP_DEFINITIONS, BUY_PLOT_GROUPS, LEVEL_PLOT_GROUPS } from '../data/plotGroupData'
import { setNpcSpawnPositionOverride } from './npcSystem'

const SOIL_MODEL             = 'assets/scene/Models/Soil01/Soil01.glb'
const SOIL_TRANSPARENT_MODEL = 'assets/scene/Models/Soil01Trasnparent/Soil01Trasnparent.glb'

// ---------------------------------------------------------------------------
// Multi-farm soil discovery — finds all soil entities under a named parent
// by traversing the entity hierarchy (needed because duplicated entities in
// Creator Hub don't get unique names).
// ---------------------------------------------------------------------------

function collectSoilsUnderParent(parentName: string): Entity[] {
  const parentEntity = engine.getEntityOrNullByName(parentName)
  if (!parentEntity) return []

  // Build a parent → children map from all entities with Transform
  const childrenOf = new Map<number, Entity[]>()
  for (const [entity] of engine.getEntitiesWith(Transform)) {
    const t = Transform.get(entity)
    const p = t.parent as number | undefined
    if (p) {
      const kids = childrenOf.get(p) ?? []
      kids.push(entity)
      childrenOf.set(p, kids)
    }
  }

  // BFS — collect all descendants that have a Soil GLB
  const result: Entity[] = []
  const queue: Entity[] = [parentEntity]
  while (queue.length > 0) {
    const current = queue.shift()!
    const kids = childrenOf.get(current as unknown as number) ?? []
    for (const kid of kids) {
      const gltf = GltfContainer.getOrNull(kid)
      if (gltf?.src?.includes('Soil01')) {
        result.push(kid)
      }
      queue.push(kid)
    }
  }
  return result
}

// One array of soil entities per farm slot (populated in setupEntities)
export const farmSlotSoils: Entity[][] = [[], [], []]

// Farm parent entities indexed by slot
const farmParentEntities: (Entity | null)[] = [null, null, null]
const farmParentOriginalScales: ({ x: number; y: number; z: number } | null)[] = [null, null, null]

// Farm spawn positions (world-space, one per slot) — adjust to match scene layout
export const FARM_SPAWN_POSITIONS = [
  { x: 8,  y: 1, z: 8  },   // slot 0 — FarmParent z=0
  { x: 8,  y: 1, z: 99 },   // slot 1 — FarmParent z=91
  { x: 8,  y: 1, z: 179 },  // slot 2 — FarmParent z=171
]

// Plaza spawn (no farm slot)
export const PLAZA_SPAWN_POSITION = { x: 8, y: 1, z: 45 }

export function hideFarmSlot(slotId: number): void {
  const entity = farmParentEntities[slotId]
  if (!entity) return
  const t = Transform.getMutableOrNull(entity)
  if (t) {
    t.scale = Vector3.Zero()
    console.log(`[MultiFarm] Farm ${slotId + 1} hidden — player disconnected`)
  }
}

export function revealFarmSlot(slotId: number): void {
  const entity = farmParentEntities[slotId]
  const origScale = farmParentOriginalScales[slotId]
  if (!entity) {
    console.error(`[MultiFarm] revealFarmSlot(${slotId}): entity not found`)
    return
  }
  if (!origScale) {
    console.error(`[MultiFarm] revealFarmSlot(${slotId}): origScale not saved`)
    return
  }
  const t = Transform.getMutableOrNull(entity)
  if (!t) {
    console.error(`[MultiFarm] revealFarmSlot(${slotId}): Transform not found`)
    return
  }
  t.scale = Vector3.create(origScale.x, origScale.y, origScale.z)
  console.log(`[MultiFarm] Farm ${slotId + 1} revealed — scale restored to (${origScale.x}, ${origScale.y}, ${origScale.z})`)
}

// Tracks which plot indices were watered in the current visitor session
const visitSessionWateredPlots = new Set<number>()
export function clearVisitSessionWater(): void { visitSessionWateredPlots.clear() }

export function initVisitorWaterFeedback(): void {
  visitorWaterCallbacks.onWaterResult = (data) => {
    const entity = soilEntities.find(
      (e) => PlotState.get(e).plotIndex === data.plotIndex
    )
    if (entity) {
      PlotState.getMutable(entity).isWatering = false
      if (!data.success) visitSessionWateredPlots.delete(data.plotIndex)
      updatePlotHoverText(entity)
    }
  }
}

// Icon position/size constants — tune here
const COMPUTER_ICON_Y    = 3.2   // height above Computer entity origin
const COMPUTER_ICON_SIZE = 1.2
const TRUCK_ICON_Y       = 3.5   // height above Truck entity origin
const TRUCK_ICON_SIZE    = 1.4

/** Visual-only billboard icon — no collider so it never intercepts raycasts */
function spawnVisualIcon(parent: Entity, y: number, size: number, src: string) {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, y, 0),
    scale:    Vector3.create(size, size, size),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(e)
  // NO MeshCollider — purely visual, pointer events handled by a separate box collider
  Material.setPbrMaterial(e, {
    texture:           Material.Texture.Common({ src }),
    emissiveTexture:   Material.Texture.Common({ src }),
    emissiveIntensity: 0.9,
    emissiveColor:     Color4.White(),
    alphaTest:         0.1,
    transparencyMode:  2,
  })
}

/**
 * Add CL_POINTER to an entity's existing GLTF collision masks so that
 * pointerEventsSystem works on it using the model's own geometry.
 *
 * Scene-editor objects only get CL_PHYSICS|CL_SCENE by default.
 * Adding a separate child box inside a physics mesh doesn't work because
 * the physics layer intercepts the raycast first.  The right fix is to
 * promote the existing collision mesh to also respond to pointer rays.
 */
function enablePointerOnGltf(entity: Entity) {
  const gltf = GltfContainer.getOrNull(entity)
  if (!gltf) return
  GltfContainer.createOrReplace(entity, {
    src: gltf.src,
    visibleMeshesCollisionMask:
      (gltf.visibleMeshesCollisionMask   ?? 0) | ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask:
      (gltf.invisibleMeshesCollisionMask ?? 0) | ColliderLayer.CL_POINTER,
  })
}

const soilEntities: Entity[] = []
const plotGroupSignEntities = new Map<string, Entity>()
let forSaleSignEntity: Entity | null = null
let computerEntity: Entity | null = null
let truckEntity: Entity | null = null
let compostBinEntity: Entity | null = null
let compostBinOriginalScale: { x: number; y: number; z: number } | null = null

export function setupEntities() {
  // ── Computer ──────────────────────────────────────────────────────────────
  computerEntity = engine.getEntityOrNullByName('Computer.glb')
  const computer = computerEntity
  if (computer) {
    spawnVisualIcon(computer, COMPUTER_ICON_Y, COMPUTER_ICON_SIZE, SHOPINGCART_ICON)
    // Promote the GLB's own collision mesh to also respond to pointer rays.
    // Scene-editor objects only get CL_PHYSICS|CL_SCENE by default; OR in CL_POINTER.
    enablePointerOnGltf(computer)
    pointerEventsSystem.onPointerDown(
      { entity: computer, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Shop', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'shop' }
    )
  }

  // ── Truck ─────────────────────────────────────────────────────────────────
  truckEntity = engine.getEntityOrNullByName('Truck01.glb')
  const truck = truckEntity
  if (truck) {
    spawnVisualIcon(truck, TRUCK_ICON_Y, TRUCK_ICON_SIZE, COINS_ICON)
    // Same fix: promote the GLB collision mesh to include CL_POINTER.
    enablePointerOnGltf(truck)
    pointerEventsSystem.onPointerDown(
      { entity: truck, opts: { button: InputAction.IA_POINTER, hoverText: 'Sell Crops', maxDistance: 10 } },
      () => { if (isVisiting()) return; playSound('truck'); playerState.activeMenu = 'sell' }
    )
  }

  // ── Farmer unlock sign (big 10k sign) ────────────────────────────────────
  forSaleSignEntity = engine.getEntityOrNullByName('For Sale Sign')
  if (forSaleSignEntity) {
    pointerEventsSystem.onPointerDown(
      {
        entity: forSaleSignEntity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'Expand Farm (10000 coins)', maxDistance: 8 },
      },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'unlock' }
    )
  }

  // ── Plot group For Sale Signs (A–J) ───────────────────────────────────────
  wireAllPlotGroupSigns()

  // ── Soil plots — Farm 1 (by name, original approach) ────────────────────
  const firstSoil = engine.getEntityOrNullByName('Soil01.glb')
  if (firstSoil) soilEntities.push(firstSoil)
  for (let i = 2; i <= 84; i++) {
    const soil = engine.getEntityOrNullByName(`Soil01.glb_${i}`)
    if (soil) soilEntities.push(soil)
  }

  // ── Farm parents — store refs and hide Farm 2 & 3 until occupied ─────────
  const fpNames = ['FarmParent', 'FarmParent_2', 'FarmParent_3']
  for (let i = 0; i < 3; i++) {
    const fp = engine.getEntityOrNullByName(fpNames[i])
    farmParentEntities[i] = fp
    if (fp) {
      const t = Transform.getMutableOrNull(fp)
      if (t) {
        farmParentOriginalScales[i] = { x: t.scale.x, y: t.scale.y, z: t.scale.z }
        if (i > 0) {
          t.scale = Vector3.Zero()
          console.log(`[MultiFarm] Hidden Farm ${i + 1} (FarmParent scale set to 0)`)
        }
      }
    } else {
      console.error(`[MultiFarm] Entity '${fpNames[i]}' not found in scene!`)
    }
  }

  // ── Soil plots — Farm 2 & 3 (by parent traversal, duplicated names) ──────
  farmSlotSoils[0] = [...soilEntities]
  farmSlotSoils[1] = collectSoilsUnderParent('SoilPlots_2')
  farmSlotSoils[2] = collectSoilsUnderParent('SoilPlots_3')
  console.log(`[Setup] Soils per farm: ${farmSlotSoils.map((s, i) => `Farm${i+1}=${s.length}`).join(', ')}`)

  // ── Init PlotState only on the current player's farm slot ─────────────────
  // Other farms' soils stay untouched until their owner's data is loaded.
  soilEntities.forEach((entity, index) => {
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

    if (index >= 1) {
      GltfContainer.createOrReplace(entity, { src: SOIL_TRANSPARENT_MODEL })
    }

    registerPlotPointerEvent(entity)
  })

  // ── Boombox ───────────────────────────────────────────────────────────────
  const boombox = engine.getEntityOrNullByName('Boombox')
  if (boombox) {
    enablePointerOnGltf(boombox)
    pointerEventsSystem.onPointerDown(
      { entity: boombox, opts: { button: InputAction.IA_POINTER, hoverText: 'Change Music', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'jukebox' }
    )
  }

  // ── Bed (3 clicks = dev full reset to tutorial start) ────────────────────
  let bedClickCount = 0
  const bed = engine.getEntityOrNullByName('Bed.glb')
  if (bed) {
    enablePointerOnGltf(bed)
    pointerEventsSystem.onPointerDown(
      { entity: bed, opts: { button: InputAction.IA_POINTER, hoverText: 'Sleep', maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        bedClickCount++
        if (bedClickCount >= 3) {
          bedClickCount = 0
          resetFarm()
        }
      },
    )
  }

  // ── Axe (dev shortcut — 3 clicks = skip tutorial + 20k coins) ────────────
  // Requires collider enabled on the model in Creator Hub (same as Bed, Computer, etc.)
  let axeClickCount = 0
  const axe = engine.getEntityOrNullByName('Axe 2')
  if (axe) {
    enablePointerOnGltf(axe)
    pointerEventsSystem.onPointerDown(
      { entity: axe, opts: { button: InputAction.IA_POINTER, hoverText: 'Chop', maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        axeClickCount++
        if (axeClickCount >= 3) { axeClickCount = 0; skipTutorial() }
      },
    )
  }

  // ── Mailbox (Farmers Directory) ───────────────────────────────────────────
  const mailbox = engine.getEntityOrNullByName('Mailbox')
  if (mailbox) {
    enablePointerOnGltf(mailbox)
    pointerEventsSystem.onPointerDown(
      { entity: mailbox, opts: { button: InputAction.IA_POINTER, hoverText: 'Mailbox & Neighbours', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'mailbox' }
    )
  }

  // ── Compost Bin ───────────────────────────────────────────────────────────
  const compostBin = engine.getEntityOrNullByName('CompostBin.glb')
  compostBinEntity = compostBin
  if (compostBin) {
    const s = Transform.get(compostBin).scale
    compostBinOriginalScale = { x: s.x, y: s.y, z: s.z }
    enablePointerOnGltf(compostBin)
    pointerEventsSystem.onPointerDown(
      { entity: compostBin, opts: { button: InputAction.IA_POINTER, hoverText: 'Compost Bin', maxDistance: 8 } },
      () => { if (isVisiting()) return; if (!playerState.compostBinUnlocked) return; playSound('menu'); playerState.activeMenu = 'compost' }
    )
  }

  console.log(`CozyFarm: Discovered ${soilEntities.length} soil plots, computer=${!!computer}, truck=${!!truck}, farmerSign=${!!forSaleSignEntity}, boombox=${!!boombox}, bed=${!!bed}, mailbox=${!!mailbox}, compostBin=${!!compostBin}`)
}

export function removeForSaleSign() {
  if (forSaleSignEntity) {
    pointerEventsSystem.removeOnPointerDown(forSaleSignEntity)
    engine.removeEntity(forSaleSignEntity)
    forSaleSignEntity = null
  }
}

/** @deprecated Use hidePlotGroupSign('PlotGroup_Buy_A') instead */
export function removeForSaleSign2() {
  hidePlotGroupSign('PlotGroup_Buy_A')
}

/** @deprecated Use hidePlotGroupSign('PlotGroup_Buy_B') instead */
export function removeForSaleSign3() {
  hidePlotGroupSign('PlotGroup_Buy_B')
}

/** @deprecated Use unlockPlotGroupByName('PlotGroup_Buy_A') — kept for save migration */
export function unlockExpansion1Plots() {
  unlockPlotGroupByName('PlotGroup_Buy_A')
}

/** @deprecated Use unlockPlotGroupByName('PlotGroup_Buy_B') — kept for save migration */
export function unlockExpansion2Plots() {
  unlockPlotGroupByName('PlotGroup_Buy_B')
}

/** Farmer zone: unlock plots 12–35 (entity names Soil01.glb_13 through _36) */
export function unlockFarmerPlots() {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 12) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
}

// ---------------------------------------------------------------------------
// Plot-group sign wiring (ForSaleSign_A through ForSaleSign_J)
// ---------------------------------------------------------------------------

function wireAllPlotGroupSigns(): void {
  for (const def of BUY_PLOT_GROUPS) {
    if (!def.signName) continue
    const signEntity = engine.getEntityOrNullByName(def.signName)
    if (!signEntity) {
      console.log(`CozyFarm: ForSaleSign '${def.signName}' not found in scene`)
      continue
    }
    enablePointerOnGltf(signEntity)
    const parts = [
      'Expand Farm',
      `+3 plots`,
      `${def.coinCost} coins`,
    ]
    if (def.requiredLevel > 0) parts.push(`Lv ${def.requiredLevel}+`)
    const hoverText = parts.join('  •  ')
    pointerEventsSystem.onPointerDown(
      { entity: signEntity, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        playerState.activePlotGroupName = def.groupName
        playSound('menu')
        playerState.activeMenu = 'plotGroupUnlock'
      }
    )
    plotGroupSignEntities.set(def.groupName, signEntity)
    console.log(`CozyFarm: Wired sign ${def.signName} → ${def.groupName}`)
  }
}

// ---------------------------------------------------------------------------
// Group-based unlock (new system — uses Transform.parent to find child soils)
// ---------------------------------------------------------------------------

/** Unlock all soil plots parented to the named group entity. */
export function unlockPlotGroupByName(groupName: string): void {
  const groupEntity = engine.getEntityOrNullByName(groupName)
  if (!groupEntity) {
    console.log(`CozyFarm: Group '${groupName}' not found — skipping unlock`)
    return
  }
  let count = 0
  soilEntities.forEach((entity) => {
    const t = Transform.getOrNull(entity)
    if (!t || t.parent !== groupEntity) return
    PlotState.getMutable(entity).isUnlocked = true
    updatePlotHoverText(entity)
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 1) GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    count++
  })
  console.log(`CozyFarm: Unlocked group '${groupName}' — ${count} plots`)
}

/** Hide the ForSaleSign for a group (call after purchase or save-restore). */
export function hidePlotGroupSign(groupName: string): void {
  const signEntity = plotGroupSignEntities.get(groupName)
  if (!signEntity) return
  pointerEventsSystem.removeOnPointerDown(signEntity)
  Transform.getMutable(signEntity).scale = Vector3.create(0, 0, 0)
}

/** Auto-unlock all level-gated groups where requiredLevel <= playerLevel. */
export function checkLevelGroupUnlocks(playerLevel: number, unlockedGroups: string[]): string[] {
  const newlyUnlocked: string[] = []
  for (const def of LEVEL_PLOT_GROUPS) {
    if (playerLevel >= def.requiredLevel && !unlockedGroups.includes(def.groupName)) {
      unlockPlotGroupByName(def.groupName)
      newlyUnlocked.push(def.groupName)
      console.log(`CozyFarm: Auto-unlocked ${def.groupName} at level ${playerLevel}`)
    }
  }
  return newlyUnlocked
}

/** Tutorial Phase 1: unlock plots 1-2 (total 3 available) */
export function unlockSoilsPhase1(): void {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 1 && plot.plotIndex < 3) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
  console.log('CozyFarm Tutorial: unlocked soil plots 1-2')
}

/** Tutorial Phase 2: unlock plots 3-5 (total 6 available) */
export function unlockSoilsPhase2(): void {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 3 && plot.plotIndex < 6) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
  console.log('CozyFarm Tutorial: unlocked soil plots 3-5')
}

/** Skip path: unlock all 6 tutorial plots immediately */
export function unlockSoilsAll6(): void {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex < 6) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
  console.log('CozyFarm Tutorial: unlocked all 6 soil plots (skip)')
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

export function registerPlotPointerEvent(entity: Entity) {
  const plot = PlotState.get(entity)
  const visiting = isVisiting()

  let hoverText = 'Plant'

  if (visiting) {
    if (!plot.isUnlocked) {
      hoverText = 'Locked'
    } else if (plot.cropType !== -1 && !plot.isReady) {
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
          const TUTORIAL_ONION_GROW_MS = 30_000
          const effectiveGrowTimeMs =
            tutorialState.active && plot.cropType === CropType.Onion
              ? TUTORIAL_ONION_GROW_MS
              : def.growTimeMs
          const remaining = effectiveGrowTimeMs - (Date.now() - plot.plantedAt)
          const hasFerts = plot.fertilizerType === -1 &&
            ALL_FERTILIZER_TYPES.some((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
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
      if (isVisiting()) { handleVisitorPlotClick(entity); return }
      handlePlotClick(entity)
    }
  )
}

export function refreshAllPlotHoverTexts(): void {
  for (const entity of soilEntities) {
    updatePlotHoverText(entity)
  }
}

export function updatePlotHoverText(entity: Entity) {
  pointerEventsSystem.removeOnPointerDown(entity)
  registerPlotPointerEvent(entity)
}

/**
 * Restore the visual model and hover text for a plot that was unlocked in a
 * previous session. Call this from saveService after setting isUnlocked in ECS.
 * Plot 0 keeps its scene-editor model; plots 1+ swap from transparent to opaque.
 */
export function applyPlotUnlockVisual(entity: Entity): void {
  const plot = PlotState.get(entity)
  if (plot.plotIndex >= 1) {
    GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
  }
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

// ---------------------------------------------------------------------------
// Per-slot entity setup — called after slot assignment so handlers use the
// correct farm's entities (Computer_2, Truck01.glb_2, etc.)
// Slot 0 is already set up by setupEntities(); this handles slots 1 and 2.
// ---------------------------------------------------------------------------

// Compute world position of an entity by summing the local positions up the parent chain.
// Assumes no rotation/scale on parent transforms (valid for Farm parents).
function getWorldPosition(entity: Entity): { x: number; y: number; z: number } {
  let x = 0, y = 0, z = 0
  let current: number = entity as unknown as number
  for (let depth = 0; depth < 8; depth++) {
    const t = Transform.getOrNull(current as unknown as Entity)
    if (!t) break
    x += t.position.x
    y += t.position.y
    z += t.position.z
    const parent = t.parent as number | undefined
    if (!parent) break
    current = parent
  }
  return { x, y, z }
}

// Collect NPC spawn positions from a parent entity using world coordinates.
function collectNpcSpawnPositions(parentName: string): Map<string, ReturnType<typeof Vector3.create>> {
  const parentEntity = engine.getEntityOrNullByName(parentName)
  if (!parentEntity) return new Map()

  const childrenOf = new Map<number, Entity[]>()
  for (const [entity] of engine.getEntitiesWith(Transform)) {
    const t = Transform.get(entity)
    const p = t.parent as number | undefined
    if (p) {
      const kids = childrenOf.get(p) ?? []
      kids.push(entity)
      childrenOf.set(p, kids)
    }
  }

  const suffixes = ['Spawn01', 'Spawn01_2', 'Spawn01_3', 'Spawn01_4', 'Spawn01_5']
  const positions = new Map<string, ReturnType<typeof Vector3.create>>()
  const children = childrenOf.get(parentEntity as unknown as number) ?? []

  children.forEach((child, i) => {
    if (i < suffixes.length) {
      const worldPos = getWorldPosition(child)
      positions.set(suffixes[i], Vector3.create(worldPos.x, worldPos.y, worldPos.z))
    }
  })

  return positions
}

export function setupFarmSlotEntities(slotId: number): void {
  if (slotId === 0) {
    // Slot 0: clear any override so Farm 1 spawn points are used
    setNpcSpawnPositionOverride(null)
    return
  }

  const sfx = `_${slotId + 1}`   // slot 1 → '_2', slot 2 → '_3'

  // ── Update soilEntities to this slot's soils ─────────────────────────────
  soilEntities.length = 0
  for (const e of farmSlotSoils[slotId]) soilEntities.push(e)

  // Init PlotState on this farm's soils so restorePlotStates can write to them
  soilEntities.forEach((entity, index) => {
    if (!PlotState.has(entity)) {
      PlotState.create(entity, {
        cropType: -1, growthStage: 0, plantedAt: 0, waterCount: 0,
        isUnlocked: index < 1, plotIndex: index, isRotten: false, fertilizerType: -1,
      })
    }
    if (index >= 1) GltfContainer.createOrReplace(entity, { src: SOIL_TRANSPARENT_MODEL })
    registerPlotPointerEvent(entity)
  })

  // ── Computer (Shop) ───────────────────────────────────────────────────────
  const computer = engine.getEntityOrNullByName(`Computer.glb${sfx}`)
  if (computer) {
    enablePointerOnGltf(computer)
    computerEntity = computer
    spawnVisualIcon(computer, COMPUTER_ICON_Y, COMPUTER_ICON_SIZE, SHOPINGCART_ICON)
    pointerEventsSystem.onPointerDown(
      { entity: computer, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Shop', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'shop' },
    )
  }

  // ── Truck (Sell) ──────────────────────────────────────────────────────────
  const truck = engine.getEntityOrNullByName(`Truck01.glb${sfx}`)
  if (truck) {
    enablePointerOnGltf(truck)
    truckEntity = truck
    spawnVisualIcon(truck, TRUCK_ICON_Y, TRUCK_ICON_SIZE, COINS_ICON)
    pointerEventsSystem.onPointerDown(
      { entity: truck, opts: { button: InputAction.IA_POINTER, hoverText: 'Sell Crops', maxDistance: 10 } },
      () => { if (isVisiting()) return; playSound('truck'); playerState.activeMenu = 'sell' },
    )
  }

  // ── Boombox (Jukebox) ─────────────────────────────────────────────────────
  const boombox = engine.getEntityOrNullByName(`Boombox${sfx}`)
  if (boombox) {
    enablePointerOnGltf(boombox)
    pointerEventsSystem.onPointerDown(
      { entity: boombox, opts: { button: InputAction.IA_POINTER, hoverText: 'Change Music', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'jukebox' },
    )
  }

  // ── Mailbox ───────────────────────────────────────────────────────────────
  const mailbox = engine.getEntityOrNullByName(`Mailbox${sfx}`)
  if (mailbox) {
    enablePointerOnGltf(mailbox)
    pointerEventsSystem.onPointerDown(
      { entity: mailbox, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Mailbox', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'mailbox' },
    )
  }

  // ── Compost Bin ───────────────────────────────────────────────────────────
  const compost = engine.getEntityOrNullByName(`CompostBin.glb${sfx}`)
  if (compost) {
    enablePointerOnGltf(compost)
    compostBinEntity = compost
    pointerEventsSystem.onPointerDown(
      { entity: compost, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Compost Bin', maxDistance: 8 } },
      () => { if (isVisiting()) return; if (!playerState.compostBinUnlocked) return; playSound('menu'); playerState.activeMenu = 'compost' },
    )
  }

  // ── For Sale Sign (Farmer unlock) ─────────────────────────────────────────
  const forSaleSign = engine.getEntityOrNullByName(`For Sale Sign${sfx}`)
  if (forSaleSign) {
    pointerEventsSystem.onPointerDown(
      { entity: forSaleSign, opts: { button: InputAction.IA_POINTER, hoverText: 'Expand Farm (10000 coins)', maxDistance: 8 } },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'unlock' },
    )
  }

  // ── Axe (tutorial skip / debug) ───────────────────────────────────────────
  let axeClickCount = 0
  const axe = engine.getEntityOrNullByName(`Axe 2${sfx}`)
  if (axe) {
    enablePointerOnGltf(axe)
    pointerEventsSystem.onPointerDown(
      { entity: axe, opts: { button: InputAction.IA_POINTER, hoverText: 'Chop', maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        axeClickCount++
        if (axeClickCount >= 3) { axeClickCount = 0; skipTutorial() }
      },
    )
  }

  // ── NPC spawn points — use this farm's NPCSSPAWNS group ─────────────────
  const npcSpawns = collectNpcSpawnPositions(`NPCSSPAWNS${sfx}`)
  if (npcSpawns.size > 0) {
    setNpcSpawnPositionOverride(npcSpawns)
    console.log(`[MultiFarm] NPC spawn override set for slot ${slotId}: ${npcSpawns.size} points`)
  } else {
    console.error(`[MultiFarm] NPCSSPAWNS${sfx} not found — NPCs will use Farm 1 positions`)
  }

  console.log(`[MultiFarm] Slot ${slotId} entities wired (suffix: ${sfx}), soils: ${soilEntities.length}`)
}

/** Dev reset: clear all crop models, re-lock all plots except #0. */
export function resetSoilPlots(): void {
  soilEntities.forEach((entity, index) => {
    const plot = PlotState.getMutable(entity)
    if (plot.cropType !== -1) removeCropModel(entity)
    removeSoilIcons(entity)
    removeSoilTimerText(entity)
    plot.cropType      = -1
    plot.growthStage   = 0
    plot.plantedAt     = 0
    plot.waterCount    = 0
    plot.isUnlocked    = index === 0
    plot.growthStarted = false
    plot.isReady       = false
    plot.justHarvested = false
    plot.isPlanting    = false
    plot.isWatering    = false
    plot.isRotten      = false
    plot.fertilizerType = -1
    if (index >= 1) {
      GltfContainer.createOrReplace(entity, { src: SOIL_TRANSPARENT_MODEL })
    } else {
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
}

/** Show or hide the compost bin 3D model. Call after unlock state is known. */
export function setCompostBinVisible(visible: boolean) {
  if (!compostBinEntity) return
  const t = Transform.getMutable(compostBinEntity)
  if (visible) {
    const s = compostBinOriginalScale ?? { x: 3, y: 3, z: 3 }
    t.scale = Vector3.create(s.x, s.y, s.z)
  } else {
    t.scale = Vector3.Zero()
  }
}

// Animal buildings are now managed by animalSystem.ts → initAnimalBuildings()
