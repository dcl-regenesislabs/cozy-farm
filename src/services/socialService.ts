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

export function requestLikeFarm(targetWallet: string): void {
  void room.send('socialLikeFarm', { targetWallet: targetWallet.toLowerCase() })
}

export function requestCollectMailbox(): void {
  void room.send('collectMailbox', {})
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
      saveFarm()
    }

    socialUiCallbacks.onMailboxCollected?.({
      success: data.success,
      coins: data.coins,
      seeds: data.seeds,
      rewardCount: data.rewards.length,
    })
  })
}
