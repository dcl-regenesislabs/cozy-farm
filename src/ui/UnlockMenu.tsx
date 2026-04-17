import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { spawnFarmer } from '../systems/farmerSystem'
import { removeForSaleSign, unlockFarmerPlots } from '../systems/interactionSetup'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'

const UNLOCK_COST = 1000
const PANEL_W     = 480
const PANEL_H     = 230

export const UnlockMenu = () => {
  const canAfford = playerState.coins >= UNLOCK_COST

  return (
    // Full-screen wrapper — centres the panel on screen
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
      <UiEntity
        uiTransform={{
          width: PANEL_W,
          height: PANEL_H,
          flexDirection: 'column',
          padding: { top: 18, bottom: 20, left: 24, right: 24 },
          pointerFilter: 'block',
        }}
        uiBackground={{ color: C.panelBg }}
      >
        {/* Header row: title + X button */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 36,
            alignItems: 'center',
            margin: { bottom: 10 },
          }}
        >
          <Label
            value="For Sale Sign"
            fontSize={22}
            color={C.header}
            textAlign="middle-left"
            uiTransform={{ flex: 1 }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { right: 0, top: 0 },
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.22, g: 0.08, b: 0.03, a: 1 } }}
            onMouseDown={() => { playSound('buttonclick'); playerState.activeMenu = 'none' }}
          >
            <Label value="✕" fontSize={16} color={C.orange} textAlign="middle-center" />
          </UiEntity>
        </UiEntity>

        {/* Divider */}
        <UiEntity
          uiTransform={{ width: '100%', height: 1, margin: { bottom: 14 } }}
          uiBackground={{ color: C.divider }}
        />

        {/* Description */}
        <Label
          value="Unlock Tier 2 & 3 crops and hire a farmer to work the fields for you."
          fontSize={15}
          color={C.textMain}
          textAlign="top-left"
          uiTransform={{ flex: 1, margin: { bottom: 10 } }}
        />

        {/* Cost + buttons row */}
        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Label
            value={`Cost: ${UNLOCK_COST} coins  (You: ${playerState.coins})`}
            fontSize={15}
            color={canAfford ? C.gold : { r: 1, g: 0.38, b: 0.38, a: 1 }}
            textAlign="middle-left"
            uiTransform={{ flex: 1 }}
          />
          <UiEntity uiTransform={{ flexDirection: 'row' }}>
            <Button
              value="Confirm"
              variant={canAfford ? 'primary' : 'secondary'}
              disabled={!canAfford}
              fontSize={15}
              uiTransform={{ width: 120, height: 38, margin: { right: 10 } }}
              onMouseDown={() => {
                if (!canAfford) return
                playSound('buttonclick')
                playerState.coins -= UNLOCK_COST
                playerState.cropsUnlocked = true
                removeForSaleSign()
                unlockFarmerPlots()
                spawnFarmer()
                playerState.activeMenu = 'none'
              }}
            />
            <Button
              value="Cancel"
              variant="secondary"
              fontSize={15}
              uiTransform={{ width: 100, height: 38 }}
              onMouseDown={() => { playSound('buttonclick'); playerState.activeMenu = 'none' }}
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
