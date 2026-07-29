import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { ALL_CROP_TYPES, CROP_NAMES } from '../data/cropData'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA } from '../data/fertilizerData'
import { CROP_HARVEST_IMAGES, CROP_SEED_IMAGES, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { playerState } from '../game/gameState'
import { playSound } from '../systems/sfxSystem'
import { RevampPanelFrame } from './RevampPanel'
import {
  SHARED_PAGINATION_HEIGHT_DESKTOP,
  SHARED_PAGINATION_HEIGHT_MOBILE,
  SharedPaginationBar,
} from './SharedPaginationBar'
import { lerpColor, setTabActive } from './tabFadeSystem'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const INVENTORY_TAB_SELECTED_IMG = 'assets/images/revamp/selected.png'
const INVENTORY_TAB_IDLE_IMG = 'assets/images/revamp/notselected.png'
const INVENTORY_CARD_IMG = 'assets/images/revamp/card.png'
const INVENTORY_CARD_ASPECT = 236 / 326

const INVENTORY_CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const INVENTORY_COUNT_TEXT = { r: 0.45, g: 0.27, b: 0.11, a: 1 }
const INVENTORY_CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const INVENTORY_EMPTY_TEXT = { r: 0.96, g: 0.88, b: 0.70, a: 0.88 }
const INVENTORY_TAB_TEXT_IDLE = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const INVENTORY_TAB_TEXT_SELECTED = { r: 1, g: 1, b: 1, a: 1 }

const INVENTORY_TAB_W = 160
const INVENTORY_TAB_ASPECT = 151 / 68
const INVENTORY_TAB_H = Math.round(INVENTORY_TAB_W / INVENTORY_TAB_ASPECT)
const INVENTORY_TAB_GAP = ss(14)

const INVENTORY_CARD_W = 156
const INVENTORY_CARD_W_MOBILE = 142
const INVENTORY_CARD_PAD_TOP = 14
const INVENTORY_CARD_PAD_BOTTOM = 12
const INVENTORY_CARD_PAD_SIDE = 14
const INVENTORY_CARD_ICON = 92
const INVENTORY_CARD_ICON_MOBILE = 84
const INVENTORY_CARD_ICON_MARGIN = 8
const INVENTORY_CARD_TITLE_H = 42
const INVENTORY_CARD_TITLE_H_MOBILE = 44
const INVENTORY_CARD_COUNT_H = 26
const INVENTORY_CARD_COUNT_H_MOBILE = 28
const INVENTORY_CARD_SLOT_PAD_X = 4
const INVENTORY_CARD_ROW_GAP = 2
const INVENTORY_CARD_BG_SCALE = 1.03
const INVENTORY_CARD_BG_SCALE_MOBILE = 1
const INVENTORY_COLUMNS_DESKTOP = 5
const INVENTORY_COLUMNS_MOBILE = 3
const INVENTORY_ITEMS_PER_PAGE_DESKTOP = 10
const INVENTORY_ITEMS_PER_PAGE_MOBILE = 6

type InventoryTabValue = 'seeds' | 'harvested' | 'other'

type InventoryCardItem = {
  key: string
  title: string
  imageSrc: string
  count: number
}

const inventoryTab = { value: 'seeds' as InventoryTabValue }
const inventoryPage: Record<InventoryTabValue, number> = {
  seeds: 0,
  harvested: 0,
  other: 0,
}

function getInventoryCardWidth(): number {
  return isMobile() ? INVENTORY_CARD_W_MOBILE : INVENTORY_CARD_W
}

function getInventoryCardVisualWidth(): number {
  const width = getInventoryCardWidth()
  const scale = isMobile() ? INVENTORY_CARD_BG_SCALE_MOBILE : INVENTORY_CARD_BG_SCALE
  return Math.round(width * scale)
}

function getInventoryCardHeight(): number {
  return Math.round(getInventoryCardVisualWidth() / INVENTORY_CARD_ASPECT)
}

function getInventoryCardSlotWidth(): number {
  return getInventoryCardVisualWidth() + INVENTORY_CARD_SLOT_PAD_X
}

function getInventoryTitleFont(title: string): number {
  const mobile = isMobile()
  if (title.length <= 10) return mobile ? 22 : 22
  if (title.length <= 14) return mobile ? 20 : 20
  if (title.length <= 18) return mobile ? 18 : 18
  return mobile ? 16 : 16
}

const InventoryCard = ({ title, imageSrc, count }: InventoryCardItem) => {
  const mobile = isMobile()
  const cardWidth = getInventoryCardVisualWidth()
  const cardHeight = getInventoryCardHeight()
  const iconSize = mobile ? INVENTORY_CARD_ICON_MOBILE : INVENTORY_CARD_ICON
  const titleHeight = mobile ? INVENTORY_CARD_TITLE_H_MOBILE : INVENTORY_CARD_TITLE_H
  const countHeight = mobile ? INVENTORY_CARD_COUNT_H_MOBILE : INVENTORY_CARD_COUNT_H

  return (
    <UiEntity
      uiTransform={{
        width: cardWidth,
        height: cardHeight,
        padding: {
          top: INVENTORY_CARD_PAD_TOP,
          bottom: INVENTORY_CARD_PAD_BOTTOM,
          left: INVENTORY_CARD_PAD_SIDE,
          right: INVENTORY_CARD_PAD_SIDE,
        },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{
        texture: { src: INVENTORY_CARD_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      <UiEntity
        uiTransform={{
          width: iconSize,
          height: iconSize,
          margin: { bottom: INVENTORY_CARD_ICON_MARGIN },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: imageSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      <UiEntity
        uiTransform={{
          width: cardWidth - 20,
          height: titleHeight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Label
          value={`<b>${title}</b>`}
          fontSize={getInventoryTitleFont(title)}
          color={INVENTORY_CARD_TEXT}
          textAlign="middle-center"
          uiTransform={{ width: '100%', height: '100%' }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: cardWidth - 28,
          height: countHeight,
          alignItems: 'center',
          justifyContent: 'center',
          margin: { top: 4 },
        }}
      >
        <Label
          value={`<b>x${count}</b>`}
          fontSize={mobile ? 20 : 18}
          color={INVENTORY_COUNT_TEXT}
          textAlign="middle-center"
          uiTransform={{ width: '100%', height: '100%' }}
        />
      </UiEntity>
    </UiEntity>
  )
}

const InventoryTabChip = ({
  tabKey,
  label,
  selected,
  onClick,
}: {
  tabKey: InventoryTabValue
  label: string
  selected: boolean
  onClick: () => void
}) => {
  const mobile = isMobile()
  const hitWidth = mobile ? INVENTORY_TAB_W + 22 : INVENTORY_TAB_W
  const hitHeight = mobile ? INVENTORY_TAB_H + 18 : INVENTORY_TAB_H
  const hitLeft = Math.round((INVENTORY_TAB_W - hitWidth) / 2)
  const fade = setTabActive(`inventory-tab-${tabKey}`, selected)

  return (
    <UiEntity
      uiTransform={{
        width: INVENTORY_TAB_W,
        height: hitHeight,
        margin: { right: INVENTORY_TAB_GAP },
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: INVENTORY_TAB_W,
          height: INVENTORY_TAB_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: INVENTORY_TAB_W, height: INVENTORY_TAB_H }}
          uiBackground={{
            texture: { src: INVENTORY_TAB_IDLE_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: 1 - fade },
          }}
        />
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: INVENTORY_TAB_W, height: INVENTORY_TAB_H }}
          uiBackground={{
            texture: { src: INVENTORY_TAB_SELECTED_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: fade },
          }}
        />
        <Label
          value={`<b>${label}</b>`}
          fontSize={mobile ? 24 : 22}
          color={lerpColor(INVENTORY_TAB_TEXT_IDLE, INVENTORY_TAB_TEXT_SELECTED, fade)}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{ width: INVENTORY_TAB_W - 18, height: INVENTORY_TAB_H, padding: { bottom: 10 } }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: hitLeft },
          width: hitWidth,
          height: hitHeight,
        }}
        onMouseDown={() => {
          playSound('buttonclick')
          onClick()
        }}
      />
    </UiEntity>
  )
}

const TabBar = ({ hasOther }: { hasOther: boolean }) => (
  <UiEntity
    uiTransform={{
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      margin: { bottom: 10 },
      flexShrink: 0,
    }}
  >
    <InventoryTabChip
      tabKey="seeds"
      label="Seeds"
      selected={inventoryTab.value === 'seeds'}
      onClick={() => { inventoryTab.value = 'seeds' }}
    />
    <InventoryTabChip
      tabKey="harvested"
      label="Harvested"
      selected={inventoryTab.value === 'harvested'}
      onClick={() => { inventoryTab.value = 'harvested' }}
    />
    {hasOther && (
      <InventoryTabChip
        tabKey="other"
        label="Other"
        selected={inventoryTab.value === 'other'}
        onClick={() => { inventoryTab.value = 'other' }}
      />
    )}
  </UiEntity>
)

const EmptyState = ({ message }: { message: string }) => (
  <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Label value={message} fontSize={isMobile() ? 24 : 22} color={INVENTORY_EMPTY_TEXT} textAlign="middle-center" />
  </UiEntity>
)

const InventoryGrid = ({ items }: { items: InventoryCardItem[] }) => {
  const mobile = isMobile()
  const columns = mobile ? INVENTORY_COLUMNS_MOBILE : INVENTORY_COLUMNS_DESKTOP
  const slotWidth = getInventoryCardSlotWidth()
  const cardWidth = getInventoryCardVisualWidth()
  const cardHeight = getInventoryCardHeight()
  const offsetX = Math.round((slotWidth - cardWidth) / 2)
  const gridWidth = columns * slotWidth
  const rows: InventoryCardItem[][] = []

  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns))
  }

  return (
    <UiEntity uiTransform={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: rows.length > 1 ? 'center' : 'flex-start' }}>
      <UiEntity uiTransform={{ width: gridWidth, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {rows.map((row, rowIndex) => (
          <UiEntity
            key={`inventory-row-${rowIndex}`}
            uiTransform={{
              width: gridWidth,
              height: cardHeight,
              flexDirection: 'row',
              justifyContent: 'center',
              margin: { bottom: rowIndex < rows.length - 1 ? INVENTORY_CARD_ROW_GAP : 0 },
            }}
          >
            {row.map((item) => (
              <UiEntity key={item.key} uiTransform={{ width: slotWidth, height: cardHeight }}>
                <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                  <InventoryCard {...item} />
                </UiEntity>
              </UiEntity>
            ))}
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

function getInventoryItems(tab: InventoryTabValue): InventoryCardItem[] {
  if (tab === 'seeds') {
    return ALL_CROP_TYPES
      .filter((crop) => (playerState.seeds.get(crop) ?? 0) > 0)
      .map((crop) => ({
        key: `seed-${crop}`,
        title: CROP_NAMES[crop],
        imageSrc: CROP_SEED_IMAGES[crop],
        count: playerState.seeds.get(crop) ?? 0,
      }))
  }

  if (tab === 'harvested') {
    return ALL_CROP_TYPES
      .filter((crop) => (playerState.harvested.get(crop) ?? 0) > 0)
      .map((crop) => ({
        key: `harvest-${crop}`,
        title: CROP_NAMES[crop],
        imageSrc: CROP_HARVEST_IMAGES[crop],
        count: playerState.harvested.get(crop) ?? 0,
      }))
  }

  const otherItems: InventoryCardItem[] = []
  if (playerState.organicWaste > 0) {
    otherItems.push({
      key: 'organic-waste',
      title: 'Organic Waste',
      imageSrc: ORGANIC_WASTE_ICON,
      count: playerState.organicWaste,
    })
  }
  for (const fertilizer of ALL_FERTILIZER_TYPES) {
    const count = playerState.fertilizers.get(fertilizer) ?? 0
    if (count <= 0) continue
    const def = FERTILIZER_DATA.get(fertilizer)!
    otherItems.push({
      key: `fert-${fertilizer}`,
      title: def.name,
      imageSrc: def.iconSrc,
      count,
    })
  }
  return otherItems
}

const InventoryPanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => (
  <RevampPanelFrame name="inventory" onClose={onClose}>
    {children}
  </RevampPanelFrame>
)

export const InventoryPanel = () => {
  const mobile = isMobile()
  const hasOther = playerState.organicWaste > 0 || ALL_FERTILIZER_TYPES.some((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
  if (inventoryTab.value === 'other' && !hasOther) inventoryTab.value = 'seeds'

  const tab = inventoryTab.value
  const items = getInventoryItems(tab)
  const itemsPerPage = mobile ? INVENTORY_ITEMS_PER_PAGE_MOBILE : INVENTORY_ITEMS_PER_PAGE_DESKTOP
  const lastPage = Math.max(0, Math.ceil(items.length / itemsPerPage) - 1)
  if (inventoryPage[tab] > lastPage) inventoryPage[tab] = lastPage
  const page = inventoryPage[tab]
  const pageSlice = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const paginationHeight = mobile ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP

  return (
    <InventoryPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      <TabBar hasOther={hasOther} />

      {items.length === 0 ? (
        <EmptyState
          message={
            tab === 'seeds'
              ? 'No seeds in stock'
              : tab === 'harvested'
                ? 'Nothing harvested yet'
                : 'No extra items stored'
          }
        />
      ) : (
        <UiEntity uiTransform={{ flex: 1, width: '100%', flexDirection: 'column' }}>
          <UiEntity
            uiTransform={{
              flex: 1,
              width: '100%',
              padding: { bottom: lastPage > 0 ? paginationHeight : 0 },
            }}
          >
            <InventoryGrid items={pageSlice} />
          </UiEntity>

          {lastPage > 0 && (
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { bottom: 0, left: 0 },
                width: '100%',
                height: paginationHeight,
              }}
            >
              <SharedPaginationBar
                id={`inventory-${tab}`}
                page={page}
                lastPage={lastPage}
                onPrev={() => { inventoryPage[tab]-- }}
                onNext={() => { inventoryPage[tab]++ }}
                mode={mobile ? 'mobile' : 'desktop'}
              />
            </UiEntity>
          )}
        </UiEntity>
      )}
    </InventoryPanelFrame>
  )
}
