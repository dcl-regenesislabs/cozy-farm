# Leveling System

## Overview

Players earn Experience Points (XP) through farming actions and completing quests. XP accumulates into **Levels** (1–20) that unlock new features, seeds, and expansions — preventing the player from accessing all content on day one.

---

## XP Sources

| Action | XP Gained | Notes |
|--------|-----------|-------|
| Plant a seed | +5 | Any crop type |
| Water a crop | +3 | Per watering event |
| Harvest Tier 1 crop | +10 | Onion, Potato, Garlic |
| Harvest Tier 2 crop | +20 | Tomato, Carrot, Corn |
| Harvest Tier 3 crop | +35 | Lavender, Pumpkin, Sunflower |
| Complete a regular quest | +50 | Rosa, Dave quests |
| Complete a gate quest | +100 | Marco, Mayor Chen quests |
| Complete a retribution quest | +75 | Gerald quests |

---

## Level Table

| Level | XP Required (cumulative) | Unlock |
|-------|--------------------------|--------|
| 1 | 0 | Starting level |
| 2 | 100 | Access to Shop |
| 3 | 250 | Potato seeds available |
| 4 | 500 | Garlic seeds available |
| 5 | 900 | NPC quests unlocked |
| 6 | 1,400 | Expansion 1 available |
| 7 | 2,100 | Tomato seeds available |
| 8 | 3,000 | Carrot seeds available |
| 9 | 4,200 | Worker system available |
| 10 | 5,700 | Corn seeds available |
| 11 | 7,500 | Expansion 2 available |
| 12 | 9,600 | Fertilizer system available |
| 13 | 12,000 | Sunflower seeds available |
| 14 | 14,800 | Beauty system unlocked |
| 15 | 18,000 | Expansion 3 available |
| 16 | 21,600 | Lavender seeds available |
| 17 | 25,500 | Pumpkin seeds available |
| 18 | 30,000 | Expansion 4 available |
| 19 | 35,000 | Mayor Chen quests unlocked |
| 20 | 41,000 | Max level — all features open |

---

## Level-Up Events

When a player levels up:
1. A level-up VFX plays (TBD — sparkle / fanfare)
2. A notification appears on the HUD: `"Level Up! You are now level X"`
3. Any feature unlocked at that level becomes available
4. `onLevelUp` callbacks fire so other systems can react

---

## Implementation Notes

- XP and level are stored in `playerState` (`src/game/gameState.ts`)
- `addXp(amount)` is the single entry point — handles threshold checks and fires `onLevelUp`
- Level gates are checked via `getLevel()` wherever features need to be conditionally available
- XP is **not** lost on level-up; the table uses **cumulative** totals
- Future: persist XP/level via signed fetch to a player profile service

---

## Integration Points

- **Farming actions** (`src/game/actions.ts`): `plantCrop`, `waterCrop`, `harvestCrop` call `addXp`
- **Quest system** (`src/systems/questSystem.ts`, future): quest completion calls `addXp`
- **HUD** (`src/ui/Hud.tsx`): display current level and XP bar (future)
- **Feature gates**: Shop, NPC system, Expansions check `getLevel()` before enabling
