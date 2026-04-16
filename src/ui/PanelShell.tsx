import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playSound } from '../systems/sfxSystem'

export const C = {
  panelBg:  { r: 0.09, g: 0.07, b: 0.04, a: 0.97 },
  header:   { r: 1,    g: 0.88, b: 0.5,  a: 1    },
  divider:  { r: 0.45, g: 0.32, b: 0.08, a: 0.7  },
  dim:      { r: 0,    g: 0,    b: 0,    a: 0.6   },
  rowBg:    { r: 0.14, g: 0.11, b: 0.07, a: 1     },
  textMain: { r: 0.95, g: 0.95, b: 0.9,  a: 1     },
  textMute: { r: 0.55, g: 0.55, b: 0.55, a: 1     },
  gold:     { r: 1,    g: 0.88, b: 0.2,  a: 1     },
  green:    { r: 0.3,  g: 0.92, b: 0.3,  a: 1     },
  blue:     { r: 0.4,  g: 0.75, b: 1,    a: 1     },
  orange:   { r: 1,    g: 0.72, b: 0.2,  a: 1     },
}

export const PANEL_W = 1290
export const PANEL_H = 870

type Props = {
  title: string
  onClose?: () => void
  children?: ReactEcs.JSX.ReactNode
}

export const PanelShell = ({ title, onClose, children }: Props) => (
  // Full-screen centering wrapper — no background so the world stays visible.
  // pointerFilter:'none' so the BottomNav and other UI behind the overlay stay clickable.
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: 0, left: 0 },
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      pointerFilter: 'none',
    }}
  >
    {/* Invisible full-screen blocker — prevents the mobile joystick from activating
        in areas outside the panel card. pointerFilter:'block' swallows all touches
        so they don't reach the 3D world. The panel card renders on top of this. */}
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        pointerFilter: 'block',
      }}
    />
    {/* Centered card — blocks its own area from 3D world clicks */}
    <UiEntity
      uiTransform={{
        width: PANEL_W,
        height: PANEL_H,
        flexDirection: 'column',
        padding: { top: 24, bottom: 36, left: 45, right: 45 },
        pointerFilter: 'block',
      }}
      uiBackground={{ color: C.panelBg }}
    >
      {/* Header: full-width title + X button absolutely pinned to the right */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 66,
          margin: { bottom: 10 },
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Label
          value={title}
          fontSize={36}
          color={C.header}
          textAlign="middle-center"
          uiTransform={{ width: '100%' }}
        />
        {onClose && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { right: 0, top: 4 },
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.22, g: 0.08, b: 0.03, a: 1 } }}
            onMouseDown={() => { playSound('buttonclick'); onClose() }}
          >
            <Label value="✕" fontSize={27} color={C.orange} textAlign="middle-center" />
          </UiEntity>
        )}
      </UiEntity>

      {/* Divider */}
      <UiEntity
        uiTransform={{ width: '100%', height: 3, margin: { bottom: 16 } }}
        uiBackground={{ color: C.divider }}
      />
      {/* Content area */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        {children}
      </UiEntity>
    </UiEntity>
  </UiEntity>
)
