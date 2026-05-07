# Crop Progression System

## Overview

Crops are organized into three tiers. Tier 1 is available from the start of the game. Tier 2 and Tier 3 unlock through level milestones — the level reward system delivers starter seeds and simultaneously unlocks purchasing in the shop.

> **Status (as of 2026-05):** Tier gating is fully implemented. Claiming a tier 2/3 seeds reward adds the crop to `playerState.unlockedCrops`, which gates both `ShopMenu.tsx` (buy) and `PlantMenu.tsx` (plant). Existing saves are migrated automatically via `normalizeFarm()` in `playerFarm.ts`.

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
| 5 | +3 Tomato Seeds | Unlocks Tomato in shop |
| 7 | +3 Carrot Seeds | Unlocks Carrot in shop |
| 10 | +500 Coins | — |
| 12 | +5 Corn Seeds | Unlocks Corn in shop |
| 15 | +3 Lavender Seeds | Unlocks Lavender in shop (Tier 3 gate) |
| 18 | +1000 Coins | — |
| 20 | +3 Pumpkin Seeds | Unlocks Pumpkin in shop |
| 25 | +3 Sunflower Seeds | Unlocks Sunflower in shop |

---

## Design Intent

- **Tier 1** (Onion, Potato, Garlic): quick feedback crops for early sessions; grow in minutes.
- **Tier 2** (Tomato, Carrot, Corn): require multi-session planning; grow in hours. Introduce the second watering requirement.
- **Tier 3** (Lavender, Pumpkin, Sunflower): prestige crops. Grow over full days. High sell price rewards dedicated players.

The level gate means a player cannot meaningfully farm Tier 2 until they've put in enough work to reach level 5, making the unlock feel earned rather than arbitrary.

---

## How the Shop Gate Works

`playerState.unlockedCrops` is a `Set<CropType>` that drives all gating. Tier 1 crops are always in the set. Tier 2/3 crops are added when their level reward is claimed.

**Claim flow** (`src/ui/StatsPanel.tsx` → `claimReward()`):
- When a `seeds` reward for a tier 2/3 crop is claimed, the crop is added to `unlockedCrops` in addition to the seeds being granted.
- The `'unlock_crop'` reward type also exists for future standalone unlock entries.

**Shop gate** (`src/ui/ShopMenu.tsx`): locked cards show "Unlock at Level X" sourced from `LEVEL_REWARDS`.

**Plant gate** (`src/ui/PlantMenu.tsx`): seeds for locked crops are hidden even if the player has them in inventory.

**Persistence**: `unlockedCrops` is saved as `number[]` through the standard 4-file pattern. On load, `normalizeFarm()` in `playerFarm.ts` calls `deriveUnlockedCrops()` which merges the saved array with unlocks implied by `claimedRewards` — so old saves migrate correctly without wiping data.

---

## Watering Windows

Window `k` (0-indexed) is open from `k/N * growTimeMs` to `(k+1)/N * growTimeMs` where `N = wateringsRequired`. Missing a window permanently reduces yield (tracked in `PlotState.waterCount`). This is already implemented — no changes needed.

---

## Dev / Testing

The Axe (3 clicks) runs `skipTutorial()` which calls `skipToPostTutorial()` giving 20,000 coins and bypassing all gates. Use this to test higher-tier crops during development. Remove or gate this cheat before production.
