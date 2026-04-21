import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { requestLikeFarm, socialUiCallbacks } from '../services/socialService'
import { exitVisitMode, getVisitedPayload } from '../services/visitService'
import { playSound } from '../systems/sfxSystem'
import { C } from './PanelShell'

const likeUiState = {
  farm:    '',
  pending: false,
  liked:   false,
  status:  '',
}

function shortenAddr(addr: string): string {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function syncLikeUi(targetFarm: string): void {
  if (likeUiState.farm === targetFarm) return
  likeUiState.farm    = targetFarm
  likeUiState.pending = false
  likeUiState.liked   = false
  likeUiState.status  = ''
}

export const VisitHud = () => {
  const targetFarm = playerState.viewingFarm
  if (!targetFarm) return null

  syncLikeUi(targetFarm)

  socialUiCallbacks.onLikeResult = (data) => {
    if (data.targetWallet !== likeUiState.farm) return
    likeUiState.pending = false

    if (data.success) {
      likeUiState.liked  = true
      likeUiState.status = `Liked farm. +${data.rewardCoins} coins queued in mailbox`
      return
    }

    likeUiState.liked = data.reason === 'already_liked_today'
    likeUiState.status =
      data.reason === 'already_liked_today' ? 'You already liked this farm today'
      : data.reason === 'cannot_like_own_farm' ? 'You cannot like your own farm'
      : 'Could not register like'
  }

  const payload    = getVisitedPayload()
  const likeCount  = payload?.wallet === targetFarm ? payload.totalLikesReceived : 0
  const farmLabel  = shortenAddr(targetFarm)
  const likeLabel  = likeUiState.pending ? 'Liking...' : likeUiState.liked ? 'Liked Today' : 'Like Farm'
  const likeBg     = likeUiState.liked
    ? { r: 0.35, g: 0.18, b: 0.18, a: 1 }
    : { r: 0.58, g: 0.22, b: 0.22, a: 1 }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 138, left: 720 },
        width: 540,
        height: 104,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: { top: 10, bottom: 10, left: 16, right: 12 },
        pointerFilter: 'block',
      }}
      uiBackground={{ color: { r: 0.06, g: 0.04, b: 0.02, a: 0.92 } }}
    >
      <UiEntity uiTransform={{ width: '100%', flexDirection: 'row', alignItems: 'center' }}>
        <UiEntity
          uiTransform={{ width: 4, height: 36, margin: { right: 12 } }}
          uiBackground={{ color: C.gold }}
        />

        <UiEntity uiTransform={{ flex: 1, height: 52, justifyContent: 'center' }}>
          <Label
            value={`Visiting ${farmLabel}`}
            fontSize={22}
            color={C.header}
            textAlign="middle-left"
            uiTransform={{ width: '100%', height: 24 }}
          />
          <Label
            value={`Likes ${likeCount}`}
            fontSize={17}
            color={C.textMute}
            textAlign="middle-left"
            uiTransform={{ width: '100%', height: 22, margin: { top: 2 } }}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: 138, height: 44, alignItems: 'center', justifyContent: 'center', margin: { right: 10 } }}
          uiBackground={{ color: likeBg }}
          onMouseDown={(!likeUiState.pending && !likeUiState.liked) ? () => {
            playSound('buttonclick')
            likeUiState.pending = true
            likeUiState.status  = ''
            requestLikeFarm(targetFarm)
          } : undefined}
        >
          <Label value={likeLabel} fontSize={18} color={C.textMain} textAlign="middle-center" />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: 150, height: 44, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: { r: 0.2, g: 0.55, b: 0.2, a: 1 } }}
          onMouseDown={() => {
            playSound('buttonclick')
            likeUiState.farm    = ''
            likeUiState.pending = false
            likeUiState.liked   = false
            likeUiState.status  = ''
            exitVisitMode()
          }}
        >
          <Label value="Return Home" fontSize={20} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {likeUiState.status !== '' && (
        <Label
          value={likeUiState.status}
          fontSize={15}
          color={C.textMute}
          textAlign="middle-left"
          uiTransform={{ width: '100%', height: 18, margin: { top: 6, left: 18 } }}
        />
      )}
    </UiEntity>
  )
}
