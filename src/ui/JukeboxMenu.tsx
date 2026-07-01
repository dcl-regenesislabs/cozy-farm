import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { musicState, SONGS, SongDef } from '../game/musicState'
import { playSong, toggleMute, setMusicVolume } from '../systems/musicSystem'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { C } from './PanelShell'

// ─── Atlas frame — same scale/close-button convention as CompostBinMenu ─────
const JUKEBOX_ATLAS   = 'assets/images/ui_loading/jukebox_atlas.png'
const CLOSE_BTN_IMG   = 'assets/images/ui_loading/closebutton.png'
const ATLAS_SIZE      = 1024
const BG_RECT         = { x: 62, y: 12, w: 900, h: 677 } as const
const UI_SCALE        = 0.8
const ss               = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1180)
const PANEL_H          = Math.round(PANEL_W * BG_RECT.h / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(190)
const CONTENT_LEFT     = ss(80)
const CONTENT_RIGHT    = ss(60)
const CONTENT_TOP      = ss(104)
const CONTENT_BOTTOM   = ss(24)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)

// ─── Palette — shop-style card border + jukebox accents ─────────────────────
const CARD_BORDER   = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_ACTIVE:     { r: number; g: number; b: number; a: number } = { r: 0.32, g: 0.21, b: 0.08, a: 1 }
const CARD_INACTIVE:   { r: number; g: number; b: number; a: number } = { r: 0.16, g: 0.11, b: 0.05, a: 1 }
const ACCENT_PINK:     { r: number; g: number; b: number; a: number } = { r: 1,    g: 0.40, b: 0.70, a: 1 }
const MUTE_RED:        { r: number; g: number; b: number; a: number } = { r: 0.75, g: 0.15, b: 0.15, a: 1 }
const MUTE_GREEN:      { r: number; g: number; b: number; a: number } = { r: 0.20, g: 0.75, b: 0.30, a: 1 }
const VOL_ACTIVE_BG:   { r: number; g: number; b: number; a: number } = { r: 0.60, g: 0.44, b: 0.02, a: 1 }
const VOL_INACTIVE_BG: { r: number; g: number; b: number; a: number } = { r: 0.16, g: 0.13, b: 0.07, a: 1 }
const BTN_GRAY:         { r: number; g: number; b: number; a: number } = { r: 0.20, g: 0.18, b: 0.16, a: 1 }

const VOLUME_STEPS      = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const VOLUME_ROWS_MOBILE = [[10, 20, 30, 40, 50], [60, 70, 80, 90, 100]]
const SONG_CARD_W  = ss(950)
const VOL_GAP      = ss(8)
const VOL_BTN_W        = Math.round((SONG_CARD_W - VOL_GAP * (VOLUME_STEPS.length - 1)) / VOLUME_STEPS.length)
const VOL_BTN_W_MOBILE  = Math.round((SONG_CARD_W - VOL_GAP * 4) / 5)

function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── Panel frame — atlas background with the title & close X baked in ───────
const JukeboxPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => {
  const mob = isMobile()
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', pointerFilter: 'none' }}
    >
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', pointerFilter: 'block' }} />
      <UiEntity
        uiTransform={{ width: PANEL_W, height: PANEL_H, margin: { top: PANEL_TOP_MARGIN }, pointerFilter: 'block' }}
        uiBackground={{ texture: { src: JUKEBOX_ATLAS, wrapMode: 'clamp' }, textureMode: 'stretch', uvs: bgUvs(BG_RECT) }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: mob ? ss(70) : CONTENT_LEFT, top: CONTENT_TOP },
            width: mob ? CONTENT_W + ss(10) : CONTENT_W,
            height: CONTENT_H,
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: isMobile() ? { right: ss(20), top: ss(8) } : { right: CLOSE_RIGHT, top: CLOSE_TOP },
            width: isMobile() ? ss(90) : CLOSE_SIZE,
            height: isMobile() ? ss(90) : CLOSE_SIZE,
          }}
          uiBackground={mob ? { texture: { src: CLOSE_BTN_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' } : undefined}
          onMouseDown={() => { playSound('buttonclick'); onClose() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── Song card ─────────────────────────────────────────────────────────────
type SongCardProps = { key?: string; song: SongDef; isPlaying: boolean; isMuted: boolean }

const SongCard = ({ song, isPlaying, isMuted }: SongCardProps) => {
  const active  = isPlaying
  const zoomKey = `jukebox_${song.id}`
  const scale   = getZoomScale(zoomKey)
  const mob     = isMobile()
  const cardW   = mob ? ss(1000) : SONG_CARD_W

  return (
    <UiEntity
      uiTransform={{
        flexDirection:  'row',
        alignItems:     'center',
        width:          cardW,
        height:         Math.round(ss(mob ? 130 : 100) * scale),
        margin:         { bottom: ss(14) },
        padding:        { top: ss(10), bottom: ss(10), left: ss(16), right: ss(16) },
        borderWidth:    3,
        borderColor:    CARD_BORDER,
        borderRadius:   12,
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
          width:           ss(mob ? 76 : 60),
          height:          ss(mob ? 76 : 60),
          alignItems:      'center',
          justifyContent:  'center',
          margin:          { right: ss(16) },
          flexShrink:      0,
          borderRadius:    10,
        }}
        uiBackground={{ color: active ? C.divider : { r: 0.07, g: 0.05, b: 0.02, a: 1 } }}
      >
        <Label
          value="♪"
          fontSize={ss(mob ? 40 : 32)}
          color={active ? ACCENT_PINK : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>

      {/* Song info column */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <Label
          value={song.label}
          fontSize={ss(mob ? 32 : 24)}
          color={active ? C.header : C.textMain}
          textAlign="top-left"
        />
        {active && (
          <Label
            value={isMuted ? 'Muted' : 'Now Playing'}
            fontSize={ss(mob ? 24 : 18)}
            color={isMuted ? C.textMute : MUTE_GREEN}
            textAlign="top-left"
            uiTransform={{ margin: { top: ss(4) } }}
          />
        )}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Volume picker — row of percentage buttons (two rows of 5, bigger, on mobile) ─
const VolumeButton = ({ pct, isActive, mob }: { key?: string; pct: number; isActive: boolean; mob: boolean }) => (
  <UiEntity
    key={`vol_${pct}`}
    uiTransform={{
      width:          Math.round((mob ? VOL_BTN_W_MOBILE : VOL_BTN_W) * getZoomScale(`jukebox_vol_${pct}`)),
      height:         Math.round(ss(mob ? 120 : 60) * getZoomScale(`jukebox_vol_${pct}`)),
      alignItems:     'center',
      justifyContent: 'center',
      margin:         { right: VOL_GAP },
      borderRadius:   8,
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
      fontSize={ss(mob ? 30 : 15)}
      color={isActive ? C.gold : C.textMute}
      textAlign="middle-center"
    />
  </UiEntity>
)

const VolumePicker = ({ volume }: { volume: number }) => {
  const activeStep = Math.round(volume * 100 / 10) * 10  // nearest 10%
  const mob        = isMobile()

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems:    'center',
        margin:        { top: ss(8), bottom: ss(8) },
      }}
    >
      <Label
        value="Volume"
        fontSize={ss(mob ? 26 : 20)}
        color={C.textMute}
        uiTransform={{ margin: { bottom: ss(8) } }}
      />
      {mob ? (
        <UiEntity uiTransform={{ flexDirection: 'column' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: VOL_GAP } }}>
            {VOLUME_ROWS_MOBILE[0].map((pct) => (
              <VolumeButton key={`vol_${pct}`} pct={pct} isActive={activeStep === pct} mob={mob} />
            ))}
          </UiEntity>
          <UiEntity uiTransform={{ flexDirection: 'row' }}>
            {VOLUME_ROWS_MOBILE[1].map((pct) => (
              <VolumeButton key={`vol_${pct}`} pct={pct} isActive={activeStep === pct} mob={mob} />
            ))}
          </UiEntity>
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'row', width: SONG_CARD_W }}>
          {VOLUME_STEPS.map((pct) => (
            <VolumeButton key={`vol_${pct}`} pct={pct} isActive={activeStep === pct} mob={mob} />
          ))}
        </UiEntity>
      )}
    </UiEntity>
  )
}

// ─── Mute button ───────────────────────────────────────────────────────────
const MuteButton = ({ muted }: { muted: boolean }) => (
  <UiEntity
    uiTransform={{
      width:          Math.round(ss(340) * getZoomScale('jukebox_mute')),
      height:         Math.round(ss(72) * getZoomScale('jukebox_mute')),
      alignItems:     'center',
      justifyContent: 'center',
      margin:         { top: ss(6) },
      borderRadius:   10,
      pointerFilter:  'block',
    }}
    uiBackground={{ color: muted ? MUTE_RED : BTN_GRAY }}
    onMouseDown={() => {
      if (isZooming('jukebox_mute')) return
      playSound('buttonclick')
      triggerCardZoom('jukebox_mute')
      setTimeout(toggleMute, 290)
    }}
  >
    <Label
      value={muted ? 'Unmute Music' : 'Mute Music'}
      fontSize={ss(22)}
      color={muted ? { r: 1, g: 0.9, b: 0.9, a: 1 } : C.textMain}
      textAlign="middle-center"
      uiTransform={{ width: '100%', height: '100%' }}
    />
  </UiEntity>
)

// ─── Main menu ─────────────────────────────────────────────────────────────
export const JukeboxMenu = () => {
  const { currentSongId, muted, volume } = musicState

  return (
    <JukeboxPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Song cards */}
      <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: '100%' }}>
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

    </JukeboxPanelFrame>
  )
}
