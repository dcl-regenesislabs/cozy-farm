import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import {
  COINS_IMAGE,
  CHICKEN_ICON,
  PIG_ICON,
  EGG_ICON,
  GRAIN_ICON,
  MANURE_ICON,
  VEGGIE_SCRAP_ICON,
} from '../data/imagePaths'
import {
  EGG_CYCLE_MS,
  PIG_CYCLE_MS,
  CHICKEN_COOP_UNLOCK_LEVEL,
  PIG_PEN_UNLOCK_LEVEL,
  BUILDING_BUY_PRICE,
  MAX_ANIMALS_PER_BUILDING,
  getPigStage,
  PIG_BREED_COOLDOWN,
} from '../data/animalData'
import { buyAnimal, breedPigs, harvestPig, purchaseBuilding } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'
import { RevampPanelFrame } from './RevampPanel'
import { SHARED_PAGINATION_HEIGHT_DESKTOP, SHARED_PAGINATION_HEIGHT_MOBILE, SharedPaginationBar } from './SharedPaginationBar'
import { MiniTextButton, MINI_BUTTON_IMG, MINI_BUTTON_NO_COIN_IMG, PillTabButton } from './RevampButtons'

type AnimalTabValue = 'coop' | 'pigPen' | 'stock'
type AnimalCardSpec = {
  key: string
  iconSrc: string
  title: string
  meta?: string
  status: string
  statusColor: { r: number; g: number; b: number; a: number }
  note?: string
  buttonLabel?: string
  buttonEnabled?: boolean
  buttonTextureSrc?: string
  buttonTextColor?: { r: number; g: number; b: number; a: number }
  onButtonPress?: () => void
  onCardPress?: () => void
  locked?: boolean
}

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const CARD_IMG = 'assets/images/revamp/card.png'
const CARD_LOCKED_IMG = 'assets/images/revamp/lockedlevel.png'

const CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const STATUS_SUCCESS = { r: 0.24, g: 0.66, b: 0.18, a: 1 }
const STATUS_WARNING = { r: 0.88, g: 0.46, b: 0.14, a: 1 }
const STATUS_INFO = { r: 0.20, g: 0.46, b: 0.88, a: 1 }
const STATUS_MUTE = { r: 0.48, g: 0.34, b: 0.18, a: 1 }

const TAB_W = 166
const TAB_GAP = ss(12)
const CONTENT_TOP_GAP = ss(8)
const GRID_TOP_GAP = ss(12)
const PAGINATION_MARGIN_TOP = ss(24)
const ITEMS_PER_PAGE = 4

const CARD_W = 208
const CARD_H = 332
const CARD_MARGIN = 2
const CARD_PAD_TOP = 28
const CARD_PAD_BOTTOM = 34
const CARD_PAD_SIDE = 16
const CARD_BG_SCALE = 1.14
const CARD_BG_SCALE_MOBILE = 1.18
const CARD_CONTENT_SCALE_MOBILE = 1.22
const CARD_ART_ASPECT = 236 / 326
const GRID_CARD_SLOT_TRIM = 10
const CARD_ICON = 96
const CARD_ICON_TOP_SPACE = ss(12)
const CARD_ICON_MARGIN = ss(12)
const CARD_TITLE_LG = ss(28)
const CARD_TITLE_SM = ss(24)
const CARD_META_FONT = ss(18)
const CARD_STATUS_FONT = ss(24)
const CARD_NOTE_FONT = ss(16)
const ACTION_BUTTON_W = 126
const ACTION_BUTTON_FONT = ss(20)
const MOBILE_TITLE_BLOCK_H = ss(56)
const MOBILE_META_BLOCK_H = ss(24)
const MOBILE_STATUS_BLOCK_H = ss(30)
const MOBILE_NOTE_BLOCK_H = ss(44)

const animalTab = { value: 'coop' as AnimalTabValue }
const animalPage: Record<AnimalTabValue, number> = { coop: 0, pigPen: 0, stock: 0 }

const PIG_STAGE_LABELS: Record<string, string> = {
  piglet: 'Piglet',
  adolescent: 'Teen',
  adult: 'Adult',
  harvestable: 'Ready!'
}

function formatMs(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function nextEggMs(lastEggAt: number): number {
  if (lastEggAt <= 0) return EGG_CYCLE_MS
  return Math.max(0, lastEggAt + EGG_CYCLE_MS - Date.now())
}

function nextManureMs(lastManureAt: number): number {
  if (lastManureAt <= 0) return PIG_CYCLE_MS
  return Math.max(0, lastManureAt + PIG_CYCLE_MS - Date.now())
}

function scaleCardContent(value: number): number {
  return isMobile() ? Math.round(value * CARD_CONTENT_SCALE_MOBILE) : value
}

function getCardBgScale(): number {
  return isMobile() ? CARD_BG_SCALE_MOBILE : CARD_BG_SCALE
}

function getCardTitleFont(title: string): number {
  return title.length <= 12 ? scaleCardContent(CARD_TITLE_LG) : scaleCardContent(CARD_TITLE_SM)
}

function getCardStatusFont(status: string): number {
  if (status.length > 13) return scaleCardContent(CARD_META_FONT + ss(1))
  if (status.length > 10) return scaleCardContent(CARD_STATUS_FONT - ss(2))
  return scaleCardContent(CARD_STATUS_FONT)
}

function getCardNoteFont(note: string): number {
  if (note.length > 34) return scaleCardContent(CARD_NOTE_FONT - ss(1))
  return scaleCardContent(CARD_NOTE_FONT)
}

function getCardTransform(scale = 1) {
  const bgScale = getCardBgScale()
  const width = Math.round(CARD_W * scale * bgScale)
  const artHeight = Math.round(width / CARD_ART_ASPECT)
  const baseHeightScaled = Math.round(CARD_H * scale * bgScale)

  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    width,
    height: Math.max(artHeight, baseHeightScaled),
    margin: { right: CARD_MARGIN, bottom: CARD_MARGIN },
    padding: {
      top: isMobile() ? CARD_PAD_TOP + 8 : CARD_PAD_TOP,
      bottom: isMobile() ? CARD_PAD_BOTTOM + 8 : CARD_PAD_BOTTOM,
      left: isMobile() ? 12 : CARD_PAD_SIDE,
      right: isMobile() ? 12 : CARD_PAD_SIDE,
    },
  }
}

function getCardVisualWidth(scale = 1): number {
  return Math.round(CARD_W * scale * getCardBgScale())
}

function getGridSlotWidth(scale = 1): number {
  return Math.max(0, getCardVisualWidth(scale) - GRID_CARD_SLOT_TRIM)
}

function getGridSlotHeight(scale = 1): number {
  return getCardTransform(scale).height
}

function getGridTopGap(): number {
  return isMobile() ? 0 : GRID_TOP_GAP
}

function getMobileTextBlockTransform(height: number) {
  return isMobile()
    ? {
        width: '100%' as const,
        height: scaleCardContent(height),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      }
    : { width: '100%' as const }
}

const AnimalCardFrame = ({
  locked = false,
  onCardPress,
  children,
}: {
  locked?: boolean
  onCardPress?: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const transform = getCardTransform(1)

  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={{
        texture: { src: locked ? CARD_LOCKED_IMG : CARD_IMG, wrapMode: 'clamp' },
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

const AnimalInfoCard = ({
  iconSrc,
  title,
  meta,
  status,
  statusColor,
  note,
  buttonLabel,
  buttonEnabled = true,
  buttonTextureSrc = MINI_BUTTON_NO_COIN_IMG,
  buttonTextColor,
  onButtonPress,
  onCardPress,
  locked = false,
}: AnimalCardSpec) => {
  const transform = getCardTransform(1)
  const buttonPress = onButtonPress ?? onCardPress

  return (
    <AnimalCardFrame locked={locked} onCardPress={buttonPress}>
      <UiEntity uiTransform={{ height: scaleCardContent(CARD_ICON_TOP_SPACE), flexShrink: 0 }} />

      <UiEntity
        uiTransform={{
          width: scaleCardContent(CARD_ICON),
          height: scaleCardContent(CARD_ICON),
          margin: { bottom: scaleCardContent(CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: iconSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: locked ? { r: 1, g: 1, b: 1, a: 0.58 } : { r: 1, g: 1, b: 1, a: 1 },
        }}
      />

      <Label
        value={`<b>${title}</b>`}
        fontSize={getCardTitleFont(title)}
        color={locked ? CARD_TEXT_MUTE : CARD_TEXT}
        textAlign="middle-center"
        uiTransform={getMobileTextBlockTransform(MOBILE_TITLE_BLOCK_H)}
      />

      {meta && (
        <Label
          value={meta}
          fontSize={scaleCardContent(CARD_META_FONT)}
          color={CARD_TEXT_MUTE}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            ...getMobileTextBlockTransform(MOBILE_META_BLOCK_H),
            margin: { top: ss(4) }
          }}
        />
      )}

      <Label
        value={`<b>${status}</b>`}
        fontSize={getCardStatusFont(status)}
        color={locked ? CARD_TEXT_MUTE : statusColor}
        textAlign="middle-center"
        textWrap="nowrap"
        uiTransform={{
          ...getMobileTextBlockTransform(MOBILE_STATUS_BLOCK_H),
          margin: { top: ss(10) }
        }}
      />

      {note && (
        <Label
          value={note}
          fontSize={getCardNoteFont(note)}
          color={CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{
            ...getMobileTextBlockTransform(MOBILE_NOTE_BLOCK_H),
            margin: { top: ss(8) }
          }}
        />
      )}

      <UiEntity uiTransform={{ flex: 1 }} />

      {buttonLabel && (
        <MiniTextButton
          label={buttonLabel}
          width={Math.round(ACTION_BUTTON_W * (isMobile() ? CARD_CONTENT_SCALE_MOBILE : 1))}
          fontSize={scaleCardContent(ACTION_BUTTON_FONT)}
          topOffset={-scaleCardContent(4)}
          textureSrc={buttonTextureSrc}
          textColor={buttonTextColor}
          disabled={!buttonEnabled}
          onPress={buttonPress}
        />
      )}

      {!buttonLabel && onCardPress && !isMobile() && (
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
    </AnimalCardFrame>
  )
}

const AnimalCardGrid = ({ items }: { items: AnimalCardSpec[] }) => {
  const columns = isMobile() ? 2 : 4
  const slotWidth = getGridSlotWidth()
  const slotHeight = getGridSlotHeight()
  const visualWidth = getCardVisualWidth()
  const offsetX = Math.round((slotWidth - visualWidth) / 2)
  const rows: AnimalCardSpec[][] = []

  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns))
  }

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        margin: { top: getGridTopGap() },
      }}
    >
      {rows.map((row, rowIndex) => (
        <UiEntity
          key={`animal-row-${rowIndex}`}
          uiTransform={{
            flexDirection: 'row',
            width: row.length * slotWidth,
            height: slotHeight,
            justifyContent: 'center',
            margin: { bottom: rowIndex < rows.length - 1 ? ss(10) : 0 },
          }}
        >
          {row.map((item) => (
            <UiEntity key={item.key} uiTransform={{ width: slotWidth, height: slotHeight }}>
              <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                <AnimalInfoCard {...item} />
              </UiEntity>
            </UiEntity>
          ))}
        </UiEntity>
      ))}
    </UiEntity>
  )
}

function withSound(action: () => void): () => void {
  return () => {
    playSound('buttonclick')
    action()
  }
}

function buildCoopCards(): AnimalCardSpec[] {
  if (!playerState.chickenCoopOwned) {
    if (playerState.level < CHICKEN_COOP_UNLOCK_LEVEL) {
      return [
        {
          key: 'coop-locked',
          iconSrc: CHICKEN_ICON,
          title: 'Chicken Coop',
          status: `Level ${CHICKEN_COOP_UNLOCK_LEVEL}`,
          statusColor: STATUS_MUTE,
          note: 'Unlocks later in the Pets tab.',
          locked: true
        }
      ]
    }

    return [
      {
        key: 'coop-buy',
        iconSrc: CHICKEN_ICON,
        title: 'Chicken Coop',
        meta: 'Building available',
        status: `${BUILDING_BUY_PRICE} coins`,
        statusColor: STATUS_WARNING,
        note: 'Unlock your first coop and start producing eggs.',
        buttonLabel: 'BUY',
        buttonTextureSrc: MINI_BUTTON_IMG,
        buttonEnabled: playerState.coins >= BUILDING_BUY_PRICE,
        onButtonPress: withSound(() => purchaseBuilding('chicken'))
      }
    ]
  }

  const cards: AnimalCardSpec[] = [
    {
      key: 'coop-summary',
      iconSrc: CHICKEN_ICON,
      title: 'Chicken Coop',
      meta: `Food ${playerState.chickenFoodInBowl} units`,
      status: `${playerState.chickens.length} / ${MAX_ANIMALS_PER_BUILDING}`,
      statusColor: STATUS_SUCCESS,
      note: 'Chickens currently living in the coop.'
    },
    {
      key: 'egg-stock',
      iconSrc: EGG_ICON,
      title: 'Egg Stock',
      meta: 'Current inventory',
      status: `${playerState.eggsCount}`,
      statusColor: STATUS_WARNING,
      note: 'Sell them later from the market UI.'
    },
    {
      key: 'coop-clean',
      iconSrc: MANURE_ICON,
      title: 'Coop Status',
      meta: playerState.chickenCoopDirtyAt > 0 ? 'Dirty' : 'Clean',
      status: playerState.chickenCoopDirtyAt > 0 ? 'Needs cleaning' : 'All good',
      statusColor: playerState.chickenCoopDirtyAt > 0 ? STATUS_WARNING : STATUS_SUCCESS,
      note: playerState.chickenCoopDirtyAt > 0 ? 'Clean the dirt pile in-scene.' : 'No cleanup needed right now.'
    }
  ]

  playerState.chickens.forEach((chicken, index) => {
    const timer = playerState.chickenFoodInBowl > 0 ? formatMs(nextEggMs(chicken.lastEggAt)) : 'No food'
    const ready = timer === 'Ready!'
    cards.push({
      key: chicken.id,
      iconSrc: CHICKEN_ICON,
      title: `Chicken ${index + 1}`,
      meta: 'Next egg',
      status: timer,
      statusColor: ready ? STATUS_SUCCESS : playerState.chickenFoodInBowl > 0 ? STATUS_INFO : STATUS_WARNING,
      note: ready ? 'Egg cycle complete.' : playerState.chickenFoodInBowl > 0 ? 'Production running.' : 'Add food to resume.'
    })
  })

  if (playerState.chickens.length < MAX_ANIMALS_PER_BUILDING) {
    cards.push({
      key: 'buy-chicken',
      iconSrc: CHICKEN_ICON,
      title: 'Buy Chicken',
      meta: `Space ${playerState.chickens.length} / ${MAX_ANIMALS_PER_BUILDING}`,
      status: '500 coins',
      statusColor: STATUS_WARNING,
      note: 'Add another chicken to boost egg output.',
      buttonLabel: 'BUY',
      buttonTextureSrc: MINI_BUTTON_IMG,
      buttonEnabled: playerState.coins >= 500,
      onButtonPress: withSound(() => buyAnimal('chicken'))
    })
  }

  return cards
}

function buildPigCards(): AnimalCardSpec[] {
  if (!playerState.pigPenOwned) {
    if (playerState.level < PIG_PEN_UNLOCK_LEVEL) {
      return [
        {
          key: 'pig-locked',
          iconSrc: PIG_ICON,
          title: 'Pig Pen',
          status: `Level ${PIG_PEN_UNLOCK_LEVEL}`,
          statusColor: STATUS_MUTE,
          note: 'Unlocks later in the Pets tab.',
          locked: true
        }
      ]
    }

    return [
      {
        key: 'pig-buy',
        iconSrc: PIG_ICON,
        title: 'Pig Pen',
        meta: 'Building available',
        status: `${BUILDING_BUY_PRICE} coins`,
        statusColor: STATUS_WARNING,
        note: 'Raise pigs for manure, breeding, and meat.',
        buttonLabel: 'BUY',
        buttonTextureSrc: MINI_BUTTON_IMG,
        buttonEnabled: playerState.coins >= BUILDING_BUY_PRICE,
        onButtonPress: withSound(() => purchaseBuilding('pig'))
      }
    ]
  }

  const now = Date.now()
  const readyBreeders = playerState.pigs.filter((pig) => {
    const stage = getPigStage(pig, now)
    return (stage === 'adult' || stage === 'harvestable') && now - pig.lastBreedAt >= PIG_BREED_COOLDOWN
  }).length
  const canBreed = readyBreeders >= 2 && playerState.pigs.length < MAX_ANIMALS_PER_BUILDING

  const cards: AnimalCardSpec[] = [
    {
      key: 'pig-summary',
      iconSrc: PIG_ICON,
      title: 'Pig Pen',
      meta: `Food ${playerState.pigFoodInBowl} units`,
      status: `${playerState.pigs.length} / ${MAX_ANIMALS_PER_BUILDING}`,
      statusColor: STATUS_SUCCESS,
      note: 'Pigs currently living in the pen.'
    },
    {
      key: 'pig-breed',
      iconSrc: PIG_ICON,
      title: 'Breeding',
      meta: 'Adults off cooldown',
      status: `${readyBreeders} ready`,
      statusColor: canBreed ? STATUS_SUCCESS : STATUS_WARNING,
      note: canBreed ? 'You can breed now.' : playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING ? 'Pen is full.' : 'Need 2 ready adults.',
      buttonLabel: 'BREED',
      buttonEnabled: canBreed,
      onButtonPress: withSound(() => breedPigs())
    },
    {
      key: 'pig-clean',
      iconSrc: MANURE_ICON,
      title: 'Pen Status',
      meta: playerState.pigPenDirtyAt > 0 ? 'Dirty' : 'Clean',
      status: playerState.pigPenDirtyAt > 0 ? 'Needs cleaning' : 'All good',
      statusColor: playerState.pigPenDirtyAt > 0 ? STATUS_WARNING : STATUS_SUCCESS,
      note: playerState.pigPenDirtyAt > 0 ? 'Clean the dirt pile in-scene.' : 'No cleanup needed right now.'
    },
    {
      key: 'pig-meat',
      iconSrc: PIG_ICON,
      title: 'Pig Meat',
      meta: 'Current inventory',
      status: `${playerState.pigMeatCount}`,
      statusColor: STATUS_WARNING,
      note: 'Harvestable pigs turn into sellable meat.'
    }
  ]

  playerState.pigs.forEach((pig, index) => {
    const stage = getPigStage(pig, now)
    const manure = playerState.pigFoodInBowl > 0 && (stage === 'adult' || stage === 'harvestable')
      ? formatMs(nextManureMs(pig.lastManureAt))
      : stage === 'piglet' || stage === 'adolescent'
        ? 'Growing'
        : 'No food'
    const canHarvest = stage === 'harvestable'

    cards.push({
      key: pig.id,
      iconSrc: PIG_ICON,
      title: `Pig ${index + 1}`,
      meta: stage === 'harvestable' ? 'Harvest now' : 'Next manure',
      status: PIG_STAGE_LABELS[stage] ?? stage,
      statusColor: canHarvest ? STATUS_SUCCESS : stage === 'adult' ? STATUS_INFO : STATUS_WARNING,
      note: canHarvest ? 'Ready for meat harvest.' : manure,
      buttonLabel: canHarvest ? 'HARVEST' : undefined,
      onButtonPress: canHarvest ? withSound(() => harvestPig(pig.id)) : undefined
    })
  })

  if (playerState.pigs.length < MAX_ANIMALS_PER_BUILDING) {
    cards.push({
      key: 'buy-pig',
      iconSrc: PIG_ICON,
      title: 'Buy Pig',
      meta: `Space ${playerState.pigs.length} / ${MAX_ANIMALS_PER_BUILDING}`,
      status: '500 coins',
      statusColor: STATUS_WARNING,
      note: 'Add another pig to increase output.',
      buttonLabel: 'BUY',
      buttonTextureSrc: MINI_BUTTON_IMG,
      buttonEnabled: playerState.coins >= 500,
      onButtonPress: withSound(() => buyAnimal('pig'))
    })
  }

  return cards
}

function buildStockCards(): AnimalCardSpec[] {
  return [
    {
      key: 'stock-grain',
      iconSrc: GRAIN_ICON,
      title: 'Grain',
      meta: 'Feed inventory',
      status: `${playerState.grainCount}`,
      statusColor: STATUS_WARNING,
      note: 'Used in bowls for chickens and pigs.'
    },
    {
      key: 'stock-scraps',
      iconSrc: VEGGIE_SCRAP_ICON,
      title: 'Veggie Scraps',
      meta: 'Feed inventory',
      status: `${playerState.veggieScrapCount}`,
      statusColor: STATUS_INFO,
      note: 'Handy extra food for the pig bowl.'
    },
    {
      key: 'stock-eggs',
      iconSrc: EGG_ICON,
      title: 'Eggs',
      meta: 'Product inventory',
      status: `${playerState.eggsCount}`,
      statusColor: STATUS_SUCCESS,
      note: 'Produced by fed chickens.'
    },
    {
      key: 'stock-meat',
      iconSrc: PIG_ICON,
      title: 'Pig Meat',
      meta: 'Product inventory',
      status: `${playerState.pigMeatCount}`,
      statusColor: STATUS_WARNING,
      note: 'Harvested from mature pigs.'
    },
    {
      key: 'stock-coop-food',
      iconSrc: CHICKEN_ICON,
      title: 'Coop Bowl',
      meta: 'Chicken food loaded',
      status: `${playerState.chickenFoodInBowl} units`,
      statusColor: STATUS_INFO,
      note: 'Keeps egg production running.'
    },
    {
      key: 'stock-pen-food',
      iconSrc: PIG_ICON,
      title: 'Pig Bowl',
      meta: 'Pig food loaded',
      status: `${playerState.pigFoodInBowl} units`,
      statusColor: STATUS_INFO,
      note: 'Keeps manure and breeding running.'
    },
  ]
}

function buildCardsForTab(tab: AnimalTabValue): AnimalCardSpec[] {
  if (tab === 'coop') return buildCoopCards()
  if (tab === 'pigPen') return buildPigCards()
  return buildStockCards()
}

export const AnimalPanel = () => {
  const tab = animalTab.value
  const cards = buildCardsForTab(tab)
  const lastPage = Math.max(0, Math.ceil(cards.length / ITEMS_PER_PAGE) - 1)
  const paginationHeight = isMobile() ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  if (animalPage[tab] > lastPage) animalPage[tab] = lastPage
  const page = animalPage[tab]
  const pageSlice = cards.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <RevampPanelFrame titleText="Animals" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center' }}>
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'center',
            width: '100%',
            margin: { top: CONTENT_TOP_GAP, bottom: ss(8) },
          }}
        >
          {([
            ['coop', 'Chicken Coop'],
            ['pigPen', 'Pig Pen'],
            ['stock', 'Stock'],
          ] as const).map(([key, label], index) => (
            <UiEntity key={key} uiTransform={{ margin: { right: index < 2 ? TAB_GAP : 0 } }}>
              <PillTabButton
                label={label}
                selected={tab === key}
                width={TAB_W}
                fontSize={isMobile() ? ss(22) : ss(17)}
                onPress={() => {
                  playSound('menu')
                  animalTab.value = key
                }}
              />
            </UiEntity>
          ))}
        </UiEntity>

        <UiEntity uiTransform={{ flex: 1, width: '100%' }}>
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              padding: { bottom: lastPage > 0 ? paginationHeight + PAGINATION_MARGIN_TOP : 0 },
            }}
          >
            <AnimalCardGrid items={pageSlice} />
          </UiEntity>

          {lastPage > 0 && (
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { left: 0, bottom: 0 },
                width: '100%',
                height: paginationHeight,
              }}
            >
              <SharedPaginationBar
                id={`animals-${tab}`}
                page={page}
                lastPage={lastPage}
                onPrev={() => { animalPage[tab]-- }}
                onNext={() => { animalPage[tab]++ }}
                mode={isMobile() ? 'mobile' : 'desktop'}
              />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>
    </RevampPanelFrame>
  )
}
