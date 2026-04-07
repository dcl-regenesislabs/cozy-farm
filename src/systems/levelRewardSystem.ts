import { onLevelUp } from './levelingSystem'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { playerState } from '../game/gameState'

// Register the level-up callback that grants seed/coin rewards at milestone levels.
// This file is imported as a side-effect in index.ts.

onLevelUp((newLevel: number) => {
  const reward = LEVEL_REWARDS.find((r) => r.level === newLevel)
  if (!reward) return

  if (reward.type === 'seeds' && reward.cropType !== null) {
    const current = playerState.seeds.get(reward.cropType) ?? 0
    playerState.seeds.set(reward.cropType, current + reward.amount)
  } else if (reward.type === 'coins') {
    playerState.coins += reward.amount
    playerState.totalCoinsEarned += reward.amount
  }

  console.log(`CozyFarm: Level ${newLevel} reward — ${reward.label}`)
})
