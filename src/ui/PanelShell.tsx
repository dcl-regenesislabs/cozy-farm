import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

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

export const PANEL_W = 860
export const PANEL_H = 580

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
    {/* Centered card — blocks its own area from 3D world clicks */}
    <UiEntity
      uiTransform={{
        width: PANEL_W,
        height: PANEL_H,
        flexDirection: 'column',
        padding: { top: 16, bottom: 24, left: 30, right: 30 },
        pointerFilter: 'block',
      }}
      uiBackground={{ color: C.panelBg }}
    >
      {/* Header: full-width title + X button absolutely pinned to the right */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 44,
          margin: { bottom: 10 },
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Label
          value={title}
          fontSize={24}
          color={C.header}
          textAlign="middle-center"
          uiTransform={{ width: '100%' }}
        />
        {onClose && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { right: 0, top: 4 },
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.22, g: 0.08, b: 0.03, a: 1 } }}
            onMouseDown={onClose}
          >
            <Label value="✕" fontSize={18} color={C.orange} textAlign="middle-center" />
          </UiEntity>
        )}
      </UiEntity>

      {/* Divider */}
      <UiEntity
        uiTransform={{ width: '100%', height: 2, margin: { bottom: 16 } }}
        uiBackground={{ color: C.divider }}
      />
      {/* Content area */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        {children}
      </UiEntity>
    </UiEntity>
  </UiEntity>
)
