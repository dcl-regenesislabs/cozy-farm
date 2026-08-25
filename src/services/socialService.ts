import { CropType } from '../data/cropData'
import { playerState } from '../game/gameState'
import { room, type CropCount } from '../shared/farmMessages'
import { saveFarm } from './saveService'
import { getVisitedPayload } from './visitService'

export const socialUiCallbacks = {
  onLikeResult: null as ((data: {
    targetWallet: string
    success: boolean
    reason: string
    likeCount: number
    rewardCoins: number
  }) => void) | null,
  onMailboxCollected: null as ((data: {
    success: boolean
    coins: number
    seeds: CropCount[]
    rewardCount: number
  }) => void) | null,
}

export const visitorWaterCallbacks = {
  onWaterResult: null as ((data: {
    targetWallet: string
    plotIndex: number
    success: boolean
    reason: string
  }) => void) | null,
}

export function requestLikeFarm(targetWallet: string): void {
  void room.send('socialLikeFarm', { targetWallet: targetWallet.toLowerCase() })
}

export function requestCollectMailbox(): void {
  void room.send('collectMailbox', {})
}

export function requestVisitorWaterPlot(targetWallet: string, plotIndex: number): void {
  void room.send('visitorWaterPlot', { targetWallet: targetWallet.toLowerCase(), plotIndex })
}

function pushSocialToast(text: string): void {
  playerState.socialToastText = text
  playerState.socialToastExpiresAt = Date.now() + 5000
}

function addCollectedSeeds(seeds: CropCount[]): void {
  for (const { cropType, count } of seeds) {
    const current = playerState.seeds.get(cropType as CropType) ?? 0
    playerState.seeds.set(cropType as CropType, current + count)
  }
}

export function initSocialService(): void {
  room.onMessage('socialLikeResult', (data) => {
    if (data.requester !== playerState.wallet) return

    const payload = getVisitedPayload()
    if (data.success && payload && payload.wallet === data.targetWallet) {
      payload.totalLikesReceived = data.likeCount
    }

    socialUiCallbacks.onLikeResult?.({
      targetWallet: data.targetWallet,
      success: data.success,
      reason: data.reason,
      likeCount: data.likeCount,
      rewardCoins: data.rewardCoins,
    })
  })

  room.onMessage('mailboxCollected', (data) => {
    if (data.requester !== playerState.wallet) return

    if (data.success) {
      playerState.coins += data.coins
      addCollectedSeeds(data.seeds)
      playerState.mailbox = []
      playerState.mailboxSeenCount = 0
      saveFarm()
    }

    socialUiCallbacks.onMailboxCollected?.({
      success: data.success,
      coins: data.coins,
      seeds: data.seeds,
      rewardCount: data.rewards.length,
    })
  })

  room.onMessage('socialOwnerRewardReceived', (data) => {
    if (data.ownerWallet !== playerState.wallet) return
    if (!playerState.mailbox.find((reward) => reward.id === data.reward.id)) {
      playerState.mailbox.unshift(data.reward)
    }
    playerState.totalLikesReceived = data.totalLikesReceived
    pushSocialToast(data.notificationText)
  })

  room.onMessage('visitorWaterResult', (data) => {
    if (data.requester !== playerState.wallet) return
    if (data.success) {
      playerState.visitorSessionWaterCount += 1
    }
    visitorWaterCallbacks.onWaterResult?.({
      targetWallet: data.targetWallet,
      plotIndex:    data.plotIndex,
      success:      data.success,
      reason:       data.reason,
    })
  })

  room.onMessage('socialOwnerWaterReceived', (data) => {
    if (data.ownerWallet !== playerState.wallet) return
    if (!playerState.mailbox.find((r) => r.id === data.reward.id)) {
      playerState.mailbox.unshift(data.reward)
    }
    pushSocialToast(data.notificationText)
  })
}
