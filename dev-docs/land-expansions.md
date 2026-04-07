# Land Expansions & Layout

## Overview
The farm grows outward through purchasable land expansions. Each expansion adds 12 plots in a grid. Expansions are visible from day one as locked zones — the player can see where they'll expand to, building anticipation.

---

## Starting Layout
- **Tutorial farm**: 6 plots (3x2 grid)
- **After tutorial quest**: 6 more plots unlocked free → 12 total (first full expansion zone)

---

## Expansion Map

| # | Plots Added | Total Plots | Cost | Special Crop Unlocked | Notes |
|---|---|---|---|---|---|
| Starter (tutorial) | 6 | 6 | Free | — | Pre-loaded, tutorial phase |
| Tutorial reward | 6 | 12 | Free (quest) | — | Completes first zone |
| Expansion 1 | 12 | 24 | 500 coins | Corn | First paid expansion |
| Expansion 2 | 12 | 36 | 1,500 coins | Sunflower | Worker slot unlocked |
| Expansion 3 | 12 | 48 | 4,000 coins | Lavender | Worker slot unlocked |
| Expansion 4 | 12 | 60 | 9,000 coins | — | Raw space, no exclusive crop |
| Expansion 5 | 12 | 72 | ~13,500 coins | — | Price scales +50% per step |

*Prices beyond Expansion 5 continue scaling at ~50% per step.*

---

## Unlock Mechanic
1. Player walks to the locked expansion zone
2. A sign with a padlock is visible — interacting shows the unlock price and any requirements
3. If the player has enough coins (and any required quest is complete), they confirm the purchase
4. Expansion unlocks visually — fence opens, ground texture changes, plots appear
5. If unlocked via a **Free Expansion Pass** (from a gate quest), the price ladder is unaffected — the next paid expansion still uses the normal price

---

## Special Crops & Land Exclusivity
Some Tier 3 crops are **land-exclusive** — they can only be planted in the expansion that unlocked them.

| Crop | Exclusive To |
|---|---|
| Sunflower | Expansion 2 only |
| Lavender | Expansion 3 only |

All other crops (T1, T2, Pumpkin) can be planted on any expansion.

---

## Worker Coverage
- Each paid expansion (1 through 5+) supports **one worker slot**
- The tutorial zone (12 plots) does not have a worker slot — the player manages it directly
- Workers are tied to their assigned expansion and cannot move between zones

| Expansion | Worker Slot |
|---|---|
| Tutorial zone (12 plots) | No |
| Expansion 1 | Yes |
| Expansion 2 | Yes |
| Expansion 3 | Yes |
| Expansion 4+ | Yes |

---

## Visual Design Notes
- All expansion zones should be **visible from the start** — locked areas have a distinct look (dead grass, grey tone, padlock sign)
- As expansions unlock, the farm visually "comes alive" — dirt plots appear, fences open
- The furthest locked expansion should always be visible to the player, even if they can't afford it yet
- Each expansion zone is spatially adjacent to the previous — the farm grows in one direction (or wraps around the farmhouse)

---

## Free Expansion Pass
- Obtained as a reward from specific gate quests
- Behaves exactly like a paid unlock, but costs 0 coins
- Does **not** reset or affect the price counter for future paid expansions
- Stored in player inventory — can be used at any time after receiving it
- Cannot be traded or gifted
