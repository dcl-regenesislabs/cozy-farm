# Quest System

## Overview
NPCs appear at the farm entrance and queue up with requests. There are always active quests available. Completing quests provides coins, items, or progression unlocks. Ignoring quests slows progression but rarely punishes directly — except retribution quests.

---

## NPC Queue Rules

- Max **3 NPCs** waiting at the farm entrance at any time
- A new NPC appears **~2 minutes** after the previous one is resolved
- NPCs must be served **in order** — skipping or serving out of order triggers consequences
- If a player ignores an NPC too long, NPCs get mad and consequences apply

### Out-of-Order Consequences (random, scaled by game progress)
| Consequence | Description |
|---|---|
| Worker disabled | One worker is incapacitated for 24h |
| Crop burning | 1–3 random plots burned (scales with expansion level) |
| Dog theft | If player owns a dog, it gets stolen — triggers recovery quest |

---

## Quest Types

### Regular Quests
- Fully optional
- No penalty for ignoring
- Reward: coins, fertilizer, seeds, or beauty items
- Example: *"Hey neighbour, I'm making omelettes — got 10 onions to spare?"*

### Retribution Quests
- Triggered by player actions (dog pooping, crop encroachment, etc.)
- Has a **timer** — if not started before timer runs out, consequences trigger
- Completing it provides a reward on top of clearing the penalty
- Example: *"Your dog pooped on my front door. My wife slipped on the tomatoes. Pay me 10 coins and give me 40 tomatoes."*

### Gate Quests
- Required to unlock specific seeds, land expansions, or features
- No timer, no penalty for ignoring — but progression is blocked until completed
- Example: *"If you want to grow lavender, prove yourself — bring me 20 carrots and 15 potatoes first."*

---

## Consequence Scaling

Retribution and out-of-order consequences scale with player progress to keep them meaningful but fair:

| Stage | Crop Burn Amount | Worker Disable Duration |
|---|---|---|
| Early (1 expansion) | 2–3 plots | 12h |
| Mid (2–3 expansions) | 3–5 plots | 24h |
| Late (4+ expansions) | 4–6 plots | 24h |

---

## Dog Theft Quest (Special Case)
- Triggered when a retribution quest involving the dog is ignored
- Dog disappears from the farm visually
- A new NPC appears with a ransom demand — costs more than the original retribution quest
- Until resolved, dog beauty bonus is removed

---

## NPC Roster
6 recurring characters with distinct personalities. Players will learn to recognize them.

| NPC | Personality | Quest Style |
|---|---|---|
| Gerald | Passive-aggressive neighbour | Retribution-heavy, dramatic demands |
| Rosa | Sweet old lady | Simple regular quests, generous rewards |
| Marco | Competitive farmer | Gate quests and challenges |
| Lily | Local chef | High crop volume requests, good coin rewards |
| Dave | Clumsy disaster magnet | Always in some situation, mix of all types |
| Mayor Chen | Town authority | Gate quests, unlocks special items or land |

---

## Quest Rewards (examples)
| Type | Possible Rewards |
|---|---|
| Regular | 20–150 coins, fertilizer bags, bonus seeds |
| Retribution (completed) | Coin forgiveness + 10–50 coins bonus |
| Gate | Seed unlock, land expansion pass, beauty item |
| Dog ransom | Dog returned + small coin reward for patience |

---

## Notes
- Retribution quests are indirectly caused by the player's dog — having a dog increases retribution frequency
- Land expansion passes from gate quests do not count toward price increases for purchased expansions
- Future: quests may include time-of-day or seasonal flavour text variants
