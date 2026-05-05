# Animal System

> **Status:** Design spec — not yet implemented. Scene already has `ChickenCoop.glb` and `PigPen.glb` placed. No code exists yet.

---

## Overview

Animals are a mid-to-late-game addition that give players a passive income loop alongside active crop farming. The core mechanic: players house animals, feed them daily, and collect produce (eggs, truffles, manure) on a timer. Animals do not require real-time attention — they're designed for players who log in once or twice a day.

---

## Animal Types (Phase 1)

### Chickens

| Property | Value |
|---|---|
| Housing | Chicken Coop (`ChickenCoop.glb`) |
| Capacity | 4 chickens per coop (TBD) |
| Produce | Eggs |
| Collection interval | Every 24h |
| Feed | Grain (sold in shop, or crafted from crops) |
| Starve mechanic | No eggs if unfed for 48h |
| Sell value | ~20 coins per egg (TBD) |

**Unlock:** TBD — candidate is Level 8 or a specific quest chain from an NPC (e.g. Rosa gives a hen as a gift after her quest chain completes).

### Pigs

| Property | Value |
|---|---|
| Housing | Pig Pen (`PigPen.glb`) |
| Capacity | 2 pigs per pen (TBD) |
| Produce | Truffles (rare, high value) + Manure |
| Collection interval | Every 48h |
| Feed | Vegetable scraps (auto-generated from harvests, or bought) |
| Starve mechanic | No truffles; manure production pauses |
| Sell value | Truffle ~150 coins, Manure → used as fertilizer |
| Special | Manure can go into Compost Bin to produce organic fertilizer |

**Unlock:** TBD — candidate is Level 12 or completing the Farmer quest chain.

---

## Suggested Unlock Gates

| Animal | Unlock Condition | Rationale |
|---|---|---|
| First Chicken | Level 8 | Early enough to feel rewarding, late enough to matter |
| Second Coop (4 chickens) | Level 12 or 500 coins | Scales production |
| First Pig | Level 12 or Farmer quest | Pigs are more complex — tie to the farmer theme |
| Second Pig Pen | Level 18 or 1500 coins | Late-game investment |

These gates are suggestions — adjust based on economy balance testing.

---

## Feed System

**Grain (for chickens):**
- Purchasable in the Shop (30 coins per bag, feeds 1 chicken for 24h).
- Future: craftable by processing Corn or Wheat (if added).

**Vegetable Scraps (for pigs):**
- Auto-generated: every crop harvest has a 30% chance of producing 1 scrap.
- Purchasable in the Shop as a fallback.
- Stored in the player's inventory alongside seeds.

Feed is consumed once per collection cycle. The system checks at collection time whether enough feed was available since last collection. If not, produce is halved or skipped.

---

## Produce & Economy

| Produce | Source | Use |
|---|---|---|
| Egg | Chicken, every 24h | Sell at truck |
| Truffle | Pig (rare, ~30% chance per cycle) | Sell at truck (high value) |
| Manure | Pig, every cycle | Compost Bin input → organic fertilizer |

The Manure → Compost → Fertilizer loop ties the animal system directly into the existing fertilizer system (`fertilizer-system.md`). This gives pigs a secondary value beyond just selling truffles.

---

## Save / Persistence

New fields needed in `FarmSaveV1` and `FarmStatePayload`:

```ts
animals: AnimalSaveEntry[]

type AnimalSaveEntry = {
  id:            string         // 'chicken_0', 'pig_0', etc.
  type:          'chicken' | 'pig'
  lastFedAt:     number         // timestamp
  lastCollectedAt: number       // timestamp
  feedCount:     number         // bags of feed in reserve
}
```

Add to the four-file pattern (see CLAUDE.md "Adding a New Saved Field"):
1. `farmMessages.ts` — schema + payload type
2. `playerFarm.ts` — FarmSaveV1, emptyFarm, normalizeFarm, farmSaveToPayload, applyPayload
3. `gameState.ts` — playerState
4. `saveService.ts` — buildSavePayload + applyPayload

---

## Offline Progression

Same pattern as the compost bin:
- On load, calculate how many collection cycles completed while offline.
- Award produce for completed cycles (capped at a reasonable max, e.g. 3 days).
- Deduct feed for each cycle.
- If feed ran out mid-offline, award partial produce.

---

## UI

Each animal building (Coop, Pen) is clickable → opens an Animal Panel.

**Animal Panel shows:**
- List of animals with names and status icons (fed / hungry / ready to collect)
- "Collect" button (active when collection timer expired)
- "Feed" button showing current feed reserve
- Buy feed button (links to shop)
- "Buy Animal" button if capacity not full (costs coins)

**Notification:** When animals are ready to collect, show a small indicator icon above the building (same pattern as quest icons above NPCs — a floating Billboard sprite).

---

## Scene Setup (for 3D artists / scene editors)

**Chicken Coop:**
- Entity: `ChickenCoop.glb` (already placed)
- Add pointer collider (same pattern as CompostBin / Bed)
- Spawn point for chicken walk animations: `ChickenSpawn_1` through `ChickenSpawn_4`
- Wander bounds: `ChickenWander_1` through `ChickenWander_4` (corners)

**Pig Pen:**
- Entity: `PigPen.glb` (already placed)
- Add pointer collider
- Spawn points: `PigSpawn_1`, `PigSpawn_2`
- Wander bounds: `PigWander_1` through `PigWander_4`

Animals should wander visually inside their pen/yard area using the same NPC movement system (walk speed ~1.0, shorter wander radius). They do not need dialog — clicking the building opens the UI, not the animal itself.

---

## Implementation Phases

### Phase 1 — Chickens only
1. Add `animals` field to save schema.
2. Implement `src/systems/animalSystem.ts`:
   - On startup, spawn chicken models at wander points if owned.
   - Per-frame: wander animation loop.
   - Collection timer check on load (offline production).
3. Wire `ChickenCoop.glb` click → Animal Panel.
4. Add `src/ui/AnimalPanel.tsx`.
5. Add Egg to sell menu.
6. Add Grain to shop.

### Phase 2 — Pigs + Manure loop
1. Extend `animalSystem.ts` for pig type.
2. Wire `PigPen.glb` click → Animal Panel (same panel, filtered by building type).
3. Add Manure as a Compost Bin input (extend `fertilizerData.ts`).
4. Add Vegetable Scraps auto-generation to harvest flow in `actions.ts`.

---

## Open Questions

- What level unlocks the first Chicken Coop? (Suggested: 8)
- Should feed be auto-purchased from stored coins if player forgets? (Automate or manual?)
- Do animals have names / personality, or are they purely functional?
- Is Manure a separate inventory item or auto-routed to the Compost Bin?
- Can players visit another farm and feed their animals (like watering crops)?
