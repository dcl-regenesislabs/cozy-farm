# Animal Tutorials — Chicken Coop & Pig Pen Onboarding

## Overview

When a player reaches **Level 8** they unlock the Chicken Coop; at **Level 12**, the Pig Pen. Without guidance, players don't know that:
- The building plot is bought **in the world** (clicking the empty plot), not from the shop computer.
- After building the plot, the animals themselves are bought **from the shop computer**.
- Feeding, cleaning, breeding (pigs), and harvesting (pigs) all have specific mechanics.

These two tutorials are guided Mayor Chen flows that teach the full loop for each animal type. They follow the exact same pattern as the fertilizer **Progression Event** (`progressionEventsSystem.ts`).

---

## When They Trigger

Two paths, both routed through `initAnimalTutorialSystem()`:

1. **Level-up trigger** (live) — in `index.ts` inside `onLevelUp`:
   ```typescript
   if (newLevel === 8 && chickenStep === '' && !progressionEventState.active) triggerChickenTutorial(...)
   if (newLevel === 12 && pigStep === ''     && !progressionEventState.active) triggerPigTutorial(...)
   ```
   `progressionEventState.active` is checked so the chicken tutorial cannot fire mid-fertilizer-tutorial.

2. **Startup failsafe** (load-time) — inside `initAnimalTutorialSystem` itself. If the save loads with `playerState.level ≥ 8` but `chickenTutorialStep === ''` (never started), an 8-second timer fires and triggers the chicken tutorial. Same for pigs at level 12. This covers the case where the tutorial code was deployed *after* the player had already reached that level — `onLevelUp` wouldn't fire because the threshold was already crossed.

3. **Resume on load** — if `chickenTutorialStep` is mid-flow (not `''` and not `'complete'`), `initAnimalTutorialSystem` calls `resumeChickenTutorial()` and jumps to the correct step. Same for pigs.

---

## Step Flow

### Chicken Tutorial (Level 8)

| Step | What happens | Arrow target | Watch callback |
|------|--------------|--------------|----------------|
| `buy_coop` | Dialog explains the unlock. Player must buy the plot. | empty coop placeholder (world) | `onCoopPurchased` (fires inside `purchaseBuilding`) |
| `buy_chicken` | Dialog says "go to the shop". | `Computer.glb` | `onFirstChickenBought` (fires inside `buyAnimal` when `chickens.length === 1`) |
| `feed_chicken` | Dialog explains grain → eggs. | coop food bowl | `onCoopFed` (fires inside `depositFoodInBowl`) |
| `clean_intro` | Dialog explains cleaning + dirt cycle. Auto-advance. | none | (button closes) |
| `complete` | Mayor departs. `saveFarm()` fires. | — | — |

### Pig Tutorial (Level 12)

| Step | What happens | Arrow target | Watch callback |
|------|--------------|--------------|----------------|
| `buy_pen` | Dialog explains the unlock. | empty pen placeholder (world) | `onPenPurchased` |
| `buy_pig` | Dialog says "go to the shop". | `Computer.glb` | `onFirstPigBought` |
| `feed_pig` | Dialog explains feed score. | pen food bowl | `onPenFed` |
| `clean_intro` | Cleaning + organic waste + manure cycle. | none | auto |
| `growth_explained` | Piglet → adolescent (24h) → adult (72h). | none | auto |
| `breed_explained` | Two adults can breed for free. | none | auto |
| `harvest_explained` | 7-day adult → ready to harvest. | none | auto |
| `complete` | Mayor departs. `saveFarm()` fires. | — | — |

---

## Architecture

### New Files

- **`src/game/animalTutorialState.ts`** — `ChickenTutorialStep` / `PigTutorialStep` types, the `animalTutorialState` runtime object, the `animalTutorialCallbacks` stub object (broken circular dep), and the milestone arrays + status helpers used by the Quest Log cards.
- **`src/systems/animalTutorialSystem.ts`** — all step transitions, dialog content, arrow wiring, Mayor click handlers, trigger/resume/init entry points.

### Modified Files

- **`src/systems/animalSystem.ts`**
  - Exports `getEmptyCoopEntity()`, `getEmptyPenEntity()`, `getCoopFoodEntity()`, `getPenFoodEntity()` so the tutorial can point arrows at them.
  - Calls `animalTutorialCallbacks.onCoopPurchased()` / `onPenPurchased()` inside `purchaseBuilding()`.
  - Calls `animalTutorialCallbacks.onFirstChickenBought()` / `onFirstPigBought()` inside `buyAnimal()` when the array transitions from 0 → 1.
  - Calls `animalTutorialCallbacks.onCoopFed()` / `onPenFed()` inside `depositFoodInBowl()`.
  - Exports `despawnAllAnimals()` for the bed reset.
- **`src/systems/npcSystem.ts`**
  - Mayor-click router: if `animalTutorialState.chickenActive || pigActive`, route to the animal tutorial Mayor click handler instead of the normal dialog.
  - Quest icon suppression: `hideDuringTutorial` also checks animal tutorial flags so the Mayor's fertilizer `?` icon doesn't reappear during an animal tutorial.
- **`src/index.ts`** — wires `initAnimalTutorialSystem`, sets the Mayor-click handler, registers the level-up triggers, and handles resume-on-load alongside the existing tutorial / progression-event resume branches.
- **`src/ui/QuestPanel.tsx`** — adds `ChickenTutorialQuestCard` and `PigTutorialQuestCard` (mirrors `ProgressionEventQuestCard`).
- **`src/systems/tutorialSystem.ts`** — bed reset (`resetFarm()`) extended to clear animal state and animal tutorial state (see "Bed Reset" below).

### Save Schema (added fields)

Two new strings in the save flow:

```typescript
chickenTutorialStep: string  // '' | 'buy_coop' | 'buy_chicken' | 'feed_chicken' | 'clean_intro' | 'complete'
pigTutorialStep:     string  // '' | 'buy_pen' | 'buy_pig' | 'feed_pig' | 'clean_intro' | 'growth_explained' | 'breed_explained' | 'harvest_explained' | 'complete'
```

Wired through the standard 4-file save pattern:
- `src/shared/farmMessages.ts` — `FarmStateSchema` + `FarmStatePayload`
- `src/server/storage/playerFarm.ts` — `FarmSaveV1`, `emptyFarm`, `normalizeFarm`, `farmSaveToPayload`, server merge in `applyPayload`
- `src/game/gameState.ts` — `playerState`
- `src/services/saveService.ts` — `buildSavePayload` + `applyPayload` (also rehydrates `animalTutorialState.chickenActive/pigActive`)

---

## Mayor Guard (Preventing Duplicate Mayor)

Same logic as the fertilizer event:

```typescript
// triggerChickenTutorial / triggerPigTutorial:
departAllActiveNpcs()              // force-departs whoever is there
initNpcSystem(MAYOR_DEF, onDone)   // then spawn Mayor cleanly
```

`departAllActiveNpcs()` bypasses the quest-active guard by calling `startDeparture()` directly, so it'll evict even a Mayor with a pending fertilizer quest icon.

On a fresh load with an active animal tutorial step, `index.ts` chooses the resume branch instead of `startRegularNpcRotation()` — only one Mayor at a time.

---

## Buy-Confirmation Flow (Build Plot UX)

Originally, clicking the empty coop/pen plot in the world called `purchaseBuilding()` directly, deducting 500 coins instantly with no confirmation. Players reported "I didn't know I was paying!"

The `ChickenCoopPanel` and `PigPenPanel` already render an unowned-state UI: icon, "Cost: 500 coins" label, and a green "Buy for 500 🪙 / Not enough coins" button. The fix was simply to route the world click to that panel instead of buying directly.

**Before:**
```typescript
() => { purchaseBuilding('chicken') }
```

**After:**
```typescript
() => {
  if (playerState.level < CHICKEN_COOP_UNLOCK_LEVEL) return
  playerState.activeMenu = 'chickenCoop'
}
```

The tutorial still advances correctly because `purchaseBuilding()` (now called from the panel's Buy button) is what fires `onCoopPurchased`.

Hover text was updated from "Buy Chicken Coop" to "Build Chicken Coop (500 coins)" so the cost is visible before clicking too.

---

## Tutorial Arrow — Now Boot-Time

Previously, `initTutorialArrow()` was only called inside `initTutorialSystem()` when `tutorialState.active === true`. For players past the welcome tutorial, the compass entity never existed, and `setArrowTarget()` was a silent no-op.

This was a latent bug — the **fertilizer event** also calls `setArrowTarget()` without inits, and only "worked" because the main tutorial usually ran first in the same session. A player who reconnected mid-fertilizer-event would get no arrow.

**Fix:**
- `initTutorialArrow()` is now idempotent (early-returns if `compassRoot` already exists).
- Called unconditionally in `index.ts` on every client boot.
- Any tutorial that calls `setArrowTarget(entity)` Just Works™.

The existing call inside `initTutorialSystem` is now a redundant no-op (safe to keep).

---

## Bed Reset (resetFarm)

The dev shortcut "3 clicks on the Bed" calls `resetFarm()` in `tutorialSystem.ts`. It previously did NOT reset animal state or animal tutorial state. After this branch, it also clears:

- `chickenCoopOwned`, `pigPenOwned`, `chickens[]`, `pigs[]`, food bowls, dirt timers, grain/scraps/eggs/meat counts, `coopDirtAccumMs`, `penDirtAccumMs`, `activeFeedBowl`
- `chickenTutorialStep`, `pigTutorialStep` + `animalTutorialState.*` flags
- `unlockedPlotGroups` (which was also previously not reset)
- Despawns all chicken & pig wanderer entities via `despawnAllAnimals()`
- Calls `updateBuildingVisuals()` to re-show the empty plot placeholders

---

## Server "Once-True" Bug Fix (playerFarm.ts)

This blocked the bed reset from actually working. The server-side merge had:

```typescript
chickenCoopOwned: existing.chickenCoopOwned || (payload.chickenCoopOwned ?? false),
pigPenOwned:      existing.pigPenOwned      || (payload.pigPenOwned ?? false),
```

The `||` semantically meant "once true on the server, it can never go back to false." So after a player owned a coop and the bed reset locally cleared the flag, the next save sent `false`, the server OR-merged with the previous `true`, and the next load re-flagged the coop as owned. Result: the coop appeared "auto-built" at any level.

**Fixed to follow the same `??` pattern as `compostBinUnlocked`:**

```typescript
chickenCoopOwned: payload.chickenCoopOwned ?? existing.chickenCoopOwned,
pigPenOwned:      payload.pigPenOwned      ?? existing.pigPenOwned,
```

Now `false` actually overwrites `true`. Reset works end-to-end.

**Migration note:** any player whose server save was set to `true` before this fix will need one more bed reset after this branch deploys for the server-side `true` to be overwritten with `false`.

---

## Standardization — Open Items (Future Work)

We now have four similar tutorial systems (`tutorialSystem`, `progressionEventsSystem`, `animalTutorialSystem` × 2 flows). They duplicate this pattern:

```
setStep(...)          → arrow target + dialog + watch-callback
on watch fires        → arrow off + advance to next step
on complete           → save + Mayor depart + resume rotation
```

A small shared helper would reduce boilerplate:

```typescript
runTutorialStep({
  setStep:        (s) => setChickenStep(s),
  stepId:         'buy_coop',
  arrowTarget:    () => getEmptyCoopEntity(),
  dialog:         { text, buttonLabel },
  watch:          (cb) => { animalTutorialCallbacks.onCoopPurchased = cb },
  next:           goToChickenBuyChicken,
})
```

Not refactored in this branch — flagged as a follow-up.
