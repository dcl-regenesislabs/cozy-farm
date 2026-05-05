# Crop Progression System

## Overview

Crops are organized into three tiers. Tier 1 is available from the start of the game. Tier 2 and Tier 3 unlock through level milestones — the level reward system delivers starter seeds and the shop gates purchasing until the player's level qualifies.

> **Status (as of 2026-05):** Tier gating is designed but not yet enforced in the shop UI. All crops are currently purchasable regardless of level. Implementing the gate requires adding `unlockedCrops: Set<CropType>` to `playerState` and filtering the shop. This is marked as a TODO.

---

## Crop Table

| Crop | Tier | Grow Time | Waterings | Seed Cost | Sell Price | Yield |
|---|---|---|---|---|---|---|
| Onion | 1 | 2 min | 1 | 3 | 8 | 3–5 |
| Potato | 1 | 3 min | 1 | 5 | 12 | 3–5 |
| Garlic | 1 | 5 min | 1 | 8 | 18 | 2–4 |
| Tomato | 2 | 1 hr | 2 | 15 | 45 | 4–6 |
| Carrot | 2 | 3 hr | 2 | 25 | 80 | 4–6 |
| Corn | 2 | 8 hr | 3 | 50 | 150 | 3–5 |
| Lavender | 3 | 24 hr | 3 | 100 | 300 | 5–8 |
| Pumpkin | 3 | 30 hr | 3 | 150 | 450 | 2–4 |
| Sunflower | 3 | 36 hr | 3 | 180 | 600 | 3–5 |

---

## Unlock Schedule

| Level | Reward | Effect |
|---|---|---|
| 2 | +5 Onion Seeds | — |
| 3 | +5 Potato Seeds | — |
| 5 | +3 Tomato Seeds | Tier 2 unlock gate (shop should allow Tomato purchase) |
| 7 | +3 Carrot Seeds | Shop allows Carrot |
| 10 | +500 Coins | — |
| 12 | +5 Corn Seeds | Shop allows Corn |
| 15 | +3 Lavender Seeds | Tier 3 unlock gate |
| 18 | +1000 Coins | — |

Pumpkin and Sunflower seed rewards / unlock levels are TBD — candidates are level 17 and 19, or via special quest chains.

---

## Design Intent

- **Tier 1** (Onion, Potato, Garlic): quick feedback crops for early sessions; grow in minutes.
- **Tier 2** (Tomato, Carrot, Corn): require multi-session planning; grow in hours. Introduce the second watering requirement.
- **Tier 3** (Lavender, Pumpkin, Sunflower): prestige crops. Grow over full days. High sell price rewards dedicated players.

The level gate means a player cannot meaningfully farm Tier 2 until they've put in enough work to reach level 5, making the unlock feel earned rather than arbitrary.

---

## Implementing the Shop Gate (TODO)

1. Add `unlockedCrops: Set<CropType>` to `playerState` in `gameState.ts`.
2. Tier 1 crops are always in the set (initialized at start).
3. In `levelRewardData.ts`, add a new reward type `'unlock_crop'` alongside `'seeds'` and `'coins'`.
4. The level reward claim flow adds the crop to `unlockedCrops`.
5. In `PlantMenu.tsx` (or wherever seeds are listed), filter out crops not in `unlockedCrops` or display them grayed-out with "Unlock at Level X".
6. `unlockedCrops` should be persisted in the save (as `string[]` of CropType values).

---

## Watering Windows

Window `k` (0-indexed) is open from `k/N * growTimeMs` to `(k+1)/N * growTimeMs` where `N = wateringsRequired`. Missing a window permanently reduces yield (tracked in `PlotState.waterCount`). This is already implemented — no changes needed.

---

## Dev / Testing

The Axe (3 clicks) runs `skipTutorial()` which calls `skipToPostTutorial()` giving 20,000 coins and bypassing all gates. Use this to test higher-tier crops during development. Remove or gate this cheat before production.
