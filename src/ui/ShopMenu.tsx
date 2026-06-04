import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { buySeed, buyDog, buyOrnament, buyCompostBin, COMPOST_BIN_PRICE } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { CROP_SEED_IMAGES, COINS_IMAGE, DOG01_ICON, CHICKEN_ICON, GRAIN_ICON, ORGANIC_WASTE_ICON, PIG_ICON } from '../data/imagePaths'
import { C } from './PanelShell'
import { tutorialState } from '../game/tutorialState'
import { progressionEventState } from '../game/progressionEventState'
import { triggerCardZoom, getZoomScale } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { BEAUTY_OBJECTS, RARITY_COLOR, RARITY_LABEL } from '../data/beautyObjectData'
import { isOrnamentPlaced, hasEmptySlot } from '../systems/beautySpotSystem'
import { WORKER_DAILY_WAGE, WORKER_DEBUG_ENABLED, getWorkerDebtDays, getWorkerStatus } from '../shared/worker'
import { requestDebugWorkerAction, requestPayWorkerWages } from '../services/saveService'
import { GRAIN_BUY_PRICE, GRAIN_BULK_COUNT, GRAIN_BULK_PRICE, ANIMAL_BUY_PRICE, MAX_ANIMALS_PER_BUILDING, CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL, BUILDING_BUY_PRICE } from '../data/animalData'
import { buyGrain, buyAnimal, purchaseBuilding } from '../systems/animalSystem'
import { BadgeDot } from './BadgeDot'

type ShopTabValue = 'seeds' | 'pets' | 'ornaments' | 'workers' | 'fertilizers' | 'debug'
const SHOP_UI_SCALE = 0.8
const ss = (value: number) => Math.round(value * SHOP_UI_SCALE)

const shopTab  = { value: 'seeds' as ShopTabValue }
const SHOP_ATLAS = 'assets/images/ui_loading/shop_atlas.png'
const SHOP_ATLAS_SIZE = 1024
const SHOP_BG_RECT = { x: 17, y: 13, w: 993, h: 682 } as const
const SHOP_TAB_ACTIVE_RECT = { x: 27, y: 737, w: 265, h: 83 } as const
const SHOP_TAB_IDLE_RECT = { x: 297, y: 739, w: 265, h: 83 } as const
const SHOP_PANEL_W = ss(1290)
const SHOP_PANEL_H = Math.round((SHOP_PANEL_W * SHOP_BG_RECT.h) / SHOP_BG_RECT.w)
const SHOP_TAB_SCALE = 0.62 * SHOP_UI_SCALE
const SHOP_TAB_W = 160
const SHOP_TAB_H = Math.round(SHOP_TAB_ACTIVE_RECT.h * SHOP_TAB_SCALE)
const SHOP_TAB_GAP = ss(12)
const SHOP_CONTENT_LEFT = ss(82)
const SHOP_CONTENT_RIGHT = ss(34)
const SHOP_CONTENT_TOP = ss(176)
const SHOP_CONTENT_BOTTOM = ss(74)
const SHOP_CONTENT_W = SHOP_PANEL_W - SHOP_CONTENT_LEFT - SHOP_CONTENT_RIGHT
const SHOP_CONTENT_H = SHOP_PANEL_H - SHOP_CONTENT_TOP - SHOP_CONTENT_BOTTOM
const SHOP_CLOSE_HOTSPOT_SIZE = ss(74)
const SHOP_CLOSE_RIGHT = ss(28)
const SHOP_CLOSE_TOP = ss(16)
const SHOP_PANEL_TOP_MARGIN = ss(120)
const SHOP_CARD_BORDER = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const SHOP_CARD_BORDER_LOCKED = { r: 0.46, g: 0.39, b: 0.26, a: 0.9 }
const SHOP_CARD_FILL = { r: 0.23, g: 0.13, b: 0.05, a: 0.34 }
const SHOP_CARD_FILL_LOCKED = { r: 0.15, g: 0.10, b: 0.06, a: 0.28 }
const SHOP_MOBILE_FRAME_THICKNESS = 4
const SHOP_CARD_W = 160
const SHOP_CARD_H_SHORT = 196
const SHOP_CARD_H_TALL = 212
const SHOP_CARD_H_FERTILIZER = 212
const SHOP_CARD_MARGIN = ss(12)
const SHOP_CARD_PAD_TOP = ss(12)
const SHOP_CARD_PAD_BOTTOM = ss(12)
const SHOP_CARD_PAD_SIDE = ss(10)
const SHOP_CARD_ICON = ss(108)
const SHOP_CARD_ICON_MARGIN = ss(10)
const SHOP_CARD_TITLE_LG = ss(25)
const SHOP_CARD_TITLE_MD = ss(23)
const SHOP_CARD_TITLE_SM = ss(22)
const SHOP_CARD_BODY = ss(20)
const SHOP_CARD_META = ss(18)
const SHOP_CARD_SMALL = ss(16)
const SHOP_BUTTON_W = ss(175)
const SHOP_BUTTON_H = ss(58)
const SHOP_BUTTON_FONT = ss(24)
const SHOP_BUTTON_ICON = ss(34)
const SHOP_BUTTON_ICON_GAP = ss(8)
const SHOP_BUTTON_TOP_MARGIN = ss(10)
const SHOP_TAB_TOP = ss(104)

function getVisibleShopTabs() {
  return SHOP_TABS.filter((tabDef) => tabDef.show())
}

function getShopTabsLeftInset() {
  const visibleTabs = getVisibleShopTabs()
  const tabsRowWidth = visibleTabs.length * SHOP_TAB_W + Math.max(0, visibleTabs.length - 1) * SHOP_TAB_GAP
  return Math.max(0, Math.round((SHOP_CONTENT_W - tabsRowWidth) / 2))
}

function getShopCardTransform(baseHeight: number, scale: number, locked = false) {
  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    width: Math.round(SHOP_CARD_W * scale),
    height: Math.round(baseHeight * scale),
    margin: { right: SHOP_CARD_MARGIN, bottom: SHOP_CARD_MARGIN },
    padding: {
      top: SHOP_CARD_PAD_TOP,
      bottom: SHOP_CARD_PAD_BOTTOM,
      left: SHOP_CARD_PAD_SIDE,
      right: SHOP_CARD_PAD_SIDE,
    },
    borderWidth: 3,
    borderColor: locked ? SHOP_CARD_BORDER_LOCKED : SHOP_CARD_BORDER,
    borderRadius: 12,
  }
}

const ShopCardFrame = ({
  baseHeight,
  scale,
  locked = false,
  children,
}: {
  baseHeight: number
  scale: number
  locked?: boolean
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  const width = Math.round(SHOP_CARD_W * scale)
  const height = Math.round(baseHeight * scale)
  const frameColor = locked ? SHOP_CARD_BORDER_LOCKED : SHOP_CARD_BORDER

  return (
    <UiEntity
      uiTransform={getShopCardTransform(baseHeight, scale, locked)}
      uiBackground={mobile ? { color: locked ? SHOP_CARD_FILL_LOCKED : SHOP_CARD_FILL } : undefined}
    >
      {mobile && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width, height }}>
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width, height: SHOP_MOBILE_FRAME_THICKNESS }}
            uiBackground={{ color: frameColor }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { left: 0, bottom: 0 }, width, height: SHOP_MOBILE_FRAME_THICKNESS }}
            uiBackground={{ color: frameColor }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width: SHOP_MOBILE_FRAME_THICKNESS, height }}
            uiBackground={{ color: frameColor }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { right: 0, top: 0 }, width: SHOP_MOBILE_FRAME_THICKNESS, height }}
            uiBackground={{ color: frameColor }}
          />
        </UiEntity>
      )}
      {children}
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
  { key: 'debug', label: 'Debug', show: () => WORKER_DEBUG_ENABLED },
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

const ShopTabChip = ({
  label,
  selected,
  onClick,
  showBadge = false,
}: {
  key?: string
  label: string
  selected: boolean
  onClick: () => void
  showBadge?: boolean
}) => (
  <UiEntity
    uiTransform={{
      width: SHOP_TAB_W,
      height: SHOP_TAB_H,
      margin: { right: SHOP_TAB_GAP, bottom: SHOP_TAB_GAP },
    }}
  >
    <UiEntity
      uiTransform={{
        width: SHOP_TAB_W,
        height: SHOP_TAB_H,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{
        texture: { src: SHOP_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: shopAtlasUvsRotatedRight(selected ? SHOP_TAB_ACTIVE_RECT : SHOP_TAB_IDLE_RECT),
      }}
      onMouseDown={() => {
        playSound('buttonclick')
        onClick()
      }}
    >
      <Label
        value={label}
        fontSize={ss(22)}
        color={selected ? { r: 1, g: 1, b: 1, a: 1 } : { r: 0.84, g: 0.20, b: 0.16, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ width: SHOP_TAB_W - 20, height: SHOP_TAB_H }}
      />
    </UiEntity>
    {showBadge && (
      <UiEntity uiTransform={{ positionType: 'absolute', position: { right: -4, top: -4 } }}>
        <BadgeDot />
      </UiEntity>
    )}
  </UiEntity>
)

const ShopPanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const visibleTabs = getVisibleShopTabs()

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
          width: SHOP_PANEL_W,
          height: SHOP_PANEL_H,
          margin: { top: SHOP_PANEL_TOP_MARGIN },
          pointerFilter: 'block',
        }}
        uiBackground={{
          texture: { src: SHOP_ATLAS, wrapMode: 'clamp' },
          textureMode: 'stretch',
          uvs: shopAtlasUvsRotatedRight(SHOP_BG_RECT),
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: SHOP_CONTENT_LEFT, top: SHOP_TAB_TOP },
            width: SHOP_CONTENT_W,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {visibleTabs.map((tabDef) => (
            <ShopTabChip
              key={tabDef.key}
              label={tabDef.label}
              selected={shopTab.value === tabDef.key}
              showBadge={tabDef.key === 'fertilizers' && playerState.rotSystemUnlocked && !fertilizerTabSeen}
              onClick={() => {
                tabDef.onSelect?.()
                shopTab.value = tabDef.key
              }}
            />
          ))}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: SHOP_CONTENT_LEFT, top: SHOP_CONTENT_TOP },
            width: SHOP_CONTENT_W,
            height: SHOP_CONTENT_H,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: SHOP_CLOSE_RIGHT, top: SHOP_CLOSE_TOP },
            width: SHOP_CLOSE_HOTSPOT_SIZE,
            height: SHOP_CLOSE_HOTSPOT_SIZE,
          }}
          onMouseDown={() => {
            playSound('buttonclick')
            onClose()
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

type BuyButtonProps = { cost: number; canAfford: boolean; onPress: () => void }

const BuyButton = ({ cost, canAfford, onPress }: BuyButtonProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: SHOP_BUTTON_W,
      height: SHOP_BUTTON_H,
      margin: { top: SHOP_BUTTON_TOP_MARGIN },
      borderRadius: 10,
    }}
    uiBackground={{
      color: canAfford
        ? { r: 0.2, g: 0.55, b: 0.2, a: 1 }
        : { r: 0.25, g: 0.25, b: 0.25, a: 1 },
    }}
    onMouseDown={canAfford ? () => { playSound('buttonclick'); onPress() } : undefined}
  >
    <Label
      value={`${cost}`}
      fontSize={SHOP_BUTTON_FONT}
      color={canAfford ? C.textMain : C.textMute}
      textAlign="middle-center"
      uiTransform={{ margin: { right: SHOP_BUTTON_ICON_GAP } }}
    />
    <UiEntity
      uiTransform={{ width: SHOP_BUTTON_ICON, height: SHOP_BUTTON_ICON }}
      uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />
  </UiEntity>
)

type ShopCardProps = { key?: string | number; cropType: CropType; unlocked: boolean; unlockLevel?: number }

const ShopCard = ({ cropType, unlocked, unlockLevel }: ShopCardProps) => {
  const def       = CROP_DATA.get(cropType)!
  const canAfford = playerState.coins >= def.seedCost
  const imgSrc    = CROP_SEED_IMAGES[cropType]
  const zoomKey   = `shop_${cropType}`
  const scale     = getZoomScale(zoomKey)
  const lockLabel = unlockLevel ? `Unlock at Level ${unlockLevel}` : 'Locked'

  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_SHORT} scale={scale} locked={!unlocked}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: unlocked ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />
      <Label
        value={def.name}
        fontSize={SHOP_CARD_TITLE_LG}
        color={unlocked ? C.textMain : C.textMute}
        textAlign="middle-center"
      />
      {unlocked ? (
        <BuyButton
          cost={def.seedCost}
          canAfford={canAfford}
          onPress={() => { triggerCardZoom(zoomKey); buySeed(cropType, 1) }}
        />
      ) : (
        <Label value={lockLabel} fontSize={SHOP_CARD_BODY} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: SHOP_BUTTON_TOP_MARGIN } }} />
      )}
    </ShopCardFrame>
  )
}

const DogCard = () => {
  const canAfford = playerState.coins >= 500
  const scale     = getZoomScale('shop_dog')

  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{ texture: { src: DOG01_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Dog" fontSize={SHOP_CARD_TITLE_LG} color={C.textMain} textAlign="middle-center" />
      {playerState.dogOwned ? (
        <Label value="Owned" fontSize={SHOP_CARD_BODY} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: SHOP_BUTTON_TOP_MARGIN } }} />
      ) : (
        <BuyButton cost={500} canAfford={canAfford} onPress={() => { triggerCardZoom('shop_dog'); buyDog() }} />
      )}
    </ShopCardFrame>
  )
}

const ChickenCoopCard = () => {
  const owned   = playerState.chickenCoopOwned
  const locked  = !owned && playerState.level < CHICKEN_COOP_UNLOCK_LEVEL
  const levelMet = playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL
  const canAffordBuilding = playerState.coins >= BUILDING_BUY_PRICE
  const canAffordAnimal   = playerState.coins >= ANIMAL_BUY_PRICE
  const atMax   = playerState.chickens.length >= MAX_ANIMALS_PER_BUILDING
  const scale   = getZoomScale('shop_chicken')

  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{ texture: { src: CHICKEN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Chicken Coop" fontSize={SHOP_CARD_TITLE_MD} color={C.textMain} textAlign="middle-center" />
      {locked ? (
        <Label value={`Locked — Level ${CHICKEN_COOP_UNLOCK_LEVEL}`} fontSize={18} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : !owned ? (
        <BuyButton cost={BUILDING_BUY_PRICE} canAfford={canAffordBuilding} onPress={() => { triggerCardZoom('shop_chicken'); purchaseBuilding('chicken') }} />
      ) : atMax ? (
        <Label value={`Full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})`} fontSize={20} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : (
        <BuyButton cost={ANIMAL_BUY_PRICE} canAfford={canAffordAnimal} onPress={() => { triggerCardZoom('shop_chicken'); buyAnimal('chicken') }} />
      )}
    </ShopCardFrame>
  )
}

const PigPenCard = () => {
  const owned   = playerState.pigPenOwned
  const locked  = !owned && playerState.level < PIG_PEN_UNLOCK_LEVEL
  const levelMet = playerState.level >= PIG_PEN_UNLOCK_LEVEL
  const canAffordBuilding = playerState.coins >= BUILDING_BUY_PRICE
  const canAffordAnimal   = playerState.coins >= ANIMAL_BUY_PRICE
  const atMax   = playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING
  const scale   = getZoomScale('shop_pig')

  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Pig Pen" fontSize={SHOP_CARD_TITLE_MD} color={C.textMain} textAlign="middle-center" />
      {locked ? (
        <Label value={`Locked — Level ${PIG_PEN_UNLOCK_LEVEL}`} fontSize={18} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : !owned ? (
        <BuyButton cost={BUILDING_BUY_PRICE} canAfford={canAffordBuilding} onPress={() => { triggerCardZoom('shop_pig'); purchaseBuilding('pig') }} />
      ) : atMax ? (
        <Label value={`Full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})`} fontSize={20} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : (
        <BuyButton cost={ANIMAL_BUY_PRICE} canAfford={canAffordAnimal} onPress={() => { triggerCardZoom('shop_pig'); buyAnimal('pig') }} />
      )}
    </ShopCardFrame>
  )
}

const GrainCard = () => {
  const canAfford = playerState.coins >= GRAIN_BUY_PRICE
  const scale     = getZoomScale('shop_grain_1')
  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{ texture: { src: GRAIN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Grain" fontSize={SHOP_CARD_TITLE_MD} color={C.textMain} textAlign="middle-center" />
      <Label value="1 unit" fontSize={SHOP_CARD_META} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: ss(2), bottom: ss(4) } }} />
      <BuyButton cost={GRAIN_BUY_PRICE} canAfford={canAfford} onPress={() => { triggerCardZoom('shop_grain_1'); buyGrain(1, GRAIN_BUY_PRICE) }} />
    </ShopCardFrame>
  )
}

const GrainBulkCard = () => {
  const canAfford = playerState.coins >= GRAIN_BULK_PRICE
  const scale     = getZoomScale('shop_grain_bulk')
  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
        uiBackground={{ texture: { src: GRAIN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Grain (Bulk)" fontSize={SHOP_CARD_TITLE_SM} color={C.textMain} textAlign="middle-center" />
      <Label value={`${GRAIN_BULK_COUNT} units`} fontSize={SHOP_CARD_META} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: ss(2), bottom: ss(4) } }} />
      <BuyButton cost={GRAIN_BULK_PRICE} canAfford={canAfford} onPress={() => { triggerCardZoom('shop_grain_bulk'); buyGrain(GRAIN_BULK_COUNT, GRAIN_BULK_PRICE) }} />
    </ShopCardFrame>
  )
}

const OrnamentCard = ({ objectId }: { objectId: number }) => {
  const def       = BEAUTY_OBJECTS.get(objectId)!
  const placed    = isOrnamentPlaced(objectId)
  const full      = !hasEmptySlot()
  const canAfford = playerState.coins >= def.price
  const canBuy    = !placed && !full && canAfford
  const zoomKey   = `shop_ornament_${objectId}`
  const scale     = getZoomScale(zoomKey)
  const rarityCol = RARITY_COLOR[def.rarity]

  return (
    <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
      {/* Rarity color swatch as visual */}
      <UiEntity
        uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{ color: rarityCol }}
      >
        <Label value="✦" fontSize={42} color={{ r: 1, g: 1, b: 1, a: 0.9 }} textAlign="middle-center" />
      </UiEntity>

      <Label value={def.name} fontSize={SHOP_CARD_TITLE_SM} color={C.textMain} textAlign="middle-center" />

      {/* Rarity + beauty row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 4 } }}>
        <Label value={RARITY_LABEL[def.rarity]} fontSize={16} color={rarityCol} uiTransform={{ margin: { right: 8 } }} />
        <Label value={`✦ ${def.beautyValue}`} fontSize={16} color={C.gold} />
      </UiEntity>

      {placed ? (
        <Label value="Placed ✓" fontSize={20} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : full ? (
        <Label value="Slots Full" fontSize={18} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : (
        <BuyButton
          cost={def.price}
          canAfford={canAfford}
          onPress={() => { triggerCardZoom(zoomKey); buyOrnament(objectId) }}
        />
      )}
    </ShopCardFrame>
  )
}


const WorkerPanel = () => {
  if (!playerState.cropsUnlocked) {
    return (
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 22, bottom: 22, left: 22, right: 22 }, alignItems: 'center' }}
      >
        <Label
          value="Unlock the farm expansion first. The worker payroll terminal becomes available once the worker area is open."
          fontSize={20}
          color={C.textMain}
          textAlign="middle-center"
        />
      </UiEntity>
    )
  }

  if (!playerState.farmerHired) {
    return (
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 22, bottom: 22, left: 22, right: 22 }, alignItems: 'center' }}
      >
        <Label
          value="No worker hired yet. Talk to the farm worker in the expansion and hire them there."
          fontSize={20}
          color={C.textMain}
          textAlign="middle-center"
        />
      </UiEntity>
    )
  }

  const workerState = getWorkerStatus({
    farmerHired: playerState.farmerHired,
    workerUnpaidDays: playerState.workerUnpaidDays,
    farmerSeeds: playerState.farmerSeeds,
  })
  const outstanding = playerState.workerOutstandingWages
  const outstandingDays = getWorkerDebtDays(outstanding)
  const canPay = outstanding > 0 && playerState.coins >= outstanding
  const statusLabel =
    workerState === 'idle_unpaid'
      ? 'Idle (unpaid)'
      : workerState === 'idle_no_seeds'
        ? 'Idle (no seeds)'
        : 'Active'

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 20, bottom: 20, left: 20, right: 20 }, margin: { bottom: 16 }, alignItems: 'center' }}
      >
        <Label value="Worker Payroll" fontSize={26} color={C.header} textAlign="middle-center" uiTransform={{ margin: { bottom: 10 } }} />
        <Label value={`Status: ${statusLabel}`} fontSize={21} color={workerState === 'idle_unpaid' ? C.orange : C.textMain} textAlign="middle-center" />
        <Label value={`Daily wage: ${WORKER_DAILY_WAGE} coins`} fontSize={19} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
        <Label value={`Outstanding wages: ${outstanding} coins`} fontSize={21} color={outstanding > 0 ? C.orange : C.green} textAlign="middle-center" uiTransform={{ margin: { top: 12 } }} />
        <Label
          value={`Missed wage days: ${playerState.workerUnpaidDays}`}
          fontSize={19}
          color={playerState.workerUnpaidDays >= 2 ? C.orange : C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 8 } }}
        />
        {outstanding > 0 && (
          <Label
            value={
              playerState.workerUnpaidDays >= 2
                ? `Worker stopped after ${outstandingDays} unpaid day${outstandingDays === 1 ? '' : 's'}. Clear all back-pay to reactivate them.`
                : `Back-pay accrued for ${outstandingDays} day${outstandingDays === 1 ? '' : 's'}.`
            }
            fontSize={18}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 8 } }}
          />
        )}
      </UiEntity>

      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 18, bottom: 18, left: 20, right: 20 }, alignItems: 'center' }}
      >
        <Label value={`Balance: ${playerState.coins} coins`} fontSize={21} color={C.gold} textAlign="middle-center" uiTransform={{ margin: { bottom: 12 } }} />
        {outstanding > 0 && playerState.coins < outstanding && (
          <Label
            value="Insufficient balance. Sell crops or collect earnings before paying wages."
            fontSize={18}
            color={{ r: 1, g: 0.62, b: 0.52, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 14 } }}
          />
        )}
        <Button
          value={outstanding > 0 ? `Pay ${outstanding} coins` : 'No wages due'}
          variant={canPay ? 'primary' : 'secondary'}
          disabled={!canPay}
          fontSize={26}
          uiTransform={{ width: 340, height: 76 }}
          onMouseDown={() => { if (!canPay) return; playSound('buttonclick'); requestPayWorkerWages() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

const DebugActionButton = ({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Button
    value={label}
    variant={disabled ? 'secondary' : 'primary'}
    disabled={disabled}
    fontSize={22}
    uiTransform={{ width: 260, height: 68, margin: { right: 12, bottom: 12 } }}
    onMouseDown={() => { if (disabled) return; playSound('buttonclick'); onPress() }}
  />
)

const DebugPanel = () => (
  <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
    <UiEntity
      uiTransform={{ width: '100%', padding: { top: 18, bottom: 18, left: 20, right: 20 }, margin: { bottom: 16 } }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label value="Worker Debug" fontSize={30} color={C.header} textAlign="middle-left" uiTransform={{ margin: { bottom: 10 } }} />
      <Label
        value="Use this panel to prepare the worker test scenario without editing storage files. It mutates your saved farm state directly on the authoritative server."
        fontSize={21}
        color={C.textMain}
        textAlign="middle-left"
      />
      <Label
        value={`Live snapshot: coins=${playerState.coins}, hired=${playerState.farmerHired ? 'yes' : 'no'}, worker seeds=${Array.from(playerState.farmerSeeds.values()).reduce((sum, count) => sum + count, 0)}, debt=${playerState.workerOutstandingWages}, unpaidDays=${playerState.workerUnpaidDays}`}
        fontSize={19}
        color={C.textMute}
        textAlign="middle-left"
        uiTransform={{ margin: { top: 10 } }}
      />
    </UiEntity>

    <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
      <DebugActionButton label="Prepare Worker Test" onPress={() => { requestDebugWorkerAction('setup') }} />
      <DebugActionButton label="+1000 Coins" onPress={() => { requestDebugWorkerAction('add_coins', 1000) }} />
      <DebugActionButton label="Set Coins To 0" onPress={() => { requestDebugWorkerAction('set_coins', 0) }} />
      <DebugActionButton label="Load 20 Worker Seeds" onPress={() => { requestDebugWorkerAction('load_seeds', 20) }} />
      <DebugActionButton label="Clear Worker Seeds" onPress={() => { requestDebugWorkerAction('clear_seeds') }} />
      <DebugActionButton label="Advance 1 Day" onPress={() => { requestDebugWorkerAction('advance_days', 1) }} />
      <DebugActionButton label="Advance 2 Days" onPress={() => { requestDebugWorkerAction('advance_days', 2) }} />
      <DebugActionButton label="Clear Wage Debt" onPress={() => { requestDebugWorkerAction('clear_debt') }} />
      <DebugActionButton label="Simulate 4h Offline" onPress={() => { requestDebugWorkerAction('simulate_offline', 4) }} />
      <DebugActionButton label="Simulate 24h Offline" onPress={() => { requestDebugWorkerAction('simulate_offline', 24) }} />
    </UiEntity>
  </UiEntity>
)

const FertilizersPanel = () => {
  const owned      = playerState.compostBinUnlocked
  const canAfford  = playerState.coins >= COMPOST_BIN_PRICE
  // Compost bin is only purchasable once the Level 5 progression event has started
  const binEnabled = owned || progressionEventState.active || playerState.rotSystemUnlocked
  const zoomKey   = 'shop_compostbin'
  const scale     = getZoomScale(zoomKey)
  const tabsLeftInset = getShopTabsLeftInset()

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: '100%',
          padding: { left: tabsLeftInset },
          alignItems: 'flex-start',
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
        <ShopCardFrame baseHeight={SHOP_CARD_H_TALL} scale={scale}>
        <UiEntity
          uiTransform={{ width: SHOP_CARD_ICON, height: SHOP_CARD_ICON, margin: { bottom: SHOP_CARD_ICON_MARGIN }, flexShrink: 0 }}
          uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label value="Compost Bin" fontSize={SHOP_CARD_TITLE_MD} color={C.textMain} textAlign="middle-center" />
        <Label
          value="Turn rotten crops into fertilizers"
          fontSize={SHOP_CARD_SMALL}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4), bottom: ss(6) } }}
        />
        {owned ? (
          <Label value="Owned ✓" fontSize={21} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
        ) : binEnabled ? (
          <BuyButton
            cost={COMPOST_BIN_PRICE}
            canAfford={canAfford}
            onPress={() => { triggerCardZoom(zoomKey); buyCompostBin() }}
          />
        ) : (
          <Label value="Unlocks at Level 5" fontSize={SHOP_CARD_META} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
        )}
        </ShopCardFrame>

      {owned && (
        <UiEntity
          uiTransform={{ width: Math.min(520, SHOP_CONTENT_W - tabsLeftInset), margin: { top: 16 } }}
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
  const tutorialActive = tutorialState.active

  const visibleCrops = ALL_CROP_TYPES.filter((ct) => {
    if (tutorialActive) return ct === CropType.Onion
    return playerState.unlockedCrops.has(ct)
  })
  const lockedCrops = tutorialActive ? [] : ALL_CROP_TYPES.filter((ct) => !playerState.unlockedCrops.has(ct))

  const cropUnlockLevel = (ct: CropType): number | undefined => {
    const r = LEVEL_REWARDS.find((r) => r.cropType === ct && (r.type === 'seeds' || r.type === 'unlock_crop'))
    return r?.level
  }

  const tab      = shopTab.value
  const allSeeds = [
    ...visibleCrops.map((ct) => ({ ct, unlocked: true, unlockLevel: undefined as number | undefined })),
    ...lockedCrops.map((ct) => ({ ct, unlocked: false, unlockLevel: cropUnlockLevel(ct) })),
  ]
  const seedSlice = allSeeds

  return (
    <ShopPanelFrame
      onClose={() => { playerState.activeMenu = 'none' }}
    >

      {/* Seeds tab */}
      {tab === 'seeds' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1 }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', flex: 1, alignContent: 'flex-start', justifyContent: 'center' }}>
            {seedSlice.map(({ ct, unlocked, unlockLevel }) => (
              <ShopCard key={`${unlocked ? 'u' : 'l'}${ct}`} cropType={ct} unlocked={unlocked} unlockLevel={unlockLevel} />
            ))}
            {lockedCrops.length > 0 && !tutorialActive && (
              <UiEntity
                uiTransform={{ width: '100%', padding: { top: 10, bottom: 10, left: 18, right: 18 }, margin: { top: 4 } }}
                uiBackground={{ color: { r: 0.18, g: 0.12, b: 0.04, a: 1 } }}
              >
                <Label
                  value="Higher-tier seeds unlock as you level up — claim level rewards in the Stats panel"
                  fontSize={20}
                  color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
                  textAlign="middle-center"
                />
              </UiEntity>
            )}
          </UiEntity>
        </UiEntity>
      )}

      {/* Pets tab */}
      {tab === 'pets' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
            <DogCard />
            <ChickenCoopCard />
            <PigPenCard />
            {(playerState.chickenCoopOwned || playerState.pigPenOwned) && <GrainCard />}
            {(playerState.chickenCoopOwned || playerState.pigPenOwned) && <GrainBulkCard />}
          </UiEntity>
        </UiEntity>
      )}

      {/* Ornaments tab */}
      {tab === 'ornaments' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
            {Array.from(BEAUTY_OBJECTS.keys()).map((id) => (
              <OrnamentCard objectId={id} />
            ))}
          </UiEntity>
          {!hasEmptySlot() && (
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

      {WORKER_DEBUG_ENABLED && tab === 'debug' && <DebugPanel />}

    </ShopPanelFrame>
  )
}
