# Leveling System

## Overview

Players earn Experience Points (XP) through farming actions and completing quests. XP accumulates into **Levels** (1–20) that unlock new features, plot groups, and crop tiers.

---

## XP Sources

| Action | XP | Notes |
|---|---|---|
| Plant a seed | +5 | Any crop type |
| Water a crop | +3 | Per watering event |
| Harvest Tier 1 crop | +10 | Onion, Potato, Garlic |
| Harvest Tier 2 crop | +20 | Tomato, Carrot, Corn |
| Harvest Tier 3 crop | +35 | Lavender, Pumpkin, Sunflower |
| Complete a regular quest | +50 | Rosa, Dave quests |
| Complete a retribution quest | +75 | Gerald quests |
| Complete a gate quest | +100 | Marco, Mayor Chen quests |

---

## Level Table

| Level | XP (cumulative) | Plot Groups Auto-Unlocked | Level Reward |
|---|---|---|---|
| 1 | 0 | PlotGroup_Starter, PlotGroup_TutorialA | — |
| 2 | 100 | — | +5 Onion Seeds |
| 3 | 250 | — | +5 Potato Seeds |
| 4 | 500 | — | — |
| 5 | 900 | **PlotGroup_Level_5** | +3 Tomato Seeds |
| 6 | 1,400 | — | — |
| 7 | 2,100 | — | +3 Carrot Seeds |
| 8 | 3,000 | — | — |
| 9 | 4,200 | — | — |
| 10 | 5,700 | **PlotGroup_Level_10** | +500 Coins |
| 11 | 7,500 | — | — |
| 12 | 9,600 | — | +5 Corn Seeds |
| 13 | 12,000 | — | — |
| 14 | 14,800 | — | — |
| 15 | 18,000 | **PlotGroup_Level_15** | +3 Lavender Seeds |
| 16 | 21,600 | — | — |
| 17 | 25,500 | — | — |
| 18 | 30,000 | — | +1000 Coins |
| 19 | 35,000 | — | — |
| 20 | 41,000 | **PlotGroup_Level_20** | — |

Level rewards are claimed manually from the Farmer Profile panel. Plot groups auto-unlock instantly on level-up — no manual claim needed.

Note: PlotGroup_Buy_C/D require Level 5, E/F require Level 10, G/H require Level 15, I/J require Level 20. These are **not** auto-unlocked — they still require a coin purchase. The level just removes the lock on the ForSaleSign.

---

## How Level-Based Plot Unlocks Work

When `addXp()` triggers a level-up:
1. `checkLevelGroupUnlocks(newLevel, unlockedPlotGroups)` is called in `levelingSystem.ts`.
2. It iterates `LEVEL_PLOT_GROUPS` from `plotGroupData.ts` and calls `unlockPlotGroupByName()` for any group whose `requiredLevel <= newLevel`.
3. Level-gated groups are NOT stored in `unlockedPlotGroups` (they are re-derived from level on every load).

On save load, `applyPayload()` in `saveService.ts` calls `checkLevelGroupUnlocks(payload.level, ...)` to restore level-gated groups without relying on saved state.

---

## Level-Up Events

When a player levels up:
1. `onLevelUp` callbacks fire — all registered systems react.
2. Level-gated plot groups auto-unlock visually.
3. HUD notification: "Level Up! You are now Level X" (TODO: implement).
4. Level reward becomes claimable in the Farmer Profile panel.

---

## Implementation Notes

- `addXp(amount)` in `src/systems/levelingSystem.ts` is the single entry point.
- Level gates for purchasable plot groups are enforced in `PlotGroupUnlockMenu.tsx` — buy button is disabled if `playerState.level < def.requiredLevel`.
- Crop tier gates (TODO) will be enforced in `PlantMenu.tsx` / `ShopMenu.tsx`.
- XP is cumulative — the table uses total XP thresholds, not deltas.
- Max level is determined by `XP_TABLE.length` in `src/shared/leveling.ts`.

---

## Integration Points

- `src/game/actions.ts` — `plantCrop`, `waterCrop`, `harvestCrop` call `addXp`
- `src/game/questState.ts` — `claimQuestReward` calls `addXp`
- `src/systems/levelingSystem.ts` — `addXp`, `onLevelUp`, `getLevel`, `getXpProgress`
- `src/systems/interactionSetup.ts` — `checkLevelGroupUnlocks` wired from level-up
- `src/data/levelRewardData.ts` — reward definitions
- `src/ui/ProfileMenu.tsx` — reward claim UI
