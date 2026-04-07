# Economy & Progression

## Currency
**Coins** — the single in-game currency. Earned by selling crops. Spent on seeds, fertilizer, land expansions, workers, and beauty items.

**MANA** (future) — Decentraland's native token. Reserved for purely cosmetic purchases: special pets, skins, beauty items. No gameplay impact.

---

## Core Economy Loop
Sell crops → earn coins → buy seeds / fertilizer / expansions / workers → grow more crops → repeat.

The player is always the seller. No automation reaches the sell step.

---

## Coins Per Hour — Benchmark by Stage
*Based on 6 plots, full attention, no fertilizer. Used to calibrate prices.*

| Stage | Active Crop Mix | Est. Coins/Hour |
|---|---|---|
| Tutorial (6 plots, T1 only) | All onions (2 min) | ~450–600 coins/h |
| Early (12 plots, T1+T2 intro) | Mix onions + tomatoes | ~700–950 coins/h |
| Mid (24 plots, T1+T2) | Mix tomatoes + carrots | ~1,000–1,400 coins/h |
| Late (36 plots, all tiers) | Corn + pumpkin + T1 filler | ~1,800–2,500 coins/h |
| Full farm (48+ plots, workers) | Workers handle T2/T3, player manages T3 sales | ~3,000–4,500 coins/h |

*Active attention assumed. Idle/offline earnings are lower — workers partially compensate.*

---

## Progression Milestones

### Phase 1 — Tutorial (Day 1, ~30 min)
- Start with 6 plots, onion seeds pre-loaded
- Learn plant → water → harvest → sell loop
- Complete tutorial quest → unlock 6 more plots (free)
- First computer interaction — buy potato seeds

**Saving toward:** First real land expansion (~500 coins)

---

### Phase 2 — Early Game (Days 1–3)
- 12 plots, T1 crops grinding
- Unlock tomato via Lily's quest
- First paid land expansion (12 more plots)
- Introduction to fertilizer

**Saving toward:** Land Expansion 2 (~1,500 coins), first worker (~800 coins)

---

### Phase 3 — Mid Game (Days 3–10)
- 24–36 plots active
- T2 crops covering mid-session gaps
- First worker hired — handles an expansion while player focuses on selling
- Corn unlocked via Expansion 1, requires planning ahead (8h)
- First T3 crop attempt (pumpkin via Marco's quest)

**Saving toward:** Land Expansion 3 (~4,000 coins), second worker, beauty upgrades

---

### Phase 4 — Late Game (Days 10+)
- 48+ plots, multiple workers
- T3 crops are primary income — T1 is filler between sessions
- Sunflower and Lavender unlocked (Expansions 2 and 3)
- Beauty system active — pets and decorations purchased
- Quest system fully open, retribution quests more frequent (dog ownership)

**Saving toward:** Max expansions, full worker roster, rare beauty items

---

## Price Reference (Design Targets)

### Seeds (per unit)
| Crop | Seed Cost |
|---|---|
| Onion | 10 coins |
| Potato | 12 coins |
| Garlic | 15 coins |
| Tomato | 45 coins |
| Carrot | 35 coins |
| Corn | 55 coins |
| Lavender | 200 coins |
| Pumpkin | 220 coins |
| Sunflower | 180 coins |

*Seed cost should be recoverable in 2–3 successful harvests at base yield.*

---

### Fertilizer
| Type & Tier | Cost |
|---|---|
| Speed T1 | 20 coins |
| Speed T2 | 60 coins |
| Speed T3 | 150 coins |
| Quality Soil T1 | 25 coins |
| Quality Soil T2 | 70 coins |
| Quality Soil T3 | 180 coins |
| Spoilage Protection T1 | 15 coins |
| Spoilage Protection T2 | 45 coins |
| Spoilage Protection T3 | 120 coins |

---

### Land Expansions
Each expansion = 12 new plots. Price increases with each purchase and each unlock.

| Expansion | Base Cost | Notes |
|---|---|---|
| Expansion 1 | 500 coins | Unlocks Corn |
| Expansion 2 | 1,500 coins | Unlocks Sunflower (special crop) |
| Expansion 3 | 4,000 coins | Unlocks Lavender (special crop) |
| Expansion 4 | 9,000 coins | No exclusive crop — raw plot space |
| Expansion 5+ | +50% per step | Scaling diminishing returns |

*Expansions obtained via gate quest give a "Free Expansion Pass" — does not affect the price ladder.*

---

### Workers
| Item | Cost |
|---|---|
| Hire worker | 800 coins |
| Worker weekly wage | 150 coins/day (must be paid or worker stops) |

*Workers stop functioning if unpaid for 2+ days. They don't quit — just idle until paid.*

---

### Pets & Beauty (Coins)
| Item | Cost |
|---|---|
| Dog | 500 coins |
| Cat | 400 coins |
| Chicken | 200 coins |
| Goat | 300 coins |
| Garden Statue | 150 coins |
| Scarecrow | 100 coins |
| Flower Bed | 80 coins |
| Windmill | 350 coins |
| Lantern Post | 120 coins |

*MANA-exclusive cosmetics (future): special breed pets, seasonal decorations, premium skins.*

---

## Money Sinks Summary
To prevent coin hoarding with nothing to spend on:

| Sink | Frequency |
|---|---|
| Seeds | Every harvest cycle |
| Fertilizer | Optional but regular |
| Worker wages | Daily |
| Land expansions | Major milestone spend |
| Beauty items | Ongoing optional |
| Quest retributions | Occasional forced spend |

---

## Design Notes
- T1 crops should never become worthless — they are fast coin and quest filler forever
- T3 crops are high-risk/high-reward: big investment, 3 watering commitments, large spoilage window
- The gap between "enough to buy seeds" and "enough to buy an expansion" should feel like meaningful progress, not a grind wall
- Worker wages create a gentle daily pressure — keeps players logging in to manage their farm
