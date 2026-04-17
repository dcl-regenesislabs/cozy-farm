import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  Animator,
  InputAction,
  pointerEventsSystem,
  Tween,
  EasingFunction,
  TweenStateStatus,
  TweenState,
  ColliderLayer,
  MeshCollider,
  Material,
  MeshRenderer,
  TextShape,
  Billboard,
  BillboardMode,
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { PlotState } from '../components/farmComponents'
import { CROP_DATA, CropType } from '../data/cropData'
import { playerState } from '../game/gameState'
import { getSoilEntities, updatePlotHoverText } from '../systems/interactionSetup'
import { waterCrop, harvestCrop, setSoilIconDisplay, removeSoilIcons, removeSoilTimerText, getWateringStatus } from '../game/actions'
import { playSeedVfx } from '../systems/seedVfxSystem'
import { spawnHarvestVfx } from '../systems/harvestVfxSystem'
import { DIALOG_ICON, BOX_CROPS_ICON } from '../data/imagePaths'
import { playSound } from './sfxSystem'

const FARMER_MODEL  = 'assets/scene/Models/Farmer01/Farmer01.glb'
const HOME_POS       = Vector3.create(44.66, 0, 70.91)
const HOME_FACE_TARGET = Vector3.create(44, 0, 62)
const WALK_SPEED     = 2.0   // units / second
const ACTION_DURATION = 4.0  // seconds — covers watering VFX (~3.3 s)
const TALK_DURATION  = 3.0
const TURN_SPEED     = 10.0  // higher = snappier rotation; at 10 a 90° turn takes ~0.3 s
const CROSSFADE_DURATION = 0.3  // seconds to blend between animations

// ---------------------------------------------------------------------------
// Waypoint graph
// ---------------------------------------------------------------------------

const WP_NAMES = [
  'WaypointCenter01', 'WaypointLeft01',  'WaypointRight01',
  'WaypointCenter02', 'WaypointRight02', 'WaypointLef02',
  'WaypointMidRight', 'WaypointMidLeft',
]

const GRAPH: Record<string, string[]> = {
  'HOME':             ['WaypointCenter01', 'WaypointCenter02', 'WaypointMidRight', 'WaypointMidLeft'],
  'WaypointCenter01': ['HOME', 'WaypointLeft01',  'WaypointRight01'],
  'WaypointCenter02': ['HOME', 'WaypointLef02',   'WaypointRight02'],
  'WaypointMidRight': ['HOME', 'WaypointRight01', 'WaypointRight02'],
  'WaypointMidLeft':  ['HOME', 'WaypointLeft01',  'WaypointLef02'],
  'WaypointLeft01':   ['WaypointCenter01', 'WaypointMidLeft'],
  'WaypointRight01':  ['WaypointCenter01', 'WaypointMidRight'],
  'WaypointLef02':    ['WaypointCenter02', 'WaypointMidLeft'],
  'WaypointRight02':  ['WaypointCenter02', 'WaypointMidRight'],
}

const waypointPositions = new Map<string, Vector3>()

function discoverWaypoints() {
  for (const name of WP_NAMES) {
    const entity = engine.getEntityOrNullByName(name)
    if (entity) {
      const p = Transform.get(entity).position
      waypointPositions.set(name, Vector3.create(p.x, p.y, p.z))
    } else {
      console.log(`CozyFarm: waypoint '${name}' not found`)
    }
  }
  waypointPositions.set('HOME', Vector3.create(HOME_POS.x, HOME_POS.y, HOME_POS.z))
  console.log(`CozyFarm: discovered ${waypointPositions.size - 1} waypoints`)
}

function distSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x; const dz = a.z - b.z
  return dx * dx + dz * dz
}

function nearestNode(pos: Vector3): string {
  let best = 'HOME'; let bestDist = Infinity
  waypointPositions.forEach((wpPos, name) => {
    const d = distSq(pos, wpPos)
    if (d < bestDist) { bestDist = d; best = name }
  })
  return best
}

function bfsPath(start: string, end: string): string[] {
  if (start === end) return [start]
  const visited = new Set<string>([start])
  const queue: string[][] = [[start]]
  while (queue.length > 0) {
    const path = queue.shift()!
    const cur = path[path.length - 1]
    for (const nb of (GRAPH[cur] ?? [])) {
      if (nb === end) return [...path, end]
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]) }
    }
  }
  return [start]
}

function buildWalkPath(finalTarget: Vector3): Vector3[] {
  if (!farmer.entity) return [finalTarget]
  const farmerPos = Transform.get(farmer.entity).position
  const startNode = nearestNode(farmerPos)
  const endNode   = nearestNode(finalTarget)
  if (startNode === endNode) return [finalTarget]

  const nodePath = bfsPath(startNode, endNode)
  const result: Vector3[] = []
  const startWpPos = waypointPositions.get(nodePath[0])
  const skipFirst  = startWpPos !== undefined && distSq(farmerPos, startWpPos) < 1.0
  for (let i = skipFirst ? 1 : 0; i < nodePath.length; i++) {
    const pos = waypointPositions.get(nodePath[i])
    if (pos) result.push(Vector3.create(pos.x, pos.y, pos.z))
  }
  result.push(finalTarget)
  return result
}

// ---------------------------------------------------------------------------
// Farmer state
// ---------------------------------------------------------------------------

type FarmerState = 'idle' | 'walking' | 'acting' | 'returning'
type ActionType  = 'plant' | 'water' | 'harvest' | ''

const farmer = {
  entity: null as Entity | null,
  state: 'idle' as FarmerState,
  targetPlot: null as Entity | null,
  actionType: '' as ActionType,
  plantCropType: -1 as number,
  actionTimer: 0,
  idleTimer: 3,
  talkTimer: 0,
  walkPath: [] as Vector3[],
  currentSegmentTarget: null as Vector3 | null,
  tweenSeen: false,
}

// ---------------------------------------------------------------------------
// Animation crossfade
// ---------------------------------------------------------------------------

const ANIM_CLIPS = ['Idle', 'Walk', 'Talk', 'Watering', 'CollectCrop', 'PlantSeeds']

const blend = {
  fromClip: 'Idle',
  toClip:   'Idle',
  t: 1.0,   // 0 = fully fromClip, 1 = fully toClip
}

// Request a crossfade to `clip`. Safe to call every frame (no-op if already there).
function playAnim(clip: string) {
  if (!farmer.entity) return
  if (clip === blend.toClip && blend.t >= 1.0) return  // already fully playing

  blend.fromClip = blend.toClip
  blend.toClip   = clip
  blend.t        = 0.0

  const animator = Animator.getMutable(farmer.entity)
  for (const s of animator.states) {
    if (s.clip === clip) {
      s.playing     = true
      s.weight      = 0
      s.shouldReset = clip !== 'Idle' && clip !== 'Walk'
    }
    // fromClip keeps playing at its current weight; updateBlend() fades it out
  }
}

// Advance the blend each frame and write weights to the Animator component.
function updateBlend(dt: number) {
  if (!farmer.entity || blend.t >= 1.0) return
  blend.t = Math.min(1.0, blend.t + dt / CROSSFADE_DURATION)

  const animator = Animator.getMutable(farmer.entity)
  for (const s of animator.states) {
    if (s.clip === blend.toClip) {
      s.weight = blend.t
    } else if (s.clip === blend.fromClip) {
      s.weight = 1.0 - blend.t
      if (blend.t >= 1.0) {
        s.playing = false
        s.weight  = 0
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------

// Smoothly slerp toward `targetPos` each frame — no hard snap at corners.
function updateFacing(targetPos: Vector3, dt: number) {
  if (!farmer.entity) return
  const transform = Transform.getMutable(farmer.entity)
  const dx = targetPos.x - transform.position.x
  const dz = targetPos.z - transform.position.z
  if (dx * dx + dz * dz < 0.001) return
  const angle    = Math.atan2(dx, dz) * (180 / Math.PI)
  const targetRot = Quaternion.fromAngleAxis(angle, Vector3.Up())
  // Exponential slerp: feel free to raise TURN_SPEED for a snappier turn
  transform.rotation = Quaternion.slerp(
    transform.rotation,
    targetRot,
    Math.min(1.0, TURN_SPEED * dt)
  )
}

function getTravelTime(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x; const dz = to.z - from.z
  return Math.max(0.3, Math.sqrt(dx * dx + dz * dz) / WALK_SPEED)
}

function startWalkSegment(targetPos: Vector3) {
  if (!farmer.entity) return
  const cur = Transform.get(farmer.entity).position
  Tween.createOrReplace(farmer.entity, {
    mode: Tween.Mode.Move({
      start: { x: cur.x,       y: cur.y,       z: cur.z       },
      end:   { x: targetPos.x, y: targetPos.y, z: targetPos.z },
    }),
    duration: getTravelTime(cur, targetPos) * 1000,
    easingFunction: EasingFunction.EF_LINEAR,
  })
  farmer.tweenSeen = false
  farmer.currentSegmentTarget = targetPos
  // Do NOT snap rotation here — let the per-frame slerp handle the turn smoothly
  playAnim('Walk')
}

function startWalkToTarget(finalTarget: Vector3) {
  const path = buildWalkPath(finalTarget)
  farmer.walkPath = path.slice(1)
  startWalkSegment(path[0])
}

function isTweenComplete(): boolean {
  if (!farmer.entity) return false
  const ts = TweenState.getOrNull(farmer.entity)
  if (!ts) return false
  if (ts.state === TweenStateStatus.TS_ACTIVE) { farmer.tweenSeen = true; return false }
  return farmer.tweenSeen && ts.state === TweenStateStatus.TS_COMPLETED
}

// ---------------------------------------------------------------------------
// Task selection & execution
// ---------------------------------------------------------------------------

function pickNextTask(): { plot: Entity; action: ActionType; cropType: number } | null {
  const farmerPlots = getSoilEntities().filter((e) => {
    const p = PlotState.get(e)
    return p.plotIndex >= 6 && p.isUnlocked
  })

  const harvest = farmerPlots.filter((e) => PlotState.get(e).isReady)
  if (harvest.length > 0) {
    return { plot: harvest[Math.floor(Math.random() * harvest.length)], action: 'harvest', cropType: -1 }
  }

  const now = Date.now()
  const water = farmerPlots.filter((e) => {
    const p = PlotState.get(e)
    if (p.isWatering) return false
    return getWateringStatus(p, now).canWater
  })
  if (water.length > 0) {
    return { plot: water[Math.floor(Math.random() * water.length)], action: 'water', cropType: -1 }
  }

  const empty = farmerPlots.filter((e) => {
    const p = PlotState.get(e); return p.cropType === -1 && !p.justHarvested
  })
  if (empty.length > 0) {
    let seedCropType = -1
    playerState.farmerSeeds.forEach((count, ct) => { if (count > 0 && seedCropType === -1) seedCropType = ct })
    if (seedCropType !== -1) {
      return { plot: empty[Math.floor(Math.random() * empty.length)], action: 'plant', cropType: seedCropType }
    }
  }
  return null
}

function getApproachPos(plotPos: Vector3): Vector3 {
  if (!farmer.entity) return plotPos
  const fp = Transform.get(farmer.entity).position
  const dx = fp.x - plotPos.x; const dz = fp.z - plotPos.z
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.001) return plotPos
  return Vector3.create(plotPos.x + (dx / len) * 1.0, plotPos.y, plotPos.z + (dz / len) * 1.0)
}

function doFarmerAction() {
  const { targetPlot, actionType, plantCropType } = farmer
  if (!targetPlot) return
  const plot = PlotState.get(targetPlot)

  if (actionType === 'harvest') {
    if (!plot.isReady) return
    harvestCrop(targetPlot, playerState.farmerInventory)
    // Auto-clear — farmer doesn't need a second player click
    PlotState.getMutable(targetPlot).justHarvested = false
    removeSoilIcons(targetPlot)
    removeSoilTimerText(targetPlot)
    updatePlotHoverText(targetPlot)
    updateFarmerInventoryDisplay()
  } else if (actionType === 'water') {
    if (plot.cropType === -1) return
    const def = CROP_DATA.get(plot.cropType as CropType)
    if (!def || plot.waterCount >= def.wateringsRequired) return
    waterCrop(targetPlot)
    updatePlotHoverText(targetPlot)
  } else if (actionType === 'plant' && plantCropType !== -1) {
    if (plot.cropType !== -1) return
    const count = playerState.farmerSeeds.get(plantCropType as CropType) ?? 0
    if (count <= 0) return
    playerState.farmerSeeds.set(plantCropType as CropType, count - 1)
    const m = PlotState.getMutable(targetPlot)
    m.cropType = plantCropType; m.growthStage = 0; m.plantedAt = 0
    m.waterCount = 0; m.growthStarted = false; m.isReady = false; m.justHarvested = false
    m.isPlanting = true  // block icons until VFX finishes
    // Play the same seed VFX the player sees
    playSeedVfx(targetPlot, plantCropType as CropType)
    const plantDef = CROP_DATA.get(plantCropType as CropType)!
    setSoilIconDisplay(targetPlot, {
      cropType: plantCropType, waterCount: 0, wateringsRequired: plantDef.wateringsRequired,
      canWater: false, isReady: false, isPlanting: true, justHarvested: false,
    })
    updatePlotHoverText(targetPlot)
  }
}

// ---------------------------------------------------------------------------
// Farmer inventory head display
// ---------------------------------------------------------------------------

// Parent farmer scale is 1.2 — all local positions/scales are multiplied by it.
// World values = local * 1.2.  Target: display just above the hat (~2.6m world).
const ROW_SPACING    = 0.35   // local → 0.42m world between rows
const IMG_SIZE       = 0.20   // local → 0.24m world icon size
const IMG_OFFSET_X   = -0.42  // local → -0.50m world (clearly left of text)
const TEXT_OFFSET_X  =  0.14  // local → 0.17m world (right side, text centered there)
const TEXT_SCALE     =  0.55  // counteracts 1.2 parent; effective world scale ~0.66
const ROW_BASE_Y     =  1.4  // local → 2.52m world (just above farmer head)

// Farmer head icon constants — tune here
const FARMER_HEAD_ICON_Y    = ROW_BASE_Y + 0.45  // local y, just above inventory rows
const FARMER_HEAD_ICON_SIZE = 0.55              // local size (world = ×1.2) — tune here

const inventoryDisplayEntities: Entity[] = []
let farmerHeadIconEntity: Entity | null = null

export function updateFarmerInventoryDisplay() {
  if (!farmer.entity) return

  // Remove previous count label
  for (const e of inventoryDisplayEntities) {
    engine.removeEntity(e)
  }
  inventoryDisplayEntities.length = 0

  // Sum total crops in farmer inventory
  let totalCount = 0
  playerState.farmerInventory.forEach((count) => { if (count > 0) totalCount += count })

  // Swap head icon between DialogIcon (empty) and BoxCropsIcon (carrying crops)
  if (farmerHeadIconEntity) {
    const iconSrc = totalCount > 0 ? BOX_CROPS_ICON : DIALOG_ICON
    Material.setPbrMaterial(farmerHeadIconEntity, {
      texture:           Material.Texture.Common({ src: iconSrc }),
      emissiveTexture:   Material.Texture.Common({ src: iconSrc }),
      emissiveIntensity: 0.9,
      emissiveColor:     Color4.White(),
      alphaTest:         0.1,
      transparencyMode:  2,
    })
  }

  if (totalCount === 0) return

  // Total count label just above the box icon
  const countE = engine.addEntity()
  Transform.create(countE, {
    parent: farmer.entity!,
    position: Vector3.create(0, FARMER_HEAD_ICON_Y + FARMER_HEAD_ICON_SIZE * 0.65, 0.05),
    scale:    Vector3.create(TEXT_SCALE, TEXT_SCALE, TEXT_SCALE),
  })
  Billboard.create(countE, { billboardMode: BillboardMode.BM_ALL })
  TextShape.create(countE, {
    text:         `x${totalCount}`,
    fontSize:     3,
    textColor:    { r: 1, g: 1, b: 1, a: 1 },
    outlineWidth: 0.2,
    outlineColor: { r: 0, g: 0, b: 0 },
  })
  inventoryDisplayEntities.push(countE)
}

// ---------------------------------------------------------------------------
// AI system
// ---------------------------------------------------------------------------

engine.addSystem((dt: number) => {
  if (!farmer.entity) return

  // Advance animation crossfade every frame regardless of state
  updateBlend(dt)

  if (farmer.talkTimer > 0) {
    farmer.talkTimer -= dt
    if (farmer.talkTimer <= 0) {
      farmer.talkTimer = 0
      if (farmer.state === 'idle') playAnim('Idle')
    }
    return
  }

  if (!playerState.farmerHired) return

  switch (farmer.state) {
    case 'idle': {
      farmer.idleTimer -= dt
      if (farmer.idleTimer > 0) return
      const task = pickNextTask()
      if (!task) { farmer.idleTimer = 5; return }
      farmer.targetPlot    = task.plot
      farmer.actionType    = task.action
      farmer.plantCropType = task.cropType
      startWalkToTarget(getApproachPos(Transform.get(task.plot).position))
      farmer.state = 'walking'
      break
    }

    case 'walking': {
      // Smooth rotation toward the current segment target every frame
      if (farmer.currentSegmentTarget) updateFacing(farmer.currentSegmentTarget, dt)
      if (!isTweenComplete()) return

      // More path segments to follow?
      if (farmer.walkPath.length > 0) {
        startWalkSegment(farmer.walkPath.shift()!)
        return
      }

      // Arrived — trigger action + animation simultaneously
      const animName =
        farmer.actionType === 'plant' ? 'PlantSeeds' :
        farmer.actionType === 'water' ? 'Watering' : 'CollectCrop'
      playAnim(animName)
      doFarmerAction()
      farmer.actionTimer = ACTION_DURATION
      farmer.state = 'acting'
      break
    }

    case 'acting': {
      farmer.actionTimer -= dt
      if (farmer.actionTimer > 0) return
      const next = pickNextTask()
      if (next) {
        farmer.targetPlot    = next.plot
        farmer.actionType    = next.action
        farmer.plantCropType = next.cropType
        startWalkToTarget(getApproachPos(Transform.get(next.plot).position))
        farmer.state = 'walking'
      } else {
        startWalkToTarget(HOME_POS)
        farmer.state = 'returning'
      }
      break
    }

    case 'returning': {
      if (farmer.currentSegmentTarget) updateFacing(farmer.currentSegmentTarget, dt)
      if (!isTweenComplete()) return
      if (farmer.walkPath.length > 0) {
        startWalkSegment(farmer.walkPath.shift()!)
        return
      }
      // Back home — gently face toward the fields
      updateFacing(HOME_FACE_TARGET, dt)
      playAnim('Idle')
      farmer.idleTimer = 7 + Math.random() * 23
      farmer.targetPlot = null
      farmer.actionType = ''
      farmer.state = 'idle'
      break
    }
  }
})

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

export function spawnFarmer() {
  if (farmer.entity) return

  const farmerEntity = engine.addEntity()
  farmer.entity = farmerEntity

  Transform.create(farmerEntity, {
    position: HOME_POS,
    rotation: Quaternion.fromAngleAxis(180, Vector3.Up()),
    scale: Vector3.create(1.20, 1.2, 1.2),
  })

  GltfContainer.create(farmerEntity, {
    src: FARMER_MODEL,
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0,
  })

  Animator.create(farmerEntity, {
    states: ANIM_CLIPS.map((clip) => ({
      clip,
      playing:     clip === 'Idle',
      loop:        clip === 'Idle' || clip === 'Walk',
      shouldReset: false,
      weight:      clip === 'Idle' ? 1 : 0,
    })),
  })

  // Explicit box collider — GLB has no built-in collision mesh
  const bodyCollider = engine.addEntity()
  Transform.create(bodyCollider, {
    parent: farmerEntity,
    position: Vector3.create(0, 1.0, 0),
    scale:    Vector3.create(0.6, 2.0, 0.6),
  })
  MeshCollider.setBox(bodyCollider, ColliderLayer.CL_POINTER)

  pointerEventsSystem.onPointerDown(
    {
      entity: bodyCollider,
      opts: { button: InputAction.IA_POINTER, hoverText: 'Talk to Farmer', maxDistance: 8 },
    },
    () => {
      playSound('menu')
      playerState.activeMenu = 'farmer'
      if (farmer.state === 'idle') {
        playAnim('Talk')
        farmer.talkTimer = TALK_DURATION
      }
    }
  )

  // Persistent head icon — shows DialogIcon or BoxCropsIcon depending on inventory
  farmerHeadIconEntity = engine.addEntity()
  Transform.create(farmerHeadIconEntity, {
    parent:   farmerEntity,
    position: Vector3.create(0, FARMER_HEAD_ICON_Y, 0.05),
    scale:    Vector3.create(FARMER_HEAD_ICON_SIZE, FARMER_HEAD_ICON_SIZE, FARMER_HEAD_ICON_SIZE),
  })
  Billboard.create(farmerHeadIconEntity, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(farmerHeadIconEntity)
  Material.setPbrMaterial(farmerHeadIconEntity, {
    texture:           Material.Texture.Common({ src: DIALOG_ICON }),
    emissiveTexture:   Material.Texture.Common({ src: DIALOG_ICON }),
    emissiveIntensity: 0.9,
    emissiveColor:     Color4.White(),
    alphaTest:         0.1,
    transparencyMode:  2,
  })

  discoverWaypoints()
  console.log('CozyFarm: Farmer spawned')
}
