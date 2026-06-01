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

type AtlasRect = { x: number; y: number; w: number; h: number }

const PANEL_RECT: AtlasRect = { x: 60, y: 69, w: 817, h: 261 }
const BAR_TRACK_RECT: AtlasRect = { x: 13, y: 762, w: 632, h: 67 }
const BAR_FILL_RECT: AtlasRect = { x: 16, y: 842, w: 751, h: 63 }
const LEVEL_WORD_RECT: AtlasRect = { x: 682, y: 559, w: 172, h: 64 }
const ARROW_RECT: AtlasRect = { x: 901, y: 572, w: 53, h: 44 }
const COIN_STACK_RECT: AtlasRect = { x: 865, y: 652, w: 120, h: 89 }
const LEVEL_SPROUT_RECT: AtlasRect = { x: 685, y: 652, w: 74, h: 68 }
const ONLINE_SPROUT_RECT: AtlasRect = { x: 687, y: 755, w: 67, h: 69 }
const ONLINE_TEXT_RECT: AtlasRect = { x: 862, y: 778, w: 137, h: 43 }

const DIGIT_RECTS: Record<string, AtlasRect> = {
  '0': { x: 35, y: 930, w: 52, h: 67 },
  '1': { x: 126, y: 931, w: 36, h: 65 },
  '2': { x: 216, y: 930, w: 47, h: 66 },
  '3': { x: 309, y: 930, w: 49, h: 67 },
  '4': { x: 393, y: 931, w: 54, h: 65 },
  '5': { x: 486, y: 931, w: 48, h: 66 },
  '6': { x: 571, y: 930, w: 51, h: 67 },
  '7': { x: 663, y: 931, w: 49, h: 65 },
  '8': { x: 750, y: 930, w: 51, h: 67 },
  '9': { x: 836, y: 930, w: 51, h: 67 },
}

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

function AtlasNumber(props: { value: number; digitHeight: number; gap?: number }) {
  const chars = `${Math.max(0, Math.floor(props.value))}`.split('')
  const gap = props.gap ?? 2
  const widths = chars.map((char) => Math.round((props.digitHeight * DIGIT_RECTS[char].w) / DIGIT_RECTS[char].h))
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * gap

  let left = 0

  return (
    <UiEntity uiTransform={{ width: totalWidth, height: props.digitHeight }}>
      {chars.map((char, index) => {
        const width = widths[index]
        const node = (
          <UiEntity
            key={`${char}-${index}`}
            uiTransform={{
              positionType: 'absolute',
              position: { top: 0, left },
              width,
              height: props.digitHeight,
            }}
          >
            <AtlasSprite rect={DIGIT_RECTS[char]} width={width} height={props.digitHeight} />
          </UiEntity>
        )
        left += width + gap
        return node
      })}
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

  const boardWidth = 800
  const boardHeight = 228
  const barWidth = 458
  const barFillWidth = Math.max(0, Math.round(436 * xpPct / 100))

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
          position: { top: 26, left: 0 },
          width: '100%',
          height: boardHeight,
          justifyContent: 'center',
          alignItems: 'center',
          pointerFilter: 'none',
        }}
      >
        <UiEntity uiTransform={{ width: boardWidth, height: boardHeight, pointerFilter: 'none' }}>
          <AtlasSprite rect={PANEL_RECT} width={boardWidth} height={boardHeight} />

          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 47, left: 54 },
              width: 138,
              height: 138,
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
                position: { top: 17, left: 20 },
                width: 96,
                height: 96,
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
                width: 138,
                height: 138,
              }}
              uiBackground={{
                texture: { src: BTN_PROFILE, wrapMode: 'clamp' },
                textureMode: 'stretch',
              }}
            />
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { bottom: -2, right: -5 },
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              uiBackground={{ color: { r: 0.92, g: 0.77, b: 0.22, a: 1 } }}
            >
              <Label value={`${playerState.level}`} fontSize={18} color={HUD_BROWN} textAlign="middle-center" />
            </UiEntity>
            {LEVEL_REWARDS.some((reward) => playerState.level >= reward.level && !playerState.claimedRewards.includes(reward.level)) && (
              <BadgeDot top={-4} right={-4} size={16} />
            )}
          </UiEntity>

          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 28, left: 250 },
              width: 510,
              height: 154,
            }}
          >
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: 0, left: 0 },
                width: 510,
                height: 38,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <UiEntity
                uiTransform={{
                  width: 334,
                  height: 38,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <AtlasSprite rect={LEVEL_SPROUT_RECT} width={26} height={24} />
                <UiEntity uiTransform={{ width: 10, height: 1 }} />
                <AtlasSprite rect={LEVEL_WORD_RECT} width={108} height={40} />
                <UiEntity uiTransform={{ width: 10, height: 1 }} />
                <AtlasNumber value={playerState.level} digitHeight={40} gap={2} />
                {!isMaxLvl && <UiEntity uiTransform={{ width: 8, height: 1 }} />}
                {!isMaxLvl && <AtlasSprite rect={ARROW_RECT} width={38} height={30} />}
                {!isMaxLvl && <UiEntity uiTransform={{ width: 8, height: 1 }} />}
                {!isMaxLvl && <AtlasNumber value={playerState.level + 1} digitHeight={40} gap={2} />}
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: 176,
                  height: 38,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <AtlasNumber value={playerState.coins} digitHeight={40} gap={2} />
                <UiEntity uiTransform={{ width: 16, height: 1 }} />
                <AtlasSprite rect={COIN_STACK_RECT} width={52} height={38} />
              </UiEntity>
            </UiEntity>

            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: 58, left: 8 },
                width: barWidth,
                height: 46,
              }}
            >
              <AtlasSprite rect={BAR_TRACK_RECT} width={barWidth} height={46} />
              {barFillWidth > 0 && (
                <AtlasSprite rect={BAR_FILL_RECT} width={barFillWidth} height={26} position={{ top: 10, left: 11 }} />
              )}
            </UiEntity>

            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: 112, left: 8 },
                width: 500,
                height: 34,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <UiEntity uiTransform={{ width: 214, height: 34, justifyContent: 'center' }}>
                <OutlinedLabel
                  value={isMaxLvl ? 'MAX XP' : `${xp.current} / ${xp.needed} XP`}
                  fontSize={20}
                  width={214}
                  height={30}
                  color={HUD_WHITE}
                  outlineColor={HUD_BROWN_DARK}
                  textAlign="middle-left"
                />
              </UiEntity>

              {SHOW_SERVER_INDICATOR && isConnected && (
                <UiEntity
                  uiTransform={{
                    width: 150,
                    height: 34,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <AtlasSprite rect={ONLINE_SPROUT_RECT} width={30} height={30} />
                  <UiEntity uiTransform={{ width: 8, height: 1 }} />
                  <AtlasSprite rect={ONLINE_TEXT_RECT} width={92} height={28} />
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
                    uiTransform={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      margin: { right: 6 },
                    }}
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
    </UiEntity>
  )
}
