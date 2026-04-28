import { playerState } from '../game/gameState'
import { XP_TABLE } from '../shared/leveling'

export {
  XP_PLANT,
  XP_WATER,
  XP_HARVEST_TIER1,
  XP_HARVEST_TIER2,
  XP_HARVEST_TIER3,
  XP_QUEST_REGULAR,
  XP_QUEST_RETRIBUTION,
  XP_QUEST_GATE,
  XP_TABLE,
} from '../shared/leveling'

const MAX_LEVEL = XP_TABLE.length

const levelUpCallbacks: Array<(newLevel: number) => void> = []
const xpAddedCallbacks: Array<(amount: number) => void> = []

export function onLevelUp(cb: (newLevel: number) => void): void {
  levelUpCallbacks.push(cb)
}

export function onXpAdded(cb: (amount: number) => void): void {
  xpAddedCallbacks.push(cb)
}

export function getLevel(): number {
  return playerState.level
}

export function getXpToNextLevel(): number {
  const lvl = playerState.level
  if (lvl >= MAX_LEVEL) return 0
  return XP_TABLE[lvl] - playerState.xp
}

export function getXpProgress(): { current: number; needed: number } {
  const lvl = playerState.level
  if (lvl >= MAX_LEVEL) return { current: 0, needed: 0 }
  const levelStart = XP_TABLE[lvl - 1]
  const levelEnd = XP_TABLE[lvl]
  return {
    current: playerState.xp - levelStart,
    needed: levelEnd - levelStart,
  }
}

export function addXp(amount: number): void {
  if (amount <= 0) return
  playerState.xp += amount
  console.log(`CozyFarm: +${amount} XP -> total ${playerState.xp}`)
  for (const cb of xpAddedCallbacks) cb(amount)

  while (
    playerState.level < MAX_LEVEL &&
    playerState.xp >= XP_TABLE[playerState.level]
  ) {
    playerState.level += 1
    console.log(`CozyFarm: Level up! Now level ${playerState.level}`)
    for (const cb of levelUpCallbacks) cb(playerState.level)
  }
}
