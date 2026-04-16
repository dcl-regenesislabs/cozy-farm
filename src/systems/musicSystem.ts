import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { musicState, SONGS, SongId } from '../game/musicState'

/**
 * Creates the background music audio entity and starts playing A La Fresca.
 * Call once from main() — do not import as a side-effect module.
 */
export function setupMusicSystem() {
  const audioEntity = engine.addEntity()

  // Parent to PlayerEntity so the audio follows the player at zero distance,
  // bypassing DCL's spatial attenuation and playing at full volume everywhere.
  Transform.create(audioEntity, {
    parent:   engine.PlayerEntity,
    position: Vector3.create(0, 0, 0),
  })

  const defaultSong = SONGS.find((s) => s.id === musicState.currentSongId)!

  AudioSource.create(audioEntity, {
    audioClipUrl: defaultSong.src,
    playing:      true,
    loop:         true,
    volume:       musicState.volume,
  })

  musicState.audioEntity = audioEntity
}

/**
 * Switch to a different song immediately.
 * Uses createOrReplace so the engine always picks up the new clip URL —
 * a simple getMutable() toggle in the same tick is silently ignored by DCL.
 */
export function playSong(songId: SongId) {
  const { audioEntity } = musicState
  if (!audioEntity) return

  const song = SONGS.find((s) => s.id === songId)
  if (!song) return

  musicState.currentSongId = songId

  AudioSource.createOrReplace(audioEntity, {
    audioClipUrl: song.src,
    playing:      !musicState.muted,
    loop:         true,
    volume:       musicState.volume,
  })
}

/** Toggle mute on/off. */
export function toggleMute() {
  musicState.muted = !musicState.muted
  const { audioEntity } = musicState
  if (audioEntity) {
    AudioSource.getMutable(audioEntity).playing = !musicState.muted
  }
}

/** Set mute to a specific value. */
export function setMuted(muted: boolean) {
  if (musicState.muted === muted) return
  musicState.muted = muted
  const { audioEntity } = musicState
  if (audioEntity) {
    AudioSource.getMutable(audioEntity).playing = !muted
  }
}

/** Set background music volume (0.0 – 1.0). */
export function setMusicVolume(volume: number) {
  musicState.volume = volume
  const { audioEntity } = musicState
  if (audioEntity) {
    AudioSource.getMutable(audioEntity).volume = volume
  }
}
