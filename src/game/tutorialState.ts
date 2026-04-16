export type TutorialStep =
  | 'welcome'        // Mayor greets, gives 15 coins
  | 'buy_seeds'      // Must buy 5 onion seeds (accumulator)
  | 'plant_first'    // Mayor walks to soil; plant 1 seed (only 1 soil unlocked)
  | 'water_first'    // Water the planted seed
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
// Soil unlock callbacks — set from index.ts after both modules are imported.
// This breaks the circular dependency:
//   tutorialSystem → interactionSetup → actions → tutorialSystem
// ---------------------------------------------------------------------------
export const tutorialCallbacks = {
  unlockSoilsPhase1: () => {},   // unlock plots 1-2 (3 total)
  unlockSoilsPhase2: () => {},   // unlock plots 3-5 (6 total)
  unlockSoilsAll6:   () => {},   // all 6 plots at once (skip path)
}
