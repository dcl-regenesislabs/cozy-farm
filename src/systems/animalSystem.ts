import {
  engine,
  Entity,
  GltfContainer,
  Transform,
  Animator,
  MeshCollider,
  ColliderLayer,
  pointerEventsSystem,
  InputAction,
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import { addXp } from './levelingSystem'
import { playSound } from './sfxSystem'
import {
  ANIMAL_DATA, AnimalType,
  CHICKEN_MODEL, PIG_MODEL,
  ANIMAL_WALK_SPEED, ANIMAL_PAUSE_MIN, ANIMAL_PAUSE_MAX,
  ANIMAL_SCALE_CHICKEN, ANIMAL_SCALE_PIG,
  CHICKEN_WANDER_RADIUS, PIG_WANDER_RADIUS,
  CHICKEN_COOP_CENTRE, PIG_PEN_CENTRE,
  VEGGIE_SCRAP_CHANCE,
  CHICKEN_COOP_MODEL, PIG_PEN_MODEL,
} from '../data/animalData'
import { removeChickenTeaser, removePigTeaser } from './interactionSetup'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnimalWanderer = {
  entity:        Entity
  type:          AnimalType
  centre:        { x: number; y: number; z: number }
  radius:        number
  state:         'idle' | 'walking'
  pauseTimer:    number
  currentTarget: Vector3 | null
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wanderers: AnimalWanderer[] = []
let systemRegistered = false

// ---------------------------------------------------------------------------
// Wander helpers
// ---------------------------------------------------------------------------

function randomWanderTarget(centre: { x: number; y: number; z: number }, radius: number): Vector3 {
  const angle = Math.random() * Math.PI * 2
  const dist  = Math.random() * radius
  return Vector3.create(
    centre.x + Math.cos(angle) * dist,
    centre.y,
    centre.z + Math.sin(angle) * dist,
  )
}

function randomPause(): number {
  return ANIMAL_PAUSE_MIN + Math.random() * (ANIMAL_PAUSE_MAX - ANIMAL_PAUSE_MIN)
}

// ---------------------------------------------------------------------------
// Animation helpers — assumes clips named 'idle' and 'walk' in the GLB
// ---------------------------------------------------------------------------

function playAnim(entity: Entity, clip: 'idle' | 'walk'): void {
  const animator = Animator.getMutable(entity)
  for (const s of animator.states) {
    s.playing = s.clip === clip
    s.weight  = s.clip === clip ? 1 : 0
  }
}

// ---------------------------------------------------------------------------
// Spawn one wandering animal entity
// ---------------------------------------------------------------------------

function spawnWanderer(
  type: AnimalType,
  centre: { x: number; y: number; z: number },
  radius: number,
  offsetIndex: number,
): void {
  const def    = ANIMAL_DATA.get(type)!
  const entity = engine.addEntity()
  const scale  = type === AnimalType.Chicken ? ANIMAL_SCALE_CHICKEN : ANIMAL_SCALE_PIG

  // Spread the initial positions around the centre so they don't stack
  const angle = (offsetIndex / 3) * Math.PI * 2
  const startX = centre.x + Math.cos(angle) * (radius * 0.5)
  const startZ = centre.z + Math.sin(angle) * (radius * 0.5)

  GltfContainer.create(entity, { src: def.modelSrc })
  Transform.create(entity, {
    position: Vector3.create(startX, centre.y, startZ),
    scale:    Vector3.create(scale, scale, scale),
    rotation: Quaternion.fromEulerDegrees(0, Math.random() * 360, 0),
  })
  Animator.create(entity, {
    states: [
      { clip: 'idle', playing: true,  weight: 1, loop: true },
      { clip: 'walk', playing: false, weight: 0, loop: true },
    ],
  })

  wanderers.push({
    entity,
    type,
    centre,
    radius,
    state:         'idle',
    pauseTimer:    Math.random() * 3,  // stagger initial pause
    currentTarget: null,
  })
}

// ---------------------------------------------------------------------------
// Wander update — called every frame by the ECS system
// ---------------------------------------------------------------------------

function updateWanderers(dt: number): void {
  for (const w of wanderers) {
    if (w.state === 'idle') {
      w.pauseTimer -= dt
      if (w.pauseTimer > 0) continue

      w.currentTarget = randomWanderTarget(w.centre, w.radius)
      w.state         = 'walking'
      playAnim(w.entity, 'walk')
    } else {
      // Moving toward target
      const t    = Transform.getMutable(w.entity)
      const pos  = t.position
      const tgt  = w.currentTarget!
      const dx   = tgt.x - pos.x
      const dz   = tgt.z - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 0.15) {
        // Reached target
        t.position       = Vector3.create(tgt.x, tgt.y, tgt.z)
        w.state          = 'idle'
        w.pauseTimer     = randomPause()
        w.currentTarget  = null
        playAnim(w.entity, 'idle')
      } else {
        const step = Math.min(ANIMAL_WALK_SPEED * dt, dist)
        t.position = Vector3.create(
          pos.x + (dx / dist) * step,
          pos.y,
          pos.z + (dz / dist) * step,
        )
        // Face direction of movement
        t.rotation = Quaternion.fromEulerDegrees(0, Math.atan2(dx, dz) * (180 / Math.PI), 0)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Offline catch-up — calculate egg / manure production missed while offline
// Called once from saveService.applyPayload (via initAnimalSystem)
// ---------------------------------------------------------------------------

export function catchUpAnimalProduction(): void {
  const now = Date.now()

  if (playerState.chickenCoopUnlocked) {
    const chickenDef = ANIMAL_DATA.get(AnimalType.Chicken)!
    if (playerState.chickenLastProducedAt > 0 && playerState.grainCount > 0) {
      const cyclesMissed = Math.floor(
        (now - playerState.chickenLastProducedAt) / chickenDef.cycleDurationMs,
      )
      if (cyclesMissed > 0) {
        const grainsAvailable = playerState.grainCount
        const cycles = Math.min(cyclesMissed, grainsAvailable)
        for (let i = 0; i < cycles; i++) {
          const yield_ = chickenDef.productYieldMin +
            Math.floor(Math.random() * (chickenDef.productYieldMax - chickenDef.productYieldMin + 1))
          playerState.eggsCount = Math.min(
            playerState.eggsCount + yield_,
            chickenDef.maxStockpile,
          )
        }
        playerState.grainCount           -= cycles
        playerState.chickenLastProducedAt = now - ((now - playerState.chickenLastProducedAt) % chickenDef.cycleDurationMs)
      }
    } else if (playerState.chickenLastProducedAt === 0) {
      playerState.chickenLastProducedAt = now
    }
  }

  if (playerState.pigPenUnlocked) {
    const pigDef = ANIMAL_DATA.get(AnimalType.Pig)!
    if (playerState.pigLastProducedAt > 0) {
      const cyclesMissed = Math.floor(
        (now - playerState.pigLastProducedAt) / pigDef.cycleDurationMs,
      )
      if (cyclesMissed > 0) {
        // Pigs consume veggie scraps first, then grain
        let feedAvailable = playerState.vegetableScraps + playerState.grainCount
        const cycles = Math.min(cyclesMissed, feedAvailable)
        for (let i = 0; i < cycles; i++) {
          playerState.manureCount = Math.min(
            playerState.manureCount + 1,
            pigDef.maxStockpile,
          )
          if (playerState.vegetableScraps > 0) {
            playerState.vegetableScraps -= 1
          } else {
            playerState.grainCount -= 1
          }
        }
        playerState.pigLastProducedAt = now - ((now - playerState.pigLastProducedAt) % pigDef.cycleDurationMs)
      }
    } else if (playerState.pigLastProducedAt === 0) {
      playerState.pigLastProducedAt = now
    }
  }
}

// ---------------------------------------------------------------------------
// Real-time production timer — accumulates while the player is online
// ---------------------------------------------------------------------------

let chickenAccumMs = 0
let pigAccumMs     = 0

function productionSystem(dt: number): void {
  const dtMs = dt * 1000

  if (playerState.chickenCoopUnlocked) {
    const def = ANIMAL_DATA.get(AnimalType.Chicken)!
    if (playerState.grainCount > 0 && playerState.eggsCount < def.maxStockpile) {
      chickenAccumMs += dtMs
      if (chickenAccumMs >= def.cycleDurationMs) {
        chickenAccumMs -= def.cycleDurationMs
        const yield_ = def.productYieldMin +
          Math.floor(Math.random() * (def.productYieldMax - def.productYieldMin + 1))
        playerState.eggsCount             = Math.min(playerState.eggsCount + yield_, def.maxStockpile)
        playerState.grainCount            -= 1
        playerState.chickenLastProducedAt  = Date.now()
      }
    } else {
      // Reset accumulator so it doesn't build up when there's no grain
      chickenAccumMs = 0
    }
  }

  if (playerState.pigPenUnlocked) {
    const def = ANIMAL_DATA.get(AnimalType.Pig)!
    const feedAvailable = playerState.vegetableScraps + playerState.grainCount
    if (feedAvailable > 0 && playerState.manureCount < def.maxStockpile) {
      pigAccumMs += dtMs
      if (pigAccumMs >= def.cycleDurationMs) {
        pigAccumMs -= def.cycleDurationMs
        playerState.manureCount          = Math.min(playerState.manureCount + 1, def.maxStockpile)
        playerState.pigLastProducedAt     = Date.now()
        if (playerState.vegetableScraps > 0) {
          playerState.vegetableScraps -= 1
        } else {
          playerState.grainCount -= 1
        }
      }
    } else {
      pigAccumMs = 0
    }
  }
}

// ---------------------------------------------------------------------------
// Collect eggs action
// ---------------------------------------------------------------------------

export function collectEggs(): void {
  if (playerState.eggsCount <= 0) return
  const count = playerState.eggsCount
  playerState.eggsCount        = 0
  playerState.totalEggsCollected += count
  const def = ANIMAL_DATA.get(AnimalType.Chicken)!
  addXp(def.xpPerCollect * count)
  playSound('harvest')
  console.log(`[AnimalSystem] Collected ${count} eggs`)
}

// ---------------------------------------------------------------------------
// Collect manure action
// ---------------------------------------------------------------------------

export function collectManure(): void {
  if (playerState.manureCount <= 0) return
  const count = playerState.manureCount
  playerState.manureCount         = 0
  playerState.totalManureCollected += count
  // Feed manure into compost bin as organic waste
  playerState.organicWaste        += count
  const def = ANIMAL_DATA.get(AnimalType.Pig)!
  addXp(def.xpPerCollect * count)
  playSound('harvest')
  console.log(`[AnimalSystem] Collected ${count} manure → +${count} organic waste`)
}

// ---------------------------------------------------------------------------
// Buy grain
// ---------------------------------------------------------------------------

export function buyGrain(amount: number, totalCost: number): boolean {
  if (playerState.coins < totalCost) return false
  playerState.coins    -= totalCost
  playerState.grainCount += amount
  playSound('buttonclick')
  return true
}

// ---------------------------------------------------------------------------
// Sell eggs (called from SellMenu / sell action)
// ---------------------------------------------------------------------------

export function sellEggs(count: number): boolean {
  const def = ANIMAL_DATA.get(AnimalType.Chicken)!
  if (playerState.eggsCount < count) return false
  const coins = def.productSellPrice * count
  playerState.eggsCount  -= count
  playerState.coins      += coins
  playerState.totalSellCount += 1
  playerState.totalCoinsEarned += coins
  addXp(5)
  playSound('truck')
  return true
}

// ---------------------------------------------------------------------------
// Veggie scrap drop — called from actions.ts on harvest
// ---------------------------------------------------------------------------

export function tryDropVeggieScrap(): void {
  if (!playerState.pigPenUnlocked) return
  if (Math.random() < VEGGIE_SCRAP_CHANCE) {
    playerState.vegetableScraps += 1
  }
}

// ---------------------------------------------------------------------------
// Unlock helpers — called from levelingSystem onLevelUp callback
// ---------------------------------------------------------------------------

export function unlockChickenCoop(): void {
  if (playerState.chickenCoopUnlocked) return
  playerState.chickenCoopUnlocked   = true
  playerState.chickenLastProducedAt = Date.now()
  removeChickenTeaser()
  spawnChickens()
  console.log('[AnimalSystem] Chicken Coop unlocked!')
}

export function unlockPigPen(): void {
  if (playerState.pigPenUnlocked) return
  playerState.pigPenUnlocked    = true
  playerState.pigLastProducedAt = Date.now()
  removePigTeaser()
  spawnPigs()
  console.log('[AnimalSystem] Pig Pen unlocked!')
}

// ---------------------------------------------------------------------------
// Spawn chicken / pig wanderers
// ---------------------------------------------------------------------------

export function spawnChickens(): void {
  if (!playerState.chickenCoopUnlocked) return
  // Remove any existing chickens first (re-spawn safe)
  for (const w of wanderers.filter((a) => a.type === AnimalType.Chicken)) {
    engine.removeEntity(w.entity)
  }
  wanderers.splice(0, wanderers.length, ...wanderers.filter((a) => a.type !== AnimalType.Chicken))

  for (let i = 0; i < 3; i++) {
    spawnWanderer(AnimalType.Chicken, CHICKEN_COOP_CENTRE, CHICKEN_WANDER_RADIUS, i)
  }
}

export function spawnPigs(): void {
  if (!playerState.pigPenUnlocked) return
  for (const w of wanderers.filter((a) => a.type === AnimalType.Pig)) {
    engine.removeEntity(w.entity)
  }
  wanderers.splice(0, wanderers.length, ...wanderers.filter((a) => a.type !== AnimalType.Pig))

  for (let i = 0; i < 2; i++) {
    spawnWanderer(AnimalType.Pig, PIG_PEN_CENTRE, PIG_WANDER_RADIUS, i)
  }
}

// ---------------------------------------------------------------------------
// Click handler for coop / pen buildings (wired in interactionSetup)
// ---------------------------------------------------------------------------

export function setupCoopClickHandler(coopEntity: Entity): void {
  pointerEventsSystem.onPointerDown(
    {
      entity: coopEntity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: playerState.chickenCoopUnlocked ? 'Open Chicken Coop' : 'Chicken Coop (Level 8)',
      },
    },
    () => { playerState.activeMenu = 'animals' },
  )
}

export function setupPenClickHandler(penEntity: Entity): void {
  pointerEventsSystem.onPointerDown(
    {
      entity: penEntity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: playerState.pigPenUnlocked ? 'Open Pig Pen' : 'Pig Pen (Level 12)',
      },
    },
    () => { playerState.activeMenu = 'animals' },
  )
}

// ---------------------------------------------------------------------------
// Building model paths re-exported so interactionSetup can use them
// ---------------------------------------------------------------------------
export { CHICKEN_COOP_MODEL, PIG_PEN_MODEL }

// ---------------------------------------------------------------------------
// Init — call once from index.ts (client side)
// ---------------------------------------------------------------------------

export function initAnimalSystem(): void {
  if (systemRegistered) return
  systemRegistered = true

  // Register wander + production ECS system
  engine.addSystem((dt: number) => {
    updateWanderers(dt)
    productionSystem(dt)
  }, undefined, 'animal-system')

  // Spawn any already-unlocked animals (after save is applied)
  if (playerState.chickenCoopUnlocked) spawnChickens()
  if (playerState.pigPenUnlocked)      spawnPigs()

  console.log('[AnimalSystem] Initialized')
}

// ---------------------------------------------------------------------------
// CHICKEN_MODEL / PIG_MODEL re-export (used by interactionSetup to create
// coop / pen entities when the scene doesn't have them pre-placed)
// ---------------------------------------------------------------------------
export { CHICKEN_MODEL, PIG_MODEL }
