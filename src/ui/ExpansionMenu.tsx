import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import {
  removeForSaleSign2,
  removeForSaleSign3,
  unlockExpansion1Plots,
  unlockExpansion2Plots,
} from '../systems/interactionSetup'
import { playSound } from '../systems/sfxSystem'
import { triggerCardShake, isShaking } from './cardShakeSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { COINS_IMAGE, SOIL_ICON } from '../data/imagePaths'
import { DialogActionButton } from './RevampButtons'
import { OutlineLabel } from './OutlineLabel'

const BG_SRC = 'assets/images/ui_loading/npc_dialog_background.png'

const EXPANSION_COST = 500
const ZOOM_DURATION = 290
const SHAKE_DURATION = 320

const TEXT_BROWN = { r: 0.28, g: 0.15, b: 0.04, a: 1 }
const TEXT_BROWN_MUTE = { r: 0.48, g: 0.30, b: 0.10, a: 1 }

const BASE_W = 740
const BASE_H = 380
const BASE_ICON_SIZE = 145
const BASE_ICON_LEFT = 72
const BASE_ICON_TOP = 118
const BASE_NAME_TOP = 68
const BASE_NAME_H = 36
const BASE_TEXT_RIGHT = 98
const BASE_BTN_H = 36
const BASE_BTN_FONT = 18
const BASE_BTN_W_PAIR = 140
const BASE_BTN_BOTTOM = 68

export const ExpansionMenu = () => {
  const mobile = isMobile()
  const d = (v: number) => Math.round(v * (mobile ? 1.5 : 1))

  const pack = playerState.activeMenu === 'expansion1' ? 1 : 2
  const canAfford = playerState.coins >= EXPANSION_COST
  const buyScale = getZoomScale('expansion_confirm')

  const W = d(BASE_W)
  const H = d(BASE_H)
  const ICON_SIZE = d(BASE_ICON_SIZE)
  const ICON_LEFT = d(BASE_ICON_LEFT)
  const ICON_TOP = d(BASE_ICON_TOP)
  const NAME_TOP = d(BASE_NAME_TOP)
  const NAME_H = d(BASE_NAME_H)
  const NAME_LEFT = ICON_LEFT + ICON_SIZE + d(14)
  const TEXT_W = W - NAME_LEFT - d(BASE_TEXT_RIGHT)
  const BTN_H = d(BASE_BTN_H)
  const BTN_FONT = d(BASE_BTN_FONT)
  const BTN_W = d(BASE_BTN_W_PAIR)
  const BTN_BOTTOM = d(BASE_BTN_BOTTOM)
  const BTN_LEFT = Math.round((W - BTN_W * 2 - d(10)) / 2)
  const TEXT_TOP = NAME_TOP + NAME_H + d(18)
  const COST_TOP = TEXT_TOP + d(62)

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
        position: { bottom: '6%', left: 0 },
        width: '100%',
        height: H,
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none',
      }}
    >
      <UiEntity
        uiTransform={{ width: W, height: H, pointerFilter: 'block' }}
        uiBackground={{ texture: { src: BG_SRC, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: ICON_TOP, left: ICON_LEFT },
            width: ICON_SIZE,
            height: ICON_SIZE,
          }}
          uiBackground={{ texture: { src: SOIL_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: NAME_TOP, left: NAME_LEFT },
            width: TEXT_W,
            height: NAME_H,
          }}
        >
          <OutlineLabel
            value={`Plot Expansion - Pack ${pack}`}
            fontSize={d(24)}
            color={{ r: 1, g: 0.88, b: 0.5, a: 1 }}
            outlineColor={{ r: 0.15, g: 0.07, b: 0.02, a: 1 }}
            width={TEXT_W}
            height={NAME_H}
          />
        </UiEntity>

        <Label
          value="Unlock 3 new soil plots for your farm and keep the same revamp progression flow."
          fontSize={d(mobile ? 15 : 18)}
          color={TEXT_BROWN}
          textAlign="top-left"
          uiTransform={{
            positionType: 'absolute',
            position: { top: TEXT_TOP, left: NAME_LEFT },
            width: TEXT_W,
            height: d(56),
          }}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: COST_TOP, left: NAME_LEFT },
            flexDirection: 'row',
            alignItems: 'center',
            height: d(28),
          }}
        >
          <Label value="Cost: " fontSize={d(15)} color={TEXT_BROWN_MUTE} />
          <UiEntity
            uiTransform={{ width: d(18), height: d(18), margin: { left: 4, right: 4 }, flexShrink: 0 }}
            uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          <Label
            value={`${EXPANSION_COST}`}
            fontSize={d(18)}
            color={canAfford ? TEXT_BROWN : { r: 0.7, g: 0.15, b: 0.05, a: 1 }}
          />
          <Label
            value={`  (you have: ${playerState.coins})`}
            fontSize={d(13)}
            color={TEXT_BROWN_MUTE}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: BTN_LEFT, bottom: BTN_BOTTOM },
            flexDirection: 'row',
          }}
        >
          <DialogActionButton
            label={`Buy ${EXPANSION_COST}`}
            primary
            width={BTN_W}
            height={BTN_H}
            fontSize={BTN_FONT}
            zoomScale={buyScale}
            disabled={!canAfford}
            onPress={() => {
              if (!canAfford || isZooming('expansion_confirm')) return
              playSound('buttonclick')
              triggerCardZoom('expansion_confirm')
              setTimeout(doConfirm, ZOOM_DURATION)
            }}
          />

          <UiEntity uiTransform={{ width: d(10), height: 1 }} />

          <DialogActionButton
            label="Not now"
            width={BTN_W}
            height={BTN_H}
            fontSize={BTN_FONT}
            onPress={() => {
              if (isShaking('expansion_cancel')) return
              playSound('buttonclick')
              triggerCardShake('expansion_cancel')
              setTimeout(() => { playerState.activeMenu = 'none' }, SHAKE_DURATION)
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
