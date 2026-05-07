# Animal System

## Status

Both **Chickens** and **Pigs** are fully implemented. Pigs include a multi-stage growth lifecycle (piglet → adolescent → adult → harvestable), breeding, dynamic per-pig scale based on feedScore, and dirt/cleaning mechanics.

---

## Overview

Animals form a passive income loop alongside active crop farming. The flow:

1. Player buys a building (Chicken Coop or Pig Pen) — 500 coins each
2. Player buys individual animals (500 coins each, max 5 per building)
3. Player keeps the food bowl filled (grain + crops)
4. Animals produce on per-animal timers (eggs / manure / pig meat)
5. Buildings get dirty over time and must be cleaned for organic waste
6. Pigs can be bred to create piglets that grow over 3 days

Production runs both online (real-time ECS system) and offline (catch-up on load).

---

## Buildings

Both buildings sit in the scene from start. Players see "locked" / "available" / "owned" states based on level + ownership.

| Property | Chicken Coop | Pig Pen |
|---|---|---|
| Building model | `ChickenCoopBuilding.glb` | `PigPenBuilding.glb` |
| Empty (locked) variant | `AnimalBuildingEmpty.glb` | `AnimalBuildingEmpty.glb` |
| Walk polygon model | `ChickenArea.glb` | `PigArea.glb` |
| Dirt model | `ChickenCoopDirt.glb` | `PigPenDirt.glb` |
| Food bowl (empty) | `ChickenFoodEmpty.glb` | `AnimalFoodEmpty.glb` |
| Food bowl (full) | `ChickenFoodFull.glb` | `AnimalFoodFull.glb` |
| Water bowl | `ChickenWater.glb` | `AnimalWater.glb` |
| Animal model | `Chicken01.glb` | `Pig01.glb` |
| Unlock level | 8 | 12 |
| Building cost | 500 coins | 500 coins |
| Per-animal cost | 500 coins | 500 coins |
| Capacity | 5 chickens | 5 pigs |

---

## Production

Each animal has its **own** production timer (per-animal `lastEggAt` / `lastManureAt`). One bowl unit = one production cycle for one animal.

| Animal | Cycle | Yield per cycle | Sell price |
|---|---|---|---|
| Chicken (any age) | Every 6h | 1–2 Eggs | 30 coins/egg |
| Pig (adult only) | Every 8h | 1 Manure (→ `organicWaste`) | — |
| Pig (harvestable only) | Manual harvest | 1 Pig Meat | 150 coins/meat |

Manure goes directly into `playerState.organicWaste` (Compost Bin input — no intermediate stockpile).

---

## Pig Lifecycle

Pigs have four stages, derived at runtime from `bornAt` and `becameAdultAt` (never saved as enum):

| Stage | Duration | Scale | Notes |
|---|---|---|---|
| **Piglet** | 0–24h after `bornAt` | 0.20 (fixed) | Bred only — purchased pigs skip this stage |
| **Adolescent** | 24h–72h after `bornAt` | interpolates 0.20 → 0.65 | Cannot breed, cannot harvest |
| **Adult** | After `becameAdultAt` | 0.65 → 2.0 (driven by `feedScore`) | Produces manure, can breed, grows visually as it eats |
| **Harvestable** | 7 days as adult | (same as adult) | Click "Harvest Meat" in Pig Pen panel |

**Purchased pigs** start at the Adult stage immediately (`bornAt: 0`, `becameAdultAt: 0` falls back to `purchasedAt`).

**Bred pigs** start at the Piglet stage (`bornAt: now`, `becameAdultAt: 0` until promoted).

**Promotion to adult** happens in `catchUpOffline()` and the per-frame production tick: when a piglet's age crosses `ADOLESCENT_STAGE_MS` (72h), `becameAdultAt` is set, which starts the 7-day harvest clock.

### Important `getPigStage` quirk

`PigData.becameAdultAt` is typed `number | null` on the client but serialized as `number` (with `0` meaning "not set"). `getPigStage` must check `becameAdultAt === null || becameAdultAt === 0` to detect piglets — using `??` here is wrong because `??` doesn't treat `0` as missing. Same for `pig.becameAdultAt || pig.purchasedAt` (use `||`, not `??`).

---

## Breeding

- Need 2 adult or harvestable pigs, each off a 24h cooldown (`lastBreedAt`)
- Pen must have free capacity (`< 5`)
- Cooldown is applied to both parents on success
- Piglet starts with `feedScore: 0` (does NOT inherit from parents — UI text saying it does is aspirational)
- Triggered from Pig Pen panel → Breeding tab → "Breed Pigs" button

```ts
const piglet: PigData = {
  id:            newId(),
  purchasedAt:   now,
  bornAt:        now,    // marks it as a piglet
  becameAdultAt: 0,      // not yet adult — promoted at 72h
  feedScore:     0,
  lastBreedAt:   0,
  lastManureAt:  0,
}
```

---

## Pig Scaling

Pig scale updates **every frame** in `updateBuildingVisuals()` based on stage + feedScore. Defined in `getPigletScale()` and `getPigScale()`:

```ts
piglet:        0.20 (fixed)
adolescent:    0.20 + t * 0.45     // t = elapsed/duration in 24h–72h window
adult/harvest: 0.65 + (feedScore/50) * 1.35   // 0.65 → 2.0 max
```

`feedScore` increments by `+1` per crop fed in the bowl AND `+1` per manure production cycle. Max meaningful value is 50 (saturates the scale curve).

---

## Feed System

Food in the bowl is generic "units" — each unit fuels one production cycle for one animal. Players deposit food via the **Feed Bowl Menu** (click food bowl in scene).

### Inputs

| Source | Unit | Notes |
|---|---|---|
| **Grain** | 1 unit each | Purchased in Shop. 15 coins / 1, 65 coins / 5 (bulk) |
| **Any harvested crop** | 1 unit each per crop | Deposited from inventory; for pigs, also adds `+1 feedScore` per pig per crop |
| **Veggie Scraps** | 1 unit each | Auto-generated 30% per crop harvest when Pig Pen is owned; auto-deposited into pig bowl |

### Deposit logic
`depositFoodInBowl(type, grainAmount, cropAmounts)` in `animalSystem.ts`:
- Deducts items from inventory (`grainCount` or `harvested` map)
- Adds the same count to `chickenFoodInBowl` / `pigFoodInBowl`
- For pigs: adds `feedScore += cropAmount` to every pig

---

## Dirt / Cleaning

Buildings get dirty over time. Frequency scales with animal count (more animals = dirtier faster).

```ts
DIRT_BASE_INTERVAL_MS = 12h   // base interval with 1 animal
getDirtIntervalMs(count) = DIRT_BASE_INTERVAL_MS / max(1, count)
// 1 animal → 12h, 2 → 6h, 5 → 2.4h
```

### Runtime accumulator
`playerState.coopDirtAccumMs` and `playerState.penDirtAccumMs` are **ephemeral** (not saved — reset to 0 on login). The `dirtAccumulatorSystem` ticks them up by `dt`, and when they exceed `getDirtIntervalMs(count)`, sets `chickenCoopDirtyAt` / `pigPenDirtyAt` to `Date.now()`.

The UI uses these accumulators to show a `"Next mess in Xh Xm"` countdown when clean.

### Cleaning
When dirty, the dirt model becomes visible and clickable in the scene. Clicking it:
- Adds `CLEAN_ORGANIC_WASTE_PER_ANIMAL × animalCount` to `playerState.organicWaste` (10 per animal)
- Resets `chickenCoopDirtyAt` / `pigPenDirtyAt` to 0
- Plays a harvest VFX

---

## Save Schema

In `FarmSaveV1`, `FarmStatePayload`, and `FarmStateSchema` (follow the [4-file pattern](../CLAUDE.md)):

```ts
// Chicken Coop
chickenCoopOwned:    boolean
chickens:            ChickenData[]    // [{ id, lastEggAt }]
chickenFoodInBowl:   number
chickenCoopDirtyAt:  number           // 0 = clean, else timestamp dirtied

// Pig Pen
pigPenOwned:         boolean
pigs:                PigData[]        // see below
pigFoodInBowl:       number
pigPenDirtyAt:       number

// Inventories
grainCount:          number
veggieScrapCount:    number
eggsCount:           number
pigMeatCount:        number
compostBinUnlocked:  boolean
```

### `ChickenData`
```ts
{ id: string, lastEggAt: number }
```

### `PigData`
```ts
{
  id:            string
  purchasedAt:   number    // when bought; adults derive `becameAdultAt` from this
  bornAt:        number    // 0 = was purchased (not bred)
  becameAdultAt: number    // 0 = still piglet/adolescent OR derive from purchasedAt
  feedScore:     number    // increments per crop fed + per manure cycle
  lastBreedAt:   number    // cooldown timestamp (0 = never bred)
  lastManureAt:  number    // per-pig production timer
}
```

### Ephemeral (NOT saved — runtime only)
```ts
playerState.coopDirtAccumMs    // dirt progress for chicken coop
playerState.penDirtAccumMs     // dirt progress for pig pen
playerState.activeFeedBowl     // 'chicken' | 'pig' | null — UI routing
```

---

## Key Files

| File | Role |
|---|---|
| `src/data/animalData.ts` | All constants, `PigStage` derivation (`getPigStage`, `getPigScale`, `getPigletScale`), model paths, walk polygons, building positions |
| `src/systems/animalSystem.ts` | ECS systems: wander AI, per-pig production, dirt accumulator, building visuals (scale per frame), offline catch-up, breeding, harvesting, cleaning |
| `src/game/gameState.ts` | `playerState` animal fields + ephemeral dirt accumulators |
| `src/services/saveService.ts` | `buildSavePayload` / `applyPayload` — animal field plumbing |
| `src/server/storage/playerFarm.ts` | `FarmSaveV1`, `emptyFarm`, `normalizeFarm` — server-side persistence |
| `src/shared/farmMessages.ts` | `FarmStateSchema`, `PigDataSchema`, `ChickenDataSchema` — wire format |
| `src/ui/ChickenCoopPanel.tsx` | Chicken Coop UI: tiles per chicken, dirt countdown, eggs status |
| `src/ui/PigPenPanel.tsx` | Pig Pen UI: animals tab + breeding tab, per-pig stage display, harvest button, dirt countdown |
| `src/ui/FeedBowlMenu.tsx` | Card-grid feeding UI (matches Shop style) — large icons, "Add 1" + "Add All" |
| `src/ui/AnimalPanel.tsx` | Combined overview (both buildings) accessed from bottom nav |
| `src/ui/ShopMenu.tsx` | Buy buildings, animals, grain |
| `src/ui/SellMenu.tsx` | Sell eggs, pig meat |
| `src/systems/interactionSetup.ts` | `initAnimalBuildings()` — scene-entity wiring (clicks open panels, food bowl click opens feed UI, dirt click cleans) |
| `src/game/actions.ts` | `tryDropVeggieScrap()` called on every harvest |

---

## Architecture

### Per-frame ECS systems (in `animalSystem.ts`)
- **Wander system** — moves wanderers along random points within the building's walk polygon
- **Production system** — for each chicken/pig, accumulates time since `lastEggAt` / `lastManureAt`; produces when bowl has food
- **Building visuals system** — updates pig Transform.scale every frame based on `getPigletScale(pig, now)` (so pigs visibly grow as they eat)
- **Dirt accumulator system** — increments `playerState.coopDirtAccumMs` / `penDirtAccumMs`; flips to dirty when interval exceeded

### Offline catch-up
`catchUpOffline()` runs once in `initAnimalSystem()` after save load:
- For chickens: `missedCycles = floor((now - lastEggAt) / EGG_CYCLE_MS)`, capped by available bowl food, adds eggs
- For pigs: first promotes any piglet whose age >= 72h (`becameAdultAt = bornAt + ADOLESCENT_STAGE_MS`), then catches up manure cycles
- Dirt is **not** caught up offline (accumulators reset to 0; building stays clean after login regardless of offline duration)

### Building states (visual)
The `updateBuildingVisuals()` function manages which models are visible:
- **Locked / not owned**: `AnimalBuildingEmpty.glb`
- **Owned**: real building (`ChickenCoopBuilding.glb` / `PigPenBuilding.glb`) + walk area + food bowl (empty/full variant) + water bowl
- **Dirty**: dirt model becomes visible
- **With animals**: wanderer entities spawned, pig scales updated per frame

### Walk polygons
Defined in `animalData.ts` as 2D point arrays (XZ offsets from building centre). `pickRandomPointInPolygon()` uses rejection sampling against a point-in-polygon test. Vertices were extracted directly from `ChickenArea.glb` / `PigArea.glb` meshes.

---

## UI Entry Points

| Entry | Opens |
|---|---|
| Click `ChickenCoopBuilding.glb` (or empty variant) in scene | Chicken Coop panel (locked / buy / owned view) |
| Click `PigPenBuilding.glb` (or empty variant) in scene | Pig Pen panel |
| Click food bowl model in scene | Feed Bowl Menu (sets `activeFeedBowl = 'chicken'\|'pig'`) |
| Click dirt model in scene (when dirty) | Cleans the building, awards organic waste |
| Bottom Nav → Animals icon | Combined Animal Panel |
| Shop → Pets/Grain sections | Buy buildings, animals, grain |
| Sell Menu | Sell eggs, pig meat (cards appear when count > 0) |

---

## Icons

All in `assets/scene/Images/`. **Never use emojis in UI** — always reference these icon paths from `imagePaths.ts`:

| Constant | File | Use |
|---|---|---|
| `CHICKEN_ICON` | `ChickenIcon.png` | Chicken coop title icon, per-chicken tiles, shop card |
| `PIG_ICON` | `PigIcon.png` | Pig pen title icon, per-pig tiles, shop card |
| `EGG_ICON` | `EggIcon.png` | Eggs tile, sell menu card |
| `GRAIN_ICON` | `GrainIcon.png` | Grain shop section, feed bowl card |
| `MANURE_ICON` | `PoopIcon.png` | Dirt cleanliness tile (reuses existing asset) |
| `VEGGIE_SCRAP_ICON` | `VeggieScrapIcon.png` | (declared, not currently rendered in UI) |

---

## Constants Quick Reference

```ts
// Lifecycle
PIGLET_STAGE_MS      = 24h       // piglet → adolescent
ADOLESCENT_STAGE_MS  = 72h       // adolescent → adult (3 days total from birth)
PIG_HARVEST_AGE_MS   = 7 days    // adult → harvestable
PIG_BREED_COOLDOWN   = 24h       // per-pig

// Production
EGG_CYCLE_MS         = 6h        // per chicken
PIG_CYCLE_MS         = 8h        // per adult pig

// Economy
BUILDING_BUY_PRICE   = 500       // coins (per building)
ANIMAL_BUY_PRICE     = 500       // coins (per animal)
EGG_SELL_PRICE       = 30
PIG_MEAT_SELL_PRICE  = 150
GRAIN_BUY_PRICE      = 15        // 1×
GRAIN_BULK_PRICE     = 65        // 5×

// Dirt
DIRT_BASE_INTERVAL_MS         = 12h
CLEAN_ORGANIC_WASTE_PER_ANIMAL = 10

// Capacity
MAX_ANIMALS_PER_BUILDING = 5
```

Building centre positions (`CHICKEN_COOP_CENTRE`, `PIG_PEN_CENTRE`) live in `animalData.ts`. **Update these if Creator Hub building positions change.**
