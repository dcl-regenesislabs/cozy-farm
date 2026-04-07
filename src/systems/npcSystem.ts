import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  Animator,
  pointerEventsSystem,
  InputAction,
  Tween,
  EasingFunction,
  TweenStateStatus,
  TweenState,
  ColliderLayer,
  MeshCollider,
  Billboard,
  BillboardMode,
  MeshRenderer,
  Material,
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { NpcDefinition } from '../data/npcData'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { getQuestForNpc, getQuestProgress, acceptQuest, claimQuestReward } from '../game/questState'
import { EXCLAMATION_ICON, QUESTION_ICON } from '../data/imagePaths'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALK_SPEED         = 2.0   // units / second
const TURN_SPEED         = 10.0
const CROSSFADE_DURATION = 0.3   // seconds
const TALK_DURATION      = 3.0   // seconds NPC "talks" at entry point before wandering
const WANDER_PAUSE_MIN   = 6.0   // seconds to idle between wander steps
const WANDER_PAUSE_MAX   = 14.0
const WANDER_MAX_STEP    = 4.0   // max distance per wander move — keeps NPC in the middle area

// ---------------------------------------------------------------------------
// Spawn point names (placed in the scene editor)
// Each NPC uses its own prefix (e.g. 'NPC01'):
//   {prefix}Spawn01   → point 1: initial spawn position (outside wander area)
//   {prefix}Spawn01_2 → point 2: entry/door — NPC walks here first and "talks"
//   {prefix}Spawn01_3 → point 3: wander area corner NW
//   {prefix}Spawn01_4 → point 4: wander area corner NE
//   {prefix}Spawn01_5 → point 5: wander area corner SE
// ---------------------------------------------------------------------------

// Original scene entity names follow the pattern: {prefix}Spawn01, {prefix}Spawn01_2 ...
// With prefix='NPC', this produces: NPCSpawn01, NPCSpawn01_2 ... matching the scene editor names.
const SPAWN_SUFFIXES = ['Spawn01', 'Spawn01_2', 'Spawn01_3', 'Spawn01_4', 'Spawn01_5'] as const
type SpawnSuffix = typeof SPAWN_SUFFIXES[number]

function getSpawnName(prefix: string, suffix: SpawnSuffix): string {
  return `${prefix}${suffix}`
}

function discoverSpawnPoints(prefix: string): Map<SpawnSuffix, Vector3> {
  const positions = new Map<SpawnSuffix, Vector3>()
  for (const suffix of SPAWN_SUFFIXES) {
    const name   = getSpawnName(prefix, suffix)
    const entity = engine.getEntityOrNullByName(name)
    if (entity) {
      const p = Transform.get(entity).position
      positions.set(suffix, Vector3.create(p.x, p.y, p.z))
    } else {
      console.log(`CozyFarm NPC: spawn point '${name}' not found in scene`)
    }
  }
  return positions
}

/** Compute the wander bounding box from points 2, 3, 4, 5. */
function getWanderBounds(positions: Map<SpawnSuffix, Vector3>): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const corners: SpawnSuffix[] = ['Spawn01_2', 'Spawn01_3', 'Spawn01_4', 'Spawn01_5']
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const key of corners) {
    const pos = positions.get(key)
    if (!pos) continue
    if (pos.x < minX) minX = pos.x
    if (pos.x > maxX) maxX = pos.x
    if (pos.z < minZ) minZ = pos.z
    if (pos.z > maxZ) maxZ = pos.z
  }
  return { minX, maxX, minZ, maxZ }
}

/** Pick a short-step wander target near `currentPos`, clamped to bounds. */
function randomWanderTarget(
  currentPos: Vector3,
  bounds: ReturnType<typeof getWanderBounds>,
): Vector3 {
  const angle  = Math.random() * Math.PI * 2
  const radius = (0.5 + Math.random() * 0.5) * WANDER_MAX_STEP
  const targetX = Math.max(bounds.minX, Math.min(bounds.maxX, currentPos.x + Math.cos(angle) * radius))
  const targetZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, currentPos.z + Math.sin(angle) * radius))
  return Vector3.create(targetX, 0, targetZ)
}

// ---------------------------------------------------------------------------
// NPC state machine
// ---------------------------------------------------------------------------

type NpcState = 'walkingToDoor' | 'talkAtDoor' | 'wandering' | 'pauseWander' | 'talking' | 'leavingToDoor' | 'leavingToSpawn'

type NpcInstance = {
  entity:        Entity
  def:           NpcDefinition
  state:         NpcState
  talkTimer:     number
  pauseTimer:    number
  tweenSeen:     boolean
  wanderBounds:  ReturnType<typeof getWanderBounds>
  currentTarget: Vector3 | null
  spawnPos:      Vector3
  doorPos:       Vector3
  onDespawned?:  () => void
}

const activeNpcs: NpcInstance[] = []

// Quest icon constants — tune here
const NPC_ICON_Y    = 2.4   // height above NPC entity origin
const NPC_ICON_SIZE = 0.7  // size of the quest icon sprite

/** Maps npc entity → quest icon sprite entity */
const npcQuestIcons = new Map<Entity, Entity>()

// ---------------------------------------------------------------------------
// Animation crossfade (per-instance)
// ---------------------------------------------------------------------------

const NPC_ANIM_CLIPS = ['Idle', 'Walk', 'Talk']

type BlendState = { fromClip: string; toClip: string; t: number }

const blends = new Map<Entity, BlendState>()

function playAnim(npc: NpcInstance, clip: string) {
  let b = blends.get(npc.entity)
  if (!b) {
    b = { fromClip: 'Idle', toClip: 'Idle', t: 1.0 }
    blends.set(npc.entity, b)
  }
  if (clip === b.toClip && b.t >= 1.0) return

  b.fromClip = b.toClip
  b.toClip   = clip
  b.t        = 0.0

  const animator = Animator.getMutable(npc.entity)
  for (const s of animator.states) {
    if (s.clip === clip) {
      s.playing     = true
      s.weight      = 0
      s.shouldReset = clip !== 'Idle' && clip !== 'Walk'
    }
  }
}

function updateBlend(npc: NpcInstance, dt: number) {
  const b = blends.get(npc.entity)
  if (!b || b.t >= 1.0) return
  b.t = Math.min(1.0, b.t + dt / CROSSFADE_DURATION)

  const animator = Animator.getMutable(npc.entity)
  for (const s of animator.states) {
    if (s.clip === b.toClip) {
      s.weight = b.t
    } else if (s.clip === b.fromClip) {
      s.weight = 1.0 - b.t
      if (b.t >= 1.0) { s.playing = false; s.weight = 0 }
    }
  }
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------

function getTravelTime(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x; const dz = to.z - from.z
  return Math.max(0.3, Math.sqrt(dx * dx + dz * dz) / WALK_SPEED)
}

function startWalkTo(npc: NpcInstance, target: Vector3) {
  const cur = Transform.get(npc.entity).position
  Tween.createOrReplace(npc.entity, {
    mode: Tween.Mode.Move({
      start: { x: cur.x, y: cur.y, z: cur.z },
      end:   { x: target.x, y: target.y, z: target.z },
    }),
    duration: getTravelTime(cur, target) * 1000,
    easingFunction: EasingFunction.EF_LINEAR,
  })
  npc.tweenSeen      = false
  npc.currentTarget  = target
  playAnim(npc, 'Walk')
}

function isTweenComplete(npc: NpcInstance): boolean {
  const ts = TweenState.getOrNull(npc.entity)
  if (!ts) return false
  if (ts.state === TweenStateStatus.TS_ACTIVE) { npc.tweenSeen = true; return false }
  return npc.tweenSeen && ts.state === TweenStateStatus.TS_COMPLETED
}

function updateFacing(npc: NpcInstance, targetPos: Vector3, dt: number) {
  const transform = Transform.getMutable(npc.entity)
  const dx = targetPos.x - transform.position.x
  const dz = targetPos.z - transform.position.z
  if (dx * dx + dz * dz < 0.001) return
  const angle     = Math.atan2(dx, dz) * (180 / Math.PI)
  const targetRot = Quaternion.fromAngleAxis(angle, Vector3.Up())
  transform.rotation = Quaternion.slerp(transform.rotation, targetRot, Math.min(1.0, TURN_SPEED * dt))
}

/** Walk NPC back to spawn2 then spawn1 and remove it from the scene. */
function startDeparture(npc: NpcInstance) {
  playAnim(npc, 'Walk')
  startWalkTo(npc, npc.doorPos)
  npc.state = 'leavingToDoor'
}

/** Freeze NPC in place by creating a zero-movement tween from the current position. */
function stopMovement(npc: NpcInstance) {
  const cur = Transform.get(npc.entity).position
  Tween.createOrReplace(npc.entity, {
    mode: Tween.Mode.Move({
      start: { x: cur.x, y: cur.y, z: cur.z },
      end:   { x: cur.x, y: cur.y, z: cur.z },
    }),
    duration: 1,
    easingFunction: EasingFunction.EF_LINEAR,
  })
  npc.tweenSeen = false
}

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

/** Force the current active NPC to begin departing (walk off scene). */
export function requestNpcDeparture() {
  const npc = activeNpcs[0]
  if (npc && npc.state !== 'leavingToDoor' && npc.state !== 'leavingToSpawn') {
    startDeparture(npc)
  }
}

export function initNpcSystem(def: NpcDefinition, onDespawned?: () => void) {
  const spawnPositions = discoverSpawnPoints(def.spawnPrefix)

  const spawnPos = spawnPositions.get('Spawn01')
  if (!spawnPos) {
    console.log(`CozyFarm NPC: ${def.spawnPrefix}Spawn01 not found — ${def.name} will not spawn`)
    return
  }

  const doorPos = spawnPositions.get('Spawn01_2')
  if (!doorPos) {
    console.log(`CozyFarm NPC: ${def.spawnPrefix}Spawn01_2 not found — ${def.name} will not spawn`)
    return
  }

  const entity = engine.addEntity()

  // Main model
  GltfContainer.create(entity, {
    src: def.model,
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0,
  })

  Transform.create(entity, {
    position: Vector3.create(spawnPos.x, spawnPos.y, spawnPos.z),
    rotation: Quaternion.fromAngleAxis(0, Vector3.Up()),
    scale:    Vector3.create(1.2, 1.2, 1.2),
  })

  Animator.create(entity, {
    states: NPC_ANIM_CLIPS.map((clip) => ({
      clip,
      playing:     clip === 'Idle',
      loop:        clip === 'Idle' || clip === 'Walk',
      weight:      clip === 'Idle' ? 1 : 0,
      shouldReset: false,
    })),
  })

  // Quest icon sprite (dynamically updated each frame based on quest state)
  const iconScale = 1 / 1.2  // counteract NPC parent scale of 1.2
  const questIconEntity = engine.addEntity()
  Transform.create(questIconEntity, {
    parent:   entity,
    position: Vector3.create(0, NPC_ICON_Y * iconScale, 0),
    scale:    Vector3.create(NPC_ICON_SIZE * iconScale, NPC_ICON_SIZE * iconScale, NPC_ICON_SIZE * iconScale),
  })
  Billboard.create(questIconEntity, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(questIconEntity)
  Material.setPbrMaterial(questIconEntity, {
    texture:           Material.Texture.Common({ src: EXCLAMATION_ICON }),
    emissiveTexture:   Material.Texture.Common({ src: EXCLAMATION_ICON }),
    emissiveIntensity: 0.9,
    emissiveColor:     Color4.White(),
    alphaTest:         0.1,
    transparencyMode:  2,
  })
  npcQuestIcons.set(entity, questIconEntity)

  // Click collider
  const colliderEntity = engine.addEntity()
  Transform.create(colliderEntity, {
    parent:   entity,
    position: Vector3.create(0, 1.0, 0),
    scale:    Vector3.create(0.6, 2.0, 0.6),
  })
  MeshCollider.setBox(colliderEntity, ColliderLayer.CL_POINTER)

  pointerEventsSystem.onPointerDown(
    {
      entity:    colliderEntity,
      opts: {
        button:        InputAction.IA_POINTER,
        hoverText:     `Talk to ${def.name}`,
        maxDistance:   8,
      },
    },
    () => onNpcClick(entity),
  )

  const npc: NpcInstance = {
    entity,
    def,
    state:         'walkingToDoor',
    talkTimer:     0,
    pauseTimer:    0,
    tweenSeen:     false,
    wanderBounds:  getWanderBounds(spawnPositions),
    currentTarget: Vector3.create(doorPos.x, doorPos.y, doorPos.z),
    spawnPos:      Vector3.create(spawnPos.x, spawnPos.y, spawnPos.z),
    doorPos:       Vector3.create(doorPos.x, doorPos.y, doorPos.z),
    onDespawned,
  }

  blends.set(entity, { fromClip: 'Idle', toClip: 'Idle', t: 1.0 })
  activeNpcs.push(npc)

  // Start walking to the door immediately
  startWalkTo(npc, doorPos)

  // Register the per-frame update system (only once)
  if (activeNpcs.length === 1) {
    engine.addSystem(npcUpdateSystem)
  }

  console.log(`CozyFarm NPC: Spawned ${def.name} — walking to entry point (${def.spawnPrefix}Spawn01_2)`)
}

// ---------------------------------------------------------------------------
// Click handler — quest-aware
// ---------------------------------------------------------------------------

function onNpcClick(entity: Entity) {
  const npc = activeNpcs.find((n) => n.entity === entity)
  if (!npc) return
  if (npc.state === 'talking') return

  if (npc.state === 'walkingToDoor' || npc.state === 'wandering') {
    stopMovement(npc)
  }

  npc.state = 'talking'
  playAnim(npc, 'Talk')

  const questDef = getQuestForNpc(npc.def.id)
  const qp       = questDef ? getQuestProgress(questDef.id) : undefined

  const returnToWander = () => {
    npc.state      = 'pauseWander'
    npc.pauseTimer = 2.0
    playAnim(npc, 'Idle')
  }

  npcDialogState.npcName      = npc.def.name
  npcDialogState.npcId        = npc.def.id
  npcDialogState.npcHeadImage = npc.def.headImage
  npcDialogState.onClose      = returnToWander
  npcDialogState.onAccept     = null
  npcDialogState.onClaim      = null

  if (!questDef || !qp || qp.status === 'completed') {
    // No quest or already done — show normal greeting
    npcDialogState.dialogLine = npc.def.greeting
    npcDialogState.mode       = 'greeting'
  } else if (qp.status === 'available') {
    // Quest not yet accepted — offer it
    npcDialogState.dialogLine = questDef.description
    npcDialogState.mode       = 'quest_offer'
    npcDialogState.onAccept   = () => acceptQuest(questDef.id)
  } else if (qp.status === 'active') {
    // Quest in progress — show progress
    npcDialogState.dialogLine = `${questDef.title}\n\nProgress: ${qp.current} / ${questDef.target}`
    npcDialogState.mode       = 'quest_active'
  } else if (qp.status === 'claimable') {
    // Quest complete — let player claim reward; NPC departs after claiming
    npcDialogState.dialogLine = `You did it! ${questDef.title} — complete!\n\nReward: ${questDef.rewardCoins} coins + ${questDef.rewardXp} XP`
    npcDialogState.mode       = 'quest_claimable'
    let claimed = false
    npcDialogState.onClaim  = () => {
      claimQuestReward(questDef.id)
      claimed = true
    }
    npcDialogState.onClose  = () => {
      if (claimed) {
        startDeparture(npc)
      } else {
        returnToWander()
      }
    }
  }

  playerState.activeMenu = 'npcDialog'
  console.log(`CozyFarm NPC: Player talked to ${npc.def.name} (mode: ${npcDialogState.mode})`)
}

// ---------------------------------------------------------------------------
// Per-frame update system
// ---------------------------------------------------------------------------

function npcUpdateSystem(dt: number) {
  const toRemove: NpcInstance[] = []

  for (const npc of activeNpcs) {
    updateBlend(npc, dt)

    switch (npc.state) {
      case 'walkingToDoor': {
        if (npc.currentTarget) updateFacing(npc, npc.currentTarget, dt)
        if (isTweenComplete(npc)) {
          npc.state     = 'talkAtDoor'
          npc.talkTimer = TALK_DURATION
          playAnim(npc, 'Talk')
        }
        break
      }

      case 'talkAtDoor': {
        npc.talkTimer -= dt
        if (npc.talkTimer <= 0) {
          npc.state      = 'pauseWander'
          npc.pauseTimer = WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN)
          playAnim(npc, 'Idle')
        }
        break
      }

      case 'wandering': {
        if (npc.currentTarget) updateFacing(npc, npc.currentTarget, dt)
        if (isTweenComplete(npc)) {
          npc.state      = 'pauseWander'
          npc.pauseTimer = WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN)
          playAnim(npc, 'Idle')
        }
        break
      }

      case 'pauseWander': {
        npc.pauseTimer -= dt
        if (npc.pauseTimer <= 0) {
          const curPos = Transform.get(npc.entity).position
          const target = randomWanderTarget(curPos, npc.wanderBounds)
          startWalkTo(npc, target)
          npc.state = 'wandering'
        }
        break
      }

      case 'talking': {
        // Hold Talk animation until the player closes the dialog panel.
        // The transition back to wandering is triggered by npcDialogState.onClose.
        break
      }

      case 'leavingToDoor': {
        if (npc.currentTarget) updateFacing(npc, npc.currentTarget, dt)
        if (isTweenComplete(npc)) {
          // Brief pause at the door before walking to the spawn point
          startWalkTo(npc, npc.spawnPos)
          npc.state = 'leavingToSpawn'
        }
        break
      }

      case 'leavingToSpawn': {
        if (npc.currentTarget) updateFacing(npc, npc.currentTarget, dt)
        if (isTweenComplete(npc)) {
          toRemove.push(npc)
        }
        break
      }
    }
  }

  // Deferred removal — safe to splice after the loop
  for (const npc of toRemove) {
    engine.removeEntity(npc.entity)
    blends.delete(npc.entity)
    npcQuestIcons.delete(npc.entity)
    const idx = activeNpcs.indexOf(npc)
    if (idx !== -1) activeNpcs.splice(idx, 1)
    console.log(`CozyFarm NPC: ${npc.def.name} departed`)
    if (npc.onDespawned) npc.onDespawned()
  }

  // Update quest icon material for each active NPC
  for (const npc of activeNpcs) {
    const iconEntity = npcQuestIcons.get(npc.entity)
    if (!iconEntity) continue

    const questDef = getQuestForNpc(npc.def.id)
    const qp       = questDef ? getQuestProgress(questDef.id) : undefined

    let iconSrc: string | null = null
    if (qp && (qp.status === 'available' || qp.status === 'claimable')) {
      iconSrc = EXCLAMATION_ICON
    } else if (qp && qp.status === 'active') {
      iconSrc = QUESTION_ICON
    }

    const t = Transform.getMutable(iconEntity)
    if (iconSrc === null) {
      // Hide icon
      t.scale = Vector3.create(0, 0, 0)
    } else {
      const iconScale = 1 / 1.2
      t.scale = Vector3.create(NPC_ICON_SIZE * iconScale, NPC_ICON_SIZE * iconScale, NPC_ICON_SIZE * iconScale)
      Material.setPbrMaterial(iconEntity, {
        texture:           Material.Texture.Common({ src: iconSrc }),
        emissiveTexture:   Material.Texture.Common({ src: iconSrc }),
        emissiveIntensity: 0.9,
        emissiveColor:     Color4.White(),
        alphaTest:         0.1,
        transparencyMode:  2,
      })
    }
  }
}
