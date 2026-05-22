export type ChickenTutorialStep =
  | ''
  | 'buy_coop'
  | 'buy_chicken'
  | 'feed_chicken'
  | 'clean_intro'
  | 'complete'

export type PigTutorialStep =
  | ''
  | 'buy_pen'
  | 'buy_pig'
  | 'feed_pig'
  | 'clean_intro'
  | 'growth_explained'
  | 'breed_explained'
  | 'harvest_explained'
  | 'complete'

export const animalTutorialState = {
  chickenActive: false,
  chickenStep:   '' as ChickenTutorialStep,
  pigActive:     false,
  pigStep:       '' as PigTutorialStep,
}

// ---------------------------------------------------------------------------
// Callbacks — wired from index.ts after all modules are loaded.
// Breaks circular deps: animalTutorialSystem → animalSystem → (tutorial hooks)
// ---------------------------------------------------------------------------
export const animalTutorialCallbacks = {
  onCoopPurchased:      () => {},
  onPenPurchased:       () => {},
  onFirstChickenBought: () => {},
  onFirstPigBought:     () => {},
  onCoopFed:            () => {},
  onPenFed:             () => {},
  onMayorClicked:       null as (() => void) | null,
}

// ---------------------------------------------------------------------------
// Milestone checklists — shown in Quest Log
// ---------------------------------------------------------------------------

const CHICKEN_STEP_ORDER: ChickenTutorialStep[] = [
  '', 'buy_coop', 'buy_chicken', 'feed_chicken', 'clean_intro', 'complete',
]

const PIG_STEP_ORDER: PigTutorialStep[] = [
  '', 'buy_pen', 'buy_pig', 'feed_pig', 'clean_intro',
  'growth_explained', 'breed_explained', 'harvest_explained', 'complete',
]

export type AnimalMilestone<S extends string> = { label: string; doneAtStep: S }

export const CHICKEN_MILESTONES: AnimalMilestone<ChickenTutorialStep>[] = [
  { label: 'Build the Chicken Coop',  doneAtStep: 'buy_chicken'  },
  { label: 'Buy your first chicken',  doneAtStep: 'feed_chicken' },
  { label: 'Fill the food bowl',      doneAtStep: 'clean_intro'  },
  { label: 'Learn about cleaning',    doneAtStep: 'complete'     },
]

export const PIG_MILESTONES: AnimalMilestone<PigTutorialStep>[] = [
  { label: 'Build the Pig Pen',           doneAtStep: 'buy_pig'           },
  { label: 'Buy your first pig',          doneAtStep: 'feed_pig'          },
  { label: 'Fill the food bowl',          doneAtStep: 'clean_intro'       },
  { label: 'Learn about growth stages',   doneAtStep: 'breed_explained'   },
  { label: 'Learn about breeding',        doneAtStep: 'harvest_explained' },
  { label: 'Learn about harvesting meat', doneAtStep: 'complete'          },
]

export function getChickenMilestoneStatus(m: AnimalMilestone<ChickenTutorialStep>): 'done' | 'current' | 'todo' {
  const cur    = CHICKEN_STEP_ORDER.indexOf(animalTutorialState.chickenStep)
  const doneAt = CHICKEN_STEP_ORDER.indexOf(m.doneAtStep)
  if (cur >= doneAt) return 'done'
  const firstPending = CHICKEN_MILESTONES.find((x) => CHICKEN_STEP_ORDER.indexOf(x.doneAtStep) > cur)
  return firstPending === m ? 'current' : 'todo'
}

export function getPigMilestoneStatus(m: AnimalMilestone<PigTutorialStep>): 'done' | 'current' | 'todo' {
  const cur    = PIG_STEP_ORDER.indexOf(animalTutorialState.pigStep)
  const doneAt = PIG_STEP_ORDER.indexOf(m.doneAtStep)
  if (cur >= doneAt) return 'done'
  const firstPending = PIG_MILESTONES.find((x) => PIG_STEP_ORDER.indexOf(x.doneAtStep) > cur)
  return firstPending === m ? 'current' : 'todo'
}
