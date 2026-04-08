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

// Runtime progress map — keyed by quest id, initialized from definitions
export const questProgressMap: Map<string, QuestProgress> = new Map(
  QUEST_DEFINITIONS.map((def) => [
    def.id,
    { id: def.id, current: 0, status: 'available' },
  ])
)

// ---------------------------------------------------------------------------
// Tutorial hooks — fire once when a quest is accepted / claimed
// ---------------------------------------------------------------------------

let onQuestAcceptedCb: (() => void) | null = null
let onQuestClaimedCb:  (() => void) | null = null

export function setOnQuestAccepted(cb: () => void): void {
  onQuestAcceptedCb = cb
}

export function setOnQuestClaimed(cb: () => void): void {
  onQuestClaimedCb = cb
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
  }
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getQuestForNpc(npcId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find((d) => d.id === npcId)
}

export function getQuestProgress(questId: string): QuestProgress | undefined {
  return questProgressMap.get(questId)
}
