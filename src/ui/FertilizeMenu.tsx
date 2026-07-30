import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { applyFertilizer } from '../game/actions'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType } from '../data/fertilizerData'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { RevampPanelFrame } from './RevampPanel'
import { MiniTextButton } from './RevampButtons'
import { SHARED_PAGINATION_HEIGHT_DESKTOP, SHARED_PAGINATION_HEIGHT_MOBILE, SharedPaginationBar } from './SharedPaginationBar'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const CARD_IMG = 'assets/images/revamp/card.png'
const CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const COUNT_COLOR = { r: 0.30, g: 0.66, b: 0.20, a: 1 }

const CARD_W = 208
const CARD_H = 322
const CARD_BG_SCALE = 1.14
const CARD_BG_SCALE_MOBILE = 1.04
const CARD_CONTENT_SCALE_MOBILE = 1.12
const CARD_ART_ASPECT = 236 / 326
const CARD_ICON = 92
const CARD_TITLE_LG = ss(27)
const CARD_TITLE_SM = ss(23)
const CARD_BODY = ss(18)
const CARD_BUTTON_W = 126
const CARD_BUTTON_FONT = ss(20)
const CARD_BUTTON_ASPECT = 196 / 52
const GRID_CARD_SLOT_TRIM = 10
const CARD_TOP_AIR = ss(14)
const CARD_TITLE_BLOCK_H = ss(48)
const CARD_COUNT_BLOCK_H = ss(28)
const CARD_DESC_BLOCK_H = ss(30)
const ITEMS_PER_PAGE_MOBILE = 2
const GRID_TOP_GAP = ss(10)
const PAGINATION_MARGIN_TOP = ss(24)
const MOBILE_TEXT_BOTTOM_GAP = ss(24)
const MOBILE_GRID_TOP_GAP = ss(18)
const MOBILE_PAGINATION_BOTTOM_INSET = ss(14)

const fertPage = { value: 0 }

function scaleCardContent(value: number): number {
  return isMobile() ? Math.round(value * CARD_CONTENT_SCALE_MOBILE) : value
}

function getCardBgScale(): number {
  return isMobile() ? CARD_BG_SCALE_MOBILE : CARD_BG_SCALE
}

function getCardTitleFont(title: string): number {
  return title.length <= 12 ? scaleCardContent(CARD_TITLE_LG) : scaleCardContent(CARD_TITLE_SM)
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
      bottom: isMobile() ? 24 : 34,
      left: isMobile() ? 12 : 16,
      right: isMobile() ? 12 : 16,
    },
  }
}

function getCardVisualWidth(): number {
  return Math.round(CARD_W * getCardBgScale())
}

function getGridTopGap(): number {
  return isMobile() ? MOBILE_GRID_TOP_GAP : GRID_TOP_GAP
}

function getPaginationGap(): number {
  return isMobile() ? PAGINATION_MARGIN_TOP + MOBILE_PAGINATION_BOTTOM_INSET : PAGINATION_MARGIN_TOP
}

const FertCard = ({ fertType, count }: { fertType: FertilizerType; count: number }) => {
  const def = FERTILIZER_DATA.get(fertType)!
  const zoomKey = `fert_${fertType}`
  const transform = getCardTransform()
  const textWidth = transform.width - (isMobile() ? 24 : 32)
  const iconSize = scaleCardContent(CARD_ICON)
  const buttonWidth = Math.round(CARD_BUTTON_W * (isMobile() ? CARD_CONTENT_SCALE_MOBILE : 1))
  const buttonHeight = Math.round(buttonWidth / CARD_BUTTON_ASPECT)

  const apply = () => {
    if (isZooming(zoomKey)) return
    const entity = playerState.activePlotEntity
    if (!entity) return
    playSound('buttonclick')
    triggerCardZoom(zoomKey)
    setTimeout(() => {
      if (entity) applyFertilizer(entity, fertType)
      if (playerState.activeMenu === 'fertilize') playerState.activeMenu = 'none'
      playerState.activePlotEntity = null
    }, 290)
  }

  return (
    <UiEntity
      uiTransform={{ ...transform, margin: { right: ss(4), bottom: ss(4) } }}
      uiBackground={{ texture: { src: CARD_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    >
      <UiEntity uiTransform={{ height: CARD_TOP_AIR, flexShrink: 0 }} />

      <UiEntity
        uiTransform={{
          width: iconSize,
          height: iconSize,
          margin: { bottom: ss(10) },
          flexShrink: 0,
        }}
        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />

      <Label
        value={`<b>${def.name}</b>`}
        fontSize={getCardTitleFont(def.name)}
        color={CARD_TEXT}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(CARD_TITLE_BLOCK_H) }}
      />
      <Label
        value={`x${count}`}
        fontSize={scaleCardContent(CARD_TITLE_SM)}
        color={COUNT_COLOR}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(CARD_COUNT_BLOCK_H), margin: { top: ss(4) } }}
      />
      <Label
        value={def.description}
        fontSize={scaleCardContent(CARD_BODY)}
        color={CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: scaleCardContent(CARD_DESC_BLOCK_H), margin: { top: ss(4) } }}
      />

      <UiEntity uiTransform={{ flex: 1 }} />

      <MiniTextButton
        label="APPLY"
        width={buttonWidth}
        fontSize={scaleCardContent(CARD_BUTTON_FONT)}
        topOffset={-scaleCardContent(4)}
        onPress={apply}
      />

      {isMobile() && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: transform.width,
            height: Math.max(0, transform.height - buttonHeight - ss(12)),
          }}
          onMouseDown={apply}
        />
      )}
    </UiEntity>
  )
}

export const FertilizeMenu = () => {
  const availableFerts = ALL_FERTILIZER_TYPES.filter((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
  const itemsPerPage = isMobile() ? ITEMS_PER_PAGE_MOBILE : Math.max(1, availableFerts.length)
  const lastPage = Math.max(0, Math.ceil(availableFerts.length / itemsPerPage) - 1)
  if (fertPage.value > lastPage) fertPage.value = lastPage
  const page = fertPage.value
  const pageSlice = availableFerts.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const columns = isMobile() ? 2 : 4
  const paginationHeight = isMobile() ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const slotWidth = Math.max(0, getCardVisualWidth() - GRID_CARD_SLOT_TRIM)
  const offsetX = Math.round((slotWidth - getCardVisualWidth()) / 2)
  const rows: FertilizerType[][] = []

  for (let i = 0; i < pageSlice.length; i += columns) {
    rows.push(pageSlice.slice(i, i + columns))
  }

  return (
    <RevampPanelFrame titleText="Fertilizers" onClose={() => {
      playerState.activeMenu = 'none'
      playerState.activePlotEntity = null
    }}>
      <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center' }}>
        <Label
          value="Pick a fertilizer to apply to this crop"
          fontSize={isMobile() ? ss(26) : ss(24)}
          color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{ width: '100%', margin: { top: ss(16), bottom: isMobile() ? MOBILE_TEXT_BOTTOM_GAP : ss(16) } }}
        />

        <UiEntity uiTransform={{ flex: 1, width: '100%' }}>
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              padding: { bottom: lastPage > 0 ? paginationHeight + getPaginationGap() : 0 },
            }}
          >
            <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'center', margin: { top: getGridTopGap() } }}>
              {rows.map((row, rowIndex) => (
                <UiEntity
                  key={`fert-row-${rowIndex}`}
                  uiTransform={{
                    flexDirection: 'row',
                    width: row.length * slotWidth,
                    height: getCardTransform().height,
                    justifyContent: 'center',
                    margin: { bottom: rowIndex < rows.length - 1 ? ss(12) : 0 },
                  }}
                >
                  {row.map((fertType) => (
                    <UiEntity key={fertType} uiTransform={{ width: slotWidth, height: getCardTransform().height }}>
                      <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                        <FertCard fertType={fertType} count={playerState.fertilizers.get(fertType) ?? 0} />
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
                position: { left: 0, bottom: isMobile() ? MOBILE_PAGINATION_BOTTOM_INSET : 0 },
                width: '100%',
                height: paginationHeight,
              }}
            >
              <SharedPaginationBar
                id="fertilize-menu"
                page={page}
                lastPage={lastPage}
                onPrev={() => { fertPage.value-- }}
                onNext={() => { fertPage.value++ }}
                mode={isMobile() ? 'mobile' : 'desktop'}
              />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>
    </RevampPanelFrame>
  )
}
