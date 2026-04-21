import { engine, Entity, GltfContainer, InputAction, pointerEventsSystem, Transform, Billboard, BillboardMode, MeshRenderer, MeshCollider, ColliderLayer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'
import { handlePlotClick, getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { SHOPINGCART_ICON, COINS_ICON } from '../data/imagePaths'
import { skipTutorial } from './tutorialSystem'
import { playSound } from './sfxSystem'
import { CROP_DATA, CROP_NAMES, CropType } from '../data/cropData'
import { formatTime } from './growthSystem'
import { tutorialState } from '../game/tutorialState'
import { isVisiting } from '../services/visitService'

const SOIL_MODEL             = 'assets/scene/Models/Soil01/Soil01.glb'
const SOIL_TRANSPARENT_MODEL = 'assets/scene/Models/Soil01Trasnparent/Soil01Trasnparent.glb'

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
let forSaleSignEntity: Entity | null = null
let forSaleSign2Entity: Entity | null = null
let forSaleSign3Entity: Entity | null = null
let computerEntity: Entity | null = null
let truckEntity: Entity | null = null

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

  // ── For Sale Signs ────────────────────────────────────────────────────────
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

  forSaleSign2Entity = engine.getEntityOrNullByName('For Sale Sign_2')
  if (forSaleSign2Entity) {
    pointerEventsSystem.onPointerDown(
      {
        entity: forSaleSign2Entity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'Unlock 3 Plots (500 coins)', maxDistance: 8 },
      },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'expansion1' }
    )
  }

  forSaleSign3Entity = engine.getEntityOrNullByName('For Sale Sign_3')
  if (forSaleSign3Entity) {
    pointerEventsSystem.onPointerDown(
      {
        entity: forSaleSign3Entity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'Unlock 3 Plots (500 coins)', maxDistance: 8 },
      },
      () => { if (isVisiting()) return; playSound('menu'); playerState.activeMenu = 'expansion2' }
    )
  }

  // ── Soil plots ────────────────────────────────────────────────────────────
  // First one is named "Soil01.glb", rest are "Soil01.glb_2" through "Soil01.glb_36"
  const firstSoil = engine.getEntityOrNullByName('Soil01.glb')
  if (firstSoil) soilEntities.push(firstSoil)
  for (let i = 2; i <= 36; i++) {
    const soil = engine.getEntityOrNullByName(`Soil01.glb_${i}`)
    if (soil) soilEntities.push(soil)
  }

  soilEntities.forEach((entity, index) => {
    PlotState.create(entity, {
      cropType: -1,
      growthStage: 0,
      plantedAt: 0,
      waterCount: 0,
      isUnlocked: index < 1,   // tutorial: only plot 0 unlocked at start
      plotIndex: index,
    })

    // Plot 0:  leave the scene-editor GltfContainer untouched — the GLB already
    //          has the right _collider meshes and collision masks baked in.
    // Plots 1+: swap to the transparent model until unlocked by the tutorial.
    // Plots 6+: also transparent (unlocked by the farmer upgrade later).
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

  // ── Bed (tutorial skip — 3 clicks = skip tutorial + 2000 coins) ──────────
  let bedClickCount = 0
  const bed = engine.getEntityOrNullByName('Bed.glb')
  if (bed) {
    enablePointerOnGltf(bed)
    pointerEventsSystem.onPointerDown(
      { entity: bed, opts: { button: InputAction.IA_POINTER, hoverText: 'Sleep', maxDistance: 8 } },
      () => {
        if (isVisiting()) return
        bedClickCount++
        if (bedClickCount >= 3) skipTutorial()
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

  console.log(`CozyFarm: Discovered ${soilEntities.length} soil plots, computer=${!!computer}, truck=${!!truck}, sign=${!!forSaleSignEntity}, boombox=${!!boombox}, bed=${!!bed}, mailbox=${!!mailbox}`)
}

export function removeForSaleSign() {
  if (forSaleSignEntity) {
    pointerEventsSystem.removeOnPointerDown(forSaleSignEntity)
    engine.removeEntity(forSaleSignEntity)
    forSaleSignEntity = null
  }
}

export function removeForSaleSign2() {
  if (forSaleSign2Entity) {
    pointerEventsSystem.removeOnPointerDown(forSaleSign2Entity)
    engine.removeEntity(forSaleSign2Entity)
    forSaleSign2Entity = null
  }
}

export function removeForSaleSign3() {
  if (forSaleSign3Entity) {
    pointerEventsSystem.removeOnPointerDown(forSaleSign3Entity)
    engine.removeEntity(forSaleSign3Entity)
    forSaleSign3Entity = null
  }
}

/** Expansion Pack 1: unlock player-only plots 6–8 (entity names Soil01.glb_7 through _9) */
export function unlockExpansion1Plots() {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 6 && plot.plotIndex <= 8) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
}

/** Expansion Pack 2: unlock player-only plots 9–11 (entity names Soil01.glb_10 through _12) */
export function unlockExpansion2Plots() {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 9 && plot.plotIndex <= 11) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
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

export function registerPlotPointerEvent(entity: Entity) {
  const plot = PlotState.get(entity)

  let hoverText = 'Plant'
  if (!plot.isUnlocked) {
    hoverText = 'Locked'
  } else if (plot.cropType !== -1) {
    if (plot.isReady) {
      hoverText = 'Harvest'
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
          hoverText = `${cropName} - ${formatTime(remaining)}`
        } else {
          hoverText = cropName
        }
      }
    }
  }

  pointerEventsSystem.onPointerDown(
    { entity, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 8 } },
    () => { if (isVisiting()) return; handlePlotClick(entity) }
  )
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
