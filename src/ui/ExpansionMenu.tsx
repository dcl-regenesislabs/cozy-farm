import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import {
  removeForSaleSign2, removeForSaleSign3,
  unlockExpansion1Plots, unlockExpansion2Plots,
} from '../systems/interactionSetup'
import { playSound } from '../systems/sfxSystem'
import { triggerCardShake, isShaking } from './cardShakeSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { COINS_IMAGE, SOIL_ICON } from '../data/imagePaths'

const BG_SRC = 'assets/images/ui_loading/npc_dialog_background.png'

const EXPANSION_COST  = 500
const ZOOM_DURATION   = 290
const SHAKE_DURATION  = 320

// Warm parchment palette — mirrors NpcDialogMenu
const TEXT_BROWN       = { r: 0.28, g: 0.15, b: 0.04, a: 1 }
const TEXT_BROWN_MUTE  = { r: 0.48, g: 0.30, b: 0.10, a: 1 }
const BTN_BG_PRIMARY   = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_BG_SECONDARY = { r: 0.62, g: 0.42, b: 0.16, a: 1 }
const BTN_BG_DISABLED  = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT         = { r: 0.97, g: 0.90, b: 0.68, a: 1 }
const BTN_TEXT_MUTED   = { r: 0.60, g: 0.50, b: 0.35, a: 1 }

// Base dimensions — same reference frame as NpcDialogMenu
const BASE_W             = 740
const BASE_H             = 380
const BASE_PORT_SIZE     = 145
const BASE_PORT_LEFT     = 72
const BASE_PORT_TOP      = 118   // vertically centred icon vs lower NPC portrait
const BASE_NAME_TOP      = 68
const BASE_NAME_H        = 36
const BASE_TEXT_RIGHT    = 98
const BASE_BTN_H         = 36
const BASE_BTN_FONT      = 14
const BASE_BTN_W_PAIR    = 120
const BASE_BTN_BOTTOM    = 68

export const ExpansionMenu = () => {
  const mobile = isMobile()
  const d = (v: number) => Math.round(v * (mobile ? 1.5 : 1))

  const pack      = playerState.activeMenu === 'expansion1' ? 1 : 2
  const canAfford = playerState.coins >= EXPANSION_COST

  const W          = d(BASE_W)
  const H          = d(BASE_H)
  const PORT_SIZE  = d(BASE_PORT_SIZE)
  const PORT_LEFT  = d(BASE_PORT_LEFT)
  const PORT_TOP   = d(BASE_PORT_TOP)
  const NAME_TOP   = d(BASE_NAME_TOP)
  const NAME_H     = d(BASE_NAME_H)
  const NAME_LEFT  = PORT_LEFT + PORT_SIZE + d(14)
  const TEXT_RIGHT = d(BASE_TEXT_RIGHT)
  const TEXT_W     = W - NAME_LEFT - TEXT_RIGHT
  const BTN_H      = d(BASE_BTN_H)
  const BTN_FONT   = d(BASE_BTN_FONT)
  const BTN_W      = d(BASE_BTN_W_PAIR)
  const BTN_BOTTOM = d(BASE_BTN_BOTTOM)
  const BTN_LEFT   = Math.round((W - BTN_W * 2 - d(10)) / 2)
  const TEXT_TOP   = NAME_TOP + NAME_H + d(12)
  const COST_TOP   = TEXT_TOP + d(60)
  const buyScale   = getZoomScale('expansion_confirm')

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

        {/* Soil icon — occupies the NPC portrait slot */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: PORT_TOP, left: PORT_LEFT },
            width: PORT_SIZE,
            height: PORT_SIZE,
          }}
          uiBackground={{ texture: { src: SOIL_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />

        {/* Title */}
        <Label
          value={`Plot Expansion — Pack ${pack}`}
          fontSize={d(22)}
          color={TEXT_BROWN}
          textAlign="middle-left"
          uiTransform={{
            positionType: 'absolute',
            position: { top: NAME_TOP, left: NAME_LEFT },
            width: TEXT_W,
            height: NAME_H,
          }}
        />

        {/* Description */}
        <Label
          value={`Unlock 3 new soil plots for your farm.\nMore land, more crops, more harvest!`}
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

        {/* Cost row */}
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
            fontSize={d(16)}
            color={canAfford ? TEXT_BROWN : { r: 0.7, g: 0.15, b: 0.05, a: 1 }}
          />
          <Label
            value={`  (you have: ${playerState.coins})`}
            fontSize={d(13)}
            color={TEXT_BROWN_MUTE}
          />
        </UiEntity>

        {/* X close button */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: d(14), top: d(12) },
            width: d(30),
            height: d(30),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
          uiBackground={{ color: { r: 0.45, g: 0.26, b: 0.06, a: 0.85 } }}
          onMouseDown={() => { playSound('buttonclick'); playerState.activeMenu = 'none' }}
        >
          <Label value="✕" fontSize={d(14)} color={BTN_TEXT} textAlign="middle-center" />
        </UiEntity>

        {/* Button row — BUY + Not now */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: BTN_LEFT, bottom: BTN_BOTTOM },
            flexDirection: 'row',
          }}
        >
          <UiEntity
            uiTransform={{
              width: Math.round(BTN_W * buyScale),
              height: Math.round(BTN_H * buyScale),
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              margin: { right: d(10) },
            }}
            uiBackground={{ color: canAfford ? BTN_BG_PRIMARY : BTN_BG_DISABLED }}
            onMouseDown={() => {
              if (!canAfford || isZooming('expansion_confirm')) return
              playSound('buttonclick')
              triggerCardZoom('expansion_confirm')
              setTimeout(doConfirm, ZOOM_DURATION)
            }}
          >
            <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Label
                value={`Buy  ${EXPANSION_COST}`}
                fontSize={BTN_FONT}
                color={canAfford ? BTN_TEXT : BTN_TEXT_MUTED}
                textAlign="middle-center"
              />
              <UiEntity
                uiTransform={{ width: d(14), height: d(14), margin: { left: d(5) }, flexShrink: 0 }}
                uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
              />
            </UiEntity>
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: BTN_W,
              height: BTN_H,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
            uiBackground={{ color: BTN_BG_SECONDARY }}
            onMouseDown={() => {
              if (isShaking('expansion_cancel')) return
              playSound('buttonclick')
              triggerCardShake('expansion_cancel')
              setTimeout(() => { playerState.activeMenu = 'none' }, SHAKE_DURATION)
            }}
          >
            <Label value="Not now" fontSize={BTN_FONT} color={BTN_TEXT} textAlign="middle-center" />
          </UiEntity>
        </UiEntity>

      </UiEntity>
    </UiEntity>
  )
}
