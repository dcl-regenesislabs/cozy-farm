import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { plantSeed } from '../game/actions'
import { CropType, CROP_NAMES, ALL_CROP_TYPES } from '../data/cropData'
import { CROP_SEED_IMAGES } from '../data/imagePaths'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import {
  RevampPanelFrame,
  REVAMP_CONTENT_LEFT as CONTENT_LEFT,
  REVAMP_CONTENT_RIGHT as CONTENT_RIGHT,
  REVAMP_CONTENT_TOP as CONTENT_TOP,
  REVAMP_CONTENT_BOTTOM as CONTENT_BOTTOM,
  REVAMP_CONTENT_W as CONTENT_W,
  REVAMP_CONTENT_H as CONTENT_H,
} from './RevampPanel'

const UI_SCALE = 0.8
const ss       = (v: number) => Math.round(v * UI_SCALE)

// ─── Card dimensions ─────────────────────────────────────────────────────────
const CARD_W      = ss(180)
const CARD_H      = ss(215)
const CARD_MARGIN = ss(12)
const CARD_ICON   = ss(96)
const CARD_PAD_V  = ss(12)
const CARD_PAD_H  = ss(10)
const FRAME_THICKNESS = 4

// ─── Palette ──────────────────────────────────────────────────────────────────
const CARD_FILL      = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT      = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const SEED_BORDER    = { r: 0.32, g: 0.78, b: 0.32, a: 0.95 }
const SEED_COUNT     = { r: 0.30, g: 0.80, b: 0.30, a: 1 }
const HOVER_BORDER   = { r: 0.55, g: 0.90, b: 0.45, a: 1 }

// ─── SeedCard ────────────────────────────────────────────────────────────────
const SeedCard = ({ cropType, count }: { key?: string | number; cropType: CropType; count: number }) => {
  const mobile  = isMobile()
  const zoomKey = `plant_${cropType}`
  const scale   = getZoomScale(zoomKey)
  const W       = Math.round(CARD_W * scale)
  const H       = Math.round(CARD_H * scale)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: W,
        height: H,
        margin: { right: CARD_MARGIN, bottom: CARD_MARGIN },
        padding: { top: CARD_PAD_V, bottom: CARD_PAD_V, left: CARD_PAD_H, right: CARD_PAD_H },
        borderWidth: 3,
        borderColor: SEED_BORDER,
        borderRadius: 12,
      }}
      uiBackground={{ color: CARD_FILL }}
      onMouseDown={() => {
        const entity = playerState.activePlotEntity
        if (!entity || isZooming(zoomKey)) return
        playSound('buttonclick')
        triggerCardZoom(zoomKey)
        setTimeout(() => plantSeed(entity, cropType), 290)
      }}
    >
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(10) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={CROP_NAMES[cropType]} fontSize={mobile ? ss(26) : ss(20)} color={CARD_TEXT} textAlign="middle-center" />
      <Label value={`x${count}`} fontSize={mobile ? ss(26) : ss(21)} color={SEED_COUNT} textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }} />
    </UiEntity>
  )
}

// ─── Panel frame ─────────────────────────────────────────────────────────────
const PlantPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => (
  <RevampPanelFrame name="plantSeeds" onClose={onClose}>
    {children}
  </RevampPanelFrame>
)

// ─── Main ─────────────────────────────────────────────────────────────────────
export const PlantMenu = () => {
  const mob       = isMobile()
  const available = ALL_CROP_TYPES.filter(
    (ct) => (playerState.seeds.get(ct) ?? 0) > 0 && playerState.unlockedCrops.has(ct),
  )

  const onClose = () => {
    playerState.activeMenu       = 'none'
    playerState.activePlotEntity = null
  }

  return (
    <PlantPanelFrame onClose={onClose}>
      {available.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Label value="No seeds in inventory!" fontSize={mob ? ss(31) : ss(27)} color={mob ? { r: 1, g: 1, b: 1, a: 1 } : CARD_TEXT_MUTE} textAlign="middle-center" />
          <Label value="Visit the Seed Shop to buy some." fontSize={mob ? ss(26) : ss(20)} color={mob ? { r: 1, g: 1, b: 1, a: 1 } : CARD_TEXT_MUTE} textAlign="middle-center"
            uiTransform={{ margin: { top: ss(12) } }} />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <Label value="Choose a seed to plant:" fontSize={mob ? ss(28) : ss(21)} color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
            uiTransform={{ margin: { bottom: ss(14) } }} />
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignContent: 'flex-start', justifyContent: 'center' }}>
            {available.map((ct) => (
              <SeedCard key={ct} cropType={ct} count={playerState.seeds.get(ct)!} />
            ))}
          </UiEntity>
        </UiEntity>
      )}
    </PlantPanelFrame>
  )
}
