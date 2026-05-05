import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'

type Props = { top?: number; right?: number; size?: number }

export const BadgeDot = ({ top = -5, right = -5, size = 14 }: Props) => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top, right },
      width: size,
      height: size,
      borderRadius: size / 2,
    }}
    uiBackground={{ color: { r: 1, g: 0.15, b: 0.15, a: 1 } }}
  />
)
