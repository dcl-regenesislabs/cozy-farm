import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { C } from './PanelShell'

const PORTRAIT_SIZE = 140
const DIALOG_W      = 580
const DIALOG_H      = 230

function closeDialog() {
  const cb = npcDialogState.onClose
  npcDialogState.onClose  = null
  npcDialogState.onAccept = null
  npcDialogState.onClaim  = null
  playerState.activeMenu  = 'none'
  cb?.()  // run last so the callback can re-open a new dialog if needed
}

export const NpcDialogMenu = () => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { bottom: '8%', left: '30%' },
      width: '40%',
      height: DIALOG_H,
      flexDirection: 'row',
      pointerFilter: 'block',
    }}
    uiBackground={{ color: C.panelBg }}
  >
      {/* ── Left: NPC portrait ── */}
      <UiEntity
        uiTransform={{
          width: PORTRAIT_SIZE,
          height: PORTRAIT_SIZE,
          flexShrink: 0,
          alignSelf: 'center',
          margin: { left: 14, right: 6 },
        }}
        uiBackground={{
          texture: { src: npcDialogState.npcHeadImage, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      {/* ── Right: content area ── */}
      <UiEntity
        uiTransform={{
          flex: 1,
          flexDirection: 'column',
          padding: { top: 18, bottom: 18, left: 18, right: 18 },
        }}
      >
        {/* Header row: NPC name + X button pinned to top-right */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 36,
            alignItems: 'center',
            margin: { bottom: 10 },
          }}
        >
          <Label
            value={npcDialogState.npcName}
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
            onMouseDown={closeDialog}
          >
            <Label value="✕" fontSize={16} color={C.orange} textAlign="middle-center" />
          </UiEntity>
        </UiEntity>

        {/* Divider */}
        <UiEntity
          uiTransform={{ width: '100%', height: 1, margin: { bottom: 12 } }}
          uiBackground={{ color: C.divider }}
        />

        {/* Dialog text */}
        <Label
          value={npcDialogState.dialogLine}
          fontSize={15}
          color={C.textMain}
          textAlign="top-left"
          uiTransform={{ flex: 1, margin: { bottom: 14 } }}
        />

        {/* Button row — varies by dialog mode */}
        <UiEntity uiTransform={{ width: '100%', justifyContent: 'flex-end', flexDirection: 'row' }}>

          {npcDialogState.mode === 'quest_offer' && (
            <UiEntity uiTransform={{ flexDirection: 'row' }}>
              <Button
                value="Accept"
                variant="primary"
                fontSize={15}
                uiTransform={{ width: 120, height: 38, margin: { right: 10 } }}
                onMouseDown={() => {
                  const accept = npcDialogState.onAccept
                  closeDialog()
                  accept?.()  // run after close so any new dialog it opens isn't overwritten
                }}
              />
              <Button
                value="Not now"
                variant="secondary"
                fontSize={15}
                uiTransform={{ width: 120, height: 38 }}
                onMouseDown={closeDialog}
              />
            </UiEntity>
          )}

          {npcDialogState.mode === 'quest_active' && (
            <Button
              value="Keep it up!"
              variant="secondary"
              fontSize={15}
              uiTransform={{ width: 150, height: 38 }}
              onMouseDown={closeDialog}
            />
          )}

          {npcDialogState.mode === 'quest_claimable' && (
            <Button
              value="Claim Reward!"
              variant="primary"
              fontSize={15}
              uiTransform={{ width: 170, height: 38 }}
              onMouseDown={() => {
                const claim = npcDialogState.onClaim
                closeDialog()   // triggers npcSystem onClose → departure begins
                claim?.()       // run after close so any new dialog it opens persists
              }}
            />
          )}

          {npcDialogState.mode === 'greeting' && (
            <Button
              value="Goodbye"
              variant="secondary"
              fontSize={15}
              uiTransform={{ width: 120, height: 38 }}
              onMouseDown={closeDialog}
            />
          )}

          {npcDialogState.mode === 'tutorial' && (
            <Button
              value={npcDialogState.tutorialButtonLabel}
              variant="primary"
              fontSize={15}
              uiTransform={{ width: 180, height: 38 }}
              onMouseDown={closeDialog}
            />
          )}
        </UiEntity>
      </UiEntity>
  </UiEntity>
)
