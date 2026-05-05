export type ProgressionEventStep =
  | ''
  | 'rot_intro_active'
  | 'compost_quest'
  | 'waste_quest'
  | 'collect_quest'
  | 'complete'

export const progressionEventState = {
  active: false,
  step:   '' as ProgressionEventStep,
}

// Wired from index.ts after all modules load — avoids circular imports
export const progressionEventCallbacks = {
  onMayorClicked: () => {},
}

// ── Quest checklist ───────────────────────────────────────────────────────────

const STEP_ORDER: ProgressionEventStep[] = [
  '', 'rot_intro_active', 'compost_quest', 'waste_quest', 'collect_quest', 'complete',
]

export type ProgressionMilestone = { label: string; doneAtStep: ProgressionEventStep }

export const PROGRESSION_MILESTONES: ProgressionMilestone[] = [
  { label: 'Buy the Compost Bin',      doneAtStep: 'compost_quest' },
  { label: 'Add organic waste to bin', doneAtStep: 'waste_quest'   },
  { label: 'Collect fertilizer',       doneAtStep: 'collect_quest' },
  { label: 'Plant, water & fertilize', doneAtStep: 'complete'      },
]

export function getProgressionMilestoneStatus(m: ProgressionMilestone): 'done' | 'current' | 'todo' {
  const cur    = STEP_ORDER.indexOf(progressionEventState.step as ProgressionEventStep)
  const doneAt = STEP_ORDER.indexOf(m.doneAtStep)
  if (cur >= doneAt) return 'done'
  const firstPending = PROGRESSION_MILESTONES.find(
    (x) => STEP_ORDER.indexOf(x.doneAtStep) > cur,
  )
  return firstPending === m ? 'current' : 'todo'
}
