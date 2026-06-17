import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { requestClaimSlot } from './FarmSelectPanel'
import { playSound } from '../systems/sfxSystem'

const TIMEOUT_S   = 20
const BG_SRC      = 'assets/images/ui_loading/npc_dialog_background.png'

const TEXT_BROWN  = { r: 0.28, g: 0.15, b: 0.04, a: 1 }
const BTN_BG      = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_TEXT    = { r: 0.97, g: 0.90, b: 0.68, a: 1 }
const GOLD        = { r: 1,    g: 0.88, b: 0.5,  a: 1 }
const RED         = { r: 0.75, g: 0.18, b: 0.08, a: 1 }

export const FreeSlotNotification = () => {
  const notif  = playerState.freeSlotNotification
  if (!notif) return null

  const mobile = isMobile()
  const d      = (v: number) => Math.round(v * (mobile ? 1.5 : 1))

  const now       = Date.now()
  const elapsedS  = (now - notif.shownAt) / 1000
  const remaining = Math.max(0, Math.ceil(TIMEOUT_S - elapsedS))

  // Auto-dismiss when timer runs out
  if (remaining === 0 && !notif.taken) {
    playerState.freeSlotNotification = null
    return null
  }

  const taken = notif.taken

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
          width: d(480),
          height: d(220),
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: BG_SRC, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        {/* Title — always visible */}
        <Label
          value="FREE SLOT AVAILABLE!"
          fontSize={d(26)}
          color={GOLD}
          textAlign="middle-center"
          uiTransform={{ positionType: 'absolute', position: { top: d(18) } }}
        />

        {/* Body area */}
        {taken ? (
          <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
            <Label
              value="Someone else got it!"
              fontSize={d(18)}
              color={RED}
              textAlign="middle-center"
            />
          </UiEntity>
        ) : (
          <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
            <Label
              value="A farm slot just opened up!"
              fontSize={d(18)}
              color={TEXT_BROWN}
              textAlign="middle-center"
              uiTransform={{ margin: { bottom: d(16) } }}
            />

            {/* Claim button + timer */}
            <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
              <UiEntity
                uiTransform={{
                  width: d(180), height: d(52),
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: d(10), margin: { right: d(16) },
                }}
                uiBackground={{ color: BTN_BG }}
                onMouseDown={() => {
                  playSound('buttonclick')
                  requestClaimSlot(notif.slotId)
                }}
              >
                <Label value="CLAIM SLOT" fontSize={d(20)} color={BTN_TEXT} textAlign="middle-center" />
              </UiEntity>

              <Label
                value={`${remaining}s`}
                fontSize={d(22)}
                color={remaining <= 5 ? RED : TEXT_BROWN}
                textAlign="middle-center"
              />
            </UiEntity>
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}
