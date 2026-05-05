# Quest System

## Overview

NPCs visit the player's farm on a schedule and offer quests. Each NPC has one or more quests that chain sequentially — when all are complete, the NPC shows a generic greeting. Quest progress persists across sessions.

---

## Current Quest Roster

| ID | NPC | Title | Type | Crop | Target | Reward |
|---|---|---|---|---|---|---|
| `rosa` | Rosa | Harvest 5 Onions | harvest_crop | Onion | 5 | 50 coins + 50 XP |
| `gerald` | Gerald | Water crops 10 times | water_total | — | 10 | 40 coins + 50 XP |
| `marco` | Marco | Harvest 10 crops total | harvest_total | — | 10 | 75 coins + 75 XP |
| `lily` | Lily | Harvest 3 Tomatoes | harvest_crop | Tomato | 3 | 100 coins + 75 XP |
| `dave` | Dave | Plant 8 seeds | plant_total | — | 8 | 60 coins + 50 XP |
| `mayorchen` | Mayor Chen | Sell 5 crops | sell_total | — | 5 | 200 coins + 100 XP |
| `mayorchen_fertilizer` | Mayor Chen | Generate 5 Fertilizers | collect_fertilizer | — | 5 | 150 coins + 100 XP |

`mayorchen_fertilizer` is hidden until `rotSystemUnlocked = true` (Level 5 progression event).

---

## Quest Lifecycle

```
available  →  (player accepts)  →  active
active     →  (target reached)  →  claimable
claimable  →  (player claims)   →  completed
```

Quest progress is tracked in `questProgressMap` (in `questState.ts`) and saved to the server via `questProgress[]` in the payload.

---

## NPC Visit Schedule

NPCs visit on a timer (`lastNpcVisitAt` + interval). The scheduler cycles through `REGULAR_NPC_ROSTER` using `npcScheduleIndex`. After the tutorial, NPCs appear every 5 minutes (configurable constant in `npcSystem.ts`).

### Known Issues / Planned Improvements

**Problem 1 — Impossible quests:** Lily's Tomato quest can be offered before the player has unlocked Tier 2 crops, making it impossible to complete.

**Fix (TODO):** Add a `prerequisite` field to `QuestDefinition`:
```ts
prerequisite?: { minLevel?: number; cropUnlocked?: CropType }
```
The NPC scheduler skips any NPC whose active quest has an unmet prerequisite. Lily only visits after level 5 (Tomato unlock).

**Problem 2 — Quests run out:** Once all quests are `completed`, NPCs show their greeting indefinitely.

**Fix (TODO):** Add multiple quests per NPC (quest chains). `getActiveQuestForNpc` already picks the best-priority quest, so adding more entries with the same `npcId` automatically chains them.

**Problem 3 — Fixed 5-minute timer ignores player state.**

**Fix (TODO):** Before spawning the next NPC, check if any NPC has a completable quest. If not, skip the visit and retry at next interval. Optionally: trigger a visit on significant player actions (first harvest of a new crop type, reaching a new level) instead of purely on a timer.

---

## Adding More Quests

All quest data lives in `src/data/questData.ts`. Each entry needs:

```ts
{
  id: 'unique_id',
  npcId: 'npc_id',        // optional; defaults to id
  npcName: 'Display Name',
  title: 'Short title',
  description: 'NPC dialog text',
  type: 'harvest_crop' | 'harvest_total' | 'water_total' | 'plant_total' | 'sell_total' | 'collect_fertilizer',
  cropType: CropType | null,
  target: number,
  rewardCoins: number,
  rewardXp: number,
  requiresRotSystem?: boolean,    // existing gate flag
  prerequisite?: { ... },         // TODO: add this field
}
```

Adding more quests for existing NPCs requires no code changes — just add the definition.

### Suggested Additional Quests per NPC

| NPC | Quest 2 | Quest 3 | Quest 4 |
|---|---|---|---|
| Rosa | Harvest 15 Onions | Harvest 10 Potatoes | Plant 20 seeds |
| Gerald | Water 30 times | Water 60 times | Use 5 fertilizers |
| Marco | Harvest 30 total | Harvest 10 Tier 2 | Harvest 5 Lavender |
| Lily | Harvest 8 Tomatoes | Harvest 5 Carrots | Earn 500 coins |
| Dave | Plant 20 seeds | Plant 5 Tier 2 | Plant 50 total |
| Mayor Chen | Sell 20 crops | Earn 2000 coins | Harvest 100 total |

### Planned Quest Types to Add

- `earn_coins` — earn X coins total
- `reach_level` — reach level X (narrative gate quest)
- `use_fertilizer` — apply N fertilizers on crops

---

## Quest Types Reference

| Type | Tracked by | Hook |
|---|---|---|
| `harvest_crop` | `onHarvestCrop(cropType, amount)` | after harvest in `actions.ts` |
| `harvest_total` | `onHarvestCrop(cropType, amount)` | same hook |
| `water_total` | `onWater()` | after water in `actions.ts` |
| `plant_total` | `onPlant()` | after plant in `actions.ts` |
| `sell_total` | `onSell(amount)` | after sell in `actions.ts` |
| `collect_fertilizer` | `onCollectFertilizer(amount)` | after compost collection |

---

## Progression Gate Quests

Some future quests should gate significant unlock events. Pattern:

1. Define a quest with a unique id.
2. In `questState.ts`, export a callback setter: `setOnQuestClaimed(cb)`.
3. Wire the callback in `index.ts` to fire the unlock (plot group, crop tier, etc.).
4. Mark the quest with `requiresXxx: true` so it only appears at the right time.

Mayor Chen's fertilizer quest (`mayorchen_fertilizer`) is an existing example of this pattern.
