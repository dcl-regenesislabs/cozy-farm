# Fertilizer System

## Overview
Fertilizers are consumables purchased via the farm computer and applied manually to individual plots. Each fertilizer has a type and a tier. Higher-tier fertilizers are more effective but cost more. Lower-tier fertilizers still work on higher-tier crops — they're just less impactful.

Workers can auto-apply fertilizer from their own inventory once hired.

---

## Fertilizer Types

### Speed Fertilizer
Reduces grow time for a crop.

| Fertilizer Tier | Tier 1 Crop Reduction | Tier 2 Crop Reduction | Tier 3 Crop Reduction |
|---|---|---|---|
| Tier 1 | -30% grow time | -15% grow time | -5% grow time |
| Tier 2 | -50% grow time | -35% grow time | -15% grow time |
| Tier 3 | -70% grow time | -55% grow time | -30% grow time |

---

### Quality Soil
Increases crop yield per plot on harvest.

| Fertilizer Tier | Bonus Yield |
|---|---|
| Tier 1 | +10% crops |
| Tier 2 | +20% crops |
| Tier 3 | +35% crops |

Yield is calculated at harvest time. Applying quality soil after the crop is halfway grown still applies the full bonus.

---

### Spoilage Protection
Extends the window before a crop wilts and turns into compost.

| Fertilizer Tier | Extension |
|---|---|
| Tier 1 | +30% spoilage window |
| Tier 2 | +60% spoilage window |
| Tier 3 | +100% spoilage window (doubles time) |

---

## Application Rules
- Fertilizer is applied **per plot**, manually by the player
- One fertilizer slot per plot — applying a second replaces the first
- Fertilizer is consumed on application (not on harvest)
- Workers will auto-apply fertilizer if it's loaded into their inventory
- Fertilizer cannot be recovered once applied

---

## Purchasing
- Bought via the **farm computer**
- Delivered by truck — a crate arrives, player opens it to receive the items
- Stacks in player inventory

---

## Wilting & Compost
When a crop wilts (not harvested in time):
- Crop is removed from the plot
- Plot automatically yields a small amount of **Tier 1 fertilizer** as compost
- This is the base behavior — Spoilage Protection fertilizer extends the window before this happens

---

## Notes
- Fertilizer prices should scale meaningfully — Tier 3 should feel like a real investment
- Future consideration: crop-specific fertilizer variants with unique bonuses (e.g. "Tomato Boost" for +50% on tomatoes only)
