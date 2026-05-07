import {
  engine,
  Entity,
  Transform,
  Material,
  MeshRenderer,
  Tween,
  EasingFunction,
  TweenSequence,
  Billboard,
  BillboardMode,
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { onLevelUp } from './levelingSystem'

// ─── Constants ────────────────────────────────────────────────────────────────

const YELLOW      = Color4.create(1, 0.95, 0, 1)     // vivid yellow core
const YELLOW_GLOW = Color4.create(1, 0.95, 0, 0.28)  // soft transparent halo

// Flat rotation for ground-lying ring planes (tilt plane to face +Y)
const FLAT_ROT = Quaternion.fromAngleAxis(-90, Vector3.create(1, 0, 0))

// ─── Tracking ─────────────────────────────────────────────────────────────────

type Entry = { entity: Entity; removeAt: number }
const active: Entry[] = []

function levelUpVfxCleanupSystem(_dt: number) {
  const now = Date.now()
  for (let i = active.length - 1; i >= 0; i--) {
    if (now >= active[i].removeAt) {
      engine.removeEntity(active[i].entity)
      active.splice(i, 1)
    }
  }
}

engine.addSystem(levelUpVfxCleanupSystem, 4, 'levelUpVfxCleanupSystem')

// ─── Layer 1: Light Pillar ────────────────────────────────────────────────────

function spawnPillar(px: number, py: number, pz: number) {
  // Core pillar
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(px, py + 0.5, pz),
    scale: Vector3.create(0.1, 0.1, 0.1),
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    albedoColor: YELLOW,
    emissiveColor: YELLOW,
    emissiveIntensity: 1.5,
    transparencyMode: 2,
    alphaTest: 0.05,
  })
  Tween.create(e, {
    mode: Tween.Mode.Scale({
      start: Vector3.create(0.1, 0.1, 0.1),
      end:   Vector3.create(0.5, 5.0, 0.5),
    }),
    duration: 300,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })
  TweenSequence.create(e, {
    sequence: [{
      mode: Tween.Mode.Scale({
        start: Vector3.create(0.5, 5.0, 0.5),
        end:   Vector3.Zero(),
      }),
      duration: 800,
      easingFunction: EasingFunction.EF_EASEINQUAD,
    }],
  })
  active.push({ entity: e, removeAt: Date.now() + 1200 })

  // Soft glow halo — wider, semi-transparent corona around the core pillar
  const halo = engine.addEntity()
  Transform.create(halo, {
    position: Vector3.create(px, py + 0.5, pz),
    scale: Vector3.create(0.1, 0.1, 0.1),
  })
  Billboard.create(halo, { billboardMode: BillboardMode.BM_Y })
  MeshRenderer.setPlane(halo)
  Material.setPbrMaterial(halo, {
    albedoColor: YELLOW_GLOW,
    emissiveColor: YELLOW,
    emissiveIntensity: 0.9,
    transparencyMode: 2,
    alphaTest: 0.01,
  })
  Tween.create(halo, {
    mode: Tween.Mode.Scale({
      start: Vector3.create(0.1, 0.1, 0.1),
      end:   Vector3.create(1.8, 5.5, 1.8),
    }),
    duration: 300,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })
  TweenSequence.create(halo, {
    sequence: [{
      mode: Tween.Mode.Scale({
        start: Vector3.create(1.8, 5.5, 1.8),
        end:   Vector3.Zero(),
      }),
      duration: 800,
      easingFunction: EasingFunction.EF_EASEINQUAD,
    }],
  })
  active.push({ entity: halo, removeAt: Date.now() + 1200 })
}

// ─── Layer 2: Ground Ring Burst ───────────────────────────────────────────────

function spawnRingBurst(px: number, py: number, pz: number) {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)

    const startPos = Vector3.create(px + dx * 0.2, py + 0.05, pz + dz * 0.2)
    const endPos   = Vector3.create(px + dx * 2.5, py + 0.05, pz + dz * 2.5)

    const e = engine.addEntity()

    Transform.create(e, {
      position: startPos,
      rotation: FLAT_ROT,
      scale: Vector3.create(0.6, 0.6, 0.6),
    })

    MeshRenderer.setPlane(e)

    Material.setPbrMaterial(e, {
      albedoColor: YELLOW,
      emissiveColor: YELLOW,
      emissiveIntensity: 1.2,
      transparencyMode: 2,
      alphaTest: 0.05,
    })

    // Expand outward
    Tween.create(e, {
      mode: Tween.Mode.Move({ start: startPos, end: endPos }),
      duration: 600,
      easingFunction: EasingFunction.EF_EASEOUTQUAD,
    })

    // Then shrink away
    TweenSequence.create(e, {
      sequence: [{
        mode: Tween.Mode.Scale({
          start: Vector3.create(0.6, 0.6, 0.6),
          end:   Vector3.Zero(),
        }),
        duration: 400,
        easingFunction: EasingFunction.EF_EASEINQUAD,
      }],
    })

    active.push({ entity: e, removeAt: Date.now() + 1100 })
  }

  // Ground glow disc — large flat circle expanding under the player's feet
  const disc = engine.addEntity()
  const discStart = Vector3.create(px, py + 0.02, pz)
  Transform.create(disc, {
    position: discStart,
    rotation: FLAT_ROT,
    scale: Vector3.create(0.3, 0.3, 0.3),
  })
  MeshRenderer.setPlane(disc)
  Material.setPbrMaterial(disc, {
    albedoColor: YELLOW_GLOW,
    emissiveColor: YELLOW,
    emissiveIntensity: 1.0,
    transparencyMode: 2,
    alphaTest: 0.01,
  })
  Tween.create(disc, {
    mode: Tween.Mode.Scale({
      start: Vector3.create(0.3, 0.3, 0.3),
      end:   Vector3.create(4.0, 4.0, 4.0),
    }),
    duration: 500,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })
  TweenSequence.create(disc, {
    sequence: [{
      mode: Tween.Mode.Scale({
        start: Vector3.create(4.0, 4.0, 4.0),
        end:   Vector3.Zero(),
      }),
      duration: 400,
      easingFunction: EasingFunction.EF_EASEINQUAD,
    }],
  })
  active.push({ entity: disc, removeAt: Date.now() + 1000 })
}

// ─── Layer 3: Rising Sparks ───────────────────────────────────────────────────

function spawnSparks(px: number, py: number, pz: number) {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)

    const startPos = Vector3.create(px + dx * 0.15, py + 1.0, pz + dz * 0.15)
    const endPos   = Vector3.create(px + dx * 1.5,  py + 2.5, pz + dz * 1.5)

    const e = engine.addEntity()

    Transform.create(e, {
      position: startPos,
      scale: Vector3.create(0.25, 0.25, 0.25),
    })

    Billboard.create(e, { billboardMode: BillboardMode.BM_ALL })
    MeshRenderer.setPlane(e)

    Material.setPbrMaterial(e, {
      albedoColor: YELLOW,
      emissiveColor: YELLOW,
      emissiveIntensity: 2.0,
      transparencyMode: 2,
      alphaTest: 0.05,
    })

    // Radiate outward and upward
    Tween.create(e, {
      mode: Tween.Mode.Move({ start: startPos, end: endPos }),
      duration: 700,
      easingFunction: EasingFunction.EF_EASEOUTQUAD,
    })

    // Then shrink away
    TweenSequence.create(e, {
      sequence: [{
        mode: Tween.Mode.Scale({
          start: Vector3.create(0.25, 0.25, 0.25),
          end:   Vector3.Zero(),
        }),
        duration: 350,
        easingFunction: EasingFunction.EF_EASEINQUAD,
      }],
    })

    active.push({ entity: e, removeAt: Date.now() + 1100 })
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function spawnLevelUpVfx(): void {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return

  const { x: px, y: py, z: pz } = playerTransform.position

  spawnPillar(px, py, pz)
  spawnRingBurst(px, py, pz)
  spawnSparks(px, py, pz)
}

// Self-register — importing this file is sufficient
onLevelUp(() => spawnLevelUpVfx())
