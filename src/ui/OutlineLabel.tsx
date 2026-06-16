import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

type Color = { r: number; g: number; b: number; a: number }

const OFFSETS = [
  { left: -1, top: 0 }, { left: 1, top: 0 },
  { left: 0, top: -1 }, { left: 0, top: 1 },
]

type Props = {
  value:        string
  fontSize:     number
  color:        Color
  outlineColor: Color
  width:        number
  height:       number
  textAlign?:   'middle-left' | 'middle-center' | 'middle-right' | 'top-left' | 'top-center'
}

// Mirrors NpcNameLabel: 4 offset outline layers + 2 main layers (for solid fill)
// Inner labels use width:'100%' so they match the parent container exactly on all platforms
export const OutlineLabel = ({ value, fontSize, color, outlineColor, width, height, textAlign = 'middle-left' }: Props) => (
  <UiEntity uiTransform={{ width, height }}>
    {OFFSETS.map((off, i) => (
      <Label
        key={`ol-${i}`}
        value={value}
        fontSize={fontSize}
        color={outlineColor}
        textAlign={textAlign}
        uiTransform={{ width: '100%', height, positionType: 'absolute', position: off }}
      />
    ))}
    <Label
      value={value}
      fontSize={fontSize}
      color={color}
      textAlign={textAlign}
      uiTransform={{ width: '100%', height, positionType: 'absolute', position: { left: 1, top: 0 } }}
    />
    <Label
      value={value}
      fontSize={fontSize}
      color={color}
      textAlign={textAlign}
      uiTransform={{ width: '100%', height, positionType: 'absolute', position: { left: 0, top: 0 } }}
    />
  </UiEntity>
)
