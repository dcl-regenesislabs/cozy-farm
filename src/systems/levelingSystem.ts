import { playerState } from '../game/gameState'

// ---------------------------------------------------------------------------
// XP constants — awarded per farming action
// ---------------------------------------------------------------------------

export const XP_PLANT         = 5
export const XP_WATER         = 3
export const XP_HARVEST_TIER1 = 10
export const XP_HARVEST_TIER2 = 20
export const XP_HARVEST_TIER3 = 35

export const XP_QUEST_REGULAR    = 50
export const XP_QUEST_RETRIBUTION = 75
export const XP_QUEST_GATE       = 100

// ---------------------------------------------------------------------------
// Level table — cumulative XP required to reach each level (index = level)
// Level 1 = 0 XP (starting), Level 20 = 41000 XP (max)
// ---------------------------------------------------------------------------

export const XP_TABLE: number[] = [
       0,   // level 1
     100,   // level 2
     250,   // level 3
     500,   // level 4
     900,   // level 5
   1_400,   // level 6
   2_100,   // level 7
   3_000,   // level 8
   4_200,   // level 9
   5_700,   // level 10
   7_500,   // level 11
   9_600,   // level 12
  12_000,   // level 13
  14_800,   // level 14
  18_000,   // level 15
  21_600,   // level 16
  25_500,   // level 17
  30_000,   // level 18
  35_000,   // level 19
  41_000,   // level 20
]

const MAX_LEVEL = XP_TABLE.length  // 20

// ---------------------------------------------------------------------------
// Level-up callbacks
// ---------------------------------------------------------------------------

const levelUpCallbacks: Array<(newLevel: number) => void> = []
const xpAddedCallbacks: Array<(amount: number) => void> = []

export function onLevelUp(cb: (newLevel: number) => void): void {
  levelUpCallbacks.push(cb)
}

export function onXpAdded(cb: (amount: number) => void): void {
  xpAddedCallbacks.push(cb)
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

export function getLevel(): number {
  return playerState.level
}

/** XP still needed to reach the next level (0 if already max level). */
export function getXpToNextLevel(): number {
  const lvl = playerState.level
  if (lvl >= MAX_LEVEL) return 0
  return XP_TABLE[lvl] - playerState.xp  // XP_TABLE[lvl] = threshold for level lvl+1
}

/** XP earned within the current level (for progress bar display). */
export function getXpProgress(): { current: number; needed: number } {
  const lvl = playerState.level
  if (lvl >= MAX_LEVEL) return { current: 0, needed: 0 }
  const levelStart = XP_TABLE[lvl - 1]
  const levelEnd   = XP_TABLE[lvl]
  return {
    current: playerState.xp - levelStart,
    needed:  levelEnd - levelStart,
  }
}

/** Add XP and handle level-ups. */
export function addXp(amount: number): void {
  if (amount <= 0) return
  playerState.xp += amount
  console.log(`CozyFarm: +${amount} XP → total ${playerState.xp}`)
  for (const cb of xpAddedCallbacks) cb(amount)

  // Check for level-up (may cross multiple thresholds at once)
  while (
    playerState.level < MAX_LEVEL &&
    playerState.xp >= XP_TABLE[playerState.level]  // XP_TABLE[level] = threshold for next level
  ) {
    playerState.level += 1
    console.log(`CozyFarm: Level up! Now level ${playerState.level}`)
    for (const cb of levelUpCallbacks) {
      cb(playerState.level)
    }
  }
}
