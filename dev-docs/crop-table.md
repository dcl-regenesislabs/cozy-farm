# Crop Table
*Design draft — values subject to playtesting.*

---

## Tier 1 Crops
*1 watering required. Grow time: 2–5 min. The clicker loop.*

| Crop | Grow Time | Watering Window | Spoilage Window | Base Yield | Base Sell Price (each) | Unlock |
|---|---|---|---|---|---|---|
| Onion | 2 min | Anytime before 90% growth | 15 min post-ready | 3–5 units | 5 coins | Default (tutorial) |
| Potato | 3 min | Anytime before 90% growth | 15 min post-ready | 3–5 units | 6 coins | Buy from computer |
| Garlic | 5 min | Anytime before 90% growth | 15 min post-ready | 2–4 units | 8 coins | Buy from computer |

---

## Tier 2 Crops
*2–3 waterings depending on crop. Under-watered = reduced yield.*

| Crop | Grow Time | Waterings | Watering Windows | Spoilage Window | Base Yield | Base Sell Price (each) | Unlock |
|---|---|---|---|---|---|---|---|
| Tomato | 1h | 2 | At ~40% and ~80% growth | 45 min post-ready | 4–6 units | 18 coins | Quest (Lily) |
| Carrot | 3h | 2 | At ~40% and ~80% growth | 45 min post-ready | 4–6 units | 15 coins | Buy from computer |
| Corn | 8h | 3 | At ~30%, ~60%, ~85% growth | 45 min post-ready | 3–5 units | 22 coins | Land Expansion 1 |

---

## Tier 3 Crops
*3 waterings required. Long investment — 24h+ grow time.*

| Crop | Grow Time | Watering Windows | Spoilage Window | Base Yield | Base Sell Price (each) | Unlock |
|---|---|---|---|---|---|---|
| Lavender | 36h | At 25%, 50%, 75% growth | 3h post-ready | 5–8 units | 55 coins | Land Expansion 3 (special crop) |
| Pumpkin | 24h | At 25%, 50%, 75% growth | 3h post-ready | 2–4 units | 65 coins | Quest (Marco) |
| Sunflower | 30h | At 25%, 50%, 75% growth | 3h post-ready | 3–5 units | 50 coins | Land Expansion 2 (special crop) |

---

## Watering Rules

- Watering at the wrong time (outside the window) is **ignored** — doesn't count
- Missing a watering reduces yield at harvest:
  - Tier 1: 1 watering required — miss it = 50% yield
  - Tier 2: 2 waterings required — miss 1 = 60% yield, miss both = 30% yield
  - Tier 3: 3 waterings required — miss 1 = 75% yield, miss 2 = 50% yield, miss all = 25% yield
- Workers auto-water when assigned to a plot expansion

---

## Spoilage (Wilting)

- After the spoilage window expires, crop wilts
- Wilted crop cannot be harvested for coins
- Wilted crop yields **1 Tier 1 fertilizer bag** per plot instead
- Spoilage Protection fertilizer extends this window (see Fertilizer doc)

---

## Special Crops Note
Some Tier 3 crops are **land-exclusive** — they can only be planted on the expansion that unlocks them (Lavender → Expansion 3, Sunflower → Expansion 2). All Tier 1 and Tier 2 crops can be planted on any expansion. This is subject to design review.

---

## Reward Multiplier (watering quality)
| Waterings Completed | Yield Multiplier |
|---|---|
| All waterings | 100% |
| 1 missed | 75% |
| 2 missed | 50% |
| All missed | 25% |

*Tier 1 only has 1 watering so it's binary: watered (100%) or not (50%).*
