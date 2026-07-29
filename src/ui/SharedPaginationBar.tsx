import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playSound } from '../systems/sfxSystem'
import { getZoomScale, isZooming, triggerCardZoom } from './cardZoomSystem'

const PAGE_BUTTON_IMG = 'assets/images/revamp/mini-button.png'
const PAGE_BUTTON_DISABLED_IMG = 'assets/images/revamp/mini-button-not-coins.png'
const PAGE_BUTTON_ASPECT = 196 / 52

const PAGE_TEXT_ACTIVE = { r: 0.98, g: 0.96, b: 0.93, a: 1 }
const PAGE_TEXT_DISABLED = { r: 0.82, g: 0.79, b: 0.74, a: 0.72 }
const PAGE_CHIP_BG = { r: 0.16, g: 0.10, b: 0.04, a: 0.94 }
const PAGE_CHIP_BORDER = { r: 0.94, g: 0.75, b: 0.24, a: 0.95 }
const PAGE_CHIP_TEXT = { r: 0.98, g: 0.90, b: 0.72, a: 1 }
const PAGE_TOUCH_CAPTURE = { r: 0, g: 0, b: 0, a: 0.001 }

type PaginationMode = 'auto' | 'desktop' | 'mobile'

type SharedPaginationBarProps = {
  id?: string
  page: number
  lastPage: number
  onPrev: () => void
  onNext: () => void
  mode?: PaginationMode
  marginTop?: number
  hideIfSinglePage?: boolean
  buttonTextureSrc?: string
  buttonDisabledTextureSrc?: string
  buttonAspect?: number
  buttonLabelTopOffset?: number
  pageTextTopOffset?: number
  buttonLabelColor?: { r: number; g: number; b: number; a: number }
  buttonLabelDisabledColor?: { r: number; g: number; b: number; a: number }
  pageChipBgColor?: { r: number; g: number; b: number; a: number }
  pageChipBorderColor?: { r: number; g: number; b: number; a: number }
  pageChipTextColor?: { r: number; g: number; b: number; a: number }
  labelFontSize?: number
  pageFontSize?: number
}

export const SHARED_PAGINATION_HEIGHT_DESKTOP = 52
export const SHARED_PAGINATION_HEIGHT_MOBILE = 78

export const SharedPaginationBar = ({
  id = 'shared-pagination',
  page,
  lastPage,
  onPrev,
  onNext,
  mode = 'auto',
  marginTop = 0,
  hideIfSinglePage = false,
  buttonTextureSrc = PAGE_BUTTON_IMG,
  buttonDisabledTextureSrc = PAGE_BUTTON_DISABLED_IMG,
  buttonAspect = PAGE_BUTTON_ASPECT,
  buttonLabelTopOffset = 0,
  pageTextTopOffset = 0,
  buttonLabelColor = PAGE_TEXT_ACTIVE,
  buttonLabelDisabledColor = PAGE_TEXT_DISABLED,
  pageChipBgColor = PAGE_CHIP_BG,
  pageChipBorderColor = PAGE_CHIP_BORDER,
  pageChipTextColor = PAGE_CHIP_TEXT,
  labelFontSize,
  pageFontSize,
}: SharedPaginationBarProps) => {
  if (hideIfSinglePage && lastPage <= 0) return null

  const mobile = mode === 'mobile' || (mode === 'auto' && isMobile())
  const canPrev = page > 0
  const canNext = page < lastPage
  const rowHeight = mobile ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const buttonWidth = mobile ? 214 : 150
  const buttonHeight = Math.round(buttonWidth / buttonAspect)
  const buttonTouchWidth = mobile ? buttonWidth + 56 : buttonWidth
  const buttonTouchHeight = mobile ? buttonHeight + 18 : buttonHeight
  const buttonGap = mobile ? 14 : 14
  const pageWidth = mobile ? 118 : 92
  const pageHeight = mobile ? 44 : 34
  const pageRadius = mobile ? 18 : 14
  const pageBorder = mobile ? 3 : 2
  const labelFont = labelFontSize ?? (mobile ? 21 : 17)
  const pageFont = pageFontSize ?? (mobile ? 20 : 16)
  const prevKey = `${id}_prev`
  const nextKey = `${id}_next`
  const prevScale = getZoomScale(prevKey)
  const nextScale = getZoomScale(nextKey)
  const runPrev = canPrev ? () => {
    if (isZooming(prevKey)) return
    playSound('pagination')
    playSound('buttonclick')
    triggerCardZoom(prevKey)
    setTimeout(onPrev, 290)
  } : undefined
  const runNext = canNext ? () => {
    if (isZooming(nextKey)) return
    playSound('pagination')
    playSound('buttonclick')
    triggerCardZoom(nextKey)
    setTimeout(onNext, 290)
  } : undefined

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: rowHeight,
        flexShrink: 0,
        margin: { top: marginTop },
      }}
    >
      <UiEntity
        uiTransform={{
          width: Math.round(buttonTouchWidth * prevScale),
          height: Math.round(buttonTouchHeight * prevScale),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { right: buttonGap },
          pointerFilter: 'block',
        }}
        uiBackground={mobile ? { color: PAGE_TOUCH_CAPTURE } : undefined}
        onMouseDown={runPrev}
      >
        <UiEntity
          uiTransform={{
            width: Math.round(buttonWidth * prevScale),
            height: Math.round(buttonHeight * prevScale),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{
            texture: { src: canPrev ? buttonTextureSrc : buttonDisabledTextureSrc, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        >
          <Label
            value="<b>Prev</b>"
            fontSize={labelFont}
            color={canPrev ? buttonLabelColor : buttonLabelDisabledColor}
            textAlign="middle-center"
            uiTransform={{
              positionType: 'absolute',
              position: { top: buttonLabelTopOffset, left: 0 },
              width: Math.round(buttonWidth * prevScale),
              height: Math.round(buttonHeight * prevScale),
            }}
          />
        </UiEntity>
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: pageWidth,
          height: pageHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: pageRadius,
          borderWidth: pageBorder,
          borderColor: pageChipBorderColor,
          margin: { top: mobile ? 1 : 0 },
        }}
        uiBackground={{ color: pageChipBgColor }}
      >
        <Label
          value={`<b>${page + 1}</b> / ${lastPage + 1}`}
          fontSize={pageFont}
          color={pageChipTextColor}
          textAlign="middle-center"
          uiTransform={{
            positionType: 'absolute',
            position: { top: pageTextTopOffset, left: 0 },
            width: pageWidth,
            height: pageHeight,
          }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: Math.round(buttonTouchWidth * nextScale),
          height: Math.round(buttonTouchHeight * nextScale),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { left: buttonGap },
          pointerFilter: 'block',
        }}
        uiBackground={mobile ? { color: PAGE_TOUCH_CAPTURE } : undefined}
        onMouseDown={runNext}
      >
        <UiEntity
          uiTransform={{
            width: Math.round(buttonWidth * nextScale),
            height: Math.round(buttonHeight * nextScale),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{
            texture: { src: canNext ? buttonTextureSrc : buttonDisabledTextureSrc, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        >
          <Label
            value="<b>Next</b>"
            fontSize={labelFont}
            color={canNext ? buttonLabelColor : buttonLabelDisabledColor}
            textAlign="middle-center"
            uiTransform={{
              positionType: 'absolute',
              position: { top: buttonLabelTopOffset, left: 0 },
              width: Math.round(buttonWidth * nextScale),
              height: Math.round(buttonHeight * nextScale),
            }}
          />
        </UiEntity>
      </UiEntity>

      {mobile && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: 0, top: 0 },
            width: '43%',
            height: '100%',
            pointerFilter: 'block',
          }}
          uiBackground={{ color: PAGE_TOUCH_CAPTURE }}
          onMouseDown={runPrev}
        />
      )}

      {mobile && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: 0, top: 0 },
            width: '43%',
            height: '100%',
            pointerFilter: 'block',
          }}
          uiBackground={{ color: PAGE_TOUCH_CAPTURE }}
          onMouseDown={runNext}
        />
      )}
    </UiEntity>
  )
}
