# CozyFarm — Team Tasks & Open Work

Central hub for open tasks, design specs, and context for new contributors. Start here before picking up any feature.

---

## How to Use This Doc

- Pick a task from the lists below.
- Read the linked dev-doc for full context before writing any code.
- Follow the patterns in `CLAUDE.md` for save fields, circular deps, and UI panels.
- Mark the task done here when you open a PR.

---

## Architecture Quick Reference

| What | Where |
|---|---|
| Entry point (client + server) | `src/index.ts` |
| All game state | `src/game/gameState.ts` — `playerState` object |
| Save / load flow | `src/services/saveService.ts` + `src/server/storage/playerFarm.ts` |
| Farming actions | `src/game/actions.ts` |
| Scene wiring (clicks, soils, signs) | `src/systems/interactionSetup.ts` |
| Plot group definitions | `src/data/plotGroupData.ts` |
| Crop definitions | `src/data/cropData.ts` |
| Quest definitions | `src/data/questData.ts` |
| Level rewards | `src/data/levelRewardData.ts` |
| NPC behavior | `src/systems/npcSystem.ts` |
| UI root | `src/ui.tsx` |

See `CLAUDE.md` for the full architecture overview and save-field checklist.

---

## Open Tasks

### 🔴 High Priority

#### 1. Quest Prerequisites (fix impossible quests)
**Doc:** `dev-docs/quest-system.md`

Lily offers a Tomato quest before players can grow Tomatoes. Gerald's Water quest can appear very early.

**What to do:**
1. Add optional `prerequisite?: { minLevel?: number }` field to `QuestDefinition` in `questData.ts`.
2. In `getActiveQuestForNpc()` (`questState.ts`), skip quests where the prerequisite is unmet.
3. In the NPC scheduler (`index.ts` or `npcSystem.ts`), skip NPCs whose only quest is blocked by prerequisites.
4. Update Lily's quest definition: `prerequisite: { minLevel: 5 }`.

---

### 🟡 Medium Priority

#### 3. Expand Quest Chains (more quests per NPC)
**Doc:** `dev-docs/quest-system.md` → "Suggested Additional Quests" table

Each NPC currently has 1 quest (Mayor Chen has 2). Once all are done, NPCs only give greetings.

**What to do:**
- Add 2–3 more quest entries per NPC in `questData.ts` using the same `npcId` as the first quest.
- No code changes needed — `getActiveQuestForNpc` already chains sequentially.
- Suggested quest list is in `quest-system.md`.

---

#### 4. PlotGroup_Farmer unlock via quest (replace 10k coins)
**Doc:** `dev-docs/land-expansions.md`

Currently the Farmer upgrade costs 10,000 coins (`UnlockMenu.tsx`). The scene now has `PlotGroup_Farmer` as a group. The farmer plot area should unlock through a proper quest chain instead.

**What to do:**
1. Design the gate quest (e.g. "Sell 50 crops total" — Mayor Chen quest chain final step).
2. In the quest claim callback (`setOnQuestClaimed`), call `unlockPlotGroupByName('PlotGroup_Farmer')`.
3. Wire the callback in `index.ts`.
4. The farmer hire itself (10k coins, `UnlockMenu`) can remain as-is for now — it's separate from the plot unlock.

---

#### 5. NPC Visit Schedule improvement
**Doc:** `dev-docs/quest-system.md` → "Problem 3"

The 5-minute fixed timer fires regardless of whether the NPC has a quest the player can complete.

**What to do:**
- Before scheduling the next NPC visit, check if the candidate NPC's quest has met prerequisites.
- If no valid NPC is available, skip the visit and retry at next interval.
- Constant to adjust: look for `VISIT_INTERVAL` or similar in `src/index.ts`.

---

### 🟢 New Feature — Animals (Chickens & Pigs)
**Doc:** `dev-docs/animal-system.md`

Full design spec is ready. Scene already has `ChickenCoop.glb` and `PigPen.glb` placed.

**Phase 1 — Chickens:**
1. Add `animals: AnimalSaveEntry[]` to save schema (4-file pattern — see CLAUDE.md).
2. Create `src/systems/animalSystem.ts` — wander animation, collection timer, offline catch-up.
3. Wire `ChickenCoop.glb` click → new `src/ui/AnimalPanel.tsx`.
4. Add Egg item: sell at truck (new entry in sell menu).
5. Add Grain: purchasable in shop.
6. Unlock gate: Level 8 (hook into `onLevelUp` in `levelingSystem.ts`).

**Phase 2 — Pigs + Manure loop:**
7. Extend `animalSystem.ts` for pig type.
8. Add Manure as Compost Bin input → produces organic fertilizer.
9. Add Vegetable Scraps auto-generation in `actions.ts` harvest flow (30% chance per harvest).

See `animal-system.md` for the full save schema, UI design, and wander point naming conventions.

---

### 🔵 Polish / Nice-to-Have

#### Level-up HUD notification
When `onLevelUp` fires, show a temporary HUD banner "Level Up! Now Level X". Hook into `onLevelUp` callback in `levelingSystem.ts`. Display via a timed toast in `TopHud.tsx` or a new overlay component.

#### Crop unlock notification
When a new crop tier unlocks (from level reward), show a "New crop unlocked!" toast so players know to check the shop.

#### More ForSaleSign hover detail
Currently the hover text is "Unlock 3 Plots — 500 coins". Could show a richer tooltip panel on approach (like quest icons show `!` bubbles). Low priority.

---

## Completed (recently)

- ✅ **Crop tier gate** — `unlockedCrops: Set<CropType>` in playerState; tier 2/3 crops gated in `ShopMenu.tsx` and `PlantMenu.tsx`; persisted via 4-file save pattern; old saves migrate via `deriveUnlockedCrops()` in `playerFarm.ts`
- ✅ **Pumpkin + Sunflower unlock levels** — Pumpkin at level 20, Sunflower at level 25; both get +3 seed rewards same as other crops
- ✅ **Endless leveling (level 100)** — XP table extended to 100; levels 1–20 unchanged, 21–100 generated at ~5% cost growth; `buildXpTable()` in `src/shared/leveling.ts`
- ✅ **Rewards tab redesign** — three tier sections (Starter / Advanced / Prestige) with reveal mechanic (each tier visible once player is within 3 levels of its first reward); rows show unlock sub-label for shop crops
- ✅ Plot group system wired — `PlotGroup_Starter` through `PlotGroup_Buy_J`, ForSaleSign_A–J, level auto-unlocks
- ✅ Save field `unlockedPlotGroups` added (client + server)
- ✅ Soil scan extended to 84 entities
- ✅ `PlotGroupUnlockMenu.tsx` — generic purchase UI with level gate enforcement
- ✅ Dev-docs written: `land-expansions.md`, `crop-progression.md`, `quest-system.md`, `leveling-system.md`, `animal-system.md`
- ✅ Fertilizer system + compost tutorial quest
- ✅ Beauty score + leaderboard
- ✅ Social system (farm visits, watering, likes, mailbox)
- ✅ Worker / farmer system

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| Plot groups use `Transform.parent` to find child soils | Avoids hardcoded index ranges; adding a new group = one row in `plotGroupData.ts` |
| Level-gated groups NOT stored in `unlockedPlotGroups` | Re-derived from level on load — no staleness risk |
| Purchased groups merged server-side (union, never reverted) | Prevents accidental unlock loss from client bugs |
| Quest prereqs filter at NPC scheduling time | Players shouldn't see quests they can't complete |
| Animals use offline catch-up (same pattern as compost bin) | Sessions are short; players need to be rewarded for time away |
