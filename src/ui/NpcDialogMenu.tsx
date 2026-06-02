import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { getQuestForNpc, questProgressMap } from '../game/questState'
import { C } from './PanelShell'
import { triggerCardShake, isShaking } from './cardShakeSystem'
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

const BG_SRC = 'assets/images/ui_loading/npc_dialog_background.png'

const ZOOM_KEY       = 'dialog_btn_zoom'
const ZOOM_DURATION  = 290
const SHAKE_DURATION = 320

const BASE_DIALOG_W = 740
const BASE_DIALOG_H = 380

const BASE_PORTRAIT_SIZE = 145
const BASE_PORT_LEFT     = 72
const BASE_PORT_TOP      = 128

const BASE_NAME_TOP  = 68
const BASE_NAME_H    = 36

const BASE_BTN_H        = 36
const BASE_BTN_FONT     = 14
const BASE_BTN_W_SINGLE = 150
const BASE_BTN_W_PAIR   = 120
const BASE_BTN_BOTTOM   = 68

const BASE_TEXT_RIGHT = 98
const BASE_QUEST_ACTIVE_TOP_OFFSET = 18
const BASE_QUEST_ACTIVE_CONTENT_H  = 108
const BASE_QUEST_ACTIVE_HEADER_H   = 28
const BASE_QUEST_ACTIVE_ICON_H     = 48
const BASE_QUEST_ACTIVE_TEXT_H     = 28
const BASE_QUEST_ACTIVE_BUTTON_BOTTOM = 58
const BASE_QUEST_ACTIVE_RIGHT_COL_W = 140
const BASE_QUEST_ACTIVE_DIVIDER_W   = 3
const BASE_QUEST_ACTIVE_COL_GAP     = 10
const QUEST_ACTIVE_BUTTON_X_OFFSETS: Partial<Record<string, number>> = {
  rosa: -108,
  gerald: -84,
  marco: -84,
  lily: -84,
  dave: -132,
  mayorchen: -132,
}

const TEXT_BROWN       = { r: 0.28, g: 0.15, b: 0.04, a: 1 }
const TEXT_BROWN_MUTE  = { r: 0.48, g: 0.30, b: 0.10, a: 1 }
const NAME_OUTLINE     = { r: 0.15, g: 0.07, b: 0.02, a: 1 }
const GOLD_OUTLINE     = { r: 0.34, g: 0.18, b: 0.03, a: 1 }
const BTN_BG_PRIMARY   = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_BG_SECONDARY = { r: 0.62, g: 0.42, b: 0.16, a: 1 }
const BTN_TEXT         = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

const OUTLINE_OFFSETS = [
  { left: -1, top: 0 }, { left: 1, top: 0 },
  { left: 0, top: -1 }, { left: 0, top: 1 },
]

function NpcNameLabel(props: {
  value: string
  dialogW: number
  nameTop: number
  nameLeft: number
  textRight: number
  nameH: number
  fontSize: number
}) {
  return (
    <UiEntity uiTransform={{
      positionType: 'absolute',
      position: { top: props.nameTop, left: props.nameLeft },
      width: props.dialogW - props.nameLeft - props.textRight,
      height: props.nameH,
    }}>
      {OUTLINE_OFFSETS.map((off, i) => (
        <Label
          key={`out-${i}`}
          value={props.value}
          fontSize={props.fontSize}
          color={NAME_OUTLINE}
          textAlign="middle-left"
          uiTransform={{ width: '100%', height: props.nameH, positionType: 'absolute', position: off }}
        />
      ))}
      <Label
        value={props.value}
        fontSize={props.fontSize}
        color={C.header}
        textAlign="middle-left"
        uiTransform={{ width: '100%', height: props.nameH, positionType: 'absolute', position: { left: 1, top: 0 } }}
      />
      <Label
        value={props.value}
        fontSize={props.fontSize}
        color={C.header}
        textAlign="middle-left"
        uiTransform={{ width: '100%', height: props.nameH, positionType: 'absolute', position: { left: 0, top: 0 } }}
      />
    </UiEntity>
  )
}

function DialogButton(props: {
  label: string
  primary?: boolean
  width: number
  height: number
  fontSize: number
  zoomScale?: number
  onClick: () => void
}) {
  const w = Math.round(props.width * (props.zoomScale ?? 1))
  const h = Math.round(props.height * (props.zoomScale ?? 1))
  return (
    <UiEntity
      uiTransform={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
      uiBackground={{ color: props.primary ? BTN_BG_PRIMARY : BTN_BG_SECONDARY }}
      onMouseDown={props.onClick}
    >
      <Label
        value={props.label}
        fontSize={props.fontSize}
        color={BTN_TEXT}
        textAlign="middle-center"
        uiTransform={{ width: w, height: h }}
      />
    </UiEntity>
  )
}

function closeDialog() {
  const cb = npcDialogState.onClose
  npcDialogState.onClose  = null
  npcDialogState.onAccept = null
  npcDialogState.onClaim  = null
  playerState.activeMenu  = 'none'
  cb?.()
}

export const NpcDialogMenu = () => {
  const mobileDialog = isMobile()
  const dialogScale = mobileDialog ? 1.5 : 1
  const d = (value: number) => Math.round(value * dialogScale)

  const DIALOG_W = d(BASE_DIALOG_W)
  const DIALOG_H = d(BASE_DIALOG_H)
  const PORTRAIT_SIZE = d(BASE_PORTRAIT_SIZE)
  const PORT_LEFT = d(BASE_PORT_LEFT)
  const PORT_TOP = d(BASE_PORT_TOP)
  const NAME_TOP = d(BASE_NAME_TOP)
  const NAME_H = d(BASE_NAME_H)
  const NAME_LEFT = PORT_LEFT + PORTRAIT_SIZE + d(14)
  const BTN_H = d(BASE_BTN_H)
  const BTN_FONT = d(BASE_BTN_FONT)
  const BTN_W_SINGLE = d(BASE_BTN_W_SINGLE)
  const BTN_W_PAIR = d(BASE_BTN_W_PAIR)
  const BTN_BOTTOM = d(BASE_BTN_BOTTOM)
  const BTN_TOP = DIALOG_H - BTN_BOTTOM - BTN_H
  const TEXT_TOP = NAME_TOP + NAME_H + d(16)
  const TEXT_LEFT = PORT_LEFT + PORTRAIT_SIZE + d(14)
  const TEXT_RIGHT = d(BASE_TEXT_RIGHT)
  const TEXT_W = DIALOG_W - TEXT_LEFT - TEXT_RIGHT
  const BTN_CENTER = Math.round((DIALOG_W - BTN_W_SINGLE) / 2)
  const BTN_PAIR_L = Math.round((DIALOG_W - BTN_W_PAIR * 2 - d(10)) / 2)
  const QUEST_ACTIVE_TOP_OFFSET = d(BASE_QUEST_ACTIVE_TOP_OFFSET)
  const QUEST_ACTIVE_CONTENT_H = d(BASE_QUEST_ACTIVE_CONTENT_H)
  const QUEST_ACTIVE_HEADER_H = d(BASE_QUEST_ACTIVE_HEADER_H)
  const QUEST_ACTIVE_ICON_H = d(BASE_QUEST_ACTIVE_ICON_H)
  const QUEST_ACTIVE_TEXT_H = d(BASE_QUEST_ACTIVE_TEXT_H)
  const QUEST_ACTIVE_BUTTON_BOTTOM = d(BASE_QUEST_ACTIVE_BUTTON_BOTTOM)
  const QUEST_ACTIVE_RIGHT_COL_W = d(BASE_QUEST_ACTIVE_RIGHT_COL_W)
  const QUEST_ACTIVE_DIVIDER_W = d(BASE_QUEST_ACTIVE_DIVIDER_W)
  const QUEST_ACTIVE_COL_GAP = d(BASE_QUEST_ACTIVE_COL_GAP)

  const isQuestMode = npcDialogState.mode === 'quest_active' || npcDialogState.mode === 'quest_offer'
  const activeQuest = isQuestMode ? getQuestForNpc(npcDialogState.npcId) : null
  const activeQuestProgress = activeQuest ? questProgressMap.get(activeQuest.id) : null

  function getQuestIcon(quest: ReturnType<typeof getQuestForNpc>): string {
    if (!quest) return BOX_CROPS_ICON
    if (quest.type === 'harvest_crop' && quest.cropType !== null) return CROP_HARVEST_IMAGES[quest.cropType]
    if (quest.type === 'harvest_total') return BOX_CROPS_ICON
    if (quest.type === 'water_total') return WATERINGCAN_ICON
    if (quest.type === 'plant_total') return SOIL_ICON
    if (quest.type === 'sell_total') return SHOPINGCART_ICON
    return BOX_CROPS_ICON
  }

  const questIcon = getQuestIcon(activeQuest ?? undefined)
  const textContentH = DIALOG_H - TEXT_TOP - BTN_BOTTOM - BTN_H - 8
  const questOfferCoinFontSize = d(activeQuest && activeQuest.rewardCoins >= 100 ? 12 : 14)
  const questOfferCoinWidth = d(activeQuest && activeQuest.rewardCoins >= 100 ? 36 : 28)
  const questActiveCoinFontSize = d(activeQuest && activeQuest.rewardCoins >= 100 ? 10 : 12)
  const questActiveXpFontSize = d(activeQuest && activeQuest.rewardXp >= 100 ? 10 : 12)
  const questActiveCoinWidth = d(activeQuest && activeQuest.rewardCoins >= 100 ? 36 : 28)
  const questActiveXpWidth = d(activeQuest && activeQuest.rewardXp >= 100 ? 32 : 24)
  const questActiveLeftColW = TEXT_W - QUEST_ACTIVE_RIGHT_COL_W - QUEST_ACTIVE_DIVIDER_W - QUEST_ACTIVE_COL_GAP * 2
  const questActiveDividerCenterX = TEXT_LEFT + questActiveLeftColW + QUEST_ACTIVE_COL_GAP + QUEST_ACTIVE_DIVIDER_W / 2
  const questActiveButtonXOffset = d(QUEST_ACTIVE_BUTTON_X_OFFSETS[npcDialogState.npcId] ?? -108)
  const questActiveButtonLeft = Math.round(questActiveDividerCenterX - BTN_W_SINGLE / 2 + questActiveButtonXOffset)
  const mobileQuestCardGap = d(12)
  const mobileQuestCardW = Math.round((TEXT_W - d(12)) / 2)
  const mobileQuestButtonLeft = TEXT_LEFT

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: '6%', left: 0 },
        width: '100%',
        height: DIALOG_H,
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none',
      }}
    >
      <UiEntity
        uiTransform={{
          width: DIALOG_W,
          height: DIALOG_H,
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: BG_SRC, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <NpcNameLabel
          value={npcDialogState.npcName}
          dialogW={DIALOG_W}
          nameTop={NAME_TOP}
          nameLeft={NAME_LEFT}
          textRight={TEXT_RIGHT}
          nameH={NAME_H}
          fontSize={d(24)}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: PORT_TOP, left: PORT_LEFT },
            width: PORTRAIT_SIZE,
            height: PORTRAIT_SIZE,
          }}
          uiBackground={{ texture: { src: npcDialogState.npcHeadImage, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />

        {npcDialogState.mode !== 'quest_offer' && npcDialogState.mode !== 'quest_active' && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: NAME_TOP + NAME_H + 52, left: TEXT_LEFT },
              width: TEXT_W,
              height: BTN_TOP - (NAME_TOP + NAME_H + 4),
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            <Label
              value={npcDialogState.dialogLine}
              fontSize={d(19)}
              color={TEXT_BROWN}
              textAlign="top-left"
              uiTransform={{ width: TEXT_W }}
            />
          </UiEntity>
        )}

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: TEXT_TOP, left: TEXT_LEFT },
            width: TEXT_W,
            height: textContentH,
            flexDirection: 'column',
          }}
        >
          {npcDialogState.mode === 'quest_offer' && activeQuest && (
            <UiEntity uiTransform={{ width: TEXT_W, height: textContentH, flexDirection: 'column' }}>
              <Label
                value={npcDialogState.dialogLine}
                fontSize={d(15)}
                color={TEXT_BROWN}
                textAlign="top-left"
                uiTransform={{ flex: 1 }}
              />
              <UiEntity
                uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 6 } }}
                uiBackground={{ color: { r: 0.88, g: 0.82, b: 0.68, a: 0.6 } }}
              >
                <UiEntity
                  uiTransform={{ width: 28, height: 28, margin: { top: 4, bottom: 4, left: 6, right: 6 }, flexShrink: 0 }}
                  uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />
                <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
                  <Label value="Task" fontSize={d(12)} color={TEXT_BROWN_MUTE} textAlign="top-left" />
                  <Label value={activeQuest.title} fontSize={d(14)} color={TEXT_BROWN} textAlign="top-left" />
                </UiEntity>
              </UiEntity>
              <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
                <Label value="Reward: " fontSize={d(13)} color={TEXT_BROWN_MUTE} />
                <UiEntity
                  uiTransform={{ width: 14, height: 14, margin: { left: 4, right: 4 }, flexShrink: 0 }}
                  uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />
                <Label
                  value={`${activeQuest.rewardCoins}`}
                  fontSize={questOfferCoinFontSize}
                  color={TEXT_BROWN}
                  textAlign="middle-left"
                  uiTransform={{ width: questOfferCoinWidth, height: d(18) }}
                />
                <Label
                  value={`+ ${activeQuest.rewardXp} XP`}
                  fontSize={d(13)}
                  color={TEXT_BROWN_MUTE}
                  textAlign="middle-left"
                  uiTransform={{ width: d(84), height: d(18), margin: { left: 6 } }}
                />
              </UiEntity>
            </UiEntity>
          )}

          {npcDialogState.mode === 'quest_active' && activeQuest && (
            mobileDialog ? (
              <UiEntity uiTransform={{ width: TEXT_W, height: textContentH, flexDirection: 'column', margin: { top: d(6) } }}>
                <UiEntity uiTransform={{ width: TEXT_W, height: d(28), justifyContent: 'center', margin: { bottom: d(8) } }}>
                  <Label value={activeQuest.title} fontSize={d(16)} color={TEXT_BROWN} textAlign="middle-left" uiTransform={{ width: TEXT_W, height: d(28) }} />
                </UiEntity>
                <UiEntity uiTransform={{ width: TEXT_W, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <UiEntity
                    uiTransform={{
                      width: mobileQuestCardW,
                      height: d(116),
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: { right: mobileQuestCardGap },
                    }}
                    uiBackground={{ color: { r: 0.88, g: 0.82, b: 0.68, a: 0.34 } }}
                  >
                    <UiEntity
                      uiTransform={{ width: d(46), height: d(46), margin: { bottom: d(8) } }}
                      uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                    />
                    <Label
                      value={`Progress: ${activeQuestProgress?.current ?? 0} / ${activeQuest.target}`}
                      fontSize={d(13)}
                      color={C.blue}
                      textAlign="middle-center"
                      uiTransform={{ width: mobileQuestCardW - d(12), height: d(18) }}
                    />
                  </UiEntity>

                  <UiEntity
                    uiTransform={{
                      width: mobileQuestCardW,
                      height: d(116),
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    uiBackground={{ color: { r: 0.88, g: 0.82, b: 0.68, a: 0.34 } }}
                  >
                    <Label
                      value="Reward"
                      fontSize={d(15)}
                      color={TEXT_BROWN_MUTE}
                      textAlign="middle-center"
                      uiTransform={{ width: mobileQuestCardW - d(12), height: d(18), margin: { bottom: d(6) } }}
                    />
                    <UiEntity
                      uiTransform={{ width: d(42), height: d(42), margin: { bottom: d(6) } }}
                      uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                    />
                    <UiEntity uiTransform={{ width: mobileQuestCardW - d(12), height: d(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Label
                        value={`${activeQuest.rewardCoins}`}
                        fontSize={d(activeQuest.rewardCoins >= 100 ? 11 : 12)}
                        color={TEXT_BROWN}
                        textAlign="middle-right"
                        uiTransform={{ width: d(activeQuest.rewardCoins >= 100 ? 34 : 26), height: d(20) }}
                      />
                      <Label
                        value=" COINS + "
                        fontSize={d(9)}
                        color={TEXT_BROWN_MUTE}
                        textAlign="middle-center"
                        uiTransform={{ width: d(54), height: d(20) }}
                      />
                      <Label
                        value={`${activeQuest.rewardXp} XP`}
                        fontSize={d(activeQuest.rewardXp >= 100 ? 9 : 10)}
                        color={TEXT_BROWN_MUTE}
                        textAlign="middle-left"
                        uiTransform={{ width: d(activeQuest.rewardXp >= 100 ? 42 : 34), height: d(20) }}
                      />
                    </UiEntity>
                  </UiEntity>
                </UiEntity>
              </UiEntity>
            ) : (
              <UiEntity uiTransform={{ width: TEXT_W, height: textContentH, flexDirection: 'column', margin: { top: QUEST_ACTIVE_TOP_OFFSET } }}>
                <UiEntity uiTransform={{ width: TEXT_W, flexDirection: 'row', height: QUEST_ACTIVE_CONTENT_H }}>
                  <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', margin: { right: 10 } }}>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_HEADER_H, justifyContent: 'center', margin: { bottom: 8 } }}>
                      <Label value={activeQuest.title} fontSize={d(17)} color={TEXT_BROWN} textAlign="top-left" />
                    </UiEntity>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_ICON_H, margin: { bottom: 8, left: 44 } }}>
                      <UiEntity
                        uiTransform={{ width: 48, height: 48 }}
                        uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                      />
                    </UiEntity>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_TEXT_H, justifyContent: 'center' }}>
                      <Label
                        value={`Progress: ${activeQuestProgress?.current ?? 0} / ${activeQuest.target}`}
                        fontSize={d(16)}
                        color={C.blue}
                        textAlign="top-left"
                      />
                    </UiEntity>
                  </UiEntity>

                  <UiEntity
                    uiTransform={{ width: 3, height: 100, flexShrink: 0, margin: { top: 4, right: 10 } }}
                    uiBackground={{ color: C.divider }}
                  />

                  <UiEntity uiTransform={{ width: 140, flexDirection: 'column' }}>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_HEADER_H, justifyContent: 'center', margin: { bottom: 8 } }}>
                      <Label value="Reward" fontSize={d(17)} color={TEXT_BROWN_MUTE} textAlign="top-left" />
                    </UiEntity>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_ICON_H, alignItems: 'center', justifyContent: 'center', margin: { bottom: 8 } }}>
                      <UiEntity
                        uiTransform={{ width: 48, height: 48 }}
                        uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                      />
                    </UiEntity>
                    <UiEntity uiTransform={{ height: QUEST_ACTIVE_TEXT_H, justifyContent: 'center' }}>
                      <UiEntity uiTransform={{ width: '100%', height: QUEST_ACTIVE_TEXT_H, flexDirection: 'row', alignItems: 'center' }}>
                        <Label
                          value={`${activeQuest.rewardCoins}`}
                          fontSize={questActiveCoinFontSize}
                          color={TEXT_BROWN}
                          textAlign="middle-left"
                          uiTransform={{ width: questActiveCoinWidth, height: QUEST_ACTIVE_TEXT_H }}
                        />
                        <Label
                          value=" COINS + "
                          fontSize={d(10)}
                          color={TEXT_BROWN_MUTE}
                          textAlign="middle-left"
                          uiTransform={{ width: d(58), height: QUEST_ACTIVE_TEXT_H }}
                        />
                        <Label
                          value={`${activeQuest.rewardXp}`}
                          fontSize={questActiveXpFontSize}
                          color={TEXT_BROWN_MUTE}
                          textAlign="middle-left"
                          uiTransform={{ width: questActiveXpWidth, height: QUEST_ACTIVE_TEXT_H }}
                        />
                        <Label
                          value=" XP"
                          fontSize={d(10)}
                          color={TEXT_BROWN_MUTE}
                          textAlign="middle-left"
                          uiTransform={{ width: d(22), height: QUEST_ACTIVE_TEXT_H }}
                        />
                      </UiEntity>
                    </UiEntity>
                  </UiEntity>
                </UiEntity>
              </UiEntity>
            )
          )}
        </UiEntity>

        {npcDialogState.mode === 'quest_offer' && (
          <UiEntity uiTransform={{
            positionType: 'absolute',
            position: { left: BTN_PAIR_L, bottom: BTN_BOTTOM },
            flexDirection: 'row',
          }}>
            <DialogButton
              label="Accept"
              primary
              width={BTN_W_PAIR}
              height={BTN_H}
              fontSize={BTN_FONT}
              zoomScale={getZoomScale('dialog_accept')}
              onClick={() => {
                if (isZooming('dialog_accept')) return
                playSound('buttonclick')
                const accept = npcDialogState.onAccept
                triggerCardZoom('dialog_accept')
                setTimeout(() => { closeDialog(); accept?.() }, ZOOM_DURATION)
              }}
            />
            <UiEntity uiTransform={{ width: 10, height: 1 }} />
            <DialogButton
              label="Not now"
              width={BTN_W_PAIR}
              height={BTN_H}
              fontSize={BTN_FONT}
              onClick={() => {
                if (isShaking('dialog_decline')) return
                playSound('buttonclick')
                triggerCardShake('dialog_decline')
                setTimeout(closeDialog, SHAKE_DURATION)
              }}
            />
          </UiEntity>
        )}

        {npcDialogState.mode === 'quest_claimable' && (
          <UiEntity uiTransform={{
            positionType: 'absolute',
            position: { left: BTN_PAIR_L, bottom: BTN_BOTTOM },
            flexDirection: 'row',
          }}>
            <DialogButton
              label="Claim Reward!"
              primary
              width={BTN_W_PAIR}
              height={BTN_H}
              fontSize={BTN_FONT}
              zoomScale={getZoomScale(ZOOM_KEY)}
              onClick={() => {
                if (isZooming(ZOOM_KEY)) return
                playSound('buttonclick')
                const claim = npcDialogState.onClaim
                triggerCardZoom(ZOOM_KEY)
                setTimeout(() => { closeDialog(); claim?.() }, ZOOM_DURATION)
              }}
            />
            <UiEntity uiTransform={{ width: 10, height: 1 }} />
            <DialogButton
              label="Later"
              width={BTN_W_PAIR}
              height={BTN_H}
              fontSize={BTN_FONT}
              onClick={() => {
                if (isShaking('dialog_claim_later')) return
                playSound('buttonclick')
                triggerCardShake('dialog_claim_later')
                setTimeout(closeDialog, SHAKE_DURATION)
              }}
            />
          </UiEntity>
        )}

        {npcDialogState.mode === 'quest_active' && (
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: mobileDialog ? mobileQuestButtonLeft : questActiveButtonLeft, bottom: QUEST_ACTIVE_BUTTON_BOTTOM } }}>
            <DialogButton
              label="Keep it up!"
              width={BTN_W_SINGLE}
              height={BTN_H}
              fontSize={BTN_FONT}
              zoomScale={getZoomScale(ZOOM_KEY)}
              onClick={() => {
                if (isZooming(ZOOM_KEY)) return
                playSound('buttonclick')
                triggerCardZoom(ZOOM_KEY)
                setTimeout(closeDialog, ZOOM_DURATION)
              }}
            />
          </UiEntity>
        )}

        {npcDialogState.mode === 'greeting' && (
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: BTN_CENTER, bottom: BTN_BOTTOM } }}>
            <DialogButton
              label="Goodbye"
              width={BTN_W_SINGLE}
              height={BTN_H}
              fontSize={BTN_FONT}
              zoomScale={getZoomScale(ZOOM_KEY)}
              onClick={() => {
                if (isZooming(ZOOM_KEY)) return
                playSound('buttonclick')
                triggerCardZoom(ZOOM_KEY)
                setTimeout(closeDialog, ZOOM_DURATION)
              }}
            />
          </UiEntity>
        )}

        {npcDialogState.mode === 'tutorial' && (
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: BTN_CENTER, bottom: BTN_BOTTOM } }}>
            <DialogButton
              label={npcDialogState.tutorialButtonLabel}
              primary
              width={BTN_W_SINGLE}
              height={BTN_H}
              fontSize={BTN_FONT}
              zoomScale={getZoomScale(ZOOM_KEY)}
              onClick={() => {
                if (isZooming(ZOOM_KEY)) return
                playSound('buttonclick')
                triggerCardZoom(ZOOM_KEY)
                setTimeout(closeDialog, ZOOM_DURATION)
              }}
            />
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}
