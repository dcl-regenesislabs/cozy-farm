# Fertilizer System

## Overview

Crops that are not harvested in time will **rot**, yielding Organic Waste instead of sellable crops. Organic Waste can be composted into fertilizers that buff future crops.

---

## Rot Mechanic

A crop rots if the player doesn't harvest it within the **rot window** after it becomes ready.

| Variable | Value |
|---|---|
| Rot window | `min(growTimeMs, 12h)` after crop is ready |
| Hard cap | 12 hours for all tiers |
| RotShield fertilizer | Prevents rot entirely (rot deadline = Infinity) |

**Implementation:** `src/game/rotUtils.ts`
- `getRotTimeMs(def, fertilizerType)` — returns total ms from planting until rot
- `isPlotRotten(plantedAt, cropType, fertilizerType, effectiveGrowTimeMs, now)` — live check used by `growthSystem` and `saveService` (offline catch-up)

When a crop rots:
- The crop model swaps to `RotCrop.glb` (`assets/scene/Models/RotCrop/RotCrop.glb`)
- The harvest icon changes to the Organic Waste icon
- Harvesting a rotten crop adds 1 Organic Waste to `playerState.organicWaste` (no coins/XP)

---

## Organic Waste

- Stored in `playerState.organicWaste` (integer count)
- Icon: `assets/scene/Images/OrganicWasteIcon.png`
- Gained by harvesting rotten crops (1 waste per harvest)
- Spent by adding to the Compost Bin (1 unit at a time via the CompostBinMenu)

---

## Compost Bin

- Scene entity name: `CompostBin` (discovered in `setupEntities()`)
- Click to open the `'compost'` panel (`CompostBinMenu.tsx`)
- World-space VFX (icon + countdown timer above the bin): `src/systems/compostBinVfx.ts`

### Composting Flow

1. Player clicks "Add Waste" in the menu — transfers 1 Organic Waste from hand into the bin. `compostLastCollectedAt` is set on first addition.
2. The bin processes one unit every **5 minutes** (`COMPOST_CYCLE_MS = 300_000 ms`).
3. Player clicks "Collect" — awards one random fertilizer per completed cycle and decrements `compostWasteCount`.

**Offline catch-up**: on farm load (`applyPayload` in `saveService.ts`), completed cycles are awarded automatically so the player doesn't miss production while offline.

### Saved State

| Field | Type | Description |
|---|---|---|
| `organicWaste` | `number` | Waste in player's hand (not in bin) |
| `compostWasteCount` | `number` | Waste units currently in the bin |
| `compostLastCollectedAt` | `number` | Timestamp of last collection (ms) |
| `fertilizers` | `FertilizerCount[]` | Player's fertilizer inventory |

---

## Fertilizer Types

Defined in `src/data/fertilizerData.ts`. Applied at planting time via `FertilizeMenu.tsx`.

| Type | Enum value | Effect | Icon |
|---|---|---|---|
| Growth Boost | `0` | −25% grow time | `GrowthBoostFertilizerIcon.png` |
| Yield Boost | `1` | ×1.5 harvest yield | `YieldBoostFertilizerIcon.png` |
| Water Saver | `2` | −1 watering required (min 1) | `WaterSaverFertilizerIcon.png` |
| Rot Shield | `3` | Crop never rots | `RotShieldFertilizerIcon.png` |

All icons are in `assets/scene/Images/`.

**Compost output** is random (uniform across all 4 types) via `randomFertilizer()`.

---

## Applying Fertilizer

1. A crop is planted without fertilizer (click soil → PlantMenu → select crop).
2. While the crop is growing and `fertilizerType === -1`, an "Click to Fertilize" hint shows in the hover text if the player owns any fertilizers.
3. Clicking the growing crop opens `FertilizeMenu` (`playerState.activeMenu = 'fertilize'`).
4. Player selects a fertilizer card — `applyFertilizer(entity, fertType)` is called, setting `PlotState.fertilizerType` and consuming one unit from inventory.
5. Effects are applied immediately to `effectiveGrowTimeMs` (Growth Boost) and at harvest time (Yield Boost, Water Saver).

**Fertilizer cannot be applied after a crop is already ready.**

---

## Key Files

| File | Role |
|---|---|
| `src/data/fertilizerData.ts` | `FertilizerType` enum, `FERTILIZER_DATA` map, `randomFertilizer()` |
| `src/game/rotUtils.ts` | `getRotTimeMs`, `isPlotRotten` |
| `src/systems/growthSystem.ts` | Live rot checking each frame; applies `GrowthBoost` to effective grow time |
| `src/systems/compostBinVfx.ts` | World-space icon + timer above the bin |
| `src/ui/CompostBinMenu.tsx` | Add waste / collect fertilizers panel |
| `src/ui/FertilizeMenu.tsx` | Choose fertilizer to apply to a growing crop |
| `src/components/farmComponents.ts` | `PlotState.isRotten`, `PlotState.fertilizerType` |
| `src/game/actions.ts` | `applyRotVisual()`, `applyFertilizer()`, rot-aware `setSoilIconDisplay()` |
| `src/services/saveService.ts` | Serialisation + offline compost catch-up in `applyPayload()` |
| `src/server/storage/playerFarm.ts` | `FarmSaveV1` fields for organic waste, fertilizers, compost state |

---

## Planned / Future Work

- Store tab to buy fertilizers directly with coins
- Compost bin upgrade (faster cycles, larger capacity)
