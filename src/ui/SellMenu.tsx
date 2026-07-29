import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { sellCrop } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA } from '../data/cropData'
import { CROP_HARVEST_IMAGES, COINS_IMAGE, EGG_ICON, PIG_ICON } from '../data/imagePaths'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { sellEggs, sellPigMeat } from '../systems/animalSystem'
import { EGG_SELL_PRICE, PIG_MEAT_SELL_PRICE } from '../data/animalData'
import {
  RevampPanelFrame,
  REVAMP_CONTENT_H as CONTENT_H,
  REVAMP_CONTENT_W as CONTENT_W,
} from './RevampPanel'

const SELL_DEBUG = false

const UI_SCALE = 0.8
const ss = (value: number) => Math.round(value * UI_SCALE)

const SELL_CARD_IMG = 'assets/images/revamp/card.png'
const SELL_BUTTON_IMG = 'assets/images/revamp/mini-button.png'
const SELL_CARD_ASPECT = 236 / 326
const SELL_BUTTON_ASPECT = 196 / 52

const SELL_CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const SELL_CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const SELL_HEADER_TEXT = { r: 0.96, g: 0.88, b: 0.70, a: 1 }
const SELL_GOLD = { r: 0.92, g: 0.72, b: 0.10, a: 1 }
const SELL_EARN = { r: 0.18, g: 0.82, b: 0.28, a: 1 }
const SELL_SCROLL_BG = { r: 0.15, g: 0.09, b: 0.03, a: 0.18 }
const SELL_EMPTY_TEXT = { r: 0.96, g: 0.88, b: 0.70, a: 0.88 }

const SELL_CARD_W = 184
const SELL_CARD_H = 246
const SELL_CARD_BG_SCALE = 1.15
const SELL_CARD_BG_SCALE_MOBILE = 1.05
const SELL_CARD_CONTENT_SCALE_MOBILE = 1.12
const SELL_CARD_MARGIN = 2
const SELL_CARD_PAD_TOP = 24
const SELL_CARD_PAD_BOTTOM = 18
const SELL_CARD_PAD_SIDE = 14
const SELL_CARD_ICON = 90
const SELL_CARD_ICON_MARGIN = ss(10)
const SELL_CARD_TITLE_LG = ss(25)
const SELL_CARD_TITLE_MD = ss(23)
const SELL_CARD_TITLE_SM = ss(21)
const SELL_CARD_COUNT_FONT = ss(19)
const SELL_BUTTON_SCALE = 1.1
const SELL_BUTTON_W = 124
const SELL_BUTTON_H = Math.round(SELL_BUTTON_W / SELL_BUTTON_ASPECT)
const SELL_BUTTON_FONT = ss(24)
const SELL_BUTTON_TOP_MARGIN = ss(10)
const SELL_FLOAT_MS = 900
const SELL_FLOAT_RISE = ss(46)
const SELL_FLOAT_RISE_MOBILE = ss(62)
const SELL_FLOAT_FONT_MOBILE = ss(32)
const SELL_GRID_SLOT_TRIM = 10
const SELL_GRID_COLUMNS_DESKTOP = 4
const SELL_GRID_COLUMNS_MOBILE = 3
const SELL_GRID_ROW_GAP = 0
const SELL_GRID_TOP_OFFSET = ss(8)
const SELL_HEADER_ROW_H = ss(44)
const SELL_SUBTITLE_H = ss(30)
const SELL_GRID_VIEW_H = CONTENT_H - SELL_HEADER_ROW_H - SELL_SUBTITLE_H - ss(18)

type SellFloatEntry = {
  id: number
  key: string
  text: string
  startedAt: number
}

type SellGridItem = {
  key: string | number
  node: ReactEcs.JSX.ReactNode
}

type SellCardData = {
  key?: string
  icon: string
  name: string
  count: number
  unitPrice: number
  zoomKey: string
  onSell: () => void
}

let nextSellFloatId = 1
const sellFloats: SellFloatEntry[] = []

function triggerSellFloat(key: string, text: string): void {
  sellFloats.push({
    id: nextSellFloatId++,
    key,
    text,
    startedAt: Date.now(),
  })
}

function getSellFloats(key: string): SellFloatEntry[] {
  const now = Date.now()
  for (let i = sellFloats.length - 1; i >= 0; i--) {
    if (now - sellFloats[i].startedAt > SELL_FLOAT_MS) {
      sellFloats.splice(i, 1)
    }
  }
  return sellFloats.filter((entry) => entry.key === key)
}

function getSellCardBgScale(): number {
  return isMobile() ? SELL_CARD_BG_SCALE_MOBILE : SELL_CARD_BG_SCALE
}

function scaleSellCardContent(value: number): number {
  return isMobile() ? Math.round(value * SELL_CARD_CONTENT_SCALE_MOBILE) : value
}

function getSellCardVisualWidth(scale = 1): number {
  return Math.round(SELL_CARD_W * scale * getSellCardBgScale())
}

function getSellCardVisualHeight(scale = 1): number {
  const width = getSellCardVisualWidth(scale)
  return Math.max(
    Math.round(width / SELL_CARD_ASPECT),
    Math.round(SELL_CARD_H * scale * getSellCardBgScale()),
  )
}

function getSellCardTransform(scale: number) {
  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: getSellCardVisualWidth(scale),
    height: getSellCardVisualHeight(scale),
    margin: { right: SELL_CARD_MARGIN, bottom: SELL_CARD_MARGIN },
    padding: {
      top: isMobile() ? SELL_CARD_PAD_TOP + 4 : SELL_CARD_PAD_TOP,
      bottom: isMobile() ? SELL_CARD_PAD_BOTTOM + 4 : SELL_CARD_PAD_BOTTOM,
      left: isMobile() ? SELL_CARD_PAD_SIDE - 2 : SELL_CARD_PAD_SIDE,
      right: isMobile() ? SELL_CARD_PAD_SIDE - 2 : SELL_CARD_PAD_SIDE,
    },
  }
}

function getSellGridColumns(): number {
  return isMobile() ? SELL_GRID_COLUMNS_MOBILE : SELL_GRID_COLUMNS_DESKTOP
}

function getSellGridSlotWidth(): number {
  return Math.max(0, getSellCardVisualWidth() - SELL_GRID_SLOT_TRIM)
}

function getSellTitleFont(title: string): number {
  if (title.length <= 10) return scaleSellCardContent(SELL_CARD_TITLE_LG)
  if (title.length <= 13) return scaleSellCardContent(SELL_CARD_TITLE_MD)
  return scaleSellCardContent(SELL_CARD_TITLE_SM)
}

function getSellFloatRise(): number {
  return isMobile() ? SELL_FLOAT_RISE_MOBILE : SELL_FLOAT_RISE
}

function getSellFloatFont(): number {
  return isMobile() ? scaleSellCardContent(SELL_FLOAT_FONT_MOBILE) : scaleSellCardContent(SELL_BUTTON_FONT)
}

function runSellPress({
  zoomKey,
  totalValue,
  onSell,
}: {
  zoomKey: string
  totalValue: number
  onSell: () => void
}): void {
  if (isZooming(zoomKey)) return
  playSound('buttonclick')
  triggerCardZoom(zoomKey)
  triggerSellFloat(zoomKey, `+${totalValue}`)
  setTimeout(onSell, 290)
}

const SellPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => (
  <RevampPanelFrame name="sellCrops" onClose={onClose}>
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
      {children}
    </UiEntity>
  </RevampPanelFrame>
)

const SellValueButton = ({ totalValue, floatKey }: { totalValue: number; floatKey: string }) => {
  const buttonScale = isMobile() ? SELL_BUTTON_SCALE * SELL_CARD_CONTENT_SCALE_MOBILE : SELL_BUTTON_SCALE
  const buttonWidth = Math.round(SELL_BUTTON_W * buttonScale)
  const buttonHeight = Math.round(SELL_BUTTON_H * buttonScale)
  const labelTopOffset = -ss(4)
  const priceLeft = Math.round(buttonWidth * 0.42)
  const priceWidth = Math.round(buttonWidth * 0.38)
  const floats = getSellFloats(floatKey)

  return (
    <UiEntity
      uiTransform={{
        alignItems: 'center',
        justifyContent: 'center',
        width: buttonWidth,
        height: buttonHeight,
        margin: { top: scaleSellCardContent(SELL_BUTTON_TOP_MARGIN) },
      }}
      uiBackground={{
        texture: { src: SELL_BUTTON_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      <Label
        value={`<b>${totalValue}</b>`}
        fontSize={scaleSellCardContent(SELL_BUTTON_FONT)}
        color={{ r: 1, g: 1, b: 1, a: 1 }}
        textAlign="middle-left"
        textWrap="nowrap"
        uiTransform={{
          positionType: 'absolute',
          position: { top: labelTopOffset, left: priceLeft },
          width: priceWidth,
          height: buttonHeight,
        }}
      />

      {floats.map((entry) => {
        const progress = Math.min(1, (Date.now() - entry.startedAt) / SELL_FLOAT_MS)
        const rise = Math.round(progress * getSellFloatRise())
        return (
          <Label
            key={entry.id}
            value={`<b>${entry.text}</b>`}
            fontSize={getSellFloatFont()}
            color={{ r: SELL_EARN.r, g: SELL_EARN.g, b: SELL_EARN.b, a: 1 - progress }}
            textAlign="middle-center"
            uiTransform={{
              positionType: 'absolute',
              position: { top: -ss(18) - rise, left: 0 },
              width: buttonWidth,
              height: buttonHeight,
            }}
          />
        )
      })}
    </UiEntity>
  )
}

const SellCardFrame = ({
  scale,
  onCardPress,
  children,
}: {
  scale: number
  onCardPress: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const transform = getSellCardTransform(scale)

  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={{
        texture: { src: SELL_CARD_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      {children}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: transform.width,
          height: transform.height,
        }}
        onMouseDown={onCardPress}
      />
    </UiEntity>
  )
}

const SellCard = ({ icon, name, count, unitPrice, zoomKey, onSell }: SellCardData) => {
  const scale = getZoomScale(zoomKey)
  const totalValue = unitPrice * count
  const iconSize = scaleSellCardContent(SELL_CARD_ICON)

  return (
    <SellCardFrame
      scale={scale}
      onCardPress={() => {
        if (count <= 0) return
        runSellPress({ zoomKey, totalValue, onSell })
      }}
    >
      <UiEntity uiTransform={{ height: scaleSellCardContent(ss(8)), flexShrink: 0 }} />
      <UiEntity
        uiTransform={{
          width: iconSize,
          height: iconSize,
          margin: { bottom: scaleSellCardContent(SELL_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{ texture: { src: icon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`<b>${name}</b>`} fontSize={getSellTitleFont(name)} color={SELL_CARD_TEXT} textAlign="middle-center" />
      <Label
        value={`x${count}`}
        fontSize={scaleSellCardContent(SELL_CARD_COUNT_FONT)}
        color={SELL_CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }}
      />
      <SellValueButton totalValue={totalValue} floatKey={zoomKey} />
    </SellCardFrame>
  )
}

const SellCardGrid = ({ items, viewHeight }: { items: SellGridItem[]; viewHeight: number }) => {
  const columns = getSellGridColumns()
  const slotWidth = getSellGridSlotWidth()
  const visualWidth = getSellCardVisualWidth()
  const slotHeight = getSellCardVisualHeight()
  const offsetX = Math.round((slotWidth - visualWidth) / 2)
  const gridWidth = columns * slotWidth
  const rows: SellGridItem[][] = []

  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns))
  }

  return (
    <UiEntity
      uiTransform={{
        width: CONTENT_W,
        height: viewHeight,
        overflow: 'scroll',
        flexShrink: 0,
        margin: { top: ss(6) },
      }}
      uiBackground={{ color: SELL_SCROLL_BG }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          padding: { top: ss(10), bottom: ss(10) },
        }}
      >
        <UiEntity
          uiTransform={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: gridWidth,
            margin: { top: SELL_GRID_TOP_OFFSET },
          }}
        >
          {rows.map((row, rowIndex) => (
            <UiEntity
              key={`sell-row-${rowIndex}`}
              uiTransform={{
                flexDirection: 'row',
                width: gridWidth,
                height: slotHeight,
                justifyContent: 'center',
                margin: { bottom: rowIndex < rows.length - 1 ? SELL_GRID_ROW_GAP : 0 },
              }}
            >
              {row.map((item) => (
                <UiEntity key={item.key} uiTransform={{ width: slotWidth, height: slotHeight }}>
                  <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                    {item.node}
                  </UiEntity>
                </UiEntity>
              ))}
            </UiEntity>
          ))}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export const SellMenu = () => {
  const mobile = isMobile()
  if (SELL_DEBUG) {
    for (const ct of ALL_CROP_TYPES) {
      if (!playerState.harvested.has(ct)) playerState.harvested.set(ct, 25)
    }
  }

  const harvestedCrops = ALL_CROP_TYPES.filter((ct) => (playerState.harvested.get(ct) ?? 0) > 0)
  const hasEggs = playerState.chickenCoopOwned && playerState.eggsCount > 0
  const hasMeat = playerState.pigMeatCount > 0
  const hasAnything = harvestedCrops.length > 0 || hasEggs || hasMeat

  const totalCropValue = harvestedCrops.reduce((sum, ct) => (
    sum + (CROP_DATA.get(ct)?.sellPrice ?? 0) * (playerState.harvested.get(ct) ?? 0)
  ), 0)

  const totalValue =
    totalCropValue +
    (hasEggs ? EGG_SELL_PRICE * playerState.eggsCount : 0) +
    (hasMeat ? PIG_MEAT_SELL_PRICE * playerState.pigMeatCount : 0)

  const headerRowH = mobile ? ss(54) : SELL_HEADER_ROW_H
  const subtitleH = mobile ? ss(40) : SELL_SUBTITLE_H
  const gridViewH = CONTENT_H - headerRowH - subtitleH - ss(18)
  const headerIconSize = mobile ? ss(40) : ss(32)
  const headerCoinsFont = mobile ? ss(34) : ss(28)
  const headerGainFont = mobile ? ss(34) : ss(28)
  const subtitleFont = mobile ? ss(24) : ss(18)
  const emptyTitleFont = mobile ? ss(36) : ss(32)
  const emptyBodyFont = mobile ? ss(24) : ss(20)

  const items: SellGridItem[] = [
    ...harvestedCrops.map((ct) => {
      const def = CROP_DATA.get(ct)!
      return {
        key: `${ct}`,
        node: (
          <SellCard
            key={`${ct}`}
            icon={CROP_HARVEST_IMAGES[ct]}
            name={def.name}
            count={playerState.harvested.get(ct)!}
            unitPrice={def.sellPrice}
            zoomKey={`sell_${ct}`}
            onSell={() => sellCrop(ct, playerState.harvested.get(ct)!)}
          />
        ),
      }
    }),
    ...(hasEggs ? [{
      key: 'eggs',
      node: (
        <SellCard
          key="eggs"
          icon={EGG_ICON}
          name="Eggs"
          count={playerState.eggsCount}
          unitPrice={EGG_SELL_PRICE}
          zoomKey="sell_eggs"
          onSell={() => sellEggs(playerState.eggsCount)}
        />
      ),
    }] : []),
    ...(hasMeat ? [{
      key: 'meat',
      node: (
        <SellCard
          key="meat"
          icon={PIG_ICON}
          name="Pig Meat"
          count={playerState.pigMeatCount}
          unitPrice={PIG_MEAT_SELL_PRICE}
          zoomKey="sell_meat"
          onSell={() => sellPigMeat(playerState.pigMeatCount)}
        />
      ),
    }] : []),
  ]

  return (
    <SellPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: CONTENT_W,
          height: headerRowH,
          margin: { top: ss(16) },
          flexShrink: 0,
        }}
      >
        <UiEntity
          uiTransform={{ width: headerIconSize, height: headerIconSize, margin: { right: ss(10) }, flexShrink: 0 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label value={`<b>${playerState.coins}</b>`} fontSize={headerCoinsFont} color={SELL_GOLD} textAlign="middle-center" />
        {hasAnything && (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { left: ss(12) } }}>
            <Label value="·" fontSize={ss(24)} color={SELL_CARD_TEXT_MUTE} textAlign="middle-center" />
            <Label
              value={`<b>+${totalValue}</b>`}
              fontSize={headerGainFont}
              color={SELL_EARN}
              textAlign="middle-center"
              uiTransform={{ margin: { left: ss(12) } }}
            />
          </UiEntity>
        )}
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: CONTENT_W,
          height: subtitleH,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Label
          value={hasAnything ? '<b>Tap a card to sell</b>' : '<b>No crops ready to sell</b>'}
          fontSize={subtitleFont}
          color={SELL_HEADER_TEXT}
          textAlign="middle-center"
        />
      </UiEntity>

      {hasAnything ? (
        <SellCardGrid items={items} viewHeight={gridViewH} />
      ) : (
        <UiEntity
          uiTransform={{
            width: CONTENT_W,
            height: gridViewH,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            flexShrink: 0,
            margin: { top: ss(6) },
          }}
          uiBackground={{ color: SELL_SCROLL_BG }}
        >
          <Label value="Nothing to sell." fontSize={emptyTitleFont} color={SELL_EMPTY_TEXT} textAlign="middle-center" />
          <Label
            value="Harvest crops or collect eggs first."
            fontSize={emptyBodyFont}
            color={{ r: SELL_EMPTY_TEXT.r, g: SELL_EMPTY_TEXT.g, b: SELL_EMPTY_TEXT.b, a: 0.78 }}
            textAlign="middle-center"
            uiTransform={{ margin: { top: ss(8) } }}
          />
        </UiEntity>
      )}
    </SellPanelFrame>
  )
}
