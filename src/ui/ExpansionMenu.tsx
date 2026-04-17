import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import {
  removeForSaleSign2, removeForSaleSign3,
  unlockExpansion1Plots, unlockExpansion2Plots,
} from '../systems/interactionSetup'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { triggerCardShake, getShakeOffset, isShaking } from './cardShakeSystem'
import { COINS_ICON, SOIL_ICON } from '../data/imagePaths'

const EXPANSION_COST  = 500
const DIALOG_H        = 400
const BTN_H           = 64
const BTN_FONT        = 22
const BTN_W_BUY       = 220
const BTN_W_CANCEL    = 180
const BTN_BOTTOM      = 24
const BTN_RIGHT       = 24
const SHAKE_DURATION  = 320

const BUY_BTN_BG          = { r: 0.17, g: 0.52, b: 0.17, a: 1 }
const BUY_BTN_BG_DISABLED = { r: 0.22, g: 0.22, b: 0.22, a: 1 }

export const ExpansionMenu = () => {
  const pack      = playerState.activeMenu === 'expansion1' ? 1 : 2
  const canAfford = playerState.coins >= EXPANSION_COST

  function doConfirm() {
    playerState.coins -= EXPANSION_COST
    if (pack === 1) {
      playerState.expansion1Unlocked = true
      removeForSaleSign2()
      unlockExpansion1Plots()
    } else {
      playerState.expansion2Unlocked = true
      removeForSaleSign3()
      unlockExpansion2Plots()
    }
    playerState.activeMenu = 'none'
  }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: '8%', left: '20%' },
        width: '60%',
        height: DIALOG_H,
        flexDirection: 'row',
        pointerFilter: 'block',
      }}
      uiBackground={{ color: C.panelBg }}
    >
      {/* ── Left: soil visual ── */}
      <UiEntity
        uiTransform={{
          width: 160,
          height: 160,
          flexShrink: 0,
          alignSelf: 'center',
          margin: { left: 24, right: 16 },
        }}
        uiBackground={{
          texture: { src: SOIL_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      {/* ── Right: content ── */}
      <UiEntity
        uiTransform={{
          flex: 1,
          flexDirection: 'column',
          padding: { top: 24, bottom: BTN_H + BTN_BOTTOM + 8, left: 8, right: 70 },
        }}
      >
        <Label
          value={`Plot Expansion — Pack ${pack}`}
          fontSize={30}
          color={C.header}
          textAlign="middle-left"
          uiTransform={{ width: '100%', height: 46, margin: { bottom: 10 } }}
        />
        <UiEntity
          uiTransform={{ width: '100%', height: 2, margin: { bottom: 14 } }}
          uiBackground={{ color: C.divider }}
        />
        <Label
          value="Unlock 3 new soil plots to grow your own crops. These are yours to manage — no farmer needed."
          fontSize={22}
          color={C.textMain}
          textAlign="top-left"
          uiTransform={{ flex: 1 }}
        />

        {/* Cost row */}
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', height: 38 }}>
          <Label value="Cost: " fontSize={28} color={C.textMute} />
          <UiEntity
            uiTransform={{ width: 30, height: 30, margin: { left: 4, right: 6 }, flexShrink: 0 }}
            uiBackground={{ texture: { src: COINS_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          <Label
            value={`${EXPANSION_COST}`}
            fontSize={28}
            color={canAfford ? C.gold : { r: 1, g: 0.38, b: 0.38, a: 1 }}
          />
          <Label
            value={`  (You: ${playerState.coins})`}
            fontSize={22}
            color={C.textMute}
            uiTransform={{ margin: { left: 8 } }}
          />
        </UiEntity>
      </UiEntity>

      {/* ── X button ── */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: 0, top: 0 },
          width: 52,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        uiBackground={{ color: { r: 0.22, g: 0.08, b: 0.03, a: 1 } }}
        onMouseDown={() => { playSound('buttonclick'); playerState.activeMenu = 'none' }}
      >
        <Label value="✕" fontSize={24} color={C.orange} textAlign="middle-center" />
      </UiEntity>

      {/* ── BUY button (custom — includes coin icon + price) ── */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: {
            right: BTN_RIGHT + BTN_W_CANCEL + 12 - getShakeOffset('expansion_confirm'),
            bottom: BTN_BOTTOM,
          },
          width: BTN_W_BUY,
          height: BTN_H,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        uiBackground={{ color: canAfford ? BUY_BTN_BG : BUY_BTN_BG_DISABLED }}
        onMouseDown={() => {
          if (!canAfford || isShaking('expansion_confirm')) return
          playSound('buttonclick')
          triggerCardShake('expansion_confirm')
          setTimeout(doConfirm, SHAKE_DURATION)
        }}
      >
        <Label
          value="BUY"
          fontSize={BTN_FONT}
          color={canAfford ? { r: 1, g: 1, b: 1, a: 1 } : C.textMute}
          textAlign="middle-center"
        />
        <UiEntity
          uiTransform={{ width: 22, height: 22, margin: { left: 10, right: 6 }, flexShrink: 0 }}
          uiBackground={{ texture: { src: COINS_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label
          value={`${EXPANSION_COST}`}
          fontSize={BTN_FONT}
          color={canAfford ? C.gold : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>

      {/* ── Not now button ── */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: {
            right: BTN_RIGHT - getShakeOffset('expansion_cancel'),
            bottom: BTN_BOTTOM,
          },
        }}
      >
        <Button
          value="Not now"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_CANCEL, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking('expansion_cancel')) return
            playSound('buttonclick')
            triggerCardShake('expansion_cancel')
            setTimeout(() => { playerState.activeMenu = 'none' }, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
