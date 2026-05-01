import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { getQuestForNpc, questProgressMap } from '../game/questState'
import { C } from './PanelShell'
import { triggerCardShake, getShakeOffset, isShaking } from './cardShakeSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import {
  CROP_HARVEST_IMAGES,
  COINS_IMAGE,
  SOIL_ICON,
  WATERINGCAN_ICON,
  BOX_CROPS_ICON,
  SHOPINGCART_ICON,
} from '../data/imagePaths'

const SHAKE_KEY  = 'dialog_btn'
const ZOOM_KEY   = 'dialog_btn_zoom'
const ZOOM_DURATION  = 290
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

export const NpcDialogMenu = () => {
  // Derive quest data for quest_offer and quest_active modes
  const isQuestMode = npcDialogState.mode === 'quest_active' || npcDialogState.mode === 'quest_offer'
  const activeQuest = isQuestMode ? getQuestForNpc(npcDialogState.npcId) : null
  const activeQuestProgress = activeQuest ? questProgressMap.get(activeQuest.id) : null

  function getQuestIcon(quest: ReturnType<typeof getQuestForNpc>): string {
    if (!quest) return BOX_CROPS_ICON
    if (quest.type === 'harvest_crop' && quest.cropType !== null) return CROP_HARVEST_IMAGES[quest.cropType]
    if (quest.type === 'harvest_total') return BOX_CROPS_ICON
    if (quest.type === 'water_total')   return WATERINGCAN_ICON
    if (quest.type === 'plant_total')   return SOIL_ICON
    if (quest.type === 'sell_total')    return SHOPINGCART_ICON
    return BOX_CROPS_ICON
  }
  const questIcon = getQuestIcon(activeQuest ?? undefined)

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

    {/* ── Right: text content ── */}
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

      {/* Default: plain dialog text (greeting / tutorial) */}
      {npcDialogState.mode !== 'quest_offer' && npcDialogState.mode !== 'quest_active' && (
        <Label
          value={npcDialogState.dialogLine}
          fontSize={24}
          color={C.textMain}
          textAlign="top-left"
          uiTransform={{ flex: 1 }}
        />
      )}

      {/* quest_offer: description + task card + reward row */}
      {npcDialogState.mode === 'quest_offer' && activeQuest && (
        <UiEntity uiTransform={{ flex: 1, flexDirection: 'column' }}>
          {/* NPC speech */}
          <Label
            value={npcDialogState.dialogLine}
            fontSize={22}
            color={C.textMain}
            textAlign="top-left"
            uiTransform={{ flex: 1 }}
          />
          {/* Task row */}
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: { bottom: 10 },
            }}
            uiBackground={{ color: C.rowBg }}
          >
            <UiEntity
              uiTransform={{ width: 52, height: 52, margin: { top: 8, bottom: 8, left: 10, right: 12 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
              <Label value="Task" fontSize={18} color={C.textMute} textAlign="top-left" />
              <Label value={activeQuest.title} fontSize={22} color={C.textMain} textAlign="top-left" />
            </UiEntity>
          </UiEntity>
          {/* Reward row */}
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
            <Label value="Reward: " fontSize={22} color={C.textMute} />
            <UiEntity
              uiTransform={{ width: 26, height: 26, margin: { left: 4, right: 6 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={`${activeQuest.rewardCoins}`} fontSize={24} color={C.gold} />
            <Label
              value={`+ ${activeQuest.rewardXp} XP`}
              fontSize={22}
              color={C.textMute}
              uiTransform={{ margin: { left: 14 } }}
            />
          </UiEntity>
        </UiEntity>
      )}

      {/* quest_active: structured inline layout */}
      {npcDialogState.mode === 'quest_active' && activeQuest && (
        <UiEntity uiTransform={{ flex: 1, flexDirection: 'column' }}>
          {/* Quest title */}
          <Label
            value={activeQuest.title}
            fontSize={22}
            color={C.textMain}
            uiTransform={{ margin: { bottom: 10 } }}
          />
          {/* Quest item icon */}
          <UiEntity
            uiTransform={{ width: 82, height: 82, margin: { bottom: 10 } }}
            uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          {/* Progress */}
          <Label
            value={`Progress: ${activeQuestProgress?.current ?? 0} / ${activeQuest.target}`}
            fontSize={21}
            color={C.blue}
            uiTransform={{ margin: { bottom: 0 } }}
          />
          {/* Spacer pushes reward to bottom */}
          <UiEntity uiTransform={{ flex: 1 }} />
          {/* Reward row */}
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
            <Label value="Reward: " fontSize={22} color={C.textMute} />
            <UiEntity
              uiTransform={{ width: 26, height: 26, margin: { left: 4, right: 6 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={`${activeQuest.rewardCoins}`} fontSize={24} color={C.gold} />
            <Label
              value={`+ ${activeQuest.rewardXp} XP`}
              fontSize={22}
              color={C.textMute}
              uiTransform={{ margin: { left: 14 } }}
            />
          </UiEntity>
        </UiEntity>
      )}
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
      onMouseDown={() => { playSound('buttonclick'); closeDialog() }}
    >
      <Label value="✕" fontSize={24} color={C.orange} textAlign="middle-center" />
    </UiEntity>

    {/* ── Action buttons — absolute bottom-right, shake on press before closing ── */}

    {/* Accept — left of the Deny button */}
    {npcDialogState.mode === 'quest_offer' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT + BTN_W_PAIR + 12, bottom: BTN_BOTTOM },
        }}
      >
        <Button
          value="Accept"
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: Math.round(BTN_W_PAIR * getZoomScale('dialog_accept')), height: Math.round(BTN_H * getZoomScale('dialog_accept')) }}
          onMouseDown={() => {
            if (isZooming('dialog_accept')) return
            playSound('buttonclick')
            const accept = npcDialogState.onAccept
            triggerCardZoom('dialog_accept')
            setTimeout(() => { closeDialog(); accept?.() }, ZOOM_DURATION)
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
            playSound('buttonclick')
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
          position: { right: BTN_RIGHT, bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Keep it up!"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: Math.round(BTN_W_SINGLE * getZoomScale(ZOOM_KEY)), height: Math.round(BTN_H * getZoomScale(ZOOM_KEY)) }}
          onMouseDown={() => {
            if (isZooming(ZOOM_KEY)) return
            playSound('buttonclick')
            triggerCardZoom(ZOOM_KEY)
            setTimeout(closeDialog, ZOOM_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'quest_claimable' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT, bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Claim Reward!"
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: Math.round(BTN_W_SINGLE * getZoomScale(ZOOM_KEY)), height: Math.round(BTN_H * getZoomScale(ZOOM_KEY)) }}
          onMouseDown={() => {
            if (isZooming(ZOOM_KEY)) return
            playSound('buttonclick')
            const claim = npcDialogState.onClaim
            triggerCardZoom(ZOOM_KEY)
            setTimeout(() => { closeDialog(); claim?.() }, ZOOM_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'greeting' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT, bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value="Goodbye"
          variant="secondary"
          fontSize={BTN_FONT}
          uiTransform={{ width: Math.round(BTN_W_SINGLE * getZoomScale(ZOOM_KEY)), height: Math.round(BTN_H * getZoomScale(ZOOM_KEY)) }}
          onMouseDown={() => {
            if (isZooming(ZOOM_KEY)) return
            playSound('buttonclick')
            triggerCardZoom(ZOOM_KEY)
            setTimeout(closeDialog, ZOOM_DURATION)
          }}
        />
      </UiEntity>
    )}

    {npcDialogState.mode === 'tutorial' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: BTN_RIGHT, bottom: BTN_BOTTOM },
          flexDirection: 'row',
        }}
      >
        <Button
          value={npcDialogState.tutorialButtonLabel}
          variant="primary"
          fontSize={BTN_FONT}
          uiTransform={{ width: Math.round(BTN_W_SINGLE * getZoomScale(ZOOM_KEY)), height: Math.round(BTN_H * getZoomScale(ZOOM_KEY)) }}
          onMouseDown={() => {
            if (isZooming(ZOOM_KEY)) return
            playSound('buttonclick')
            triggerCardZoom(ZOOM_KEY)
            setTimeout(closeDialog, ZOOM_DURATION)
          }}
        />
      </UiEntity>
    )}

  </UiEntity>
  )
}
