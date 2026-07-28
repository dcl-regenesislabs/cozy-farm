import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { plantSeed } from '../game/actions'
import { CropType, CROP_NAMES, ALL_CROP_TYPES } from '../data/cropData'
import { CROP_SEED_IMAGES } from '../data/imagePaths'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { REVAMP_CONTENT_TOP, RevampPanelFrame } from './RevampPanel'
import {
  SHARED_PAGINATION_HEIGHT_DESKTOP,
  SHARED_PAGINATION_HEIGHT_MOBILE,
  SharedPaginationBar,
} from './SharedPaginationBar'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const PLANT_CARD_IMG = 'assets/images/revamp/card.png'
const PLANT_BUTTON_IMG = 'assets/images/revamp/mini-button-no-coin.png'
const PLANT_BUTTON_ASPECT = 196 / 52
const PLANT_PAGINATION_BUTTON_IMG = 'assets/images/revamp/Type=Secondary, State=Default.png'
const PLANT_PAGINATION_BUTTON_ASPECT = 366 / 84

const PLANT_CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const PLANT_CARD_TEXT_MUTE = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const PLANT_COUNT_TEXT = { r: 0.45, g: 0.27, b: 0.11, a: 1 }
const PLANT_BUTTON_TEXT = { r: 1, g: 1, b: 1, a: 1 }
const PLANT_PAGINATION_TEXT = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const PLANT_PAGINATION_TEXT_DISABLED = { r: 0.53, g: 0.39, b: 0.25, a: 0.72 }
const PLANT_PAGINATION_CHIP_BG = { r: 0.34, g: 0.18, b: 0.07, a: 0.96 }
const PLANT_PAGINATION_CHIP_BORDER = { r: 0.95, g: 0.90, b: 0.80, a: 0.98 }
const PLANT_PAGINATION_CHIP_TEXT = { r: 1, g: 1, b: 1, a: 1 }
const PLANT_GRID_SLOT_HEIGHT_TRIM = 28

// Copied from the shop card geometry so Plant Seeds uses the same visual language.
const PLANT_CARD_W = 185
const PLANT_CARD_BASE_H = 292
const PLANT_CARD_MARGIN = 2
const PLANT_CARD_PAD_TOP = 26
const PLANT_CARD_PAD_BOTTOM = 40
const PLANT_CARD_PAD_SIDE = 16
const PLANT_CARD_BG_SCALE = 1.15
const PLANT_CARD_BG_SCALE_MOBILE = 1.08
const PLANT_CARD_CONTENT_SCALE_MOBILE = 1.08
const PLANT_CARD_ART_ASPECT = 236 / 326
const PLANT_GRID_CARD_SLOT_TRIM = 10
const PLANT_CARD_ICON = 90
const PLANT_CARD_ICON_TOP_SPACE = ss(14)
const PLANT_CARD_ICON_MARGIN = ss(10)
const PLANT_CARD_TITLE_MD = ss(23)
const PLANT_CARD_TITLE_SM = ss(22)
const PLANT_CARD_COUNT_FONT = ss(18)
const PLANT_CARD_COUNT_FONT_MOBILE = ss(20)
const PLANT_BUTTON_SCALE = 1.1
const PLANT_BUTTON_W = 124
const PLANT_BUTTON_H = Math.round(PLANT_BUTTON_W / PLANT_BUTTON_ASPECT)
const PLANT_BUTTON_FONT = ss(20)
const PLANT_BUTTON_TOP_MARGIN = ss(6)
const PLANT_BUTTON_LABEL_TOP_OFFSET = -ss(4)
const PLANT_ITEMS_PER_PAGE = 4
const plantPage = { value: 0 }
const PLANT_CONTENT_TOP_OFFSET = ss(28)
const PLANT_CARD_ROW_TOP_OFFSET = ss(48)
const PLANT_PAGINATION_MARGIN_TOP = ss(60)

function getPlantContentTopOffset(): number {
  return isMobile() ? ss(20) : PLANT_CONTENT_TOP_OFFSET
}

function getPlantCardRowTopOffset(): number {
  return isMobile() ? ss(40) : PLANT_CARD_ROW_TOP_OFFSET
}

function getPlantPaginationMarginTop(): number {
  return isMobile() ? ss(34) : PLANT_PAGINATION_MARGIN_TOP
}

function getPlantFrameContentTop(): number {
  return isMobile() ? REVAMP_CONTENT_TOP - ss(34) : REVAMP_CONTENT_TOP
}

function getPlantCardBgScale(): number {
  return isMobile() ? PLANT_CARD_BG_SCALE_MOBILE : PLANT_CARD_BG_SCALE
}

function scalePlantCardContent(value: number): number {
  return isMobile() ? Math.round(value * PLANT_CARD_CONTENT_SCALE_MOBILE) : value
}

function getPlantCardTransform(scale: number) {
  const bgScale = getPlantCardBgScale()
  const width = Math.round(PLANT_CARD_W * scale * bgScale)
  const artHeight = Math.round(width / PLANT_CARD_ART_ASPECT)
  const baseHeightScaled = Math.round(PLANT_CARD_BASE_H * scale * bgScale)
  const padTop = isMobile() ? PLANT_CARD_PAD_TOP + 8 : PLANT_CARD_PAD_TOP + 12
  const padBottom = isMobile() ? PLANT_CARD_PAD_BOTTOM + 6 : PLANT_CARD_PAD_BOTTOM + 8
  const padSide = isMobile() ? 12 : PLANT_CARD_PAD_SIDE

  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    width,
    height: Math.max(artHeight, baseHeightScaled),
    margin: { right: PLANT_CARD_MARGIN, bottom: PLANT_CARD_MARGIN },
    padding: {
      top: padTop,
      bottom: padBottom,
      left: padSide,
      right: padSide,
    },
  }
}

function getPlantTitleFont(title: string): number {
  if (title.length <= 12) return scalePlantCardContent(PLANT_CARD_TITLE_MD)
  return scalePlantCardContent(PLANT_CARD_TITLE_SM)
}

function getPlantCardVisualWidth(scale = 1): number {
  return Math.round(PLANT_CARD_W * scale * getPlantCardBgScale())
}

function getPlantGridSlotWidth(scale = 1): number {
  return Math.max(0, getPlantCardVisualWidth(scale) - PLANT_GRID_CARD_SLOT_TRIM)
}

function getPlantGridMetrics(itemCount: number) {
  const slotWidth = getPlantGridSlotWidth()
  const offsetX = Math.round((slotWidth - getPlantCardVisualWidth()) / 2)
  const gridWidth = Math.max(1, itemCount) * slotWidth
  const cardHeight = getPlantCardTransform(1).height
  const slotHeight = Math.max(1, cardHeight - (isMobile() ? 0 : PLANT_GRID_SLOT_HEIGHT_TRIM))

  return {
    slotWidth,
    offsetX,
    gridWidth,
    slotHeight,
  }
}

const SeedCard = ({ cropType, count }: { key?: string | number; cropType: CropType; count: number }) => {
  const mobile = isMobile()
  const zoomKey = `plant_${cropType}`
  const scale = getZoomScale(zoomKey)
  const transform = getPlantCardTransform(scale)
  const iconSize = scalePlantCardContent(PLANT_CARD_ICON)
  const buttonScale = isMobile() ? PLANT_BUTTON_SCALE * PLANT_CARD_CONTENT_SCALE_MOBILE : PLANT_BUTTON_SCALE
  const buttonWidth = Math.round(PLANT_BUTTON_W * buttonScale)
  const buttonHeight = Math.round(PLANT_BUTTON_H * buttonScale)

  const plant = () => {
    const entity = playerState.activePlotEntity
    if (!entity || isZooming(zoomKey)) return
    playSound('buttonclick')
    triggerCardZoom(zoomKey)
    setTimeout(() => plantSeed(entity, cropType), 290)
  }

  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={{
        texture: { src: PLANT_CARD_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      <UiEntity uiTransform={{ height: scalePlantCardContent(PLANT_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />

      <UiEntity
        uiTransform={{
          width: iconSize,
          height: iconSize,
          margin: { bottom: scalePlantCardContent(PLANT_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      <Label
        value={`<b>${CROP_NAMES[cropType]}</b>`}
        fontSize={getPlantTitleFont(CROP_NAMES[cropType])}
        color={PLANT_CARD_TEXT}
        textAlign="middle-center"
      />

      <Label
        value={`x${count}`}
        fontSize={mobile ? scalePlantCardContent(PLANT_CARD_COUNT_FONT_MOBILE) : scalePlantCardContent(PLANT_CARD_COUNT_FONT)}
        color={PLANT_COUNT_TEXT}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(2), bottom: ss(4) } }}
      />

      <UiEntity uiTransform={{ flex: 1 }} />

      <UiEntity
        uiTransform={{
          alignItems: 'center',
          justifyContent: 'center',
          width: buttonWidth,
          height: buttonHeight,
          margin: { top: scalePlantCardContent(PLANT_BUTTON_TOP_MARGIN) },
        }}
        uiBackground={{
          texture: { src: PLANT_BUTTON_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
        onMouseDown={plant}
      >
        <Label
          value="<b>PLANT!</b>"
          fontSize={scalePlantCardContent(PLANT_BUTTON_FONT)}
          color={PLANT_BUTTON_TEXT}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            positionType: 'absolute',
            position: { top: PLANT_BUTTON_LABEL_TOP_OFFSET, left: 0 },
            width: buttonWidth,
            height: buttonHeight,
          }}
        />
      </UiEntity>

      {mobile && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: transform.width,
            height: transform.height,
          }}
          onMouseDown={plant}
        />
      )}
    </UiEntity>
  )
}

const PlantPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => (
  <RevampPanelFrame name="plantSeeds" onClose={onClose} contentTop={getPlantFrameContentTop()}>
    {children}
  </RevampPanelFrame>
)

const PlantGrid = ({
  itemCount,
  children,
}: {
  itemCount: number
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  const { slotWidth, offsetX, gridWidth, slotHeight } = getPlantGridMetrics(itemCount)
  const childNodes = Array.isArray(children) ? children : children ? [children] : []
  const contentTopOffset = getPlantContentTopOffset()
  const rowTopOffset = getPlantCardRowTopOffset()

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        margin: { top: ss(6) + contentTopOffset },
      }}
    >
      <UiEntity
        uiTransform={{
          width: gridWidth,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <UiEntity
          uiTransform={{
            width: gridWidth,
            margin: { bottom: mobile ? ss(14) : ss(14) },
          }}
        >
          <Label
            value="Choose a seed to plant"
            fontSize={mobile ? ss(30) : ss(25)}
            color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{ width: gridWidth }}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            width: gridWidth,
            height: slotHeight,
            justifyContent: 'center',
            margin: { top: rowTopOffset },
          }}
        >
          {childNodes.map((child, index) => (
            <UiEntity key={`plant-slot-${index}`} uiTransform={{ width: slotWidth, height: slotHeight }}>
              <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                {child}
              </UiEntity>
            </UiEntity>
          ))}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export const PlantMenu = () => {
  const mob = isMobile()
  const available = ALL_CROP_TYPES.filter(
    (ct) => (playerState.seeds.get(ct) ?? 0) > 0 && playerState.unlockedCrops.has(ct),
  )
  const lastPage = Math.max(0, Math.ceil(available.length / PLANT_ITEMS_PER_PAGE) - 1)
  if (plantPage.value > lastPage) plantPage.value = lastPage
  const page = plantPage.value
  const pageSlice = available.slice(page * PLANT_ITEMS_PER_PAGE, (page + 1) * PLANT_ITEMS_PER_PAGE)
  const paginationHeight = mob ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const paginationMarginTop = getPlantPaginationMarginTop()

  const onClose = () => {
    playerState.activeMenu = 'none'
    playerState.activePlotEntity = null
  }

  return (
    <PlantPanelFrame onClose={onClose}>
      {available.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Label
            value="No seeds in inventory!"
            fontSize={mob ? ss(31) : ss(27)}
            color={mob ? { r: 1, g: 1, b: 1, a: 1 } : PLANT_CARD_TEXT_MUTE}
            textAlign="middle-center"
          />
          <Label
            value="Visit the Seed Shop to buy some."
            fontSize={mob ? ss(26) : ss(20)}
            color={mob ? { r: 1, g: 1, b: 1, a: 1 } : PLANT_CARD_TEXT_MUTE}
            textAlign="middle-center"
            uiTransform={{ margin: { top: ss(12) } }}
          />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1, alignItems: 'center' }}>
          <PlantGrid itemCount={pageSlice.length}>
            {pageSlice.map((ct) => (
              <SeedCard
                key={ct}
                cropType={ct}
                count={playerState.seeds.get(ct) ?? 0}
              />
            ))}
          </PlantGrid>

          {lastPage > 0 && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: paginationHeight,
                margin: { top: paginationMarginTop },
                flexShrink: 0,
              }}
            >
              <SharedPaginationBar
                id="plant-seeds"
                page={page}
                lastPage={lastPage}
                onPrev={() => { plantPage.value-- }}
                onNext={() => { plantPage.value++ }}
                mode={mob ? 'mobile' : 'desktop'}
                marginTop={0}
                buttonTextureSrc={PLANT_PAGINATION_BUTTON_IMG}
                buttonDisabledTextureSrc={PLANT_PAGINATION_BUTTON_IMG}
                buttonAspect={PLANT_PAGINATION_BUTTON_ASPECT}
                buttonLabelTopOffset={-ss(1)}
                pageTextTopOffset={-ss(1)}
                buttonLabelColor={PLANT_PAGINATION_TEXT}
                buttonLabelDisabledColor={PLANT_PAGINATION_TEXT_DISABLED}
                pageChipBgColor={PLANT_PAGINATION_CHIP_BG}
                pageChipBorderColor={PLANT_PAGINATION_CHIP_BORDER}
                pageChipTextColor={PLANT_PAGINATION_CHIP_TEXT}
              />
            </UiEntity>
          )}
        </UiEntity>
      )}
    </PlantPanelFrame>
  )
}
