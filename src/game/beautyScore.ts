import type { FarmStatePayload } from '../shared/farmMessages'

// ---------------------------------------------------------------------------
// Beauty score contributors
// Each constant is the point value for that element.
// Future decorations will be added here with their rarity values.
// ---------------------------------------------------------------------------
const BEAUTY = {
  // Soil / land progression
  soilUnlocked:       5,   // each unlocked plot
  expansion1:        20,
  expansion2:        30,

  // Companions
  dog:               25,

  // Farmer (shows farm is active + invested)
  farmer:            15,

  // Level milestones
  perLevel:           2,   // × player level

  // Lifetime activity (small bonus, capped to avoid grinding abuse)
  perHundredHarvests: 1,   // 1 pt per 100 crops harvested, max 20 pts
} as const

export function calculateBeautyScore(payload: Pick<
  FarmStatePayload,
  'plotStates' | 'expansion1Unlocked' | 'expansion2Unlocked' |
  'dogOwned' | 'farmerHired' | 'level' | 'totalCropsHarvested'
>): number {
  let score = 0

  // Unlocked soil plots
  const unlockedPlots = payload.plotStates.filter((p) => p.isUnlocked).length
  score += unlockedPlots * BEAUTY.soilUnlocked

  // Land expansions
  if (payload.expansion1Unlocked) score += BEAUTY.expansion1
  if (payload.expansion2Unlocked) score += BEAUTY.expansion2

  // Companions & staff
  if (payload.dogOwned)    score += BEAUTY.dog
  if (payload.farmerHired) score += BEAUTY.farmer

  // Level bonus
  score += payload.level * BEAUTY.perLevel

  // Harvest activity bonus (capped at 20 pts = 2000 crops)
  const harvestBonus = Math.min(20, Math.floor(payload.totalCropsHarvested / 100))
  score += harvestBonus * BEAUTY.perHundredHarvests

  return Math.max(0, score)
}
