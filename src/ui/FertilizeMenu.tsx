import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { applyFertilizer } from '../game/actions'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType } from '../data/fertilizerData'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { RevampPanelFrame } from './RevampPanel'
import { MiniTextButton } from './RevampButtons'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const CARD_IMG = 'assets/images/revamp/card.png'
const CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const COUNT_COLOR = { r: 0.30, g: 0.66, b: 0.20, a: 1 }

const CARD_W = 208
const CARD_H = 322
const CARD_BG_SCALE = 1.14
const CARD_BG_SCALE_MOBILE = 1.18
const CARD_CONTENT_SCALE_MOBILE = 1.18
const CARD_ART_ASPECT = 236 / 326
const CARD_ICON = 92
const CARD_TITLE_LG = ss(27)
const CARD_TITLE_SM = ss(23)
const CARD_BODY = ss(18)
const CARD_BUTTON_W = 126
const CARD_BUTTON_FONT = ss(20)
const GRID_CARD_SLOT_TRIM = 10
const CARD_TOP_AIR = ss(14)

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
      bottom: isMobile() ? 40 : 34,
      left: isMobile() ? 12 : 16,
      right: isMobile() ? 12 : 16,
    },
  }
}

function getCardVisualWidth(): number {
  return Math.round(CARD_W * getCardBgScale())
}

const FertCard = ({ fertType, count }: { fertType: FertilizerType; count: number }) => {
  const def = FERTILIZER_DATA.get(fertType)!
  const zoomKey = `fert_${fertType}`
  const transform = getCardTransform()
  const iconSize = scaleCardContent(CARD_ICON)

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
          margin: { bottom: ss(12) },
          flexShrink: 0,
        }}
        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />

      <Label value={`<b>${def.name}</b>`} fontSize={getCardTitleFont(def.name)} color={CARD_TEXT} textAlign="middle-center" />
      <Label value={`x${count}`} fontSize={scaleCardContent(CARD_TITLE_SM)} color={COUNT_COLOR} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
      <Label value={def.description} fontSize={scaleCardContent(CARD_BODY)} color={CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(10) } }} />

      <UiEntity uiTransform={{ flex: 1 }} />

      <MiniTextButton
        label="APPLY"
        width={Math.round(CARD_BUTTON_W * (isMobile() ? CARD_CONTENT_SCALE_MOBILE : 1))}
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
            height: transform.height,
          }}
          onMouseDown={apply}
        />
      )}
    </UiEntity>
  )
}

export const FertilizeMenu = () => {
  const availableFerts = ALL_FERTILIZER_TYPES.filter((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
  const columns = isMobile() ? 2 : 4
  const slotWidth = Math.max(0, getCardVisualWidth() - GRID_CARD_SLOT_TRIM)
  const offsetX = Math.round((slotWidth - getCardVisualWidth()) / 2)
  const rows: FertilizerType[][] = []

  for (let i = 0; i < availableFerts.length; i += columns) {
    rows.push(availableFerts.slice(i, i + columns))
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
          uiTransform={{ width: '100%', margin: { top: ss(16), bottom: ss(16) } }}
        />

        <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'center', margin: { top: ss(12) } }}>
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
    </RevampPanelFrame>
  )
}
