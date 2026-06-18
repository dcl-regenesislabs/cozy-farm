import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { requestClaimFarmSlot } from '../services/saveService'
import { playSound } from '../systems/sfxSystem'

const BG_SRC    = 'assets/images/ui_loading/npc_dialog_background.png'
const TIMEOUT_S = 20

const d = (v: number) => Math.round(v * (isMobile() ? 1.5 : 1))

const PANEL_W = 520
const PANEL_H = 220

const TITLE_COLOR  = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const BODY_COLOR   = { r: 0.40, g: 0.24, b: 0.08, a: 1 }
const TAKEN_COLOR  = { r: 0.75, g: 0.15, b: 0.10, a: 1 }
const BTN_BG       = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_TEXT     = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

export const FreeSlotNotification = () => {
  const notif = playerState.freeSlotNotification
  if (!notif) return null

  const elapsed = (Date.now() - notif.shownAt) / 1000
  const remaining = Math.max(0, Math.ceil(TIMEOUT_S - elapsed))

  // Auto-dismiss after timeout
  if (remaining === 0 && !notif.taken) {
    playerState.freeSlotNotification = null
    return null
  }

  const onClaim = () => {
    if (notif.taken) return
    playSound('buttonclick')
    requestClaimFarmSlot(notif.slotId)
  }

  return (
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
          width: d(PANEL_W),
          height: d(PANEL_H),
          flexDirection: 'column',
          alignItems: 'center',
          pointerFilter: 'block',
        }}
        uiBackground={{
          texture: { src: BG_SRC, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      >
        {/* Title */}
        <Label
          value="FREE SLOT AVAILABLE!"
          fontSize={d(22)}
          color={TITLE_COLOR}
          textAlign="middle-center"
          uiTransform={{ width: d(PANEL_W - 60), height: d(44), margin: { top: d(18) } }}
        />

        {/* Body */}
        {notif.taken ? (
          <Label
            value="Someone else got it!"
            fontSize={d(18)}
            color={TAKEN_COLOR}
            textAlign="middle-center"
            uiTransform={{ width: d(PANEL_W - 60), height: d(36), margin: { top: d(8) } }}
          />
        ) : (
          <UiEntity
            uiTransform={{
              flexDirection: 'column',
              alignItems: 'center',
              margin: { top: d(8) },
            }}
          >
            <Label
              value={`Claim it in ${remaining}s`}
              fontSize={d(17)}
              color={BODY_COLOR}
              textAlign="middle-center"
              uiTransform={{ width: d(PANEL_W - 60), height: d(28) }}
            />
            <UiEntity
              uiTransform={{
                width: d(180),
                height: d(46),
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                margin: { top: d(14) },
              }}
              uiBackground={{ color: BTN_BG }}
              onMouseDown={onClaim}
            >
              <Label
                value="Claim Slot"
                fontSize={d(19)}
                color={BTN_TEXT}
                textAlign="middle-center"
              />
            </UiEntity>
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}
