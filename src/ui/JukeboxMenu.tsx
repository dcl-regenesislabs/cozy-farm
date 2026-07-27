import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { musicState, SONGS, SongDef } from '../game/musicState'
import { playSong, toggleMute, setMusicVolume } from '../systems/musicSystem'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { C } from './PanelShell'
import { RevampPanelFrame } from './RevampPanel'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const CARD_BORDER = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_ACTIVE = { r: 0.32, g: 0.21, b: 0.08, a: 1 }
const CARD_INACTIVE = { r: 0.16, g: 0.11, b: 0.05, a: 1 }
const ACCENT_PINK = { r: 1, g: 0.4, b: 0.7, a: 1 }
const MUTE_RED = { r: 0.75, g: 0.15, b: 0.15, a: 1 }
const MUTE_GREEN = { r: 0.2, g: 0.75, b: 0.3, a: 1 }
const VOL_ACTIVE_BG = { r: 0.6, g: 0.44, b: 0.02, a: 1 }
const VOL_INACTIVE_BG = { r: 0.16, g: 0.13, b: 0.07, a: 1 }
const BTN_GRAY = { r: 0.2, g: 0.18, b: 0.16, a: 1 }

const VOLUME_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const VOLUME_ROWS_MOBILE = [[10, 20, 30, 40, 50], [60, 70, 80, 90, 100]]
const SONG_CARD_W = ss(950)
const VOL_GAP = ss(8)
const VOL_BTN_W = Math.round((SONG_CARD_W - VOL_GAP * (VOLUME_STEPS.length - 1)) / VOLUME_STEPS.length)
const VOL_BTN_W_MOBILE = Math.round((SONG_CARD_W - VOL_GAP * 4) / 5)

const JukeboxPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => {
  const mob = isMobile()

  return (
    <RevampPanelFrame name="jukebox" onClose={onClose}>
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          padding: { top: ss(6), left: mob ? ss(8) : 0, right: mob ? ss(8) : 0 },
        }}
      >
        {children}
      </UiEntity>
    </RevampPanelFrame>
  )
}

type SongCardProps = { key?: string; song: SongDef; isPlaying: boolean; isMuted: boolean }

const SongCard = ({ song, isPlaying, isMuted }: SongCardProps) => {
  const active = isPlaying
  const zoomKey = `jukebox_${song.id}`
  const scale = getZoomScale(zoomKey)
  const mob = isMobile()
  const cardW = mob ? ss(1000) : SONG_CARD_W

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        width: cardW,
        height: Math.round(ss(mob ? 130 : 100) * scale),
        margin: { bottom: ss(14) },
        padding: { top: ss(10), bottom: ss(10), left: ss(16), right: ss(16) },
        borderWidth: 3,
        borderColor: CARD_BORDER,
        borderRadius: 12,
        pointerFilter: 'block',
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
      <UiEntity
        uiTransform={{
          width: ss(mob ? 76 : 60),
          height: ss(mob ? 76 : 60),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { right: ss(16) },
          flexShrink: 0,
          borderRadius: 10,
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

const VolumeButton = ({ pct, isActive, mob }: { key?: string; pct: number; isActive: boolean; mob: boolean }) => (
  <UiEntity
    key={`vol_${pct}`}
    uiTransform={{
      width: Math.round((mob ? VOL_BTN_W_MOBILE : VOL_BTN_W) * getZoomScale(`jukebox_vol_${pct}`)),
      height: Math.round(ss(mob ? 120 : 60) * getZoomScale(`jukebox_vol_${pct}`)),
      alignItems: 'center',
      justifyContent: 'center',
      margin: { right: VOL_GAP },
      borderRadius: 8,
      pointerFilter: 'block',
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
  const activeStep = Math.round(volume * 100 / 10) * 10
  const mob = isMobile()

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        margin: { top: ss(8), bottom: ss(8) },
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

const MuteButton = ({ muted }: { muted: boolean }) => (
  <UiEntity
    uiTransform={{
      width: Math.round(ss(340) * getZoomScale('jukebox_mute')),
      height: Math.round(ss(72) * getZoomScale('jukebox_mute')),
      alignItems: 'center',
      justifyContent: 'center',
      margin: { top: ss(6) },
      borderRadius: 10,
      pointerFilter: 'block',
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

export const JukeboxMenu = () => {
  const { currentSongId, muted, volume } = musicState

  return (
    <JukeboxPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
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

      <VolumePicker volume={volume} />

      <UiEntity uiTransform={{ flex: 1 }} />

      <MuteButton muted={muted} />
    </JukeboxPanelFrame>
  )
}
