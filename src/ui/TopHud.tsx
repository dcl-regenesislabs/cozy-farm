import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { COINS_IMAGE } from '../data/imagePaths'
import { triggerBtnAnim } from './navAnimSystem'
import { getWorkerDebtDays } from '../shared/worker'


const DEBUG_SOCIAL_TOAST = false
const DEBUG_SOCIAL_TOAST_TEXT = 'Debug social toast: Alice liked your farm!'

export const TopHud = () => {
  const xp       = getXpProgress()
  const xpPct    = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const isMaxLvl = playerState.level >= 20
  const liveSocialToast = playerState.socialToastText !== '' && Date.now() < playerState.socialToastExpiresAt
  const showSocialToast = DEBUG_SOCIAL_TOAST || liveSocialToast
  const socialToastText = DEBUG_SOCIAL_TOAST ? DEBUG_SOCIAL_TOAST_TEXT : playerState.socialToastText
  const showWorkerAlert = playerState.farmerHired && playerState.workerOutstandingWages > 0
  const workerDebtDays = getWorkerDebtDays(playerState.workerOutstandingWages)

  if (!DEBUG_SOCIAL_TOAST && !showSocialToast && playerState.socialToastText !== '') {
    playerState.socialToastText = ''
    playerState.socialToastExpiresAt = 0
  }

  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { top: 0, left: 0 }, pointerFilter: 'none' }}>
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
        uiBackground={{ color: { r: 0.10, g: 0.17, b: 0.08, a: 0.95 } }}
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
    {/* ── Leaderboard button (top-right, small) ── */}
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
        uiBackground={{ color: playerState.workerUnpaidDays >= 2 ? { r: 0.28, g: 0.1, b: 0.08, a: 0.96 } : { r: 0.2, g: 0.13, b: 0.05, a: 0.96 } }}
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
        position: { top: 10, left: 720 },
        width: 540,
        height: 120,
        flexDirection: 'row',
        alignItems: 'center',
        pointerFilter: 'none',
      }}
      uiBackground={{ color: { r: 0.05, g: 0.04, b: 0.02, a: 0.88 } }}
    >
      {/* ── Avatar square ── */}
      <UiEntity
        uiTransform={{
          width: 87,
          height: 87,
          margin: { left: 9, right: 15 },
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          pointerFilter: 'block',
        }}
        uiBackground={
          playerState.userId
            ? { avatarTexture: { userId: playerState.userId }, textureMode: 'stretch' }
            : { color: { r: 0.52, g: 0.37, b: 0.04, a: 1 } }
        }
        onMouseDown={() => {
          triggerBtnAnim('stats')
          playerState.activeMenu = playerState.activeMenu === 'stats' ? 'none' : 'stats'
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: -6, right: -6 },
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.82, g: 0.58, b: 0.04, a: 1 } }}
        >
          <Label value={`${playerState.level}`} fontSize={16} color={{ r: 0.04, g: 0.02, b: 0, a: 1 }} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {/* ── Right content column ── */}
      <UiEntity
        uiTransform={{
          width: 400,
          height: 100,
          flexDirection: 'column',
          justifyContent: 'center',
          margin: { right: 14 },
        }}
      >
        {/* Row 1: level (left, fixed w) + coins (right, fixed w) — explicit sizes prevent wrap */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            width: 400,
            height: 32,
            margin: { bottom: 6 },
          }}
        >
          {/* Level label — fixed width */}
          <Label
            value={isMaxLvl ? 'MAX LEVEL' : `Lv ${playerState.level}  →  ${playerState.level + 1}`}
            fontSize={18}
            color={{ r: 1, g: 0.85, b: 0.42, a: 1 }}
            uiTransform={{ width: 180, height: 32 }}
          />

          {/* Coins — number then icon, pinned to the right */}
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: 220,
              height: 32,
            }}
          >
            <Label
              value={`${playerState.coins}`}
              fontSize={24}
              color={{ r: 1, g: 0.88, b: 0.2, a: 1 }}
              uiTransform={{ width: 180, height: 32 }}
              textAlign="middle-right"
            />
            <UiEntity
              uiTransform={{ width: 30, height: 30, margin: { left: 6 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
          </UiEntity>
        </UiEntity>

        {/* Row 2: XP bar */}
        <UiEntity
          uiTransform={{ width: 400, height: 22 }}
          uiBackground={{ color: { r: 0.14, g: 0.12, b: 0.08, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${xpPct}%`, height: '100%' }}
            uiBackground={{ color: { r: 0.18, g: 0.82, b: 0.26, a: 1 } }}
          />
        </UiEntity>

        {/* Row 3: XP text */}
        <Label
          value={isMaxLvl ? '' : `${xp.current} / ${xp.needed} XP`}
          fontSize={15}
          color={{ r: 0.58, g: 0.58, b: 0.58, a: 1 }}
          uiTransform={{ width: 400, height: 22, margin: { top: 4 } }}
        />
      </UiEntity>
    </UiEntity>
    </UiEntity>
  )
}
