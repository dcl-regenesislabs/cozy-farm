# Animal System

## Status
**Phase 1 (Chickens) — Implemented.** Phase 2 (Pigs) — implemented but not yet fully tested in scene.

---

## Overview

Animals are a passive income loop alongside active crop farming. Players unlock buildings (Chicken Coop, Pig Pen), keep animals fed, and collect produce on a timer. Production runs both online (real-time ECS system) and offline (catch-up on load).

---

## Animal Types

### Phase 1 — Chickens

| Property | Value |
|---|---|
| Building | `ChickenCoop.glb` — placed in scene via Creator Hub |
| Wandering animals | `Chicken01.glb` — 3 chickens spawn around coop when unlocked |
| Unlock | Level 8 (automatic via `onLevelUp` callback) |
| Feed | Grain (1 bag per production cycle) |
| Production cycle | Every 6 hours when grain is available |
| Yield per cycle | 1–2 Eggs |
| Max stockpile | 12 Eggs |
| Egg sell price | 30 coins each |
| XP on collect | 5 XP per egg collected |

### Phase 2 — Pig Pen

| Property | Value |
|---|---|
| Building | `PigPen.glb` — placed in scene via Creator Hub |
| Wandering animals | `Pig01.glb` — 2 pigs spawn around pen when unlocked |
| Unlock | Level 12 (automatic via `onLevelUp` callback) |
| Feed | Veggie Scraps (priority) → Grain (fallback) |
| Production cycle | Every 8 hours when feed is available |
| Yield per cycle | 1 Manure |
| Max stockpile | 5 Manure |
| Manure use | Collected → added directly to `organicWaste` (Compost Bin input) |
| XP on collect | 10 XP per manure collected |

---

## Feed System

### Grain
- Purchased in **Shop → Pets tab**
- 15 coins × 1 / 65 coins × 5 (bulk discount)
- Consumed: 1 grain per chicken production cycle; 1 grain per pig cycle (only if no veggie scraps available)

### Veggie Scraps
- Auto-generated: **30% chance per crop harvest** (any crop type)
- Only generated when Pig Pen is unlocked (`playerState.pigPenUnlocked`)
- Consumed by pigs before grain is used

---

## Save Schema

All fields are in `FarmSaveV1`, `FarmStatePayload`, and `FarmStateSchema`. Follow the [4-file pattern](../CLAUDE.md) if adding new fields.

```ts
// Chicken Coop
chickenCoopUnlocked:   boolean   // true once Level 8 reached
grainCount:            number    // bags in inventory
eggsCount:             number    // eggs ready to collect (capped at 12)
chickenLastProducedAt: number    // timestamp of last production cycle
totalEggsCollected:    number    // lifetime stat

// Pig Pen
pigPenUnlocked:        boolean   // true once Level 12 reached
vegetableScraps:       number    // auto-generated from harvests
manureCount:           number    // manure ready to collect (capped at 5)
pigLastProducedAt:     number    // timestamp of last production cycle
totalManureCollected:  number    // lifetime stat
```

---

## Key Files

| File | Role |
|---|---|
| `src/data/animalData.ts` | `AnimalType` enum, `AnimalDefinition` interface, all constants (cycle times, prices, model paths, wander radii) |
| `src/systems/animalSystem.ts` | Wander AI, real-time production timer, offline catch-up, collect/sell actions, unlock helpers, click handlers |
| `src/ui/AnimalPanel.tsx` | In-scene panel (click building → open). Shows grain stock, egg/manure count, next cycle countdown, collect button. Locked state if level not met. |
| `src/ui/ShopMenu.tsx` | Pets tab: Dog card + Chicken Coop card + Pig Pen card + Grain buy section |
| `src/ui/SellMenu.tsx` | Egg sell card (appears when `chickenCoopUnlocked && eggsCount > 0`) |
| `src/systems/interactionSetup.ts` | `initAnimalBuildings()` — finds scene entities `ChickenCoop.glb` and `PigPen.glb` by name, enables pointer collision, wires click handlers |
| `src/game/actions.ts` | `tryDropVeggieScrap()` called on every harvest |

---

## Architecture

### Building vs. Animal model
- **Buildings** (`ChickenCoop.glb`, `PigPen.glb`) are placed by the Creator Hub and found at runtime via `engine.getEntityOrNullByName()`. Always visible regardless of unlock state.
- **Animals** (`Chicken01.glb`, `Pig01.glb`) are spawned as wandering entities by code only after the feature is unlocked.

### Production flow (online)
```
ECS system runs every frame (animal-system)
  → checks grainCount / feedAvailable
  → accumulates dt in chickenAccumMs / pigAccumMs
  → when accumulator >= cycleDurationMs → produce, consume feed, reset accumulator
```

### Offline catch-up
Called once in `saveService.applyPayload` via `catchUpAnimalProduction()`:
```
cyclesMissed = floor((now - lastProducedAt) / cycleDurationMs)
cycles = min(cyclesMissed, feedAvailable)
→ add produce (capped at maxStockpile)
→ consume feed
→ update lastProducedAt to now - remainder
```

### Unlock flow
```
levelingSystem.addXp()
  → player reaches level 8 or 12
  → onLevelUp callback (wired in index.ts)
  → unlockChickenCoop() / unlockPigPen()
  → sets flag, sets lastProducedAt = now, spawns wandering animals
```

### Manure → Compost loop
Collecting manure adds directly to `playerState.organicWaste`. No intermediate step — it feeds straight into the existing Compost Bin system.

---

## UI Entry Points

| Entry point | Condition |
|---|---|
| Click `ChickenCoop.glb` in scene | Always clickable. Shows locked state if Level < 8 |
| Click `PigPen.glb` in scene | Always clickable. Shows locked state if Level < 12 |
| Shop → Pets tab | Always visible. Cards show lock status |
| Sell Menu | Egg card appears only when `chickenCoopUnlocked && eggsCount > 0` |

---

## Icons

All icons in `assets/scene/Images/`:

| File | Use |
|---|---|
| `ChickenIcon.png` | Shop Pets card |
| `EggIcon.png` | Sell Menu card |
| `GrainIcon.png` | Grain buy section in Shop |
| `PigIcon.png` | Shop Pets card |
| `VeggieScrapIcon.png` | Declared in `imagePaths.ts`, not yet used in UI |
| `PoopIcon.png` | Used as `MANURE_ICON` (reused existing asset) |

---

## Wander System

Chickens and pigs wander in a radius around their building centre using a simple state machine: `idle` → pick random target → `walking` → reach target → `idle`. Animation clips assumed: `idle` and `walk` (must exist in the GLB). Constants in `animalData.ts`:

```ts
CHICKEN_WANDER_RADIUS = 3.5   // metres
PIG_WANDER_RADIUS     = 2.5
ANIMAL_WALK_SPEED     = 0.9   // units/second
ANIMAL_PAUSE_MIN      = 3.0   // seconds
ANIMAL_PAUSE_MAX      = 8.0
```

Building centre positions (`CHICKEN_COOP_CENTRE`, `PIG_PEN_CENTRE`) in `animalData.ts` control where wandering animals spawn. **Update these if the Creator Hub building positions change.**
