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
}

export const SHARED_PAGINATION_HEIGHT_DESKTOP = 52
export const SHARED_PAGINATION_HEIGHT_MOBILE = 64

export const SharedPaginationBar = ({
  id = 'shared-pagination',
  page,
  lastPage,
  onPrev,
  onNext,
  mode = 'auto',
  marginTop = 0,
  hideIfSinglePage = false,
}: SharedPaginationBarProps) => {
  if (hideIfSinglePage && lastPage <= 0) return null

  const mobile = mode === 'mobile' || (mode === 'auto' && isMobile())
  const canPrev = page > 0
  const canNext = page < lastPage
  const rowHeight = mobile ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const buttonWidth = mobile ? 184 : 150
  const buttonHeight = Math.round(buttonWidth / PAGE_BUTTON_ASPECT)
  const buttonGap = mobile ? 18 : 14
  const pageWidth = mobile ? 110 : 92
  const pageHeight = mobile ? 42 : 34
  const pageRadius = mobile ? 18 : 14
  const pageBorder = mobile ? 3 : 2
  const labelFont = mobile ? 21 : 17
  const pageFont = mobile ? 20 : 16
  const prevKey = `${id}_prev`
  const nextKey = `${id}_next`
  const prevScale = getZoomScale(prevKey)
  const nextScale = getZoomScale(nextKey)

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
          width: Math.round(buttonWidth * prevScale),
          height: Math.round(buttonHeight * prevScale),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { right: buttonGap },
        }}
        uiBackground={{
          texture: { src: canPrev ? PAGE_BUTTON_IMG : PAGE_BUTTON_DISABLED_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
        onMouseDown={canPrev ? () => {
          if (isZooming(prevKey)) return
          playSound('pagination')
          playSound('buttonclick')
          triggerCardZoom(prevKey)
          setTimeout(onPrev, 290)
        } : undefined}
      >
        <Label
          value="<b>Prev</b>"
          fontSize={labelFont}
          color={canPrev ? PAGE_TEXT_ACTIVE : PAGE_TEXT_DISABLED}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { bottom: mobile ? 1 : 0 } }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: pageWidth,
          height: pageHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: pageRadius,
          borderWidth: pageBorder,
          borderColor: PAGE_CHIP_BORDER,
          margin: { top: mobile ? 1 : 0 },
        }}
        uiBackground={{ color: PAGE_CHIP_BG }}
      >
        <Label
          value={`<b>${page + 1}</b> / ${lastPage + 1}`}
          fontSize={pageFont}
          color={PAGE_CHIP_TEXT}
          textAlign="middle-center"
          uiTransform={{ width: '100%' }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: Math.round(buttonWidth * nextScale),
          height: Math.round(buttonHeight * nextScale),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { left: buttonGap },
        }}
        uiBackground={{
          texture: { src: canNext ? PAGE_BUTTON_IMG : PAGE_BUTTON_DISABLED_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
        onMouseDown={canNext ? () => {
          if (isZooming(nextKey)) return
          playSound('pagination')
          playSound('buttonclick')
          triggerCardZoom(nextKey)
          setTimeout(onNext, 290)
        } : undefined}
      >
        <Label
          value="<b>Next</b>"
          fontSize={labelFont}
          color={canNext ? PAGE_TEXT_ACTIVE : PAGE_TEXT_DISABLED}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { bottom: mobile ? 1 : 0 } }}
        />
      </UiEntity>
    </UiEntity>
  )
}
