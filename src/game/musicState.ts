import { Entity } from '@dcl/sdk/ecs'

export type SongId = 'a_la_fresca' | 'de_buena_manana'

export type SongDef = {
  id: SongId
  label: string
  src: string
}

export const SONGS: SongDef[] = [
  {
    id:    'a_la_fresca',
    label: 'A La Fresca',
    src:   'assets/scene/Audio/A_La_Fresca.mp3',
  },
  {
    id:    'de_buena_manana',
    label: 'De Buena Mañana',
    src:   'assets/scene/Audio/De_Buena_Manana.mp3',
  },
]

export const musicState = {
  currentSongId: 'a_la_fresca' as SongId,
  muted:         false,
  volume:        0.42,  // 50% of original 0.85
  /** Set by musicSystem after it creates the audio entity */
  audioEntity:   null as Entity | null,
}
