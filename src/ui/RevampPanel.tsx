import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playSound } from '../systems/sfxSystem'

// ─── Shared "revamp" panel frame ───────────────────────────────────────────────
// One wooden background (no baked-in title) + one atlas of pre-rendered title
// graphics ("names.png") composited at render time, instead of a separate full
// *_atlas.png per panel that only differed by its baked title text.

export const REVAMP_BG_IMG    = 'assets/images/revamp/background.png'
export const REVAMP_NAMES_IMG = 'assets/images/revamp/names.png'
export const REVAMP_CLOSE_IMG = 'assets/images/ui_loading/closebutton.png'
const NAMES_ATLAS_SIZE = 1024

export const REVAMP_PANEL_W        = 1032
export const REVAMP_PANEL_H        = 648
export const REVAMP_PANEL_TOP_MARGIN = 96
export const REVAMP_CONTENT_LEFT   = 62
export const REVAMP_CONTENT_RIGHT  = 62
export const REVAMP_CONTENT_TOP    = 96
export const REVAMP_CONTENT_BOTTOM = 65
export const REVAMP_CONTENT_W      = REVAMP_PANEL_W - REVAMP_CONTENT_LEFT - REVAMP_CONTENT_RIGHT
export const REVAMP_CONTENT_H      = REVAMP_PANEL_H - REVAMP_CONTENT_TOP - REVAMP_CONTENT_BOTTOM
export const REVAMP_CLOSE_SIZE     = 50
export const REVAMP_CLOSE_RIGHT    = 12
export const REVAMP_CLOSE_TOP      = 12
export const REVAMP_CLOSE_SIZE_MOBILE = 72
export const REVAMP_CLOSE_RIGHT_MOBILE = 8
export const REVAMP_CLOSE_TOP_MOBILE = 6
export const REVAMP_CLOSE_HIT_PAD_MOBILE = 6

type Rect = { x: number; y: number; w: number; h: number }

// Brown pill behind the title text — same tile for every panel, only the name crop changes.
const TILE_RECT: Rect = { x: 45, y: 822, w: 448, h: 115 }

export type RevampPanelName =
  | 'shop'
  | 'inventory'
  | 'pigPen'
  | 'plantSeeds'
  | 'profile'
  | 'quest'
  | 'jukebox'
  | 'chickenCoop'
  | 'compostBin'
  | 'farm'
  | 'sellCrops'

// Rects measured directly off assets/images/revamp/names.png (1024x1024).
const NAME_RECTS: Record<RevampPanelName, Rect> = {
  shop:        { x: 506, y: 134, w: 503, h: 85  }, // reads "El Amazonas"
  inventory:   { x: 71,  y: 69,  w: 396, h: 100 },
  pigPen:      { x: 74,  y: 164, w: 367, h: 97  },
  plantSeeds:  { x: 81,  y: 261, w: 447, h: 83  },
  profile:     { x: 81,  y: 357, w: 265, h: 82  },
  quest:       { x: 80,  y: 466, w: 238, h: 97  },
  jukebox:     { x: 54,  y: 588, w: 317, h: 78  },
  chickenCoop: { x: 464, y: 383, w: 505, h: 98  },
  compostBin:  { x: 458, y: 490, w: 479, h: 97  },
  farm:        { x: 465, y: 596, w: 198, h: 81  },
  sellCrops:   { x: 463, y: 703, w: 382, h: 97  },
}

// Plaque box (tile + centered name) that straddles the top edge of the background frame.
const PLAQUE_W        = 320
const PLAQUE_H        = 82
const PLAQUE_NAME_H   = 42
const PLAQUE_TOP      = -8

function atlasUvs(rect: Rect, atlasSize: number): number[] {
  const l = rect.x / atlasSize
  const r = (rect.x + rect.w) / atlasSize
  const t = 1 - rect.y / atlasSize
  const b = 1 - (rect.y + rect.h) / atlasSize
  return [l, b, l, t, r, t, r, b]
}

// Reusable title plaque — tile + name, centered over `panelWidth`, straddling the top
// border. Exported on its own so custom panel frames (e.g. StatsPanel's mobile-scaled
// variant) can drop it into a differently-sized frame instead of the fixed RevampPanelFrame.
export const RevampTitlePlaque = ({ name, panelWidth, scale = 1 }: { name: RevampPanelName; panelWidth: number; scale?: number }) => {
  const nameRect  = NAME_RECTS[name]
  const plaqueW   = Math.round(PLAQUE_W * scale)
  const plaqueH   = Math.round(PLAQUE_H * scale)
  const plaqueTop = Math.round(PLAQUE_TOP * scale)
  const nameH     = Math.round(PLAQUE_NAME_H * scale)
  const nameW     = Math.round(nameH * (nameRect.w / nameRect.h))

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { left: Math.round((panelWidth - plaqueW) / 2), top: plaqueTop },
        width: plaqueW,
        height: plaqueH,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{
        texture: { src: REVAMP_NAMES_IMG, wrapMode: 'clamp', filterMode: 'tri-linear' },
        textureMode: 'stretch',
        uvs: atlasUvs(TILE_RECT, NAMES_ATLAS_SIZE),
      }}
    >
      <UiEntity
        uiTransform={{ width: nameW, height: nameH }}
        uiBackground={{
          texture: { src: REVAMP_NAMES_IMG, wrapMode: 'clamp', filterMode: 'tri-linear' },
          textureMode: 'stretch',
          uvs: atlasUvs(nameRect, NAMES_ATLAS_SIZE),
        }}
      />
    </UiEntity>
  )
}

export const RevampCloseButton = ({
  onClose,
  right,
  top,
  size,
  hitPad,
}: {
  onClose: () => void
  right?: number
  top?: number
  size?: number
  hitPad?: number
}) => {
  const mobile = isMobile()
  const closeSize = size ?? (mobile ? REVAMP_CLOSE_SIZE_MOBILE : REVAMP_CLOSE_SIZE)
  const closeRight = right ?? (mobile ? REVAMP_CLOSE_RIGHT_MOBILE : REVAMP_CLOSE_RIGHT)
  const closeTop = top ?? (mobile ? REVAMP_CLOSE_TOP_MOBILE : REVAMP_CLOSE_TOP)
  const closeHitPad = hitPad ?? (mobile ? REVAMP_CLOSE_HIT_PAD_MOBILE : 0)

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { right: closeRight, top: closeTop },
        width: closeSize,
        height: closeSize,
      }}
    >
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: closeSize, height: closeSize }}
        uiBackground={{ texture: { src: REVAMP_CLOSE_IMG, wrapMode: 'clamp', filterMode: 'tri-linear' }, textureMode: 'stretch' }}
      />
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: -closeHitPad, left: -closeHitPad },
          width: closeSize + closeHitPad * 2,
          height: closeSize + closeHitPad * 2,
        }}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  )
}

type Props = {
  name: RevampPanelName
  onClose: () => void
  contentTop?: number
  children?: ReactEcs.JSX.ReactNode
}

export const RevampPanelFrame = ({ name, onClose, contentTop = REVAMP_CONTENT_TOP, children }: Props) => {
  const contentH = REVAMP_PANEL_H - contentTop - REVAMP_CONTENT_BOTTOM

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none',
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          pointerFilter: 'block',
        }}
      />

      <UiEntity
        uiTransform={{
          width: REVAMP_PANEL_W,
          height: REVAMP_PANEL_H,
          margin: { top: REVAMP_PANEL_TOP_MARGIN },
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: REVAMP_BG_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <RevampTitlePlaque name={name} panelWidth={REVAMP_PANEL_W} />

        {/* Content area */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: REVAMP_CONTENT_LEFT, top: contentTop },
            width: REVAMP_CONTENT_W,
            height: contentH,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        {/* Close button — same image on both desktop and mobile */}
        <RevampCloseButton onClose={onClose} />
      </UiEntity>
    </UiEntity>
  )
}
