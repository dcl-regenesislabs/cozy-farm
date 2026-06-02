import { NPC_ROSTER } from '../data/npcData'
import { QUEST_DEFINITIONS, type QuestDefinition } from '../data/questData'
import { npcDialogState, NpcDialogMode } from '../game/npcDialogState'
import { questProgressMap } from '../game/questState'
import { playerState } from '../game/gameState'

export const NPC_DIALOG_DEBUG = true

const MODES: NpcDialogMode[] = ['greeting', 'quest_offer', 'quest_active', 'quest_claimable', 'tutorial']

export let debugNpcIndex  = 0
export let debugModeIndex = 2

export function debugNpcNext():  void { debugNpcIndex  = (debugNpcIndex  + 1) % NPC_ROSTER.length; applyNpcDialogDebug() }
export function debugNpcPrev():  void { debugNpcIndex  = (debugNpcIndex  - 1 + NPC_ROSTER.length) % NPC_ROSTER.length; applyNpcDialogDebug() }
export function debugModeNext(): void { debugModeIndex = (debugModeIndex + 1) % MODES.length; applyNpcDialogDebug() }
export function debugModePrev(): void { debugModeIndex = (debugModeIndex - 1 + MODES.length) % MODES.length; applyNpcDialogDebug() }

function getQuestsForNpc(npcId: string): QuestDefinition[] {
  return QUEST_DEFINITIONS.filter((quest) => (quest.npcId ?? quest.id) === npcId)
}

function resetQuestDebugState(): void {
  for (const quest of QUEST_DEFINITIONS) {
    const qp = questProgressMap.get(quest.id)
    if (!qp) continue
    qp.current = 0
    qp.status = quest.requiresRotSystem ? 'completed' : 'available'
  }
}

function applyQuestMode(quest: QuestDefinition | undefined, mode: NpcDialogMode): void {
  resetQuestDebugState()
  if (!quest) return

  const qp = questProgressMap.get(quest.id)
  if (!qp) return

  if (mode === 'quest_offer') {
    qp.status = 'available'
    return
  }

  if (mode === 'quest_active') {
    qp.status = 'active'
    qp.current = Math.max(1, Math.floor(quest.target / 2))
    return
  }

  if (mode === 'quest_claimable') {
    qp.status = 'claimable'
    qp.current = quest.target
    return
  }

  qp.status = 'completed'
  qp.current = quest.target
}

export function applyNpcDialogDebug(): void {
  const npc  = NPC_ROSTER[debugNpcIndex]
  const mode = MODES[debugModeIndex]
  const quest = getQuestsForNpc(npc.id)[0]

  npcDialogState.npcName        = npc.name
  npcDialogState.npcId          = npc.id
  npcDialogState.npcHeadImage   = npc.headImage
  npcDialogState.mode           = mode
  npcDialogState.onClose        = null
  npcDialogState.onAccept       = null
  npcDialogState.onClaim        = null
  npcDialogState.tutorialButtonLabel = 'Got it!'

  playerState.level = Math.max(1, quest?.prerequisite?.minLevel ?? 1)
  playerState.rotSystemUnlocked = !!quest?.requiresRotSystem
  applyQuestMode(quest, mode)

  if (mode === 'greeting' || mode === 'tutorial') {
    npcDialogState.dialogLine = npc.greeting
  } else if (quest) {
    npcDialogState.dialogLine = quest.description
  } else {
    npcDialogState.dialogLine = `(no quest for ${npc.name})`
  }

  playerState.activeMenu = 'npcDialog'
}
