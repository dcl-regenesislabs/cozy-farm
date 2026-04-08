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
  active:            true,
  step:              'welcome' as TutorialStep,
  seedsBought:       0,    // accumulator for buy_seeds (target: 5)
  harvestMoreCount:  0,    // accumulator for harvest_more (target: 3)
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
}
