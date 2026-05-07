import { QUEST_DEFINITIONS, QuestDefinition } from '../data/questData'
import { CropType } from '../data/cropData'
import { playerState } from './gameState'
import { addXp } from '../systems/levelingSystem'

export type QuestStatus = 'available' | 'active' | 'claimable' | 'completed'

export interface QuestProgress {
  id:      string
  current: number
  status:  QuestStatus
}

// Runtime progress map — keyed by quest id, initialized from definitions.
// requiresRotSystem quests start as 'completed' (hidden) until the rot system is unlocked.
export const questProgressMap: Map<string, QuestProgress> = new Map(
  QUEST_DEFINITIONS.map((def) => [
    def.id,
    { id: def.id, current: 0, status: def.requiresRotSystem ? 'completed' : 'available' },
  ])
)

// ---------------------------------------------------------------------------
// Tutorial hooks — fire once when a quest is accepted / claimed
// ---------------------------------------------------------------------------

let onQuestAcceptedCb:  (() => void) | null = null
let onQuestClaimedCb:   (() => void) | null = null
let onQuestClaimableCb: (() => void) | null = null

// One-shot callbacks for the progression event (plant/water/fertilize steps)
let onNextPlantCb:         (() => void) | null = null
let onNextWaterCb:         (() => void) | null = null
let onNextFertilizeCb:     (() => void) | null = null

export function setOnNextPlant(cb: () => void): void     { onNextPlantCb     = cb }
export function setOnNextWater(cb: () => void): void     { onNextWaterCb     = cb }
export function setOnNextFertilize(cb: () => void): void { onNextFertilizeCb = cb }

export function setOnQuestAccepted(cb: () => void): void {
  onQuestAcceptedCb = cb
}

export function setOnQuestClaimed(cb: () => void): void {
  onQuestClaimedCb = cb
}

/** Fires once when the active quest first becomes claimable (target reached). */
export function setOnQuestClaimable(cb: () => void): void {
  onQuestClaimableCb = cb
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function acceptQuest(questId: string): void {
  const qp = questProgressMap.get(questId)
  if (!qp || qp.status !== 'available') return
  qp.status = 'active'
  const cb = onQuestAcceptedCb
  onQuestAcceptedCb = null
  cb?.()
  console.log(`CozyFarm Quest: Accepted "${questId}"`)
}

export function claimQuestReward(questId: string): void {
  const qp  = questProgressMap.get(questId)
  const def = QUEST_DEFINITIONS.find((d) => d.id === questId)
  if (!qp || !def || qp.status !== 'claimable') return
  playerState.coins += def.rewardCoins
  playerState.totalCoinsEarned += def.rewardCoins
  addXp(def.rewardXp)
  qp.status = 'completed'
  console.log(`CozyFarm Quest: Completed "${def.title}" — +${def.rewardCoins} coins, +${def.rewardXp} XP`)
  const cb = onQuestClaimedCb
  onQuestClaimedCb = null
  cb?.()
}

// ---------------------------------------------------------------------------
// Progress hooks — called by actions.ts after successful farming actions
// ---------------------------------------------------------------------------

export function onHarvestCrop(cropType: CropType, amount: number): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (!qp || qp.status !== 'active') continue
    if (def.type === 'harvest_crop' && def.cropType === cropType) {
      qp.current = Math.min(qp.current + amount, def.target)
      checkCompletion(def, qp)
    } else if (def.type === 'harvest_total') {
      qp.current = Math.min(qp.current + amount, def.target)
      checkCompletion(def, qp)
    }
  }
}

export function onWater(): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (!qp || qp.status !== 'active') continue
    if (def.type === 'water_total') {
      qp.current = Math.min(qp.current + 1, def.target)
      checkCompletion(def, qp)
    }
  }
  const cb = onNextWaterCb
  onNextWaterCb = null
  cb?.()
}

export function onFertilize(): void {
  const cb = onNextFertilizeCb
  onNextFertilizeCb = null
  cb?.()
}

export function onCollectFertilizer(amount: number): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (!qp || qp.status !== 'active') continue
    if (def.type === 'collect_fertilizer') {
      qp.current = Math.min(qp.current + amount, def.target)
      checkCompletion(def, qp)
    }
  }
}

export function onPlant(): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (!qp || qp.status !== 'active') continue
    if (def.type === 'plant_total') {
      qp.current = Math.min(qp.current + 1, def.target)
      checkCompletion(def, qp)
    }
  }
  const cb = onNextPlantCb
  onNextPlantCb = null
  cb?.()
}

export function onSell(amount: number): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (!qp || qp.status !== 'active') continue
    if (def.type === 'sell_total') {
      qp.current = Math.min(qp.current + amount, def.target)
      checkCompletion(def, qp)
    }
  }
}

function checkCompletion(def: QuestDefinition, qp: QuestProgress): void {
  if (qp.status === 'active' && qp.current >= def.target) {
    qp.status = 'claimable'
    console.log(`CozyFarm Quest: "${def.title}" ready to claim — talk to ${def.npcName}!`)
    const cb = onQuestClaimableCb
    onQuestClaimableCb = null
    cb?.()
  }
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Returns the most relevant quest + progress for an NPC (active > claimable > available).
 *  Skips requiresRotSystem quests if rot system not yet unlocked. */
export function isQuestPrerequisiteMet(def: QuestDefinition): boolean {
  if (def.requiresRotSystem && !playerState.rotSystemUnlocked) return false
  if (def.prerequisite?.minLevel && playerState.level < def.prerequisite.minLevel) return false
  return true
}

/** Returns true if all of this NPC's pending (non-completed) quests have unmet prerequisites.
 *  Used by the scheduler to skip NPCs that have nothing to offer yet. */
export function hasOnlyBlockedQuestsForNpc(npcId: string): boolean {
  const candidates = QUEST_DEFINITIONS.filter((d) => (d.npcId ?? d.id) === npcId)
  const pending = candidates.filter((def) => {
    const qp = questProgressMap.get(def.id)
    return qp && qp.status !== 'completed'
  })
  if (pending.length === 0) return false  // all completed — allow generic greeting visit
  return pending.every((def) => !isQuestPrerequisiteMet(def))
}

export function getActiveQuestForNpc(npcId: string): { def: QuestDefinition; qp: QuestProgress } | undefined {
  const candidates = QUEST_DEFINITIONS.filter((d) => (d.npcId ?? d.id) === npcId)
  const priority: QuestStatus[] = ['active', 'claimable', 'available']
  for (const status of priority) {
    for (const def of candidates) {
      if (!isQuestPrerequisiteMet(def)) continue
      const qp = questProgressMap.get(def.id)
      if (qp && qp.status === status) return { def, qp }
    }
  }
  return undefined
}

/** Backward-compat wrapper — returns just the definition */
export function getQuestForNpc(npcId: string): QuestDefinition | undefined {
  return getActiveQuestForNpc(npcId)?.def
}

export function getQuestProgress(questId: string): QuestProgress | undefined {
  return questProgressMap.get(questId)
}

/** Reset all quest progress to initial state (dev reset). */
export function resetQuestProgress(): void {
  for (const def of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(def.id)
    if (qp) {
      qp.current = 0
      qp.status  = def.requiresRotSystem ? 'completed' : 'available'
    }
  }
}

/** Unlock the Mayor fertilizer quest after the rot system is enabled. */
export function unlockFertilizerQuest(): void {
  const qp = questProgressMap.get('mayorchen_fertilizer')
  if (qp && qp.status === 'completed') {
    qp.status  = 'active'
    qp.current = 0
  }
}
