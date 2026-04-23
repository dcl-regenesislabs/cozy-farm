# Fertilizer System

## Overview
Fertilizers are consumables applied manually to individual plots before or during growth. Each fertilizer has a single flat effect. Fertilizers are obtained by composting Organic Waste in the Compost Bin.

> **Implementation note:** The original design described 3-tier fertilizers bought via the farm computer and delivered by truck. The current implementation uses a single-tier system sourced from the Compost Bin. Tiers, store purchasing, and truck delivery are planned for a future update.

---

## Fertilizer Types

| Type | Code Enum | Effect |
|---|---|---|
| Growth Boost | `FertilizerType.GrowthBoost (0)` | −25% grow time |
| Yield Boost | `FertilizerType.YieldBoost (1)` | ×1.5 harvest yield |
| Water Saver | `FertilizerType.WaterSaver (2)` | −1 watering required (min 1) |
| Rot Shield | `FertilizerType.RotShield (3)` | Crop never rots |

Defined in `src/data/fertilizerData.ts`. Icons are in `assets/scene/Images/`.

---

## Rot & Organic Waste

Crops that are not harvested in time will **rot**.

| Variable | Value |
|---|---|
| Rot window | `min(growTimeMs, 12h)` after crop is ready |
| Hard cap | 12 hours for all tiers |
| Rot Shield fertilizer | Prevents rot entirely |

When a crop rots:
- Model swaps to `RotCrop.glb`
- Harvesting yields 1 **Organic Waste** instead of coins/XP

Logic in `src/game/rotUtils.ts`.

---

## Compost Bin

The Compost Bin converts Organic Waste into random fertilizers.

1. Click the **Compost Bin** in the scene to open the panel
2. Click **Add Waste** — moves 1 Organic Waste from hand into the bin
3. The bin processes one unit every **5 minutes**
4. Click **Collect** to receive completed fertilizers (1 random type per cycle)

**Offline catch-up:** fertilizers produced while the player is away are awarded automatically on next login.

World-space icon + countdown timer above the bin is handled by `src/systems/compostBinVfx.ts`.

---

## Application Rules
- Fertilizer is applied **per plot**, manually by the player
- One fertilizer slot per plot — only one type can be active at a time
- Apply while the crop is planted but **not yet ready** (hover text shows "Click to Fertilize" if you have any)
- Fertilizer is consumed on application (not on harvest)
- Cannot be applied once the crop is ready to harvest

---

## Purchasing / Obtaining

**Current:** Compost Bin only (Organic Waste → random fertilizer).

**Planned:** Store tab on the farm computer to buy specific fertilizers with coins.

---

## Key Files

| File | Role |
|---|---|
| `src/data/fertilizerData.ts` | `FertilizerType` enum, definitions, `randomFertilizer()` |
| `src/game/rotUtils.ts` | `getRotTimeMs`, `isPlotRotten` |
| `src/systems/growthSystem.ts` | Live rot checking; applies Growth Boost to effective grow time |
| `src/systems/compostBinVfx.ts` | World-space icon + timer above the bin |
| `src/ui/CompostBinMenu.tsx` | Add waste / collect panel |
| `src/ui/FertilizeMenu.tsx` | Choose fertilizer to apply to a growing crop |
| `src/components/farmComponents.ts` | `PlotState.isRotten`, `PlotState.fertilizerType` |
| `src/game/actions.ts` | `applyRotVisual()`, `applyFertilizer()` |
| `src/services/saveService.ts` | Serialisation + offline compost catch-up |

---

## Planned / Future Work
- Store tab on farm computer to buy specific fertilizers with coins (tiered pricing)
- 3-tier fertilizer variants with scaled effects (restoring original design)
- Worker auto-apply from worker inventory
- Crop-specific fertilizer variants (e.g. "Tomato Boost")
- Compost bin upgrade (faster cycles, larger capacity)
