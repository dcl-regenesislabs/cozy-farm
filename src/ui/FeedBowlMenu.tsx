import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { GRAIN_ICON } from '../data/imagePaths'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_HARVEST_IMAGES } from '../data/imagePaths'
import { depositFoodInBowl } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'
import { RevampPanelFrame } from './RevampPanel'
import { MiniTextButton } from './RevampButtons'
import { SHARED_PAGINATION_HEIGHT_DESKTOP, SHARED_PAGINATION_HEIGHT_MOBILE, SharedPaginationBar } from './SharedPaginationBar'

type FeedCardSpec = {
  key: string
  label: string
  imgSrc: string
  count: number
  stockLabel: string
  note: string
  addOne: () => void
  addAll: () => void
}

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const CARD_IMG = 'assets/images/revamp/card.png'
const CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const STOCK_COLOR = { r: 0.45, g: 0.27, b: 0.11, a: 1 }

const CARD_W = 248
const CARD_H = 334
const CARD_BG_SCALE = 1.14
const CARD_BG_SCALE_MOBILE = 1.18
const CARD_CONTENT_SCALE_MOBILE = 1.18
const CARD_ART_ASPECT = 236 / 326
const GRID_CARD_SLOT_TRIM = 10
const CARD_ICON = 96
const CARD_TITLE_LG = ss(27)
const CARD_TITLE_SM = ss(22)
const CARD_BODY = ss(15)
const CARD_STATUS = ss(22)
const BUTTON_W = 126
const BUTTON_FONT = ss(20)
const ITEMS_PER_PAGE_DESKTOP = 3
const ITEMS_PER_PAGE_MOBILE = 4
const CARD_TOP_AIR = ss(12)

const bowlPage = { value: 0 }

function scaleCardContent(value: number): number {
  return isMobile() ? Math.round(value * CARD_CONTENT_SCALE_MOBILE) : value
}

function getCardBgScale(): number {
  return isMobile() ? CARD_BG_SCALE_MOBILE : CARD_BG_SCALE
}

function getCardTransform() {
  const width = Math.round(CARD_W * getCardBgScale())
  const artHeight = Math.round(width / CARD_ART_ASPECT)
  const height = Math.max(artHeight, Math.round(CARD_H * getCardBgScale()))

  return {
    width,
    height,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    padding: {
      top: isMobile() ? 34 : 28,
      bottom: isMobile() ? 40 : 34,
      left: isMobile() ? 12 : 16,
      right: isMobile() ? 12 : 16,
    },
  }
}

function getCardVisualWidth(): number {
  return Math.round(CARD_W * getCardBgScale())
}

function getGridSlotHeight(): number {
  return getCardTransform().height
}

function getCardTextWidth(transformWidth: number): number {
  return transformWidth - (isMobile() ? 26 : 34)
}

function getCardTitleFont(title: string): number {
  return title.length <= 12 ? scaleCardContent(CARD_TITLE_LG) : scaleCardContent(CARD_TITLE_SM)
}

function actionWithSound(cb: () => void): () => void {
  return () => {
    playSound('buttonclick')
    cb()
  }
}

const FeedCard = ({ label, imgSrc, count, stockLabel, note, addOne, addAll }: FeedCardSpec) => {
  const transform = getCardTransform()
  const buttonWidth = Math.round(BUTTON_W * (isMobile() ? CARD_CONTENT_SCALE_MOBILE : 1))
  const enabled = count > 0
  const textWidth = getCardTextWidth(transform.width)

  return (
    <UiEntity
      uiTransform={{ ...transform, margin: { right: ss(4), bottom: ss(4) } }}
      uiBackground={{ texture: { src: CARD_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    >
      <UiEntity uiTransform={{ height: CARD_TOP_AIR, flexShrink: 0 }} />

      <UiEntity
        uiTransform={{
          width: scaleCardContent(CARD_ICON),
          height: scaleCardContent(CARD_ICON),
          margin: { bottom: ss(12) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: enabled ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.45 },
        }}
      />

      <Label
        value={`<b>${label}</b>`}
        fontSize={getCardTitleFont(label)}
        color={CARD_TEXT}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(ss(34)) }}
      />
      <Label
        value={stockLabel}
        fontSize={scaleCardContent(CARD_STATUS)}
        color={enabled ? STOCK_COLOR : CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(ss(28)), margin: { top: ss(8) } }}
      />
      <Label
        value={note}
        fontSize={scaleCardContent(CARD_BODY)}
        color={CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(ss(50)), margin: { top: ss(10) } }}
      />

      <UiEntity uiTransform={{ flex: 1 }} />

      <MiniTextButton
        label="ADD ALL"
        width={buttonWidth}
        fontSize={scaleCardContent(BUTTON_FONT)}
        topOffset={-scaleCardContent(4)}
        disabled={!enabled}
        onPress={enabled ? actionWithSound(addAll) : undefined}
      />

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: transform.width,
          height: transform.height - Math.round(buttonWidth / (196 / 52)) - ss(10),
        }}
        onMouseDown={enabled ? actionWithSound(addOne) : undefined}
      />
    </UiEntity>
  )
}

export const FeedBowlMenu = () => {
  const type = playerState.activeFeedBowl
  if (!type) return <UiEntity />

  const bowlAmount = type === 'chicken' ? playerState.chickenFoodInBowl : playerState.pigFoodInBowl
  const title = type === 'chicken' ? 'Feed Chickens' : 'Feed Pigs'

  const deposit = (grainAmt: number, cropType?: CropType, cropAmt?: number) => {
    const crops = new Map<number, number>()
    if (cropType !== undefined && cropAmt) crops.set(cropType, cropAmt)
    depositFoodInBowl(type, grainAmt, crops)
  }

  const items: FeedCardSpec[] = [
    {
      key: 'grain',
      label: 'Grain',
      imgSrc: GRAIN_ICON,
      count: playerState.grainCount,
      stockLabel: `x${playerState.grainCount}`,
      note: 'Tap for 1. Button adds all.',
      addOne: () => deposit(1),
      addAll: () => deposit(playerState.grainCount)
    },
    ...ALL_CROP_TYPES
      .map((cropType) => {
        const count = playerState.harvested.get(cropType) ?? 0
        if (count <= 0) return null
        const def = CROP_DATA.get(cropType)!
        return {
          key: `crop-${cropType}`,
          label: def.name,
          imgSrc: CROP_HARVEST_IMAGES[cropType],
          count,
          stockLabel: `x${count}`,
          note: 'Tap for 1. Button adds all.',
          addOne: () => deposit(0, cropType, 1),
          addAll: () => deposit(0, cropType, count)
        } satisfies FeedCardSpec
      })
      .filter((item): item is FeedCardSpec => item !== null)
  ]

  const itemsPerPage = isMobile() ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP
  const lastPage = Math.max(0, Math.ceil(items.length / itemsPerPage) - 1)
  if (bowlPage.value > lastPage) bowlPage.value = lastPage
  const page = bowlPage.value
  const pageSlice = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const columns = isMobile() ? 2 : 3
  const paginationHeight = isMobile() ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const slotWidth = Math.max(0, getCardVisualWidth() - GRID_CARD_SLOT_TRIM)
  const slotHeight = getGridSlotHeight()
  const offsetX = Math.round((slotWidth - getCardVisualWidth()) / 2)
  const rows: FeedCardSpec[][] = []

  for (let i = 0; i < pageSlice.length; i += columns) {
    rows.push(pageSlice.slice(i, i + columns))
  }

  return (
    <RevampPanelFrame titleText={title} onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center' }}>
        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            margin: { top: ss(18), bottom: ss(14) },
          }}
        >
          <Label
            value={`Bowl loaded: ${bowlAmount} units`}
            fontSize={isMobile() ? ss(26) : ss(24)}
            color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{ width: '100%', height: isMobile() ? ss(32) : ss(28) }}
          />
          <Label
            value="Tap a card to add 1 unit. Use the button to dump the whole stack."
            fontSize={isMobile() ? ss(18) : ss(17)}
            color={CARD_TEXT_MUTE}
            textAlign="middle-center"
            uiTransform={{
              width: '88%',
              height: isMobile() ? ss(42) : ss(24),
              margin: { top: ss(8) },
            }}
          />
        </UiEntity>

        <UiEntity uiTransform={{ flex: 1, width: '100%' }}>
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              padding: { bottom: lastPage > 0 ? paginationHeight + ss(24) : 0 },
            }}
          >
            <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'center', margin: { top: ss(8) } }}>
              {rows.map((row, rowIndex) => (
                <UiEntity
                  key={`feed-row-${rowIndex}`}
                  uiTransform={{
                    flexDirection: 'row',
                    width: row.length * slotWidth,
                    height: slotHeight,
                    justifyContent: 'center',
                    margin: { bottom: rowIndex < rows.length - 1 ? ss(12) : 0 },
                  }}
                >
                  {row.map((item) => (
                    <UiEntity key={item.key} uiTransform={{ width: slotWidth, height: slotHeight }}>
                      <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                        <FeedCard {...item} />
                      </UiEntity>
                    </UiEntity>
                  ))}
                </UiEntity>
              ))}
            </UiEntity>
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
                id={`feed-bowl-${type}`}
                page={page}
                lastPage={lastPage}
                onPrev={() => { bowlPage.value-- }}
                onNext={() => { bowlPage.value++ }}
                mode={isMobile() ? 'mobile' : 'desktop'}
              />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>
    </RevampPanelFrame>
  )
}
