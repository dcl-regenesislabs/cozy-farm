import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { C } from './PanelShell'
import { triggerCardShake, getShakeOffset, isShaking } from './cardShakeSystem'

const SHAKE_KEY = 'dialog_btn'
const SHAKE_DURATION = 320

const PORTRAIT_SIZE = 200
const DIALOG_H      = 400
const CLOSE_BTN     = 52
const BTN_H         = 64
const BTN_FONT      = 22
const BTN_W_SINGLE  = 240
const BTN_W_PAIR    = 200
const BTN_BOTTOM    = 24   // distance from dialog bottom edge
const BTN_RIGHT     = 24   // distance from dialog right edge

function closeDialog() {
  const cb = npcDialogState.onClose
  npcDialogState.onClose  = null
  npcDialogState.onAccept = null
  npcDialogState.onClaim  = null
  playerState.activeMenu  = 'none'
  cb?.()
}

export const NpcDialogMenu = () => (
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
    {/* ── Left: NPC portrait, always vertically centred ── */}
    <UiEntity
      uiTransform={{
        width: PORTRAIT_SIZE,
        height: PORTRAIT_SIZE,
        flexShrink: 0,
        alignSelf: 'center',
        margin: { left: 20, right: 12 },
      }}
      uiBackground={{
        texture: { src: npcDialogState.npcHeadImage, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />

    {/* ── Right: text content only, no buttons ── */}
    <UiEntity
      uiTransform={{
        flex: 1,
        flexDirection: 'column',
        padding: { top: 24, bottom: BTN_H + BTN_BOTTOM + 8, left: 16, right: 70 },
      }}
    >
      <Label
        value={npcDialogState.npcName}
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
        value={npcDialogState.dialogLine}
        fontSize={24}
        color={C.textMain}
        textAlign="top-left"
        uiTransform={{ flex: 1 }}
      />
    </UiEntity>

    {/* ── X button — absolute top-right ── */}
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { right: 0, top: 0 },
        width: CLOSE_BTN,
        height: CLOSE_BTN,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: { r: 0.22, g: 0.08, b: 0.03, a: 1 } }}
      onMouseDown={closeDialog}
    >
      <Label value="✕" fontSize={24} color={C.orange} textAlign="middle-center" />
    </UiEntity>

    {/* ── Action buttons — absolute bottom-right, shake on press before closing ── */}

    {/* Accept — left of the Deny button */}
    {npcDialogState.mode === 'quest_offer' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: {
            right: BTN_RIGHT + BTN_W_PAIR + 12 - getShakeOffset('dialog_accept'),
            bottom: BTN_BOTTOM,
          },
        }}
      >
        <Button
          value="Accept"
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_PAIR, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking('dialog_accept')) return
            const accept = npcDialogState.onAccept
            triggerCardShake('dialog_accept')
            setTimeout(() => { closeDialog(); accept?.() }, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}
    {/* Not now — rightmost button */}
    {npcDialogState.mode === 'quest_offer' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: {
            right: BTN_RIGHT - getShakeOffset('dialog_decline'),
            bottom: BTN_BOTTOM,
          },
        }}
      >
        <Button
          value="Not now"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_PAIR, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking('dialog_decline')) return
            triggerCardShake('dialog_decline')
            setTimeout(closeDialog, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'quest_active' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT - getShakeOffset(SHAKE_KEY), bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Keep it up!"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_SINGLE, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking(SHAKE_KEY)) return
            triggerCardShake(SHAKE_KEY)
            setTimeout(closeDialog, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'quest_claimable' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT - getShakeOffset(SHAKE_KEY), bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Claim Reward!"
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_SINGLE, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking(SHAKE_KEY)) return
            const claim = npcDialogState.onClaim
            triggerCardShake(SHAKE_KEY)
            setTimeout(() => { closeDialog(); claim?.() }, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'greeting' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT - getShakeOffset(SHAKE_KEY), bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Goodbye"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_SINGLE, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking(SHAKE_KEY)) return
            triggerCardShake(SHAKE_KEY)
            setTimeout(closeDialog, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'tutorial' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT - getShakeOffset(SHAKE_KEY), bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value={npcDialogState.tutorialButtonLabel}
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: BTN_W_SINGLE, height: BTN_H }}
          onMouseDown={() => {
            if (isShaking(SHAKE_KEY)) return
            triggerCardShake(SHAKE_KEY)
            setTimeout(closeDialog, SHAKE_DURATION)
          }}
        />
      </UiEntity>
    )}

  </UiEntity>
)
