# Land Expansions & Plot Groups

## Overview

The farm grows outward through a structured system of plot groups. Each group is a named parent entity in the scene (e.g. `PlotGroup_Buy_A`). All soil plots are children of their group. Code uses `Transform.parent` to identify which group a soil belongs to — no hardcoded index ranges.

---

## Scene Structure

Every group is a named empty entity in Creator Hub. Soil plots (`Soil01.glb`, `Soil01.glb_2` … `Soil01.glb_84`) are parented to their group. The code scans entity names up to index 84 on startup.

Signs (`ForSaleSign_A` through `ForSaleSign_J`) are children of the `UnlockSaleSigns` parent. Each sign wires to the matching `PlotGroup_Buy_*`.

---

## Group Table

| Group Name | Type | Req. Level | Cost | Sign | Notes |
|---|---|---|---|---|---|
| `PlotGroup_Starter` | starter | — | free | — | Always on; managed by tutorial |
| `PlotGroup_TutorialA` | tutorial | — | free | — | Unlocked during tutorial phases |
| `PlotGroup_Level_5` | level | 5 | free | — | Auto-unlocks on level-up |
| `PlotGroup_Level_10` | level | 10 | free | — | Auto-unlocks on level-up |
| `PlotGroup_Level_15` | level | 15 | free | — | Auto-unlocks on level-up |
| `PlotGroup_Level_20` | level | 20 | free | — | Auto-unlocks on level-up |
| `PlotGroup_Buy_A` | buy | none | 500 | `ForSaleSign_A` | Available post-tutorial |
| `PlotGroup_Buy_B` | buy | none | 500 | `ForSaleSign_B` | Available post-tutorial |
| `PlotGroup_Buy_C` | buy_with_level | 5 | 500 | `ForSaleSign_C` | |
| `PlotGroup_Buy_D` | buy_with_level | 5 | 500 | `ForSaleSign_D` | |
| `PlotGroup_Buy_E` | buy_with_level | 10 | 1000 | `ForSaleSign_E` | |
| `PlotGroup_Buy_F` | buy_with_level | 10 | 1000 | `ForSaleSign_F` | |
| `PlotGroup_Buy_G` | buy_with_level | 15 | 1500 | `ForSaleSign_G` | |
| `PlotGroup_Buy_H` | buy_with_level | 15 | 1500 | `ForSaleSign_H` | |
| `PlotGroup_Buy_I` | buy_with_level | 20 | 2000 | `ForSaleSign_I` | |
| `PlotGroup_Buy_J` | buy_with_level | 20 | 2000 | `ForSaleSign_J` | |
| `PlotGroup_Farmer` | quest | — | — | — | Unlocked via quest (TBD) |

---

## Code Architecture

### Data definition
`src/data/plotGroupData.ts` — exports `PLOT_GROUP_DEFINITIONS`, `BUY_PLOT_GROUPS`, `LEVEL_PLOT_GROUPS`, and `getPlotGroupDef(name)`.

### Runtime functions (all in `src/systems/interactionSetup.ts`)

| Function | Description |
|---|---|
| `wireAllPlotGroupSigns()` | Called once from `setupEntities()`. Wires `ForSaleSign_A–J` to open `plotGroupUnlock` menu. |
| `unlockPlotGroupByName(groupName)` | Finds all soils parented to that group, sets `isUnlocked = true`, swaps to opaque model. |
| `hidePlotGroupSign(groupName)` | Hides the ForSaleSign for a group after purchase or restore. |
| `checkLevelGroupUnlocks(level, unlockedGroups)` | Called on level-up and on save load. Auto-unlocks any level-gated group whose threshold is met. |

### UI
Clicking a ForSaleSign sets `playerState.activePlotGroupName` and opens `'plotGroupUnlock'` menu → renders `PlotGroupUnlockMenu.tsx`. The menu reads the group definition to show cost and level requirement, and calls `unlockPlotGroupByName` + `hidePlotGroupSign` on confirm.

---

## Save / Persistence

`unlockedPlotGroups: string[]` is stored in the player save (server + client). It contains only **purchased** groups — level-gated groups are not stored here (they're re-derived from the player's level on every load).

**Migration from old saves:** if `expansion1Unlocked = true`, `PlotGroup_Buy_A` is automatically added to `unlockedPlotGroups` on load. Same for `expansion2Unlocked → PlotGroup_Buy_B`. The `expansion1Unlocked` and `expansion2Unlocked` booleans are kept in the schema for backward compatibility but are no longer the source of truth.

Server: on save, `unlockedPlotGroups` is merged (union) with what the server already has — purchased unlocks are never reverted.

---

## Adding a New Plot Group

1. Place the group entity in Creator Hub and parent soil plots under it.
2. If it needs a ForSaleSign, place and name it `ForSaleSign_X`, parent it under `UnlockSaleSigns`.
3. Add an entry to `PLOT_GROUP_DEFINITIONS` in `src/data/plotGroupData.ts`.
4. That's it — the sign wiring, unlock logic, save/restore, and UI are all driven by the definition table.

---

## Visual Design Notes

- Locked soils use the transparent model (`Soil01Trasnparent.glb`) and are non-interactive until unlocked.
- All groups are **always visible** in the scene — locked areas use transparent soils so players can see what they'll gain.
- ForSaleSign hover text shows the cost and level requirement automatically.
- After purchase the sign scale is set to `(0,0,0)` — it disappears without being removed from ECS.
