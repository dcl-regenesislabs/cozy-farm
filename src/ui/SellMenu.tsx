import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { sellCrop } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_HARVEST_IMAGES, COINS_IMAGE, EGG_ICON, PIG_ICON } from '../data/imagePaths'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { sellEggs, sellPigMeat } from '../systems/animalSystem'
import { EGG_SELL_PRICE, PIG_MEAT_SELL_PRICE } from '../data/animalData'

// ─── Debug ───────────────────────────────────────────────────────────────────
const SELL_DEBUG = false

// ─── Atlas frame ─────────────────────────────────────────────────────────────
const SELL_ATLAS    = 'assets/images/ui_loading/sellcrops_atlas.png'
const CLOSE_BTN_IMG = 'assets/images/ui_loading/closebutton.png'
const ATLAS_SIZE    = 1024
const BG_RECT       = { x: 80, y: 6, w: 859, h: 686 } as const
const UI_SCALE      = 0.8
const ss            = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1100)
const PANEL_H          = Math.round(PANEL_W * BG_RECT.h / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(80)
const CONTENT_LEFT     = ss(60)
const CONTENT_RIGHT    = ss(60)
const CONTENT_TOP      = ss(78)
const CONTENT_BOTTOM   = ss(52)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CLOSE_SIZE       = ss(74)
const CLOSE_SIZE_M     = ss(90)
const CLOSE_RIGHT      = ss(20)
const CLOSE_TOP        = ss(8)

// ─── Card layout — shop style, 3 per row, centered ───────────────────────────
const CARD_GAP   = ss(14)
const CARD_W     = ss(210)
const CARD_H     = ss(238)
const CARD_PAD_V = ss(14)
const CARD_PAD_H = ss(9)
const ICON_SIZE  = ss(70)
const BTN_H      = ss(44)
// scroll shows 2 full rows + gap
const SCROLL_H   = CARD_H * 2 + CARD_GAP + ss(16)

// ─── Shop-style palette ───────────────────────────────────────────────────────
const CARD_FILL   = { r: 0.23, g: 0.13, b: 0.05, a: 0.34 }
const CARD_BORDER = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_TEXT   = { r: 0.97, g: 0.90, b: 0.68, a: 1 }
const CARD_MUTE   = { r: 0.72, g: 0.55, b: 0.28, a: 1 }
const COIN_GOLD   = { r: 0.92, g: 0.72, b: 0.10, a: 1 }
const SELL_GREEN  = { r: 0.10, g: 0.46, b: 0.14, a: 1 }
const SCROLL_BG   = { r: 0.22, g: 0.13, b: 0.04, a: 0.50 }
const GREEN_EARN  = { r: 0.30, g: 0.90, b: 0.35, a: 1 }
const HEADER_BG   = { r: 0.16, g: 0.09, b: 0.03, a: 0.60 }

// ─── UV helper ───────────────────────────────────────────────────────────────
function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── Panel frame ─────────────────────────────────────────────────────────────
const SellPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => {
  const mob = isMobile()
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', pointerFilter: 'none' }}
    >
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', pointerFilter: 'block' }} />
      <UiEntity
        uiTransform={{ width: PANEL_W, height: PANEL_H, margin: { top: PANEL_TOP_MARGIN }, pointerFilter: 'block' }}
        uiBackground={{ texture: { src: SELL_ATLAS, wrapMode: 'clamp' }, textureMode: 'stretch', uvs: bgUvs(BG_RECT) }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: CONTENT_LEFT, top: CONTENT_TOP },
            width: CONTENT_W,
            height: PANEL_H - CONTENT_TOP - CONTENT_BOTTOM,
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
            position: { right: CLOSE_RIGHT, top: CLOSE_TOP },
            width: mob ? CLOSE_SIZE_M : CLOSE_SIZE,
            height: mob ? CLOSE_SIZE_M : CLOSE_SIZE,
          }}
          uiBackground={{ texture: { src: CLOSE_BTN_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          onMouseDown={() => { playSound('buttonclick'); onClose() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── Sell card — shop-style border, no manual frame lines ────────────────────
type SellCardData = { key?: string; icon: string; name: string; count: number; unitPrice: number; zoomKey: string; onSell: () => void }

const SellCard = ({ icon, name, count, unitPrice, zoomKey, onSell }: SellCardData) => {
  const mob        = isMobile()
  const scale      = getZoomScale(zoomKey)
  const W          = Math.round(CARD_W * scale)
  const H          = Math.round(CARD_H * scale)
  const totalValue = unitPrice * count
  const btnW       = W - CARD_PAD_H * 2

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: W,
        height: H,
        margin: { right: CARD_GAP, bottom: CARD_GAP },
        padding: { top: CARD_PAD_V, bottom: CARD_PAD_V, left: CARD_PAD_H, right: CARD_PAD_H },
        borderWidth: 2,
        borderColor: CARD_BORDER,
        borderRadius: 10,
      }}
      uiBackground={mob ? { color: CARD_FILL } : { color: CARD_FILL }}
    >
      {/* Icon */}
      <UiEntity
        uiTransform={{ width: ICON_SIZE, height: ICON_SIZE, margin: { bottom: ss(6) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: icon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      {/* Name */}
      <Label value={name} fontSize={ss(23)} color={CARD_TEXT} textAlign="middle-center"
        uiTransform={{ width: W - CARD_PAD_H * 2, margin: { bottom: ss(4) } }} />
      {/* Count */}
      <Label value={`x${count}`} fontSize={ss(20)} color={CARD_MUTE} textAlign="middle-center"
        uiTransform={{ margin: { bottom: ss(10) } }} />
      {/* Sell button — single row, no wrap */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: btnW,
          height: BTN_H,
          borderRadius: 6,
          flexShrink: 0,
        }}
        uiBackground={{ color: SELL_GREEN }}
        onMouseDown={() => {
          if (isZooming(zoomKey)) return
          playSound('buttonclick')
          triggerCardZoom(zoomKey)
          setTimeout(onSell, 290)
        }}
      >
        <Label value={`${totalValue}`} fontSize={ss(24)} color={COIN_GOLD}
          uiTransform={{ flexShrink: 0, margin: { right: ss(5) } }} />
        <UiEntity
          uiTransform={{ width: ss(24), height: ss(24), flexShrink: 0 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const SellMenu = () => {
  if (SELL_DEBUG) {
    for (const ct of ALL_CROP_TYPES) {
      if (!playerState.harvested.has(ct)) playerState.harvested.set(ct, 25)
    }
  }

  const harvestedCrops = ALL_CROP_TYPES.filter((ct) => (playerState.harvested.get(ct) ?? 0) > 0)
  const hasEggs     = playerState.chickenCoopOwned && playerState.eggsCount > 0
  const hasMeat     = playerState.pigMeatCount > 0
  const hasAnything = harvestedCrops.length > 0 || hasEggs || hasMeat

  const totalCropValue = harvestedCrops.reduce((sum, ct) => {
    return sum + (CROP_DATA.get(ct)?.sellPrice ?? 0) * (playerState.harvested.get(ct) ?? 0)
  }, 0)
  const totalValue =
    totalCropValue +
    (hasEggs ? EGG_SELL_PRICE * playerState.eggsCount : 0) +
    (hasMeat ? PIG_MEAT_SELL_PRICE * playerState.pigMeatCount : 0)

  return (
    <SellPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Header — coins + total, floating (no background) */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: CONTENT_W,
          height: ss(54),
          margin: { top: ss(20), bottom: ss(18) },
          flexShrink: 0,
        }}
      >
        <UiEntity uiTransform={{ width: ss(38), height: ss(38), margin: { right: ss(7) }, flexShrink: 0 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }} />
        <Label value={`${playerState.coins}`} fontSize={ss(32)} color={COIN_GOLD}
          uiTransform={{ flexShrink: 0 }} />
        {hasAnything && (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <Label value="  ·  " fontSize={ss(22)} color={CARD_MUTE} uiTransform={{ flexShrink: 0 }} />
            <Label value={`+${totalValue}`} fontSize={ss(32)} color={GREEN_EARN} uiTransform={{ flexShrink: 0 }} />
            <UiEntity uiTransform={{ width: ss(34), height: ss(34), margin: { left: ss(7) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }} />
          </UiEntity>
        )}
      </UiEntity>

      {/* Cards scroll area — brown background, 2 rows visible */}
      {!hasAnything ? (
        <UiEntity uiTransform={{ width: CONTENT_W, height: SCROLL_H, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', borderRadius: 8 }}
          uiBackground={{ color: SCROLL_BG }}>
          <Label value="Nothing to sell." fontSize={ss(26)} color={CARD_MUTE} textAlign="middle-center" />
          <Label value="Harvest crops or collect eggs first!" fontSize={ss(18)} color={CARD_MUTE} textAlign="middle-center"
            uiTransform={{ margin: { top: ss(10) } }} />
        </UiEntity>
      ) : (
        <UiEntity
          uiTransform={{ width: CONTENT_W, height: SCROLL_H, overflow: 'scroll', borderRadius: 8, flexShrink: 0 }}
          uiBackground={{ color: SCROLL_BG }}
        >
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              width: CONTENT_W,
              padding: { top: ss(16), bottom: ss(8), left: ss(8), right: ss(8) },
            }}
          >
            {harvestedCrops.map((ct) => {
              const def = CROP_DATA.get(ct)!
              return (
                <SellCard
                  key={`${ct}`}
                  icon={CROP_HARVEST_IMAGES[ct]}
                  name={def.name}
                  count={playerState.harvested.get(ct)!}
                  unitPrice={def.sellPrice}
                  zoomKey={`sell_${ct}`}
                  onSell={() => sellCrop(ct, playerState.harvested.get(ct)!)}
                />
              )
            })}
            {hasEggs && (
              <SellCard
                key="eggs"
                icon={EGG_ICON}
                name="Eggs"
                count={playerState.eggsCount}
                unitPrice={EGG_SELL_PRICE}
                zoomKey="sell_eggs"
                onSell={() => sellEggs(playerState.eggsCount)}
              />
            )}
            {hasMeat && (
              <SellCard
                key="meat"
                icon={PIG_ICON}
                name="Pig Meat"
                count={playerState.pigMeatCount}
                unitPrice={PIG_MEAT_SELL_PRICE}
                zoomKey="sell_meat"
                onSell={() => sellPigMeat(playerState.pigMeatCount)}
              />
            )}
          </UiEntity>
        </UiEntity>
      )}

    </SellPanelFrame>
  )
}
