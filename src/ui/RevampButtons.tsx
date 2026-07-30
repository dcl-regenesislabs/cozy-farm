import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'

export const BTN_PRIMARY_IMG = 'assets/images/revamp/Type=Primary, State=Focused.png'
export const BTN_SECONDARY_IMG = 'assets/images/revamp/Type=Secondary, State=Default.png'
export const MINI_BUTTON_IMG = 'assets/images/revamp/mini-button.png'
export const MINI_BUTTON_NO_COIN_IMG = 'assets/images/revamp/mini-button-no-coin.png'
export const TAB_SELECTED_IMG = 'assets/images/revamp/selected.png'
export const TAB_IDLE_IMG = 'assets/images/revamp/notselected.png'

export const BTN_TEXT_PRIMARY = { r: 1, g: 1, b: 1, a: 1 }
export const BTN_TEXT_SECONDARY = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
export const TAB_TEXT_PRIMARY = { r: 1, g: 1, b: 1, a: 1 }
export const TAB_TEXT_SECONDARY = { r: 0.34, g: 0.20, b: 0.10, a: 1 }

export const MINI_BUTTON_ASPECT = 196 / 52
export const DIALOG_BUTTON_ASPECT = 366 / 84
export const TAB_BUTTON_ASPECT = 151 / 68

export const TOUCH_CAPTURE = { r: 0, g: 0, b: 0, a: 0.001 }

export const DialogActionButton = ({
  label,
  primary = false,
  width,
  height,
  fontSize,
  zoomScale = 1,
  disabled = false,
  onPress,
}: {
  label: string
  primary?: boolean
  width: number
  height: number
  fontSize: number
  zoomScale?: number
  disabled?: boolean
  onPress?: () => void
}) => {
  const mobile = isMobile()
  const w = Math.round(width * zoomScale)
  const h = Math.round(height * zoomScale)
  const hitboxW = mobile ? w + 44 : w
  const hitboxH = mobile ? h + 18 : h
  const textColor = primary ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY
  const alpha = disabled ? 0.55 : 1

  return (
    <UiEntity
      uiTransform={{ width: hitboxW, height: hitboxH, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
    >
      <UiEntity
        uiTransform={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
        uiBackground={{
          texture: {
            src: primary ? BTN_PRIMARY_IMG : BTN_SECONDARY_IMG,
            wrapMode: 'clamp',
          },
          textureMode: 'stretch',
          color: { r: 1, g: 1, b: 1, a: alpha },
        }}
      >
        <Label
          value={`<b>${label}</b>`}
          fontSize={fontSize}
          color={disabled ? { ...textColor, a: 0.65 } : textColor}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            positionType: 'absolute',
            position: { top: -1, left: 0 },
            width: w,
            height: h,
          }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: 0, top: 0 },
          width: hitboxW,
          height: hitboxH,
          pointerFilter: 'block',
        }}
        uiBackground={{ color: TOUCH_CAPTURE }}
        onMouseDown={!disabled ? onPress : undefined}
      />
    </UiEntity>
  )
}

export const MiniTextButton = ({
  label,
  width,
  fontSize,
  topOffset = -4,
  disabled = false,
  textureSrc = MINI_BUTTON_NO_COIN_IMG,
  textColor = BTN_TEXT_PRIMARY,
  onPress,
}: {
  label: string
  width: number
  fontSize: number
  topOffset?: number
  disabled?: boolean
  textureSrc?: string
  textColor?: { r: number; g: number; b: number; a: number }
  onPress?: () => void
}) => {
  const mobile = isMobile()
  const height = Math.round(width / MINI_BUTTON_ASPECT)
  const hitboxW = mobile ? width + 34 : width
  const hitboxH = mobile ? height + 14 : height
  const alpha = disabled ? 0.58 : 1

  return (
    <UiEntity uiTransform={{ width: hitboxW, height: hitboxH, alignItems: 'center', justifyContent: 'center' }}>
      <UiEntity
        uiTransform={{ width, height, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{
          texture: { src: textureSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: { r: 1, g: 1, b: 1, a: alpha },
        }}
      >
        <Label
          value={`<b>${label}</b>`}
          fontSize={fontSize}
          color={disabled ? { ...textColor, a: 0.62 } : textColor}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            positionType: 'absolute',
            position: { top: topOffset, left: 0 },
            width,
            height,
          }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: 0, top: 0 },
          width: hitboxW,
          height: hitboxH,
          pointerFilter: 'block',
        }}
        uiBackground={{ color: TOUCH_CAPTURE }}
        onMouseDown={!disabled ? onPress : undefined}
      />
    </UiEntity>
  )
}

export const PillTabButton = ({
  label,
  selected,
  width,
  fontSize,
  onPress,
}: {
  label: string
  selected: boolean
  width: number
  fontSize: number
  onPress: () => void
}) => {
  const mobile = isMobile()
  const height = Math.round(width / TAB_BUTTON_ASPECT)
  const hitboxW = mobile ? width + 24 : width
  const hitboxH = mobile ? height + 18 : height
  const hitboxLeft = Math.round((width - hitboxW) / 2)

  return (
    <UiEntity
      uiTransform={{ width, height: hitboxH, alignItems: 'center', justifyContent: 'flex-start' }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        uiBackground={{
          texture: { src: selected ? TAB_SELECTED_IMG : TAB_IDLE_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      >
        <Label
          value={`<b>${label}</b>`}
          fontSize={fontSize}
          color={selected ? TAB_TEXT_PRIMARY : TAB_TEXT_SECONDARY}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            width: width - 18,
            height,
            padding: { bottom: mobile ? 12 : 10 },
          }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: hitboxLeft },
          width: hitboxW,
          height: hitboxH,
          pointerFilter: 'block',
        }}
        uiBackground={{ color: TOUCH_CAPTURE }}
        onMouseDown={onPress}
      />
    </UiEntity>
  )
}
