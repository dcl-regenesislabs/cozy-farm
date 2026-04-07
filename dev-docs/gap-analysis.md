# CozyFarm — Gap Analysis & Next Phase Roadmap

## Overview
The MVP farming loop is complete and stable. This document maps out what exists, what's designed but not coded, and what's entirely missing — ordered by priority for closing out the game into a feature-complete experience.

---

## Status Summary

### ✅ Built & Working (Code)
| System | Notes |
|---|---|
| Core farming loop | Plant / water / grow / harvest / sell / buy fully functional |
| 9 crops, 3 tiers | Growth timers, watering, yield calculations working |
| 28 soil plots | First 6 player-controlled, 22 farmer-controlled |
| XP + Leveling (1–20) | Level rewards at milestones, XP per action |
| NPC system | 6 NPCs, state machine AI, dialog, quest tracking |
| Quest system | 6 quests (one per NPC), progress hooks wired |
| Farmer/worker | Basic auto-watering NPC, hired once for 100 coins |
| Shop / Sell / Inventory | Full UI panels operational |
| VFX | Seed plant, watering, harvest float, XP float |

---

### 🟡 Designed in Dev-Docs — Not Yet Coded
| System | Design Doc | Gap |
|---|---|---|
| Beauty system | `beauty-system.md` | Score calculation, decorator items, visitor visibility |
| Fertilizer | `fertilizer-system.md` | No shop tab, no per-plot fertilizer state |
| Land expansions | `land-expansions.md` | Current code has a single 1000-coin unlock; full expansion system missing |
| Worker wages | `economy.md`, `worker-system.md` | Farmer doesn't charge daily wages or idle when unpaid |
| Multiplayer sync | `beauty-system.md` (visitor section) | No syncEntity, no MessageBus, no USE_SIGNED_FETCH permission |

---

### ❌ Entirely Missing (No Docs, No Code)
| System | Priority | Blocker For |
|---|---|---|
| **Save / Auth server** | 🔴 Critical | Everything — state resets on every reload |
| **Tutorial (Mayor Chen)** | 🔴 High | First-time player experience; retention |
| **Dog companion** | 🟡 Medium | Beauty system, retribution quests |
| **Beauty object placement** | 🟡 Medium | Beauty system can't be used without placement |
| **Social system (visits + mailbox)** | 🟡 Medium | Retention, virality |
| **Progression rebalance** | 🟡 Medium | Code numbers diverge from economy.md targets |

---

## Gap Details

### 1. Save / Auth Server (🔴 Critical)
No persistence exists. All player progress resets on page reload.

**Required work:**
- Add `USE_SIGNED_FETCH` to `scene.json` requiredPermissions
- Design + deploy a lightweight backend API (save/load endpoints)
- Wire `signedFetch` calls into scene: load on enter, save on meaningful actions
- See `dev-docs/save-system.md` for full design

---

### 2. Tutorial — Mayor Chen (🔴 High)
No onboarding flow. New players are dropped in with no guidance.

**Required work:**
- Detect first-time players via save system (`tutorialComplete: false`)
- Mayor Chen-driven step-by-step dialog sequence
- Tutorial tracks progress through: plant → water → harvest → sell → buy
- Completion reward: 6 extra plots unlocked (matches economy.md Phase 1)
- See `dev-docs/tutorial-system.md` for full design

---

### 3. Dog Companion (🟡 Medium)
Dog is referenced in `economy.md` (500 coins), `quest-system.md` (theft mechanic), and `beauty-system.md` (+80 beauty). No implementation doc or code.

**Required work:**
- Write `dev-docs/dog-system.md` (owned by user to create next)
- Dog entity spawns on farm after purchase (wanders freely)
- Dog state: owned / stolen / recovering
- Beauty score contribution: +80 when present
- Dog triggers retribution quests more frequently (hook into npcSystem)
- Dog theft quest: dog entity disappears until ransom quest resolved
- See `dev-docs/quest-system.md` (dog theft section) for quest flow

---

### 4. Beauty Object Placement (🟡 Medium)
The beauty system defines items and scores but has no mechanic for HOW players place items.

**Required work:**
- Grid-based placement on a dedicated decoration zone
- "Placement mode" UI state triggered from Beauty panel
- Placed decorations saved to server as `{itemId, gridX, gridY}`
- Beauty score computed from placed items + pets + crop variety bonus
- See `dev-docs/placement-system.md` for full design

---

### 5. Social System (🟡 Medium)
No cross-player interaction. Key retention loop missing.

**Required work:**
- Visitor sees world owner's farm state (loaded from server)
- Visitor can water crops → server records, owner gets seeds reward via mailbox
- Visitor can leave a "like" → owner gets notification + small coin bonus
- Mailbox entity: flag raises when rewards pending, click to collect
- Real-time presence via DCL's multiplayer (players see each other in scene)
- Async fallback: interactions saved server-side regardless of owner online status
- See `dev-docs/social-system.md` for full design

---

### 6. Progression Rebalance (🟡 Medium)
Current code numbers were set during MVP and diverge from economy.md targets.

| Item | Code (current) | Design Target |
|---|---|---|
| Starting coins | 2,000 | ~50 (onion seeds only) |
| Onion seed cost | 3 coins | 10 coins |
| Potato seed cost | 5 coins | 12 coins |
| Garlic seed cost | 8 coins | 15 coins |
| Tomato seed cost | 15 coins | 45 coins |
| Carrot seed cost | 25 coins | 35 coins |
| Corn seed cost | 50 coins | 55 coins |
| Lavender seed cost | 100 coins | 200 coins |
| Pumpkin seed cost | 150 coins | 220 coins |
| Sunflower seed cost | 180 coins | 180 coins |
| Farmer hire cost | 100 coins | 800 coins |
| Crop unlock gate | 1,000 coins (single) | Expansion system (500→1,500→4,000) |
| Level 10 reward | +500 coins | Recalibrate to match economy |

**Required work:**
- Align `cropData.ts` seed costs with economy.md
- Replace single "Unlock for 1000 coins" gate with full expansion system
- Add worker wage system (150 coins/day, idles if unpaid 2+ days)
- Recalibrate starting resources (few onion seeds, minimal coins)
- Reconsider level reward values against new economy baseline

---

## Recommended Implementation Order

```
Phase A — Foundation
  1. Save / Auth server          (blocks everything)
  2. Tutorial — Mayor Chen       (blocks player retention)

Phase B — Core Game Loop Completion
  3. Progression rebalance       (align code with design docs)
  4. Land expansion system       (replaces current single unlock gate)
  5. Worker wages                (completes the worker system)

Phase C — Depth & Engagement
  6. Dog companion               (unlocks beauty + retribution quests)
  7. Beauty object placement     (unlocks beauty score system)
  8. Fertilizer system           (adds strategic layer)

Phase D — Social & Retention
  9. Social system (mailbox + visits)
  10. Beauty leaderboard         (referenced in beauty-system.md)
  11. MANA cosmetics             (future)
```

---

## Files to Know
| File | What It Covers |
|---|---|
| `dev-docs/save-system.md` | Auth + persistence via signedFetch |
| `dev-docs/tutorial-system.md` | Mayor Chen onboarding flow |
| `dev-docs/social-system.md` | Visits, watering, likes, mailbox |
| `dev-docs/placement-system.md` | Decoration placement mechanics |
| `dev-docs/economy.md` | Price targets, progression milestones |
| `dev-docs/beauty-system.md` | Beauty score, items, visitor visibility |
| `dev-docs/land-expansions.md` | Expansion map and costs |
| `dev-docs/quest-system.md` | NPC roster, quest types, dog theft |
| `src/game/gameState.ts` | Player state singleton (needs new fields) |
| `src/data/cropData.ts` | Seed/sell prices (needs rebalance) |
| `scene.json` | Permissions (add USE_SIGNED_FETCH) |
