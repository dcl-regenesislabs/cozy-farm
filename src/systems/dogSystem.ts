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
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { getActiveNpcPositions } from './npcSystem'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOG_MODEL             = 'assets/scene/Models/Dog01/Dog01.glb'
const DOG_SCALE             = 0.6
const WALK_SPEED            = 1.8    // units / second
const RUN_SPEED             = 4.0    // units / second
const TURN_SPEED            = 8.0    // rad / second
const CROSSFADE_DURATION    = 0.25   // seconds
const DANCE_DURATION        = 2.0    // seconds
const PAUSE_MIN             = 4.0    // seconds idle between wander steps
const PAUSE_MAX             = 10.0
const WANDER_MAX_STEP       = 3.5
const NPC_CHECK_INTERVAL    = 2.0    // seconds between NPC proximity checks
const NPC_FOLLOW_CHANCE     = 0.3    // 30 % chance to follow a nearby NPC
const NPC_FOLLOW_MIN        = 5.0    // seconds to follow an NPC
const NPC_FOLLOW_MAX        = 12.0
const NPC_TRIGGER_DIST      = 6.0    // units — NPC must be within this range
const PLAYER_FOLLOW_DIST    = 2.0    // stop chasing when within this distance
const PET_RESET_TIMEOUT     = 60.0   // seconds of inactivity before pet count resets
const PET_FOLLOW_THRESHOLD  = 3      // consecutive pets needed to start following

// Wander bounds: reuse the same four spawn-point entities NPCs use
const WANDER_POINT_NAMES = ['NPCSpawn01_2', 'NPCSpawn01_3', 'NPCSpawn01_4', 'NPCSpawn01_5']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WanderBounds = { minX: number; maxX: number; minZ: number; maxZ: number }
type DogState = 'wandering' | 'pausing' | 'dancing' | 'followingNpc' | 'followingPlayer'

type DogInstance = {
  entity:           Entity
  state:            DogState
  prevState:        DogState
  pauseTimer:       number
  danceTimer:       number
  followNpcTimer:   number
  followNpcTarget:  Vector3 | null
  tweenSeen:        boolean
  currentTarget:    Vector3 | null
  isRunning:        boolean
  wanderBounds:     WanderBounds
  petCount:         number
  lastPetTime:      number   // elapsed engine seconds at last pet
  npcCheckTimer:    number
  elapsedTime:      number   // total seconds since spawn — used for timeout checks
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let dog: DogInstance | null = null
let systemRegistered        = false

// ---------------------------------------------------------------------------
// Animation crossfade
// ---------------------------------------------------------------------------

const DOG_CLIPS = ['idle', 'walk', 'run', 'dance']

type BlendState = { fromClip: string; toClip: string; t: number }
let dogBlend: BlendState = { fromClip: 'idle', toClip: 'idle', t: 1.0 }

function playAnim(clip: string) {
  if (!dog) return
  if (clip === dogBlend.toClip && dogBlend.t >= 1.0) return

  dogBlend.fromClip = dogBlend.toClip
  dogBlend.toClip   = clip
  dogBlend.t        = 0.0

  const animator = Animator.getMutable(dog.entity)
  for (const s of animator.states) {
    if (s.clip === clip) {
      s.playing     = true
      s.weight      = 0
      s.shouldReset = clip === 'dance'
    }
  }
}

function updateBlend(dt: number) {
  if (!dog || dogBlend.t >= 1.0) return
  dogBlend.t = Math.min(1.0, dogBlend.t + dt / CROSSFADE_DURATION)

  const animator = Animator.getMutable(dog.entity)
  for (const s of animator.states) {
    if (s.clip === dogBlend.toClip) {
      s.weight = dogBlend.t
    } else if (s.clip === dogBlend.fromClip) {
      s.weight = 1.0 - dogBlend.t
      if (dogBlend.t >= 1.0) { s.playing = false; s.weight = 0 }
    }
  }
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------

function dist2D(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x; const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function getTravelTime(from: Vector3, to: Vector3, speed: number): number {
  return Math.max(0.3, dist2D(from, to) / speed)
}

function startWalkTo(target: Vector3, running: boolean) {
  if (!dog) return
  const cur = Transform.get(dog.entity).position
  dog.isRunning     = running
  dog.currentTarget = target
  dog.tweenSeen     = false
  Tween.createOrReplace(dog.entity, {
    mode: Tween.Mode.Move({
      start: { x: cur.x, y: cur.y, z: cur.z },
      end:   { x: target.x, y: target.y, z: target.z },
    }),
    duration: getTravelTime(cur, target, running ? RUN_SPEED : WALK_SPEED) * 1000,
    easingFunction: EasingFunction.EF_LINEAR,
  })
  playAnim(running ? 'run' : 'walk')
}

function stopMovement() {
  if (!dog) return
  const cur = Transform.get(dog.entity).position
  Tween.createOrReplace(dog.entity, {
    mode: Tween.Mode.Move({
      start: { x: cur.x, y: cur.y, z: cur.z },
      end:   { x: cur.x, y: cur.y, z: cur.z },
    }),
    duration: 1,
    easingFunction: EasingFunction.EF_LINEAR,
  })
  dog.tweenSeen = false
}

function isTweenComplete(): boolean {
  if (!dog) return false
  const ts = TweenState.getOrNull(dog.entity)
  if (!ts) return false
  if (ts.state === TweenStateStatus.TS_ACTIVE) { dog.tweenSeen = true; return false }
  return dog.tweenSeen && ts.state === TweenStateStatus.TS_COMPLETED
}

function updateFacing(targetPos: Vector3, dt: number) {
  if (!dog) return
  const transform = Transform.getMutable(dog.entity)
  const dx = targetPos.x - transform.position.x
  const dz = targetPos.z - transform.position.z
  if (dx * dx + dz * dz < 0.001) return
  const angle     = Math.atan2(dx, dz) * (180 / Math.PI)
  const targetRot = Quaternion.fromAngleAxis(angle, Vector3.Up())
  transform.rotation = Quaternion.slerp(transform.rotation, targetRot, Math.min(1.0, TURN_SPEED * dt))
}

// ---------------------------------------------------------------------------
// Wander helpers
// ---------------------------------------------------------------------------

function discoverWanderBounds(): WanderBounds {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const name of WANDER_POINT_NAMES) {
    const entity = engine.getEntityOrNullByName(name)
    if (!entity) { console.log(`CozyFarm Dog: spawn point '${name}' not found`); continue }
    const p = Transform.get(entity).position
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  return { minX, maxX, minZ, maxZ }
}

function randomWanderTarget(currentPos: Vector3, bounds: WanderBounds): Vector3 {
  const angle  = Math.random() * Math.PI * 2
  const radius = (0.5 + Math.random() * 0.5) * WANDER_MAX_STEP
  const x = Math.max(bounds.minX, Math.min(bounds.maxX, currentPos.x + Math.cos(angle) * radius))
  const z = Math.max(bounds.minZ, Math.min(bounds.maxZ, currentPos.z + Math.sin(angle) * radius))
  return Vector3.create(x, 0, z)
}

function boundsCenter(bounds: WanderBounds): Vector3 {
  return Vector3.create(
    (bounds.minX + bounds.maxX) / 2,
    0,
    (bounds.minZ + bounds.maxZ) / 2,
  )
}

// ---------------------------------------------------------------------------
// Dance helper
// ---------------------------------------------------------------------------

function startDance(returnTo: DogState) {
  if (!dog) return
  if (dog.state === 'dancing') return
  dog.prevState  = returnTo
  dog.state      = 'dancing'
  dog.danceTimer = DANCE_DURATION
  stopMovement()
  playAnim('dance')
}

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------

function onDogClick() {
  if (!dog) return

  // Pet timeout reset check
  const timeSincePet = dog.elapsedTime - dog.lastPetTime
  if (timeSincePet > PET_RESET_TIMEOUT && dog.petCount > 0 && dog.petCount < PET_FOLLOW_THRESHOLD) {
    dog.petCount = 0
    console.log('CozyFarm Dog: pet count reset (timeout)')
  }

  dog.petCount++
  dog.lastPetTime = dog.elapsedTime
  console.log(`CozyFarm Dog: petted (count: ${dog.petCount})`)

  if (dog.state === 'followingPlayer' && dog.petCount >= PET_FOLLOW_THRESHOLD + 1) {
    // 4th+ pet while following → stop following after dance
    dog.petCount = 0
    startDance('pausing')
    return
  }

  if (dog.petCount >= PET_FOLLOW_THRESHOLD && dog.state !== 'followingPlayer') {
    // 3rd consecutive pet → follow player after dance
    startDance('followingPlayer')
    return
  }

  // Otherwise just dance and resume whatever was happening
  const returnTo: DogState = dog.state === 'dancing' ? dog.prevState : dog.state
  startDance(returnTo === 'followingNpc' ? 'pausing' : returnTo)
}

// ---------------------------------------------------------------------------
// Public: spawn the dog
// ---------------------------------------------------------------------------

export function spawnDog() {
  if (dog) return  // already spawned

  const bounds  = discoverWanderBounds()
  const spawnPt = boundsCenter(bounds)

  const entity = engine.addEntity()

  GltfContainer.create(entity, {
    src: DOG_MODEL,
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0,
  })

  Transform.create(entity, {
    position: Vector3.create(spawnPt.x, spawnPt.y, spawnPt.z),
    rotation: Quaternion.fromAngleAxis(0, Vector3.Up()),
    scale:    Vector3.create(DOG_SCALE, DOG_SCALE, DOG_SCALE),
  })

  Animator.create(entity, {
    states: DOG_CLIPS.map((clip) => ({
      clip,
      playing:     clip === 'idle',
      loop:        clip !== 'dance',
      weight:      clip === 'idle' ? 1 : 0,
      shouldReset: false,
    })),
  })

  // Click collider — positioned at torso height relative to the dog's scale
  const colliderEntity = engine.addEntity()
  Transform.create(colliderEntity, {
    parent:   entity,
    position: Vector3.create(0, 1.0 / DOG_SCALE, 0),  // ~0.6 world units high
    scale:    Vector3.create(1.2 / DOG_SCALE, 1.6 / DOG_SCALE, 1.2 / DOG_SCALE),
  })
  MeshCollider.setBox(colliderEntity, ColliderLayer.CL_POINTER)

  pointerEventsSystem.onPointerDown(
    { entity: colliderEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'Pet the dog', maxDistance: 6 } },
    onDogClick,
  )

  dog = {
    entity,
    state:           'pausing',
    prevState:       'pausing',
    pauseTimer:      2.0,
    danceTimer:      0,
    followNpcTimer:  0,
    followNpcTarget: null,
    tweenSeen:       false,
    currentTarget:   null,
    isRunning:       false,
    wanderBounds:    bounds,
    petCount:        0,
    lastPetTime:     0,
    npcCheckTimer:   NPC_CHECK_INTERVAL,
    elapsedTime:     0,
  }

  dogBlend = { fromClip: 'idle', toClip: 'idle', t: 1.0 }
  playAnim('idle')

  if (!systemRegistered) {
    engine.addSystem(dogUpdateSystem)
    systemRegistered = true
  }

  console.log('CozyFarm Dog: spawned at wander area center')
}

// ---------------------------------------------------------------------------
// Per-frame update system
// ---------------------------------------------------------------------------

function dogUpdateSystem(dt: number) {
  if (!dog) return

  dog.elapsedTime += dt
  updateBlend(dt)

  // Auto-reset pet count after timeout (only when not already following)
  if (
    dog.state !== 'followingPlayer' &&
    dog.petCount > 0 &&
    dog.petCount < PET_FOLLOW_THRESHOLD &&
    dog.elapsedTime - dog.lastPetTime > PET_RESET_TIMEOUT
  ) {
    dog.petCount = 0
    console.log('CozyFarm Dog: pet count reset (idle timeout)')
  }

  switch (dog.state) {

    case 'pausing': {
      dog.pauseTimer -= dt
      // Periodic NPC check while idle
      dog.npcCheckTimer -= dt
      if (dog.npcCheckTimer <= 0) {
        dog.npcCheckTimer = NPC_CHECK_INTERVAL
        tryFollowNpc()
        if (dog.state !== 'pausing') break  // NPC follow triggered
      }
      if (dog.pauseTimer <= 0) {
        pickNextWanderTarget()
      }
      break
    }

    case 'wandering': {
      if (dog.currentTarget) updateFacing(dog.currentTarget, dt)
      // Periodic NPC check while wandering
      dog.npcCheckTimer -= dt
      if (dog.npcCheckTimer <= 0) {
        dog.npcCheckTimer = NPC_CHECK_INTERVAL
        tryFollowNpc()
        if (dog.state !== 'wandering') break
      }
      if (isTweenComplete()) {
        dog.state      = 'pausing'
        dog.pauseTimer = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN)
        playAnim('idle')
      }
      break
    }

    case 'dancing': {
      dog.danceTimer -= dt
      if (dog.danceTimer <= 0) {
        // Transition to post-dance state
        if (dog.prevState === 'followingPlayer') {
          dog.state = 'followingPlayer'
          playAnim('idle')
        } else if (dog.prevState === 'pausing') {
          dog.state      = 'pausing'
          dog.pauseTimer = 1.5
          playAnim('idle')
        } else {
          dog.state      = 'pausing'
          dog.pauseTimer = 1.5
          playAnim('idle')
        }
      }
      break
    }

    case 'followingNpc': {
      if (!dog.followNpcTarget) {
        dog.state      = 'pausing'
        dog.pauseTimer = 2.0
        playAnim('idle')
        break
      }
      dog.followNpcTimer -= dt
      if (dog.followNpcTimer <= 0) {
        stopMovement()
        dog.state      = 'pausing'
        dog.pauseTimer = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN)
        playAnim('idle')
        break
      }
      const curPos   = Transform.get(dog.entity).position
      const d        = dist2D(curPos, dog.followNpcTarget)
      if (d > 1.5) {
        updateFacing(dog.followNpcTarget, dt)
        if (isTweenComplete() || dog.currentTarget === null) {
          startWalkTo(dog.followNpcTarget, false)
        }
      } else {
        if (dog.isRunning || dogBlend.toClip !== 'idle') {
          stopMovement()
          playAnim('idle')
        }
      }
      break
    }

    case 'followingPlayer': {
      const playerPos = Transform.get(engine.PlayerEntity).position
      const target    = Vector3.create(playerPos.x, 0, playerPos.z)
      const curPos    = Transform.get(dog.entity).position
      const d         = dist2D(curPos, target)
      if (d > PLAYER_FOLLOW_DIST) {
        updateFacing(target, dt)
        // Re-issue tween each frame so dog continuously tracks moving player
        startWalkTo(target, true)
      } else {
        if (dogBlend.toClip !== 'idle') {
          stopMovement()
          playAnim('idle')
        }
      }
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers for state transitions
// ---------------------------------------------------------------------------

function pickNextWanderTarget() {
  if (!dog) return
  const curPos   = Transform.get(dog.entity).position
  const target   = randomWanderTarget(curPos, dog.wanderBounds)
  const running  = Math.random() < 0.5
  startWalkTo(target, running)
  dog.state = 'wandering'
}

function tryFollowNpc() {
  if (!dog) return
  const npcPositions = getActiveNpcPositions()
  const curPos       = Transform.get(dog.entity).position

  for (const npcPos of npcPositions) {
    if (dist2D(curPos, npcPos) <= NPC_TRIGGER_DIST && Math.random() < NPC_FOLLOW_CHANCE) {
      dog.state           = 'followingNpc'
      dog.followNpcTarget = npcPos
      dog.followNpcTimer  = NPC_FOLLOW_MIN + Math.random() * (NPC_FOLLOW_MAX - NPC_FOLLOW_MIN)
      startWalkTo(npcPos, false)
      console.log('CozyFarm Dog: following an NPC')
      return
    }
  }
}
