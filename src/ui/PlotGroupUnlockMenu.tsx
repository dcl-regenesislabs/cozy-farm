import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { getPlotGroupDef } from '../data/plotGroupData'
import { unlockPlotGroupByName, hidePlotGroupSign } from '../systems/interactionSetup'
import { playSound } from '../systems/sfxSystem'
import { triggerCardShake, isShaking } from './cardShakeSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { COINS_IMAGE, SOIL_ICON } from '../data/imagePaths'
import { OutlineLabel } from './OutlineLabel'

const BG_SRC = 'assets/images/ui_loading/npc_dialog_background.png'

const ZOOM_DURATION  = 290
const SHAKE_DURATION = 320

// Warm parchment palette — mirrors NpcDialogMenu
const TEXT_BROWN       = { r: 0.28, g: 0.15, b: 0.04, a: 1 }
const TEXT_BROWN_MUTE  = { r: 0.48, g: 0.30, b: 0.10, a: 1 }
const BTN_BG_PRIMARY   = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_BG_SECONDARY = { r: 0.62, g: 0.42, b: 0.16, a: 1 }
const BTN_BG_DISABLED  = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT         = { r: 0.97, g: 0.90, b: 0.68, a: 1 }
const BTN_TEXT_MUTED   = { r: 0.60, g: 0.50, b: 0.35, a: 1 }

// Base dimensions — same reference frame as NpcDialogMenu
const BASE_W          = 740
const BASE_H          = 380
const BASE_PORT_SIZE  = 145
const BASE_PORT_LEFT  = 72
const BASE_PORT_TOP   = 118
const BASE_NAME_TOP   = 68
const BASE_NAME_H     = 36
const BASE_TEXT_RIGHT = 48
const BASE_BTN_H      = 46
const BASE_BTN_FONT   = 18
const BASE_BTN_W_PAIR = 140
const BASE_BTN_BOTTOM = 68

export const PlotGroupUnlockMenu = () => {
  const mobile = isMobile()
  const d = (v: number) => Math.round(v * (mobile ? 1.5 : 1))

  const def        = getPlotGroupDef(playerState.activePlotGroupName)
  const cost       = def?.coinCost ?? 0
  const minLevel   = def?.requiredLevel ?? 0
  const canAfford  = playerState.coins >= cost
  const meetsLevel = playerState.level >= minLevel
  const canBuy     = canAfford && meetsLevel

  const W         = d(BASE_W)
  const H         = d(BASE_H)
  const PORT_SIZE = d(BASE_PORT_SIZE)
  const PORT_LEFT = d(BASE_PORT_LEFT)
  const PORT_TOP  = d(BASE_PORT_TOP)
  const NAME_TOP  = d(BASE_NAME_TOP)
  const NAME_H    = d(BASE_NAME_H)
  const NAME_LEFT = PORT_LEFT + PORT_SIZE + d(14)
  const TEXT_W    = W - NAME_LEFT - d(BASE_TEXT_RIGHT)
  const BTN_H     = d(BASE_BTN_H)
  const BTN_FONT  = d(BASE_BTN_FONT)
  const BTN_W     = d(BASE_BTN_W_PAIR)
  const BTN_BOTTOM = d(BASE_BTN_BOTTOM)
  const BTN_LEFT  = Math.round((W - BTN_W * 2 - d(10)) / 2)
  const TEXT_TOP  = NAME_TOP + NAME_H + d(28)
  const COST_TOP  = TEXT_TOP + d(62)
  const buyScale  = getZoomScale('plotgroup_confirm')

  const levelBadgeColor = meetsLevel
    ? { r: 0.18, g: 0.45, b: 0.12, a: 0.85 }
    : { r: 0.50, g: 0.12, b: 0.05, a: 0.85 }

  function doConfirm() {
    if (!def) return
    playerState.coins -= cost
    playerState.unlockedPlotGroups = [...playerState.unlockedPlotGroups, def.groupName]
    unlockPlotGroupByName(def.groupName)
    hidePlotGroupSign(def.groupName)
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

        {/* Title — outlined like the NPC name */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: NAME_TOP, left: NAME_LEFT },
            width: TEXT_W,
            height: NAME_H,
          }}
        >
          <OutlineLabel
            value="Plot Expansion"
            fontSize={d(24)}
            color={{ r: 1, g: 0.88, b: 0.5, a: 1 }}
            outlineColor={{ r: 0.15, g: 0.07, b: 0.02, a: 1 }}
            width={TEXT_W}
            height={NAME_H}
          />
        </UiEntity>

        {/* Description */}
        <Label
          value="Unlock 3 new soil plots and expand your farm."
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
            value={`${cost}`}
            fontSize={d(18)}
            color={canAfford ? TEXT_BROWN : { r: 0.7, g: 0.15, b: 0.05, a: 1 }}
          />
          <Label
            value={`  (you have: ${playerState.coins})`}
            fontSize={d(13)}
            color={TEXT_BROWN_MUTE}
          />
          {minLevel > 0 && (
            <UiEntity
              uiTransform={{
                alignItems: 'center',
                justifyContent: 'center',
                padding: { left: d(8), right: d(8), top: d(2), bottom: d(2) },
                margin: { left: d(12) },
                borderRadius: 6,
              }}
              uiBackground={{ color: levelBadgeColor }}
            >
              <Label
                value={meetsLevel ? `Lv ${minLevel} ✓` : `Lv ${minLevel} required`}
                fontSize={d(12)}
                color={BTN_TEXT}
                textAlign="middle-center"
              />
            </UiEntity>
          )}
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
            uiBackground={{ color: canBuy ? BTN_BG_PRIMARY : BTN_BG_DISABLED }}
            onMouseDown={() => {
              if (!canBuy || isZooming('plotgroup_confirm')) return
              playSound('buttonclick')
              triggerCardZoom('plotgroup_confirm')
              setTimeout(doConfirm, ZOOM_DURATION)
            }}
          >
            <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Label
                value={`Buy  ${cost}`}
                fontSize={BTN_FONT}
                color={canBuy ? BTN_TEXT : BTN_TEXT_MUTED}
                textAlign="middle-center"
                uiTransform={{ width: d(88), height: BTN_H, flexShrink: 0 }}
              />
              <UiEntity
                uiTransform={{ width: d(16), height: d(16), flexShrink: 0 }}
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
              if (isShaking('plotgroup_cancel')) return
              playSound('buttonclick')
              triggerCardShake('plotgroup_cancel')
              setTimeout(() => { playerState.activeMenu = 'none' }, SHAKE_DURATION)
            }}
          >
            <Label value="Not now" fontSize={BTN_FONT} color={BTN_TEXT} textAlign="middle-center"
              uiTransform={{ width: BTN_W, height: BTN_H }} />
          </UiEntity>
        </UiEntity>

      </UiEntity>
    </UiEntity>
  )
}
