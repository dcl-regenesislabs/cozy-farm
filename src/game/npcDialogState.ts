export type NpcDialogMode = 'greeting' | 'quest_offer' | 'quest_active' | 'quest_claimable' | 'tutorial'

/** Shared state for the active NPC dialog panel.
 *  npcSystem writes to this; NpcDialogMenu reads from it. */
export const npcDialogState = {
  npcName:             '',
  npcId:               '',
  npcHeadImage:        '',
  dialogLine:          '',
  mode:                'greeting' as NpcDialogMode,
  tutorialButtonLabel: 'Got it!',
  onClose:             null as (() => void) | null,
  onAccept:            null as (() => void) | null,  // quest_offer: called when player accepts
  onClaim:             null as (() => void) | null,  // quest_claimable: called when player claims reward
}
