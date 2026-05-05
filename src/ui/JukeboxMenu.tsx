import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { musicState, SONGS, SongDef } from '../game/musicState'
import { playSong, toggleMute, setMusicVolume } from '../systems/musicSystem'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { PanelShell, C, PANEL_W } from './PanelShell'

// ─── Palette additions for the jukebox ─────────────────────────────────────
const CARD_ACTIVE:   { r: number; g: number; b: number; a: number } = { r: 0.18, g: 0.14, b: 0.06, a: 1 }
const CARD_INACTIVE: { r: number; g: number; b: number; a: number } = { r: 0.10, g: 0.08, b: 0.04, a: 1 }
const ACCENT_PINK:   { r: number; g: number; b: number; a: number } = { r: 1,    g: 0.40, b: 0.70, a: 1 }
const MUTE_RED:      { r: number; g: number; b: number; a: number } = { r: 0.85, g: 0.15, b: 0.15, a: 1 }
const MUTE_GREEN:    { r: number; g: number; b: number; a: number } = { r: 0.20, g: 0.75, b: 0.30, a: 1 }
const VOL_ACTIVE_BG: { r: number; g: number; b: number; a: number } = { r: 0.60, g: 0.44, b: 0.02, a: 1 }
const VOL_INACTIVE_BG: { r: number; g: number; b: number; a: number } = { r: 0.12, g: 0.10, b: 0.05, a: 1 }

const VOLUME_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

// PanelShell has 45px padding on each side; use explicit pixel width per button
// so DCL's layout engine never has to resolve a percentage in a nested component.
const PANEL_PADDING = 45
const VOL_BTN_W     = (PANEL_W - PANEL_PADDING * 2) / VOLUME_STEPS.length  // = 120

// ─── Song card ─────────────────────────────────────────────────────────────
type SongCardProps = { key?: string; song: SongDef; isPlaying: boolean; isMuted: boolean }

const SongCard = ({ song, isPlaying, isMuted }: SongCardProps) => {
  const active = isPlaying

  const zoomKey = `jukebox_${song.id}`
  const scale   = getZoomScale(zoomKey)

  return (
    <UiEntity
      uiTransform={{
        flexDirection:  'row',
        alignItems:     'center',
        width:          '100%',
        height:         Math.round(120 * scale),
        margin:         { bottom: 14 },
        padding:        { top: 12, bottom: 12, left: 20, right: 20 },
        pointerFilter:  'block',
      }}
      uiBackground={{ color: active ? CARD_ACTIVE : CARD_INACTIVE }}
      onMouseDown={() => {
        if (!active) {
          playSound('buttonclick')
          triggerCardZoom(zoomKey)
          playSong(song.id)
        }
      }}
    >
      {/* Music-note icon column */}
      <UiEntity
        uiTransform={{
          width:           72,
          height:          72,
          alignItems:      'center',
          justifyContent:  'center',
          margin:          { right: 20 },
          flexShrink:      0,
        }}
        uiBackground={{ color: active ? C.divider : { r: 0.07, g: 0.05, b: 0.02, a: 1 } }}
      >
        <Label
          value="♪"
          fontSize={38}
          color={active ? ACCENT_PINK : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>

      {/* Song info column */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <Label
          value={song.label}
          fontSize={28}
          color={active ? C.header : C.textMain}
          textAlign="top-left"
        />
        {active && (
          <Label
            value={isMuted ? 'Muted' : 'Now Playing'}
            fontSize={20}
            color={isMuted ? C.textMute : MUTE_GREEN}
            textAlign="top-left"
            uiTransform={{ margin: { top: 4 } }}
          />
        )}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Volume picker ──────────────────────────────────────────────────────────
const VolumePicker = ({ volume }: { volume: number }) => {
  const activeStep = Math.round(volume * 100 / 10) * 10  // nearest 10%

  return (
    <UiEntity
      uiTransform={{
        flexDirection:  'column',
        alignSelf:      'stretch',
        margin:         { top: 10, bottom: 10 },
      }}
    >
      <Label
        value="Volume"
        fontSize={22}
        color={C.textMute}
        textAlign="top-left"
        uiTransform={{ margin: { bottom: 8 } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'row', width: PANEL_W - PANEL_PADDING * 2 }}>
        {VOLUME_STEPS.map((pct) => {
          const isActive = activeStep === pct
          return (
            <UiEntity
              key={`vol_${pct}`}
              uiTransform={{
                width:          Math.round(VOL_BTN_W * getZoomScale(`jukebox_vol_${pct}`)),
                height:         Math.round(70 * getZoomScale(`jukebox_vol_${pct}`)),
                alignItems:     'center',
                justifyContent: 'center',
                pointerFilter:  'block',
              }}
              uiBackground={{ color: isActive ? VOL_ACTIVE_BG : VOL_INACTIVE_BG }}
              onMouseDown={() => {
                if (!isActive) {
                  playSound('buttonclick')
                  triggerCardZoom(`jukebox_vol_${pct}`)
                  setMusicVolume(pct / 100)
                }
              }}
            >
              <Label
                value={`${pct}%`}
                fontSize={20}
                color={isActive ? C.gold : C.textMute}
                textAlign="middle-center"
              />
            </UiEntity>
          )
        })}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Mute button ───────────────────────────────────────────────────────────
const MuteButton = ({ muted }: { muted: boolean }) => (
  <UiEntity
    uiTransform={{
      width:          '100%',
      height:         Math.round(72 * getZoomScale('jukebox_mute')),
      alignItems:     'center',
      justifyContent: 'center',
      margin:         { top: 6 },
      pointerFilter:  'block',
    }}
    uiBackground={{ color: muted ? MUTE_RED : { r: 0.12, g: 0.12, b: 0.12, a: 1 } }}
    onMouseDown={() => {
      if (isZooming('jukebox_mute')) return
      playSound('buttonclick')
      triggerCardZoom('jukebox_mute')
      setTimeout(toggleMute, 290)
    }}
  >
    <Label
      value={muted ? 'Unmute Music' : 'Mute Music'}
      fontSize={24}
      color={muted ? { r: 1, g: 0.9, b: 0.9, a: 1 } : C.textMain}
      textAlign="middle-center"
    />
  </UiEntity>
)

// ─── Main menu ─────────────────────────────────────────────────────────────
export const JukeboxMenu = () => {
  const { currentSongId, muted, volume } = musicState

  return (
    <PanelShell
      title="♪  Jukebox"
      onClose={() => { playerState.activeMenu = 'none' }}
    >
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1 }}>

        {/* Song cards */}
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          {SONGS.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isPlaying={song.id === currentSongId}
              isMuted={muted}
            />
          ))}
        </UiEntity>

        {/* Volume picker */}
        <VolumePicker volume={volume} />

        {/* Spacer */}
        <UiEntity uiTransform={{ flex: 1 }} />

        {/* Mute toggle */}
        <MuteButton muted={muted} />
      </UiEntity>
    </PanelShell>
  )
}
