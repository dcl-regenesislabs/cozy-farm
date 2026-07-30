import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { buySeed, buyDog, buyOrnament, buyCompostBin, COMPOST_BIN_PRICE } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { CROP_SEED_IMAGES, DOG01_ICON, CHICKEN_ICON, GRAIN_ICON, ORGANIC_WASTE_ICON, PIG_ICON } from '../data/imagePaths'
import { C } from './PanelShell'
import { tutorialState } from '../game/tutorialState'
import { progressionEventState } from '../game/progressionEventState'
import { MOBILE_DEBUG_COINS, MOBILE_DEBUG_LEVEL, isMobileUiDebug } from '../game/mobileDebug'
import { triggerCardZoom, getZoomScale } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { BEAUTY_OBJECTS, RARITY_COLOR, RARITY_LABEL, type BeautyRarity } from '../data/beautyObjectData'
import { isOrnamentPlaced, hasEmptySlot } from '../systems/beautySpotSystem'
import { WORKER_DAILY_WAGE, getWorkerDebtDays, getWorkerStatus } from '../shared/worker'
import { requestPayWorkerWages } from '../services/saveService'
import { GRAIN_BUY_PRICE, GRAIN_BULK_COUNT, GRAIN_BULK_PRICE, ANIMAL_BUY_PRICE, MAX_ANIMALS_PER_BUILDING, CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL, BUILDING_BUY_PRICE } from '../data/animalData'
import { buyGrain, buyAnimal, purchaseBuilding } from '../systems/animalSystem'
import { BadgeDot } from './BadgeDot'
import { RevampCloseButton, RevampTitlePlaque, REVAMP_BG_IMG } from './RevampPanel'
import { setTabActive, lerpColor } from './tabFadeSystem'

type ShopTabValue = 'seeds' | 'pets' | 'ornaments' | 'workers' | 'fertilizers'
const SHOP_UI_SCALE = 0.8
const ss = (value: number) => Math.round(value * SHOP_UI_SCALE)

const shopTab  = { value: 'seeds' as ShopTabValue }
const SHOP_ATLAS = 'assets/images/ui_loading/shop_atlas.png'
const SHOP_ATLAS_SIZE = 1024
const SHOP_BG_RECT = { x: 17, y: 13, w: 993, h: 682 } as const
const SHOP_TAB_ACTIVE_RECT = { x: 27, y: 737, w: 265, h: 83 } as const
const SHOP_TAB_IDLE_RECT = { x: 297, y: 739, w: 265, h: 83 } as const
const SHOP_TAB_SELECTED_IMG = 'assets/images/revamp/selected.png'
const SHOP_TAB_IDLE_IMG = 'assets/images/revamp/notselected.png'
const SHOP_CARD_IMG = 'assets/images/revamp/card.png'
const SHOP_CARD_LOCKED_IMG = 'assets/images/revamp/lockedlevel.png'
const SHOP_MINI_BUTTON_IMG = 'assets/images/revamp/mini-button.png'
const SHOP_MINI_BUTTON_NOCOINS_IMG = 'assets/images/revamp/mini-button-not-coins.png'
const SHOP_BUTTON_NOTLEVEL_IMG = 'assets/images/revamp/button-not-level.png'
// Matches the native 196x52 aspect of the mini-button art (see assets/images/revamp).
const SHOP_MINI_BUTTON_ASPECT = 196 / 52
// Narrower than the card's inner content width so it doesn't touch the side padding.
const SHOP_MINI_BUTTON_W = 124
const SHOP_MINI_BUTTON_H = Math.round(SHOP_MINI_BUTTON_W / SHOP_MINI_BUTTON_ASPECT)
const SHOP_PANEL_SCALE = 1.14
const SHOP_MOBILE_FRAME_SCALE = 0.96
const SHOP_PANEL_W = Math.round(ss(1290) * SHOP_PANEL_SCALE)
const SHOP_PANEL_H = Math.round((SHOP_PANEL_W * SHOP_BG_RECT.h) / SHOP_BG_RECT.w)
const SHOP_TAB_SCALE = 0.62 * SHOP_UI_SCALE
const SHOP_TAB_W = 160
// Matches the pill shape of assets/images/revamp/selected.png (151x68) so the new
// tab art isn't stretched off its native round proportions.
const SHOP_TAB_ASPECT = 151 / 68
const SHOP_TAB_H = Math.round(SHOP_TAB_W / SHOP_TAB_ASPECT)
const SHOP_TAB_GAP = ss(12)
const SHOP_TAB_TOP = ss(104)
const SHOP_CONTENT_LEFT = ss(82)
const SHOP_CONTENT_RIGHT = ss(34)
const SHOP_CONTENT_TOP = SHOP_TAB_TOP + SHOP_TAB_H + 17
const SHOP_CONTENT_BOTTOM = ss(74)
const SHOP_CONTENT_W = SHOP_PANEL_W - SHOP_CONTENT_LEFT - SHOP_CONTENT_RIGHT
const SHOP_CONTENT_H = SHOP_PANEL_H - SHOP_CONTENT_TOP - SHOP_CONTENT_BOTTOM
const SHOP_PANEL_TOP_MARGIN = ss(120)
const SHOP_PANEL_TOP_MARGIN_MOBILE = SHOP_PANEL_TOP_MARGIN + ss(54)
const SHOP_PANEL_TOP_MARGIN_DESKTOP_EXTRA = ss(140)
const SHOP_MOBILE_FRAME_THICKNESS = 4
// card.png/lockedlevel.png are light cream — the old off-white/gray C.textMain/C.textMute
// pairing (meant for the dark shop_atlas background) went invisible on top of them.
const SHOP_CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const SHOP_CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
// Width is maxed out for 5-per-row with no scroll (939px content / 5 cards, margin
// shaved to 4px — there is no more slack left here). Height has real headroom since
// only 2 rows are needed, so it's pushed to its own ceiling (478px content / 2 rows).
// Icon/button/font sizes are untouched on purpose — only the card box grows, so the
// extra room shows up as breathing space around the same-sized inner elements.
const SHOP_CARD_W = 185
const SHOP_CARD_H_SHORT = 236
const SHOP_CARD_H_TALL = 236
const SHOP_CARD_H_FERTILIZER = 288
const SHOP_CARD_H_PETS = 288
const SHOP_CARD_H_WORKER = 288
const SHOP_CARD_MARGIN = 2
const SHOP_CARD_PAD_TOP = 26
const SHOP_CARD_PAD_BOTTOM = 18
const SHOP_CARD_PAD_SIDE = 16
const SHOP_CARD_BG_SCALE = 1.15
const SHOP_CARD_ART_ASPECT = 236 / 326
const SHOP_GRID_CARD_SLOT_TRIM = 10
const SHOP_GRID_ROW_GAP = 0
const SHOP_GRID_TOP_OFFSET_DESKTOP = ss(16)
const SHOP_GRID_COLUMNS = 5
const SHOP_BUTTON_SCALE = 1.1
const SHOP_CARD_ICON = 90
const SHOP_CARD_ICON_MARGIN = ss(10)
const SHOP_CARD_TITLE_LG = ss(25)
const SHOP_CARD_TITLE_MD = ss(23)
const SHOP_CARD_TITLE_SM = ss(22)
const SHOP_CARD_BODY = ss(20)
const SHOP_CARD_META = ss(18)
const SHOP_CARD_SMALL = ss(16)
const SHOP_BUTTON_FONT = ss(24)
const SHOP_BUTTON_TOP_MARGIN = ss(10)
const SHOP_PETS_SUBLABEL_SPACE = ss(36)
const SHOP_WORKER_VALUE_FONT = ss(34)
const SHOP_WORKER_LABEL_FONT = ss(18)
const SHOP_WORKER_NOTE_FONT = ss(16)
const SHOP_WORKER_LABEL_COLOR = { r: 0.44, g: 0.28, b: 0.12, a: 1 }
const SHOP_WORKER_NOTE_COLOR = { r: 0.52, g: 0.36, b: 0.19, a: 1 }
const SHOP_WORKER_SUCCESS_COLOR = { r: 0.24, g: 0.66, b: 0.18, a: 1 }
const SHOP_WORKER_WARNING_COLOR = { r: 0.82, g: 0.42, b: 0.16, a: 1 }
const SHOP_WORKER_GOLD_COLOR = { r: 0.9, g: 0.67, b: 0.12, a: 1 }
const SHOP_LOCKED_BUTTON_TINT = { r: 0.68, g: 0.68, b: 0.68, a: 1 }
const SHOP_LOCKED_BUTTON_TEXT = { r: 0.84, g: 0.84, b: 0.84, a: 1 }
const SHOP_PURCHASE_FLOAT_MS = 900
const SHOP_PURCHASE_FLOAT_RISE = ss(46)
const SHOP_PURCHASE_FLOAT_RISE_MOBILE = ss(62)
const SHOP_PURCHASE_FLOAT_FONT_MOBILE = ss(32)
const SHOP_CARD_BG_SCALE_MOBILE = 1.08
const SHOP_CARD_CONTENT_SCALE_MOBILE = 1.08
const SHOP_ORNAMENT_BEAUTY_COLOR = { r: 0.62, g: 0.38, b: 0.03, a: 1 }
const SHOP_DEBUG_UNLOCKED_CROPS = new Set<CropType>(ALL_CROP_TYPES)
const SHOP_DEBUG_FARMER_SEEDS = new Map<CropType, number>([[CropType.Onion, 20]])

type PurchaseFloatEntry = {
  id: number
  key: string
  text: string
  startedAt: number
}

type ShopGridItem = {
  key: string | number
  node: ReactEcs.JSX.ReactNode
}

let nextPurchaseFloatId = 1
const purchaseFloats: PurchaseFloatEntry[] = []

function triggerPurchaseFloat(key: string, text: string): void {
  purchaseFloats.push({
    id: nextPurchaseFloatId++,
    key,
    text,
    startedAt: Date.now(),
  })
}

function getPurchaseFloats(key: string): PurchaseFloatEntry[] {
  const now = Date.now()
  for (let i = purchaseFloats.length - 1; i >= 0; i--) {
    if (now - purchaseFloats[i].startedAt > SHOP_PURCHASE_FLOAT_MS) {
      purchaseFloats.splice(i, 1)
    }
  }
  return purchaseFloats.filter((entry) => entry.key === key)
}

function isShopMobileDebug(): boolean {
  return isMobileUiDebug()
}

function getShopCoins(): number {
  return isShopMobileDebug() ? MOBILE_DEBUG_COINS : playerState.coins
}

function getShopLevel(): number {
  return isShopMobileDebug() ? MOBILE_DEBUG_LEVEL : playerState.level
}

function getShopUnlockedCrops(): Set<CropType> {
  return isShopMobileDebug() ? SHOP_DEBUG_UNLOCKED_CROPS : playerState.unlockedCrops
}

function getShopDogOwned(): boolean {
  return isShopMobileDebug() ? false : playerState.dogOwned
}

function getShopChickenCoopOwned(): boolean {
  return isShopMobileDebug() ? true : playerState.chickenCoopOwned
}

function getShopPigPenOwned(): boolean {
  return isShopMobileDebug() ? true : playerState.pigPenOwned
}

function getShopChickenCount(): number {
  return isShopMobileDebug() ? 0 : playerState.chickens.length
}

function getShopPigCount(): number {
  return isShopMobileDebug() ? 0 : playerState.pigs.length
}

function getShopCropsUnlocked(): boolean {
  return isShopMobileDebug() ? true : playerState.cropsUnlocked
}

function getShopFarmerHired(): boolean {
  return isShopMobileDebug() ? true : playerState.farmerHired
}

function getShopFarmerSeeds(): Map<CropType, number> {
  return isShopMobileDebug() ? SHOP_DEBUG_FARMER_SEEDS : playerState.farmerSeeds
}

function getShopWorkerOutstandingWages(): number {
  return isShopMobileDebug() ? 0 : playerState.workerOutstandingWages
}

function getShopWorkerUnpaidDays(): number {
  return isShopMobileDebug() ? 0 : playerState.workerUnpaidDays
}

function getShopCompostBinUnlocked(): boolean {
  return isShopMobileDebug() ? false : playerState.compostBinUnlocked
}

function isShopRotSystemUnlocked(): boolean {
  return isShopMobileDebug() ? true : playerState.rotSystemUnlocked
}

function isShopProgressionEventActive(): boolean {
  return isShopMobileDebug() ? true : progressionEventState.active
}

function isShopOrnamentPlaced(objectId: number): boolean {
  return isShopMobileDebug() ? false : isOrnamentPlaced(objectId)
}

function shopHasEmptySlot(): boolean {
  return isShopMobileDebug() ? true : hasEmptySlot()
}

function runShopAction(action: () => boolean): boolean {
  return isShopMobileDebug() ? true : action()
}

const PetsCardButtonSpacer = () => (
  <UiEntity
    uiTransform={{
      height: scaleShopCardContent(SHOP_PETS_SUBLABEL_SPACE),
      margin: { top: ss(2), bottom: ss(4) },
      flexShrink: 0,
    }}
  />
)

function getVisibleShopTabs() {
  return SHOP_TABS.filter((tabDef) => tabDef.show())
}

function getShopCardBgScale(): number {
  return isMobile() ? SHOP_CARD_BG_SCALE_MOBILE : SHOP_CARD_BG_SCALE
}

function scaleShopCardContent(value: number): number {
  return isMobile() ? Math.round(value * SHOP_CARD_CONTENT_SCALE_MOBILE) : value
}

function getShopPurchaseFloatRise(): number {
  return isMobile() ? SHOP_PURCHASE_FLOAT_RISE_MOBILE : SHOP_PURCHASE_FLOAT_RISE
}

function getShopPurchaseFloatFont(): number {
  return isMobile() ? scaleShopCardContent(SHOP_PURCHASE_FLOAT_FONT_MOBILE) : scaleShopCardContent(SHOP_BUTTON_FONT)
}

function getShopCardTitleValue(title: string): string {
  return `<b>${title}</b>`
}

function getShopCardTitleFont(title: string): number {
  if (title.length <= 10) return scaleShopCardContent(SHOP_CARD_TITLE_LG)
  if (title.length <= 12) return scaleShopCardContent(SHOP_CARD_TITLE_MD)
  return scaleShopCardContent(SHOP_CARD_TITLE_SM)
}

function getShopOrnamentRarityTextColor(rarity: BeautyRarity): { r: number; g: number; b: number; a: number } {
  switch (rarity) {
    case 'common':
      return { r: 0.42, g: 0.36, b: 0.28, a: 1 }
    case 'legendary':
      return { r: 0.64, g: 0.34, b: 0.02, a: 1 }
    default:
      return RARITY_COLOR[rarity]
  }
}

function getShopTabsLeftInset() {
  const visibleTabs = getVisibleShopTabs()
  const tabsRowWidth = visibleTabs.length * SHOP_TAB_W + Math.max(0, visibleTabs.length - 1) * SHOP_TAB_GAP
  return Math.max(0, Math.round((getShopContentWidth() - tabsRowWidth) / 2))
}

function scaleShopFrame(value: number): number {
  return Math.round(value * SHOP_MOBILE_FRAME_SCALE)
}

function getShopPanelWidth(): number {
  return isMobile() ? scaleShopFrame(SHOP_PANEL_W) : SHOP_PANEL_W
}

function getShopPanelHeight(): number {
  return isMobile() ? scaleShopFrame(SHOP_PANEL_H) : SHOP_PANEL_H
}

function getShopContentWidth(): number {
  return isMobile() ? scaleShopFrame(SHOP_CONTENT_W) : SHOP_CONTENT_W
}

function getShopContentHeight(): number {
  return isMobile() ? scaleShopFrame(SHOP_CONTENT_H) : SHOP_CONTENT_H
}

function getShopCardTransform(baseHeight: number, scale: number) {
  const bgScale = getShopCardBgScale()
  const cardGap = SHOP_CARD_MARGIN
  const padTop = isMobile() ? SHOP_CARD_PAD_TOP + 8 : SHOP_CARD_PAD_TOP + 12
  const padBottom = isMobile() ? SHOP_CARD_PAD_BOTTOM + 6 : SHOP_CARD_PAD_BOTTOM + 8
  const padSide = isMobile() ? 12 : SHOP_CARD_PAD_SIDE
  const width = Math.round(SHOP_CARD_W * scale * bgScale)
  const artHeight = Math.round(width / SHOP_CARD_ART_ASPECT)
  const baseHeightScaled = Math.round(baseHeight * scale * bgScale)
  const height = Math.max(artHeight, baseHeightScaled)

  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width,
    height,
    margin: { right: cardGap, bottom: cardGap },
    padding: {
      top: padTop,
      bottom: padBottom,
      left: padSide,
      right: padSide,
    },
  }
}

function getShopCardVisualWidth(scale = 1): number {
  return Math.round(SHOP_CARD_W * scale * getShopCardBgScale())
}

function getShopGridCardWidth(scale = 1): number {
  return Math.max(0, getShopCardVisualWidth(scale) - SHOP_GRID_CARD_SLOT_TRIM)
}

function getShopGridCardHeight(scale = 1, baseHeight = SHOP_CARD_H_SHORT): number {
  const width = getShopCardVisualWidth(scale)
  return Math.max(
    Math.round(width / SHOP_CARD_ART_ASPECT),
    Math.round(baseHeight * scale * getShopCardBgScale()),
  )
}

const ShopCardFrame = ({
  baseHeight,
  scale,
  locked = false,
  onCardPress,
  children,
}: {
  baseHeight: number
  scale: number
  locked?: boolean
  onCardPress?: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const transform = getShopCardTransform(baseHeight, scale)

  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={{
        texture: { src: locked ? SHOP_CARD_LOCKED_IMG : SHOP_CARD_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      {children}
      {isMobile() && onCardPress && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: transform.width,
            height: transform.height,
          }}
          onMouseDown={onCardPress}
        />
      )}
    </UiEntity>
  )
}

const ShopCardGrid = ({ items, slotHeight }: { items: ShopGridItem[]; slotHeight: number }) => {
  const slotWidth = getShopGridCardWidth()
  const visualWidth = getShopCardVisualWidth()
  const offsetX = Math.round((slotWidth - visualWidth) / 2)
  const gridWidth = SHOP_GRID_COLUMNS * slotWidth
  const topOffset = isMobile() ? 0 : SHOP_GRID_TOP_OFFSET_DESKTOP
  const rows: ShopGridItem[][] = []

  for (let index = 0; index < items.length; index += SHOP_GRID_COLUMNS) {
    rows.push(items.slice(index, index + SHOP_GRID_COLUMNS))
  }

  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: gridWidth, margin: { top: topOffset } }}>
        {rows.map((row, rowIndex) => (
          <UiEntity
            key={`shop-row-${rowIndex}`}
            uiTransform={{
              flexDirection: 'row',
              width: gridWidth,
              height: slotHeight,
              justifyContent: 'center',
              margin: { bottom: rowIndex < rows.length - 1 ? SHOP_GRID_ROW_GAP : 0 },
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
  )
}

// Cleared to false each session; set true when player first visits the fertilizers tab
// after the rot system unlocks, so the dot only shows until they've acknowledged it.
let fertilizerTabSeen = false

// 5 cards per row × 2 rows = 10 per page
const SHOP_TABS: Array<{ key: ShopTabValue; label: string; show: () => boolean; onSelect?: () => void }> = [
  { key: 'seeds', label: 'Seeds', show: () => true },
  { key: 'pets', label: 'Pets', show: () => true },
  { key: 'ornaments', label: 'Ornaments', show: () => true },
  { key: 'workers', label: 'Workers', show: () => true },
  {
    key: 'fertilizers',
    label: 'Fertilizers',
    show: () => true,
    onSelect: () => { fertilizerTabSeen = true },
  },
]

function shopAtlasUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const left = rect.x / SHOP_ATLAS_SIZE
  const right = (rect.x + rect.w) / SHOP_ATLAS_SIZE
  const top = 1 - rect.y / SHOP_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / SHOP_ATLAS_SIZE
  return [left, top, right, top, right, bottom, left, bottom]
}

function shopAtlasUvsRotatedRight(rect: { x: number; y: number; w: number; h: number }): number[] {
  const left = rect.x / SHOP_ATLAS_SIZE
  const right = (rect.x + rect.w) / SHOP_ATLAS_SIZE
  const top = 1 - rect.y / SHOP_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / SHOP_ATLAS_SIZE
  return [left, bottom, left, top, right, top, right, bottom]
}

const SHOP_TAB_TEXT_IDLE = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const SHOP_TAB_TEXT_SELECTED = { r: 1, g: 1, b: 1, a: 1 }

const ShopTabChip = ({
  tabKey,
  label,
  selected,
  onClick,
  showBadge = false,
}: {
  key?: string
  tabKey: string
  label: string
  selected: boolean
  onClick: () => void
  showBadge?: boolean
}) => {
  const mobile = isMobile()
  const tabHitHeight = mobile ? SHOP_TAB_H + ss(18) : SHOP_TAB_H
  const tabHitWidth = mobile ? SHOP_TAB_W + ss(20) : SHOP_TAB_W
  const tabHitLeft = Math.round((SHOP_TAB_W - tabHitWidth) / 2)
  const t = setTabActive(tabKey, selected)

  return (
    <UiEntity
      uiTransform={{
        width: SHOP_TAB_W,
        height: tabHitHeight,
        margin: { right: SHOP_TAB_GAP, bottom: SHOP_TAB_GAP },
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: SHOP_TAB_W,
          height: SHOP_TAB_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Idle art fades out as `t` rises */}
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: SHOP_TAB_W, height: SHOP_TAB_H }}
          uiBackground={{
            texture: { src: SHOP_TAB_IDLE_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: 1 - t },
          }}
        />
        {/* Selected art fades in as `t` rises */}
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: SHOP_TAB_W, height: SHOP_TAB_H }}
          uiBackground={{
            texture: { src: SHOP_TAB_SELECTED_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: t },
          }}
        />
        <Label
          value={`<b>${label}</b>`}
          fontSize={ss(isMobile() ? 28 : 24)}
          color={lerpColor(SHOP_TAB_TEXT_IDLE, SHOP_TAB_TEXT_SELECTED, t)}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{ width: SHOP_TAB_W - 20, height: SHOP_TAB_H, alignItems: 'center', justifyContent: 'center', padding: { bottom: 12 } }}
        />
      </UiEntity>
      {showBadge && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { right: -4, top: -4 } }}>
          <BadgeDot />
        </UiEntity>
      )}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: tabHitLeft },
          width: tabHitWidth,
          height: tabHitHeight,
        }}
        onMouseDown={() => {
          playSound('buttonclick')
          onClick()
        }}
      />
    </UiEntity>
  )
}

const ShopPanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  const visibleTabs = getVisibleShopTabs()
  const panelWidth = getShopPanelWidth()
  const panelHeight = getShopPanelHeight()
  const contentWidth = getShopContentWidth()
  const contentHeight = getShopContentHeight()
  const contentLeft = Math.round((panelWidth - contentWidth) / 2)
  const tabsTop = mobile ? scaleShopFrame(SHOP_TAB_TOP + ss(10)) : SHOP_TAB_TOP + ss(10)
  const contentTop = mobile ? scaleShopFrame(SHOP_CONTENT_TOP + ss(16)) : SHOP_CONTENT_TOP - ss(18)
  const panelTopMargin = mobile ? SHOP_PANEL_TOP_MARGIN_MOBILE : SHOP_PANEL_TOP_MARGIN + SHOP_PANEL_TOP_MARGIN_DESKTOP_EXTRA

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
          width: panelWidth,
          height: panelHeight,
          margin: { top: panelTopMargin },
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: REVAMP_BG_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <RevampTitlePlaque name="shop" panelWidth={panelWidth} scale={mobile ? SHOP_MOBILE_FRAME_SCALE : 1} />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: contentLeft, top: contentTop },
            width: contentWidth,
            height: contentHeight,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: contentLeft, top: tabsTop },
            width: contentWidth,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {visibleTabs.map((tabDef) => (
            <ShopTabChip
              key={tabDef.key}
              tabKey={tabDef.key}
              label={tabDef.label}
              selected={shopTab.value === tabDef.key}
              showBadge={tabDef.key === 'fertilizers' && isShopRotSystemUnlocked() && !fertilizerTabSeen}
              onClick={() => {
                tabDef.onSelect?.()
                shopTab.value = tabDef.key
              }}
            />
          ))}
        </UiEntity>

        <RevampCloseButton onClose={onClose} />
      </UiEntity>
    </UiEntity>
  )
}

type BuyButtonProps = { cost: number; canAfford: boolean; onPress: () => boolean; floatKey?: string; floatText?: string }

function runShopBuyPress({ cost, canAfford, onPress, floatKey, floatText }: BuyButtonProps): void {
  if (!canAfford) return
  playSound('buttonclick')
  const purchased = onPress()
  if (purchased && floatKey) {
    triggerPurchaseFloat(floatKey, floatText ?? `-$${cost}`)
  }
}

const BuyButton = ({ cost, canAfford, onPress, floatKey, floatText }: BuyButtonProps) => {
  const buttonScale = isMobile() ? SHOP_BUTTON_SCALE * SHOP_CARD_CONTENT_SCALE_MOBILE : SHOP_BUTTON_SCALE
  const buttonWidth = Math.round(SHOP_MINI_BUTTON_W * buttonScale)
  const buttonHeight = Math.round(SHOP_MINI_BUTTON_H * buttonScale)
  const buttonLabelTopOffset = -ss(4)
  const buttonPriceLeft = Math.round(buttonWidth * 0.42)
  const buttonPriceWidth = Math.round(buttonWidth * 0.38)
  const floats = floatKey ? getPurchaseFloats(floatKey) : []

  return (
    <UiEntity
      uiTransform={{
        alignItems: 'center',
        justifyContent: 'center',
        width: buttonWidth,
        height: buttonHeight,
        margin: { top: scaleShopCardContent(SHOP_BUTTON_TOP_MARGIN) },
      }}
      uiBackground={{
        texture: { src: canAfford ? SHOP_MINI_BUTTON_IMG : SHOP_MINI_BUTTON_NOCOINS_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
      onMouseDown={canAfford ? () => { runShopBuyPress({ cost, canAfford, onPress, floatKey, floatText }) } : undefined}
    >
      <Label
        value={`<b>${cost}</b>`}
        fontSize={scaleShopCardContent(SHOP_BUTTON_FONT)}
        color={canAfford ? C.textMain : C.textMute}
        textAlign="middle-left"
        textWrap="nowrap"
        uiTransform={{
          positionType: 'absolute',
          position: { top: buttonLabelTopOffset, left: buttonPriceLeft },
          width: buttonPriceWidth,
          height: buttonHeight,
        }}
      />
      {floats.map((entry) => {
        const progress = Math.min(1, (Date.now() - entry.startedAt) / SHOP_PURCHASE_FLOAT_MS)
        const rise = Math.round(progress * getShopPurchaseFloatRise())
        return (
          <Label
            key={entry.id}
            value={`<b>${entry.text}</b>`}
            fontSize={getShopPurchaseFloatFont()}
            color={{ r: 0.9, g: 0.32, b: 0.24, a: 1 - progress }}
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

// "Unlock at lvl" button — background has the label baked in, we just overlay the
// level number in the empty space to its right.
const LevelLockedButton = ({ level }: { level?: number }) => (
  (() => {
    const buttonScale = isMobile() ? SHOP_BUTTON_SCALE * SHOP_CARD_CONTENT_SCALE_MOBILE : SHOP_BUTTON_SCALE
    const buttonWidth = Math.round(SHOP_MINI_BUTTON_W * buttonScale)
    const buttonHeight = Math.round(SHOP_MINI_BUTTON_H * buttonScale)
    const buttonLabelTopOffset = -ss(4)

    return (
      <UiEntity
        uiTransform={{
          width: buttonWidth,
          height: buttonHeight,
          margin: { top: scaleShopCardContent(SHOP_BUTTON_TOP_MARGIN) },
        }}
        uiBackground={{
          texture: { src: SHOP_BUTTON_NOTLEVEL_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: SHOP_LOCKED_BUTTON_TINT,
        }}
      >
        {level !== undefined && (
          <Label
            value={`${level}`}
            fontSize={scaleShopCardContent(SHOP_BUTTON_FONT)}
            color={SHOP_LOCKED_BUTTON_TEXT}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{
              positionType: 'absolute',
              position: { right: Math.round(buttonWidth * 0.04), top: buttonLabelTopOffset },
              width: Math.round(buttonWidth * 0.28),
              height: buttonHeight,
            }}
          />
        )}
      </UiEntity>
    )
  })()
)

type ShopCardProps = { key?: string | number; cropType: CropType; unlocked: boolean; unlockLevel?: number }

const ShopCard = ({ cropType, unlocked, unlockLevel }: ShopCardProps) => {
  const def       = CROP_DATA.get(cropType)!
  const canAfford = getShopCoins() >= def.seedCost
  const imgSrc    = CROP_SEED_IMAGES[cropType]
  const zoomKey   = `shop_${cropType}`
  const scale     = getZoomScale(zoomKey)
  const title     = getShopCardTitleValue(def.name)

  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_SHORT}
      scale={scale}
      locked={!unlocked}
      onCardPress={unlocked ? () => { runShopBuyPress({ cost: def.seedCost, canAfford, onPress: () => { triggerCardZoom(zoomKey); return runShopAction(() => buySeed(cropType, 1)) }, floatKey: zoomKey }) } : undefined}
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: unlocked ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />
      <Label
        value={title}
        fontSize={getShopCardTitleFont(def.name)}
        color={unlocked ? SHOP_CARD_TEXT : SHOP_CARD_TEXT_MUTE}
        textAlign="middle-center"
      />
      {unlocked ? (
        <BuyButton
          cost={def.seedCost}
          canAfford={canAfford}
          floatKey={zoomKey}
          onPress={() => { triggerCardZoom(zoomKey); return runShopAction(() => buySeed(cropType, 1)) }}
        />
      ) : (
        <LevelLockedButton level={unlockLevel} />
      )}
    </ShopCardFrame>
  )
}

const DogCard = () => {
  const canAfford = getShopCoins() >= 500
  const scale     = getZoomScale('shop_dog')

  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={!getShopDogOwned() ? () => { runShopBuyPress({ cost: 500, canAfford, onPress: () => { triggerCardZoom('shop_dog'); return runShopAction(() => buyDog()) }, floatKey: 'shop_dog' }) } : undefined}
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: DOG01_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={getShopCardTitleValue('Dog')} fontSize={getShopCardTitleFont('Dog')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
      <PetsCardButtonSpacer />
      {getShopDogOwned() ? (
        <Label value="Owned" fontSize={scaleShopCardContent(SHOP_CARD_BODY)} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(SHOP_BUTTON_TOP_MARGIN) } }} />
      ) : (
        <BuyButton
          cost={500}
          canAfford={canAfford}
          floatKey="shop_dog"
          onPress={() => { triggerCardZoom('shop_dog'); return runShopAction(() => buyDog()) }}
        />
      )}
    </ShopCardFrame>
  )
}

const ChickenCoopCard = () => {
  const owned   = getShopChickenCoopOwned()
  const locked  = !owned && getShopLevel() < CHICKEN_COOP_UNLOCK_LEVEL
  const canAffordBuilding = getShopCoins() >= BUILDING_BUY_PRICE
  const canAffordAnimal   = getShopCoins() >= ANIMAL_BUY_PRICE
  const atMax   = getShopChickenCount() >= MAX_ANIMALS_PER_BUILDING
  const scale   = getZoomScale('shop_chicken')

  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={
        locked
          ? undefined
          : !owned
            ? () => { runShopBuyPress({ cost: BUILDING_BUY_PRICE, canAfford: canAffordBuilding, onPress: () => { triggerCardZoom('shop_chicken'); return runShopAction(() => purchaseBuilding('chicken')) }, floatKey: 'shop_chicken' }) }
            : !atMax
              ? () => { runShopBuyPress({ cost: ANIMAL_BUY_PRICE, canAfford: canAffordAnimal, onPress: () => { triggerCardZoom('shop_chicken'); return runShopAction(() => buyAnimal('chicken')) }, floatKey: 'shop_chicken' }) }
              : undefined
      }
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: CHICKEN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={getShopCardTitleValue('Chicken Coop')} fontSize={getShopCardTitleFont('Chicken Coop')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
      <PetsCardButtonSpacer />
      {locked ? (
        <Label value={`Locked — Level ${CHICKEN_COOP_UNLOCK_LEVEL}`} fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : !owned ? (
        <BuyButton cost={BUILDING_BUY_PRICE} canAfford={canAffordBuilding} floatKey="shop_chicken" onPress={() => { triggerCardZoom('shop_chicken'); return runShopAction(() => purchaseBuilding('chicken')) }} />
      ) : atMax ? (
        <Label value={`Full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})`} fontSize={scaleShopCardContent(SHOP_CARD_BODY)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : (
        <BuyButton cost={ANIMAL_BUY_PRICE} canAfford={canAffordAnimal} floatKey="shop_chicken" onPress={() => { triggerCardZoom('shop_chicken'); return runShopAction(() => buyAnimal('chicken')) }} />
      )}
    </ShopCardFrame>
  )
}

const PigPenCard = () => {
  const owned   = getShopPigPenOwned()
  const locked  = !owned && getShopLevel() < PIG_PEN_UNLOCK_LEVEL
  const canAffordBuilding = getShopCoins() >= BUILDING_BUY_PRICE
  const canAffordAnimal   = getShopCoins() >= ANIMAL_BUY_PRICE
  const atMax   = getShopPigCount() >= MAX_ANIMALS_PER_BUILDING
  const scale   = getZoomScale('shop_pig')

  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={
        locked
          ? undefined
          : !owned
            ? () => { runShopBuyPress({ cost: BUILDING_BUY_PRICE, canAfford: canAffordBuilding, onPress: () => { triggerCardZoom('shop_pig'); return runShopAction(() => purchaseBuilding('pig')) }, floatKey: 'shop_pig' }) }
            : !atMax
              ? () => { runShopBuyPress({ cost: ANIMAL_BUY_PRICE, canAfford: canAffordAnimal, onPress: () => { triggerCardZoom('shop_pig'); return runShopAction(() => buyAnimal('pig')) }, floatKey: 'shop_pig' }) }
              : undefined
      }
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={getShopCardTitleValue('Pig Pen')} fontSize={getShopCardTitleFont('Pig Pen')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
      <PetsCardButtonSpacer />
      {locked ? (
        <Label value={`Locked — Level ${PIG_PEN_UNLOCK_LEVEL}`} fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : !owned ? (
        <BuyButton cost={BUILDING_BUY_PRICE} canAfford={canAffordBuilding} floatKey="shop_pig" onPress={() => { triggerCardZoom('shop_pig'); return runShopAction(() => purchaseBuilding('pig')) }} />
      ) : atMax ? (
        <Label value={`Full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})`} fontSize={scaleShopCardContent(SHOP_CARD_BODY)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : (
        <BuyButton cost={ANIMAL_BUY_PRICE} canAfford={canAffordAnimal} floatKey="shop_pig" onPress={() => { triggerCardZoom('shop_pig'); return runShopAction(() => buyAnimal('pig')) }} />
      )}
    </ShopCardFrame>
  )
}

const GrainCard = () => {
  const canAfford = getShopCoins() >= GRAIN_BUY_PRICE
  const scale     = getZoomScale('shop_grain_1')
  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={() => { runShopBuyPress({ cost: GRAIN_BUY_PRICE, canAfford, onPress: () => { triggerCardZoom('shop_grain_1'); return runShopAction(() => buyGrain(1, GRAIN_BUY_PRICE)) }, floatKey: 'shop_grain_1' }) }}
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: GRAIN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={getShopCardTitleValue('Grain')} fontSize={getShopCardTitleFont('Grain')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
      <Label value="1 unit" fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(2), bottom: ss(4) } }} />
      <BuyButton cost={GRAIN_BUY_PRICE} canAfford={canAfford} floatKey="shop_grain_1" onPress={() => { triggerCardZoom('shop_grain_1'); return runShopAction(() => buyGrain(1, GRAIN_BUY_PRICE)) }} />
    </ShopCardFrame>
  )
}

const GrainBulkCard = () => {
  const canAfford = getShopCoins() >= GRAIN_BULK_PRICE
  const scale     = getZoomScale('shop_grain_bulk')
  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={() => { runShopBuyPress({ cost: GRAIN_BULK_PRICE, canAfford, onPress: () => { triggerCardZoom('shop_grain_bulk'); return runShopAction(() => buyGrain(GRAIN_BULK_COUNT, GRAIN_BULK_PRICE)) }, floatKey: 'shop_grain_bulk' }) }}
    >
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: GRAIN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={getShopCardTitleValue('Grain (Bulk)')} fontSize={getShopCardTitleFont('Grain (Bulk)')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
      <Label value={`${GRAIN_BULK_COUNT} units`} fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(2), bottom: ss(4) } }} />
      <BuyButton cost={GRAIN_BULK_PRICE} canAfford={canAfford} floatKey="shop_grain_bulk" onPress={() => { triggerCardZoom('shop_grain_bulk'); return runShopAction(() => buyGrain(GRAIN_BULK_COUNT, GRAIN_BULK_PRICE)) }} />
    </ShopCardFrame>
  )
}

const OrnamentCard = ({ objectId }: { objectId: number }) => {
  const def       = BEAUTY_OBJECTS.get(objectId)!
  const placed    = isShopOrnamentPlaced(objectId)
  const full      = !shopHasEmptySlot()
  const canAfford = getShopCoins() >= def.price
  const zoomKey   = `shop_ornament_${objectId}`
  const scale     = getZoomScale(zoomKey)
  const rarityCol = RARITY_COLOR[def.rarity]
  const rarityTextCol = getShopOrnamentRarityTextColor(def.rarity)

  return (
    <ShopCardFrame
      baseHeight={SHOP_CARD_H_PETS}
      scale={scale}
      onCardPress={!placed && !full ? () => { runShopBuyPress({ cost: def.price, canAfford, onPress: () => { triggerCardZoom(zoomKey); return runShopAction(() => buyOrnament(objectId)) }, floatKey: zoomKey }) } : undefined}
    >
      {/* Rarity color swatch as visual */}
      <UiEntity
        uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(ss(8)) }, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{ color: rarityCol }}
      >
        <Label value="✦" fontSize={scaleShopCardContent(42)} color={{ r: 1, g: 1, b: 1, a: 0.9 }} textAlign="middle-center" />
      </UiEntity>

      <Label value={getShopCardTitleValue(def.name)} fontSize={getShopCardTitleFont(def.name)} color={SHOP_CARD_TEXT} textAlign="middle-center" />

      {/* Rarity + beauty row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: scaleShopCardContent(ss(4)) } }}>
        <Label value={RARITY_LABEL[def.rarity]} fontSize={scaleShopCardContent(16)} color={rarityTextCol} uiTransform={{ margin: { right: scaleShopCardContent(ss(8)) } }} />
        <Label value={`✦ ${def.beautyValue}`} fontSize={scaleShopCardContent(16)} color={SHOP_ORNAMENT_BEAUTY_COLOR} />
      </UiEntity>

      {placed ? (
        <Label value="Placed ✓" fontSize={scaleShopCardContent(SHOP_CARD_BODY)} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : full ? (
        <Label value="Slots Full" fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: scaleShopCardContent(ss(10)) } }} />
      ) : (
        <BuyButton
          cost={def.price}
          canAfford={canAfford}
          floatKey={zoomKey}
          onPress={() => { triggerCardZoom(zoomKey); return runShopAction(() => buyOrnament(objectId)) }}
        />
      )}
    </ShopCardFrame>
  )
}

const WorkerMetricCard = ({
  title,
  value,
  note,
  valueColor = SHOP_CARD_TEXT,
  noteColor = SHOP_WORKER_NOTE_COLOR,
}: {
  title: string
  value: string
  note?: string
  valueColor?: { r: number; g: number; b: number; a: number }
  noteColor?: { r: number; g: number; b: number; a: number }
}) => (
  <ShopCardFrame baseHeight={SHOP_CARD_H_WORKER} scale={1}>
    <Label value={getShopCardTitleValue(title)} fontSize={getShopCardTitleFont(title)} color={SHOP_WORKER_LABEL_COLOR} textAlign="middle-center" />
    <Label
      value={`<b>${value}</b>`}
      fontSize={scaleShopCardContent(SHOP_WORKER_VALUE_FONT)}
      color={valueColor}
      textAlign="middle-center"
      uiTransform={{ margin: { top: ss(14) } }}
    />
    {note && (
      <Label
        value={note}
        fontSize={scaleShopCardContent(SHOP_WORKER_NOTE_FONT)}
        color={noteColor}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(8) } }}
      />
    )}
  </ShopCardFrame>
)

const WorkerPayrollCard = ({
  balance,
  outstanding,
  canPay,
}: {
  balance: number
  outstanding: number
  canPay: boolean
}) => (
  <ShopCardFrame baseHeight={SHOP_CARD_H_WORKER} scale={1}>
    <Label value={getShopCardTitleValue('Payroll')} fontSize={getShopCardTitleFont('Payroll')} color={SHOP_WORKER_LABEL_COLOR} textAlign="middle-center" />
    <Label
      value={`<b>${balance}</b>`}
      fontSize={scaleShopCardContent(SHOP_WORKER_VALUE_FONT)}
      color={SHOP_WORKER_GOLD_COLOR}
      textAlign="middle-center"
      uiTransform={{ margin: { top: ss(14) } }}
    />
    <Label
      value="balance"
      fontSize={scaleShopCardContent(SHOP_WORKER_NOTE_FONT)}
      color={SHOP_WORKER_NOTE_COLOR}
      textAlign="middle-center"
      uiTransform={{ margin: { top: ss(8) } }}
    />
    {outstanding > 0 ? (
      <UiEntity uiTransform={{ alignItems: 'center' }}>
        {!canPay && (
          <Label
            value="Not enough coins"
            fontSize={scaleShopCardContent(SHOP_WORKER_NOTE_FONT)}
            color={SHOP_WORKER_WARNING_COLOR}
            textAlign="middle-center"
            uiTransform={{ margin: { top: ss(10) } }}
          />
        )}
        <BuyButton
          cost={outstanding}
          canAfford={canPay}
          onPress={() => {
            if (!canPay) return false
            requestPayWorkerWages()
            return true
          }}
        />
      </UiEntity>
    ) : (
      <Label
        value="<b>No wages due</b>"
        fontSize={scaleShopCardContent(SHOP_CARD_BODY)}
        color={SHOP_WORKER_SUCCESS_COLOR}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(18) } }}
      />
    )}
  </ShopCardFrame>
)


const WorkerPanel = () => {
  if (!getShopCropsUnlocked()) {
    return (
      <UiEntity uiTransform={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <WorkerMetricCard
          title="Workers"
          value="Locked"
          note="Unlock the worker area first"
          valueColor={SHOP_WORKER_WARNING_COLOR}
          noteColor={SHOP_WORKER_NOTE_COLOR}
        />
      </UiEntity>
    )
  }

  if (!getShopFarmerHired()) {
    return (
      <UiEntity uiTransform={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <WorkerMetricCard
          title="Workers"
          value="No hire"
          note="Hire the farm worker in the expansion"
          valueColor={SHOP_WORKER_WARNING_COLOR}
          noteColor={SHOP_WORKER_NOTE_COLOR}
        />
      </UiEntity>
    )
  }

  const workerState = getWorkerStatus({
    farmerHired: getShopFarmerHired(),
    workerUnpaidDays: getShopWorkerUnpaidDays(),
    farmerSeeds: getShopFarmerSeeds(),
  })
  const outstanding = getShopWorkerOutstandingWages()
  const outstandingDays = getWorkerDebtDays(outstanding)
  const canPay = outstanding > 0 && getShopCoins() >= outstanding
  const statusLabel =
    workerState === 'idle_unpaid'
      ? 'Idle (unpaid)'
      : workerState === 'idle_no_seeds'
        ? 'Idle (no seeds)'
        : 'Active'
  const statusValue =
    workerState === 'idle_unpaid'
      ? 'Idle'
      : workerState === 'idle_no_seeds'
        ? 'Idle'
        : 'Active'
  const statusNote =
    workerState === 'idle_unpaid'
      ? 'Back-pay due'
      : workerState === 'idle_no_seeds'
        ? 'No seeds loaded'
        : 'Worker running'
  const workerCards: ShopGridItem[] = [
    {
      key: 'worker-status',
      node: (
        <WorkerMetricCard
          title="Status"
          value={statusValue}
          note={statusNote}
          valueColor={workerState === 'idle_unpaid' ? SHOP_WORKER_WARNING_COLOR : SHOP_CARD_TEXT}
          noteColor={workerState === 'idle_unpaid' ? SHOP_WORKER_WARNING_COLOR : SHOP_WORKER_NOTE_COLOR}
        />
      ),
    },
    {
      key: 'worker-daily-wage',
      node: <WorkerMetricCard title="Daily Wage" value={`${WORKER_DAILY_WAGE}`} note="coins / day" />,
    },
    {
      key: 'worker-outstanding',
      node: (
        <WorkerMetricCard
          title="Outstanding"
          value={`${outstanding}`}
          note={outstanding === 1 ? 'coin due' : 'coins due'}
          valueColor={outstanding > 0 ? SHOP_WORKER_WARNING_COLOR : SHOP_WORKER_SUCCESS_COLOR}
          noteColor={outstanding > 0 ? SHOP_WORKER_WARNING_COLOR : SHOP_WORKER_NOTE_COLOR}
        />
      ),
    },
    {
      key: 'worker-missed-days',
      node: (
        <WorkerMetricCard
          title="Missed Days"
          value={`${getShopWorkerUnpaidDays()}`}
          note={getShopWorkerUnpaidDays() === 1 ? 'day missed' : 'days missed'}
          valueColor={getShopWorkerUnpaidDays() >= 2 ? SHOP_WORKER_WARNING_COLOR : SHOP_CARD_TEXT}
          noteColor={getShopWorkerUnpaidDays() >= 2 ? SHOP_WORKER_WARNING_COLOR : SHOP_WORKER_NOTE_COLOR}
        />
      ),
    },
    {
      key: 'worker-payroll',
      node: <WorkerPayrollCard balance={getShopCoins()} outstanding={outstanding} canPay={canPay} />,
    },
  ]

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <ShopCardGrid items={workerCards} slotHeight={getShopGridCardHeight(1, SHOP_CARD_H_WORKER)} />
      <UiEntity uiTransform={{ width: '100%', justifyContent: 'center', alignItems: 'center', margin: { top: ss(10) } }}>
        <Label
          value={
            outstanding > 0
              ? getShopWorkerUnpaidDays() >= 2
                ? `Worker stopped after ${outstandingDays} unpaid day${outstandingDays === 1 ? '' : 's'}. Clear all back-pay to reactivate them.`
                : `Back-pay accrued for ${outstandingDays} day${outstandingDays === 1 ? '' : 's'}.`
              : `Worker state: ${statusLabel}`
          }
          fontSize={scaleShopCardContent(SHOP_CARD_META)}
          color={outstanding > 0 ? SHOP_WORKER_WARNING_COLOR : C.header}
          textAlign="middle-center"
          uiTransform={{ width: Math.min(720, getShopContentWidth()) }}
        />
      </UiEntity>
    </UiEntity>
  )
}

const FertilizersPanel = () => {
  const owned      = getShopCompostBinUnlocked()
  const canAfford  = getShopCoins() >= COMPOST_BIN_PRICE
  // Compost bin is only purchasable once the Level 5 progression event has started
  const binEnabled = owned || isShopProgressionEventActive() || isShopRotSystemUnlocked()
  const zoomKey   = 'shop_compostbin'
  const scale     = getZoomScale(zoomKey)
  const fertilizerLeftInset = 0

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: '100%',
          padding: { left: fertilizerLeftInset },
          alignItems: 'center',
        }}
      >
        <Label
          value="Composting & Fertilizers"
          fontSize={28}
          color={C.header}
          uiTransform={{ margin: { bottom: 16 } }}
        />
        <Label
          value="Unlock the Compost Bin to turn rotten crops into powerful fertilizers."
          fontSize={21}
          color={C.textMute}
          uiTransform={{ margin: { bottom: 20 } }}
        />

        {/* Compost Bin card */}
        <ShopCardFrame
          baseHeight={SHOP_CARD_H_FERTILIZER}
          scale={scale}
          onCardPress={(!owned && binEnabled) ? () => { runShopBuyPress({ cost: COMPOST_BIN_PRICE, canAfford, onPress: () => { triggerCardZoom(zoomKey); return runShopAction(() => buyCompostBin()) }, floatKey: zoomKey }) } : undefined}
        >
        <UiEntity
          uiTransform={{ width: scaleShopCardContent(SHOP_CARD_ICON), height: scaleShopCardContent(SHOP_CARD_ICON), margin: { bottom: scaleShopCardContent(SHOP_CARD_ICON_MARGIN) }, flexShrink: 0 }}
          uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label value={getShopCardTitleValue('Compost Bin')} fontSize={getShopCardTitleFont('Compost Bin')} color={SHOP_CARD_TEXT} textAlign="middle-center" />
        <Label
          value="Turn rotten crops into fertilizers"
          fontSize={scaleShopCardContent(SHOP_CARD_SMALL)}
          color={SHOP_CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4), bottom: ss(6) } }}
        />
        {owned ? (
          <Label value="Owned ✓" fontSize={scaleShopCardContent(21)} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
        ) : binEnabled ? (
          <BuyButton
            cost={COMPOST_BIN_PRICE}
            canAfford={canAfford}
            floatKey={zoomKey}
            onPress={() => { triggerCardZoom(zoomKey); return runShopAction(() => buyCompostBin()) }}
          />
        ) : (
          <Label value="Unlocks at Level 5" fontSize={scaleShopCardContent(SHOP_CARD_META)} color={SHOP_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
        )}
        </ShopCardFrame>

      {owned && (
        <UiEntity
          uiTransform={{ width: Math.min(520, getShopContentWidth() - fertilizerLeftInset), margin: { top: 16 } }}
        >
          <Label
            value="Compost Bin unlocked — visit it on your farm to start composting rotten crops."
            fontSize={20}
            color={C.green}
            textAlign="middle-left"
          />
        </UiEntity>
      )}
      </UiEntity>
    </UiEntity>
  )
}

export const ShopMenu = () => {
  const tutorialActive = isShopMobileDebug() ? false : tutorialState.active

  const visibleCrops = ALL_CROP_TYPES.filter((ct) => {
    if (tutorialActive) return ct === CropType.Onion
    return getShopUnlockedCrops().has(ct)
  })
  const lockedCrops = tutorialActive
    ? []
    : ALL_CROP_TYPES.filter((ct) => !getShopUnlockedCrops().has(ct))

  const cropUnlockLevel = (ct: CropType): number | undefined => {
    const r = LEVEL_REWARDS.find((r) => r.cropType === ct && (r.type === 'seeds' || r.type === 'unlock_crop'))
    return r?.level
  }

  const tab      = shopTab.value
  const allSeeds = [
    ...visibleCrops.map((ct) => ({ ct, unlocked: true, unlockLevel: undefined as number | undefined })),
    ...lockedCrops.map((ct) => ({ ct, unlocked: false, unlockLevel: cropUnlockLevel(ct) })),
  ]
  const seedItems: ShopGridItem[] = allSeeds.map(({ ct, unlocked, unlockLevel }) => ({
    key: `${unlocked ? 'u' : 'l'}${ct}`,
    node: <ShopCard cropType={ct} unlocked={unlocked} unlockLevel={unlockLevel} />,
  }))
  const showPetGrain = getShopChickenCoopOwned() || getShopPigPenOwned()
  const petItems: ShopGridItem[] = [
    { key: 'dog', node: <DogCard /> },
    { key: 'chicken', node: <ChickenCoopCard /> },
    { key: 'pig', node: <PigPenCard /> },
    ...(showPetGrain ? [{ key: 'grain', node: <GrainCard /> }, { key: 'grain-bulk', node: <GrainBulkCard /> }] : []),
  ]
  const ornamentItems: ShopGridItem[] = Array.from(BEAUTY_OBJECTS.keys()).map((id) => ({
    key: `ornament-${id}`,
    node: <OrnamentCard objectId={id} />,
  }))
  const seedCardHeight = getShopGridCardHeight(1, SHOP_CARD_H_SHORT)
  const petCardHeight = getShopGridCardHeight(1, SHOP_CARD_H_PETS)
  const ornamentCardHeight = getShopGridCardHeight(1, SHOP_CARD_H_PETS)

  return (
    <ShopPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      {tab === 'seeds' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1 }}>
          <ShopCardGrid items={seedItems} slotHeight={seedCardHeight} />
        </UiEntity>
      )}

      {/* Pets tab */}
      {tab === 'pets' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <ShopCardGrid items={petItems} slotHeight={petCardHeight} />
        </UiEntity>
      )}

      {/* Ornaments tab */}
      {tab === 'ornaments' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <ShopCardGrid items={ornamentItems} slotHeight={ornamentCardHeight} />
          {!shopHasEmptySlot() && (
            <UiEntity
              uiTransform={{ width: '100%', justifyContent: 'center', alignItems: 'center', padding: { top: 10, bottom: 10, left: 18, right: 18 }, margin: { top: 8 } }}
            >
              <Label
                value="All 3 decoration slots are full — future update will let you swap ornaments"
                fontSize={20}
                color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
                textAlign="middle-center"
              />
            </UiEntity>
          )}
        </UiEntity>
      )}

      {tab === 'workers' && <WorkerPanel />}

      {tab === 'fertilizers' && <FertilizersPanel />}

    </ShopPanelFrame>
  )
}
