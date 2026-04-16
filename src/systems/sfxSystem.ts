import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
// Parenting audio entities to PlayerEntity makes them follow the player,
// so DCL's spatial attenuation is always at zero distance → full volume.

export type SfxId =
  | 'seeds'
  | 'wateringcan'
  | 'harvest'
  | 'menu'
  | 'pagination'
  | 'truck'
  | 'buttonclick'

const SFX_PATHS: Record<SfxId, string> = {
  seeds:       'assets/scene/Audio/Seeds.mp3',
  wateringcan: 'assets/scene/Audio/WateringCan.mp3',
  harvest:     'assets/scene/Audio/harvest.mp3',
  menu:        'assets/scene/Audio/menu.mp3',
  pagination:  'assets/scene/Audio/pagination.mp3',
  truck:       'assets/scene/Audio/truck.mp3',
  buttonclick: 'assets/scene/Audio/buttonclick.mp3',
}

const SFX_VOLUMES: Record<SfxId, number> = {
  seeds:       1.0,
  wateringcan: 0.5,   // 50% lower
  harvest:     1.0,   // 40% louder (already at max)
  menu:        1.0,   // 20% louder (already at max)
  pagination:  1.0,
  truck:       1.0,
  buttonclick: 0.3,   // 70% lower
}

type EntityRef = ReturnType<typeof engine.addEntity>
const sfxEntities: Partial<Record<SfxId, EntityRef>> = {}

/**
 * Create one audio entity per SFX. Call once from main() before any sounds
 * are needed. All entities are pre-loaded with playing:false so the audio
 * clip is cached, and then replayed via createOrReplace on each trigger.
 */
export function setupSfxSystem() {
  const ids = Object.keys(SFX_PATHS) as SfxId[]
  for (const id of ids) {
    const e = engine.addEntity()
    Transform.create(e, { parent: engine.PlayerEntity, position: Vector3.create(0, 0, 0) })
    AudioSource.create(e, {
      audioClipUrl: SFX_PATHS[id],
      playing:      false,
      loop:         false,
      volume:       SFX_VOLUMES[id],
    })
    sfxEntities[id] = e
  }
}

/**
 * Trigger a one-shot sound effect. Safe to call before setupSfxSystem —
 * it silently no-ops if the entity isn't ready.
 *
 * Uses createOrReplace so the engine always picks up a fresh play request,
 * even when the same sound is triggered back-to-back.
 */
export function playSound(id: SfxId) {
  const e = sfxEntities[id]
  if (!e) return
  AudioSource.createOrReplace(e, {
    audioClipUrl: SFX_PATHS[id],
    playing:      true,
    loop:         false,
    volume:       SFX_VOLUMES[id],
  })
}
