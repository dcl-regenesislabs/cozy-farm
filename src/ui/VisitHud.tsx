import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { exitVisitMode } from '../services/visitService'
import { playSound } from '../systems/sfxSystem'
import { C } from './PanelShell'

function shortenAddr(addr: string): string {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export const VisitHud = () => {
  if (!playerState.viewingFarm) return null

  const label = shortenAddr(playerState.viewingFarm)

  return (
    // Sits directly below TopHud (top:10, height:120) — same left:720 column
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 138, left: 720 },
        width: 540,
        height: 72,
        flexDirection: 'row',
        alignItems: 'center',
        padding: { left: 16, right: 12 },
        pointerFilter: 'block',
      }}
      uiBackground={{ color: { r: 0.06, g: 0.04, b: 0.02, a: 0.92 } }}
    >
      {/* Accent bar */}
      <UiEntity
        uiTransform={{ width: 4, height: 36, margin: { right: 12 } }}
        uiBackground={{ color: C.gold }}
      />

      {/* Label */}
      <Label
        value={`Visiting ${label}`}
        fontSize={22}
        color={C.header}
        textAlign="middle-left"
        uiTransform={{ flex: 1 }}
      />

      {/* Return Home button */}
      <UiEntity
        uiTransform={{ width: 190, height: 52, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{ color: { r: 0.2, g: 0.55, b: 0.2, a: 1 } }}
        onMouseDown={() => { playSound('buttonclick'); exitVisitMode() }}
      >
        <Label value="Return Home" fontSize={22} color={C.textMain} textAlign="middle-center" />
      </UiEntity>
    </UiEntity>
  )
}
