export type TutorialStep =
  | 'welcome'        // Mayor greets, gives 15 coins
  | 'buy_seeds'      // Must buy 5 onion seeds (accumulator)
  | 'plant_first'    // Mayor walks to soil; plant 1 seed (only 1 soil unlocked)
  | 'plant_vfx'      // Seed planting VFX playing; waits for isPlanting=false then shows watering dialog
  | 'water_first'    // Water the planted seed
  | 'water_vfx'      // Watering VFX playing; waits for isWatering=false then shows wait/grow dialog
  | 'wait_grow'      // Explains waiting; unlocks 2 more soils; polls for isReady
  | 'harvest_first'  // First onion ready; Mayor walks back to soil
  | 'harvest_more'   // Harvest 3 more onions (accumulator)
  | 'open_quests'    // Player opens quests panel (detected by watcher)
  | 'close_quests'   // Player closes quests panel (detected by watcher)
  | 'talk_mayor'     // Player clicks Mayor to receive sell quest
  | 'sell_quest'     // Complete "Sell 5 crops" quest
  | 'complete'

export type TutorialActionType = 'buy_seeds' | 'plant' | 'water' | 'harvest' | 'sell'

export const tutorialState = {
  active:            false,   // set to true by saveService after load (first-time players only)
  step:              'welcome' as TutorialStep,
  seedsBought:       0,    // accumulator for buy_seeds (target: 5)
  harvestMoreCount:  0,    // accumulator for harvest_more (target: 3)
}

// ---------------------------------------------------------------------------
// Nav highlight — set during open_quests step to dim other buttons
// ---------------------------------------------------------------------------
export const tutorialNavState = {
  highlightQuests: false,
}

// ---------------------------------------------------------------------------
// Tutorial milestone checklist — shown in the quest panel
// ---------------------------------------------------------------------------

/** Ordered list of steps used to compute milestone progress. */
const STEP_ORDER: TutorialStep[] = [
  'welcome', 'buy_seeds', 'plant_first', 'plant_vfx', 'water_first', 'water_vfx',
  'wait_grow', 'harvest_first', 'harvest_more', 'open_quests', 'close_quests',
  'talk_mayor', 'sell_quest', 'complete',
]

export type TutorialMilestone = { label: string; doneAt: TutorialStep }

export const TUTORIAL_MILESTONES: TutorialMilestone[] = [
  { label: 'Buy 5 Onion seeds',          doneAt: 'plant_first'  },
  { label: 'Plant your first seed',       doneAt: 'water_first'  },
  { label: 'Water your crop',             doneAt: 'wait_grow'    },
  { label: 'Harvest your first crop',     doneAt: 'harvest_more' },
  { label: 'Harvest 3 more crops',        doneAt: 'open_quests'  },
  { label: 'Open the Quests panel',       doneAt: 'talk_mayor'   },
  { label: 'Talk to Mayor Chen',          doneAt: 'sell_quest'   },
  { label: 'Sell 5 crops at the truck',   doneAt: 'complete'     },
]

/** Returns 'done' | 'current' | 'todo' for a milestone relative to the current step. */
export function getTutorialMilestoneStatus(m: TutorialMilestone): 'done' | 'current' | 'todo' {
  if (!tutorialState.active) return 'done'
  const cur    = STEP_ORDER.indexOf(tutorialState.step)
  const doneAt = STEP_ORDER.indexOf(m.doneAt)
  if (cur >= doneAt) return 'done'
  // 'current' = this is the first non-done milestone
  const firstPending = TUTORIAL_MILESTONES.find(
    (x) => STEP_ORDER.indexOf(x.doneAt) > cur
  )
  return firstPending === m ? 'current' : 'todo'
}

// ---------------------------------------------------------------------------
// Callbacks — set from index.ts after all modules are imported.
// This breaks circular dependencies:
//   tutorialSystem → interactionSetup → actions → tutorialSystem
// ---------------------------------------------------------------------------

// Entity is a number alias in DCL; typed as unknown to avoid importing ecs here
type AnyEntity = number

export const tutorialCallbacks = {
  unlockSoilsPhase1:    () => {},                          // unlock plots 1-2 (3 total)
  unlockSoilsPhase2:    () => {},                          // unlock plots 3-5 (6 total)
  unlockSoilsAll6:      () => {},                          // all 6 plots at once (skip path)
  getFirstSoilEntity:   (): AnyEntity | null => null,      // returns soilEntities[0]
  getComputerEntity:    (): AnyEntity | null => null,      // returns the shop Computer entity
  getTruckEntity:       (): AnyEntity | null => null,      // returns the sell Truck entity
  getMayorEntity:       (): AnyEntity | null => null,      // returns the Mayor NPC entity
}
