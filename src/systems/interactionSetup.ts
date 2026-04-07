import { engine, Entity, GltfContainer, InputAction, pointerEventsSystem, Transform, Billboard, BillboardMode, MeshRenderer, MeshCollider, ColliderLayer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'
import { handlePlotClick } from '../game/actions'
import { playerState } from '../game/gameState'
import { SHOPINGCART_ICON, COINS_ICON } from '../data/imagePaths'

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

export function setupEntities() {
  // ── Computer ──────────────────────────────────────────────────────────────
  const computer = engine.getEntityOrNullByName('Computer.glb')
  if (computer) {
    spawnVisualIcon(computer, COMPUTER_ICON_Y, COMPUTER_ICON_SIZE, SHOPINGCART_ICON)
    // Promote the GLB's own collision mesh to also respond to pointer rays.
    // Scene-editor objects only get CL_PHYSICS|CL_SCENE by default; OR in CL_POINTER.
    enablePointerOnGltf(computer)
    pointerEventsSystem.onPointerDown(
      { entity: computer, opts: { button: InputAction.IA_POINTER, hoverText: 'Open Shop', maxDistance: 8 } },
      () => { playerState.activeMenu = 'shop' }
    )
  }

  // ── Truck ─────────────────────────────────────────────────────────────────
  const truck = engine.getEntityOrNullByName('Truck01.glb')
  if (truck) {
    spawnVisualIcon(truck, TRUCK_ICON_Y, TRUCK_ICON_SIZE, COINS_ICON)
    // Same fix: promote the GLB collision mesh to include CL_POINTER.
    enablePointerOnGltf(truck)
    pointerEventsSystem.onPointerDown(
      { entity: truck, opts: { button: InputAction.IA_POINTER, hoverText: 'Sell Crops', maxDistance: 10 } },
      () => { playerState.activeMenu = 'sell' }
    )
  }

  // ── For Sale Sign ─────────────────────────────────────────────────────────
  forSaleSignEntity = engine.getEntityOrNullByName('For Sale Sign')
  if (forSaleSignEntity) {
    pointerEventsSystem.onPointerDown(
      {
        entity: forSaleSignEntity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'Unlock Crops (1000 coins)', maxDistance: 8 },
      },
      () => { playerState.activeMenu = 'unlock' }
    )
  }

  // ── Soil plots ────────────────────────────────────────────────────────────
  // First one is named "Soil01.glb", rest are "Soil01.glb_2" through "Soil01.glb_27"
  const firstSoil = engine.getEntityOrNullByName('Soil01.glb')
  if (firstSoil) soilEntities.push(firstSoil)
  for (let i = 2; i <= 30; i++) {
    const soil = engine.getEntityOrNullByName(`Soil01.glb_${i}`)
    if (soil) soilEntities.push(soil)
  }

  soilEntities.forEach((entity, index) => {
    PlotState.create(entity, {
      cropType: -1,
      growthStage: 0,
      plantedAt: 0,
      waterCount: 0,
      isUnlocked: index < 6,
      plotIndex: index,
    })

    // Plots 0-5: leave the scene-editor GltfContainer untouched — the GLB already
    //            has the right _collider meshes and collision masks baked in.
    // Plots 6+:  swap to the transparent model (no mask overrides — let the GLB
    //            handle its own collision layers, same as the original code).
    if (index >= 6) {
      GltfContainer.createOrReplace(entity, { src: SOIL_TRANSPARENT_MODEL })
    }

    registerPlotPointerEvent(entity)
  })

  console.log(`CozyFarm: Discovered ${soilEntities.length} soil plots, computer=${!!computer}, truck=${!!truck}, sign=${!!forSaleSignEntity}`)
}

export function removeForSaleSign() {
  if (forSaleSignEntity) {
    pointerEventsSystem.removeOnPointerDown(forSaleSignEntity)
    engine.removeEntity(forSaleSignEntity)
    forSaleSignEntity = null
  }
}

export function unlockFarmerPlots() {
  soilEntities.forEach((entity) => {
    const plot = PlotState.get(entity)
    if (plot.plotIndex >= 6) {
      PlotState.getMutable(entity).isUnlocked = true
      updatePlotHoverText(entity)
      GltfContainer.createOrReplace(entity, { src: SOIL_MODEL })
    }
  })
}

export function registerPlotPointerEvent(entity: Entity) {
  const plot = PlotState.get(entity)

  let hoverText = 'Plant'
  if (!plot.isUnlocked) {
    hoverText = 'Locked'
  } else if (plot.cropType !== -1) {
    hoverText = plot.growthStage < 3 ? 'Water' : 'Harvest'
  }

  pointerEventsSystem.onPointerDown(
    { entity, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 8 } },
    () => handlePlotClick(entity)
  )
}

export function updatePlotHoverText(entity: Entity) {
  pointerEventsSystem.removeOnPointerDown(entity)
  registerPlotPointerEvent(entity)
}

export function getSoilEntities(): Entity[] {
  return soilEntities
}
