import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { BTN_PROFILE } from '../data/imagePaths'
import { triggerBtnAnim } from './navAnimSystem'
import { getWorkerDebtDays } from '../shared/worker'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { BadgeDot } from './BadgeDot'

const HUD_ATLAS = 'assets/images/ui_loading/profile_atlas.png'
const ATLAS_SIZE = 1024

const DEBUG_SOCIAL_TOAST = false
const SHOW_SERVER_INDICATOR = true // set to true for internal testing only
const DEBUG_SOCIAL_TOAST_TEXT = 'Debug social toast: Alice liked your farm!'

const HUD_BROWN = { r: 0.32, g: 0.18, b: 0.06, a: 1 }
const HUD_BROWN_DARK = { r: 0.18, g: 0.09, b: 0.03, a: 1 }
const HUD_WHITE = { r: 0.98, g: 0.95, b: 0.9, a: 1 }
const HUD_GOLD = { r: 1, g: 0.84, b: 0.22, a: 1 }

type AtlasRect = { x: number; y: number; w: number; h: number }

const PANEL_RECT: AtlasRect = { x: 60, y: 69, w: 817, h: 261 }
const BAR_TRACK_RECT: AtlasRect = { x: 13, y: 762, w: 632, h: 67 }
const BAR_FILL_RECT: AtlasRect = { x: 16, y: 842, w: 751, h: 63 }
const COIN_STACK_RECT: AtlasRect = { x: 682, y: 559, w: 172, h: 64 }
const LEVEL_SPROUT_RECT: AtlasRect = { x: 685, y: 652, w: 74, h: 68 }
const ONLINE_SPROUT_RECT: AtlasRect = { x: 687, y: 755, w: 67, h: 69 }
const ONLINE_TEXT_RECT: AtlasRect = { x: 862, y: 778, w: 137, h: 43 }

const OUTLINE_OFFSETS = [
  { left: -1, top: 0 },
  { left: 1, top: 0 },
  { left: 0, top: -1 },
  { left: 0, top: 1 },
]

function atlasUvs(rect: AtlasRect): number[] {
  const left = rect.x / ATLAS_SIZE
  const right = (rect.x + rect.w) / ATLAS_SIZE
  const top = 1 - rect.y / ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / ATLAS_SIZE
  return [left, bottom, left, top, right, top, right, bottom]
}

function AtlasSprite(props: {
  rect: AtlasRect
  width: number
  height: number
  position?: { top?: number; left?: number; right?: number; bottom?: number }
}) {
  return (
    <UiEntity
      uiTransform={{
        width: props.width,
        height: props.height,
        ...(props.position
          ? {
              positionType: 'absolute',
              position: props.position,
            }
          : {}),
      }}
      uiBackground={{
        texture: { src: HUD_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: atlasUvs(props.rect),
      }}
    />
  )
}

function OutlinedLabel(props: {
  value: string
  fontSize: number
  width: number
  height: number
  color: { r: number; g: number; b: number; a: number }
  outlineColor: { r: number; g: number; b: number; a: number }
  textAlign: 'middle-left' | 'middle-center' | 'middle-right'
}) {
  return (
    <UiEntity uiTransform={{ width: props.width, height: props.height }}>
      {OUTLINE_OFFSETS.map((offset, index) => (
        <Label
          key={`outline-${index}`}
          value={props.value}
          fontSize={props.fontSize}
          color={props.outlineColor}
          textAlign={props.textAlign}
          uiTransform={{
            width: props.width,
            height: props.height,
            positionType: 'absolute',
            position: offset,
          }}
        />
      ))}
      <Label
        value={props.value}
        fontSize={props.fontSize}
        color={props.color}
        textAlign={props.textAlign}
        uiTransform={{ width: props.width, height: props.height }}
      />
    </UiEntity>
  )
}

export const TopHud = () => {
  const xp = getXpProgress()
  const xpPct = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const isMaxLvl = playerState.level >= 20
  const isConnected = playerState.serverConnected
  const connectingBlinkOn = Math.floor(Date.now() / 500) % 2 === 0
  const liveSocialToast = playerState.socialToastText !== '' && Date.now() < playerState.socialToastExpiresAt
  const showSocialToast = DEBUG_SOCIAL_TOAST || liveSocialToast
  const socialToastText = DEBUG_SOCIAL_TOAST ? DEBUG_SOCIAL_TOAST_TEXT : playerState.socialToastText
  const showLevelUpToast = playerState.levelUpToastText !== '' && Date.now() < playerState.levelUpToastExpiresAt
  const showWorkerAlert = playerState.farmerHired && playerState.workerOutstandingWages > 0
  const workerDebtDays = getWorkerDebtDays(playerState.workerOutstandingWages)

  if (!DEBUG_SOCIAL_TOAST && !showSocialToast && playerState.socialToastText !== '') {
    playerState.socialToastText = ''
    playerState.socialToastExpiresAt = 0
  }
  if (!showLevelUpToast && playerState.levelUpToastText !== '') {
    playerState.levelUpToastText = ''
    playerState.levelUpToastExpiresAt = 0
  }

  const boardWidth = 620
  const boardHeight = 198
  const barFillWidth = Math.max(0, Math.round(330 * xpPct / 100))

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        pointerFilter: 'none',
      }}
    >
      {showSocialToast && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 140, left: 18 },
            width: 420,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            padding: { left: 14, right: 14 },
          }}
          uiBackground={{ color: { r: 0.1, g: 0.17, b: 0.08, a: 0.95 } }}
        >
          <Label
            value={socialToastText}
            fontSize={18}
            color={{ r: 0.88, g: 1, b: 0.84, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ width: 390, height: 24 }}
          />
        </UiEntity>
      )}

      {showLevelUpToast && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 140, left: 720 },
            width: 540,
            height: 64,
            alignItems: 'center',
            justifyContent: 'center',
            padding: { left: 14, right: 14 },
          }}
          uiBackground={{ color: { r: 0.18, g: 0.1, b: 0.02, a: 0.96 } }}
        >
          <Label
            value={playerState.levelUpToastText}
            fontSize={26}
            color={{ r: 1, g: 0.86, b: 0.32, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ width: 510, height: 32 }}
          />
        </UiEntity>
      )}

      {showWorkerAlert && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: showSocialToast ? 202 : 140, left: 18 },
            width: 440,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            padding: { left: 14, right: 14 },
          }}
          uiBackground={{
            color:
              playerState.workerUnpaidDays >= 2
                ? { r: 0.28, g: 0.1, b: 0.08, a: 0.96 }
                : { r: 0.2, g: 0.13, b: 0.05, a: 0.96 },
          }}
        >
          <Label
            value={
              playerState.workerUnpaidDays >= 2
                ? `Worker unpaid: ${playerState.workerOutstandingWages} coins due (${workerDebtDays} days).`
                : `Worker wages due: ${playerState.workerOutstandingWages} coins.`
            }
            fontSize={18}
            color={{ r: 1, g: 0.86, b: 0.78, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ width: 400, height: 24 }}
          />
        </UiEntity>
      )}

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 26, left: 608 },
            width: boardWidth,
            height: boardHeight,
            pointerFilter: 'none',
        }}
      >
        <AtlasSprite rect={PANEL_RECT} width={boardWidth} height={boardHeight} />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 43, left: 31 },
            width: 112,
            height: 112,
            pointerFilter: 'block',
          }}
          onMouseDown={() => {
            triggerBtnAnim('stats')
            playerState.activeMenu = playerState.activeMenu === 'stats' ? 'none' : 'stats'
          }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 14, left: 16 },
              width: 78,
              height: 78,
            }}
            uiBackground={
              playerState.userId
                ? { avatarTexture: { userId: playerState.userId }, textureMode: 'stretch' }
                : { color: { r: 0.52, g: 0.37, b: 0.04, a: 1 } }
            }
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 0, left: 0 },
              width: 112,
              height: 112,
            }}
            uiBackground={{
              texture: { src: BTN_PROFILE, wrapMode: 'clamp' },
              textureMode: 'stretch',
            }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { bottom: -2, right: -4 },
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.92, g: 0.77, b: 0.22, a: 1 } }}
          >
            <Label value={`${playerState.level}`} fontSize={16} color={HUD_BROWN} textAlign="middle-center" />
          </UiEntity>
          {LEVEL_REWARDS.some((reward) => playerState.level >= reward.level && !playerState.claimedRewards.includes(reward.level)) && (
            <BadgeDot top={-4} right={-4} size={16} />
          )}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 28, left: 182 },
            width: 396,
            height: 134,
          }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 0, left: 0 },
              width: 396,
              height: 32,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <UiEntity
              uiTransform={{
                width: 246,
                height: 32,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <AtlasSprite rect={LEVEL_SPROUT_RECT} width={22} height={20} />
              <UiEntity uiTransform={{ width: 8, height: 1 }} />
              <OutlinedLabel
                value={isMaxLvl ? `Level ${playerState.level}` : `Level ${playerState.level} --> Level ${playerState.level + 1}`}
                fontSize={20}
                width={216}
                height={30}
                color={HUD_GOLD}
                outlineColor={HUD_BROWN_DARK}
                textAlign="middle-left"
              />
            </UiEntity>

            <UiEntity
              uiTransform={{
                width: 132,
                height: 32,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <OutlinedLabel
                value={`${playerState.coins}`}
                fontSize={22}
                width={72}
                height={30}
                color={HUD_GOLD}
                outlineColor={HUD_BROWN_DARK}
                textAlign="middle-right"
              />
              <UiEntity uiTransform={{ width: 6, height: 1 }} />
              <AtlasSprite rect={COIN_STACK_RECT} width={58} height={22} />
            </UiEntity>
          </UiEntity>

          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 46, left: 8 },
              width: 348,
              height: 38,
            }}
          >
            <AtlasSprite rect={BAR_TRACK_RECT} width={348} height={38} />
            {barFillWidth > 0 && (
              <AtlasSprite rect={BAR_FILL_RECT} width={barFillWidth} height={22} position={{ top: 8, left: 13 }} />
            )}
          </UiEntity>

          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 92, left: 8 },
              width: 384,
              height: 28,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <UiEntity
              uiTransform={{
                width: 182,
                height: 28,
                justifyContent: 'center',
              }}
            >
              <OutlinedLabel
                value={isMaxLvl ? 'MAX XP' : `${xp.current} / ${xp.needed} XP`}
                fontSize={16}
                width={182}
                height={24}
                color={HUD_WHITE}
                outlineColor={HUD_BROWN_DARK}
                textAlign="middle-left"
              />
            </UiEntity>

            {SHOW_SERVER_INDICATOR && isConnected && (
              <UiEntity
                uiTransform={{
                  width: 132,
                  height: 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <AtlasSprite rect={ONLINE_SPROUT_RECT} width={26} height={26} />
                <UiEntity uiTransform={{ width: 6, height: 1 }} />
                <AtlasSprite rect={ONLINE_TEXT_RECT} width={78} height={24} />
              </UiEntity>
            )}

            {SHOW_SERVER_INDICATOR && !isConnected && (
              <UiEntity
                uiTransform={{
                  width: 150,
                  height: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <UiEntity
                  uiTransform={{ width: 10, height: 10, borderRadius: 5, margin: { right: 6 } }}
                  uiBackground={{ color: { r: 0.95, g: 0.2, b: 0.2, a: connectingBlinkOn ? 1 : 0.35 } }}
                />
                <Label
                  value="Connecting..."
                  fontSize={14}
                  color={{ ...HUD_BROWN, a: connectingBlinkOn ? 1 : 0.7 }}
                  textAlign="middle-right"
                  uiTransform={{ width: 120, height: 24 }}
                />
              </UiEntity>
            )}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
