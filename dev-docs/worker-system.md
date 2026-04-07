# Worker System

## Overview
Workers are hired NPCs that autonomously manage assigned land expansions. They plant, water, and harvest crops — but never sell. Selling is always the player's job.

Workers work in real time, including while the player is offline. This is the primary offline progression mechanic.

---

## What Workers Do
| Task | Details |
|---|---|
| Plant seeds | Uses seeds from their personal inventory |
| Water crops | Waters at the correct growth windows automatically |
| Harvest crops | Collects ready crops and stores them in their stock area |
| Apply fertilizer | Applies fertilizer from their inventory if loaded |

Workers do **not**: sell crops, buy seeds/fertilizer, interact with NPCs, or move between expansions.

---

## Assignment
- Each worker is tied to **one land expansion**
- One worker per expansion maximum
- Workers can only be hired after the expansion they'll manage is unlocked
- A worker without an expansion cannot be hired

---

## Worker Inventory
Each worker has their own small inventory (visual crate near their expansion):

- Seed slots: up to 3 seed types loaded at a time
- Fertilizer slots: up to 2 fertilizer types loaded at a time
- The player loads these manually — walk to the worker's stock area and interact

Workers will plant whatever seeds are in their inventory, prioritizing in the order they were loaded. If inventory is empty, they idle (stand around, no animation urgency).

---

## Worker Stock Area
- A small crate/bin structure visible near each expansion
- Holds harvested crops until the player collects them
- Has a visual fill state (empty / half / full)
- If the stock area is full, the worker stops harvesting until the player empties it
- Player must manually collect from the stock area and bring crops to the main barn before selling

---

## Wages
- Cost to hire: **800 coins** (one-time)
- Daily wage: **150 coins/day**, deducted automatically
- If unpaid for **2+ days**, the worker idles (stops all tasks) until back-pay is cleared
- Workers do not quit — they wait to be paid
- Player pays wages via the farm computer

---

## Offline Behaviour
Workers continue operating while the player is offline:
- Planting, watering, and harvesting proceed on their real-time schedule
- Crops in their expansion can still wilt if not harvested in time (worker prioritises harvesting before spoilage)
- Worker stock area can fill up — if full, harvested crops are lost (motivation to log in)
- Wages still accrue offline

---

## Worker Limits
- Max workers = number of unlocked expansions (1 per expansion)
- With 5 expansions = max 5 workers
- No worker upgrades at launch — future consideration

---

## Worker States (visual)
| State | What player sees |
|---|---|
| Active | Worker moving between plots, doing tasks |
| Idle (no seeds) | Worker standing near their crate, no movement |
| Idle (unpaid) | Worker sitting down, crossed arms |
| Disabled (NPC consequence) | Worker lying/sitting, bandaged — out for duration |

---

## Notes
- Workers are a major quality-of-life unlock — the game shifts from micro-managing every plot to strategic oversight
- The stock area "cap" is intentional — it keeps players returning even with a full worker roster
- Future: worker cosmetic skins via MANA (purely visual, no stat changes)
