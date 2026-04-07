# Social System — Visits, Watering, Likes & Mailbox

## Overview
CozyFarm runs on a single shared World URL (e.g. `cozyfarm.dcl.eth`). Every player connects to the same Decentraland instance and sees their own farm loaded from the server. Other players' avatars are visible walking around, but each player sees only their own crops and decorations — not everyone else's simultaneously.

To visit a friend's farm, a player triggers an in-scene view switch: their farm entities despawn and the friend's farm is rendered in their place. All of this happens within the same URL — no separate World per player.

---

## "Shared World, Individual Views" — How It Works

```
Player A joins cozyfarm.dcl.eth
  → Scene loads Player A's farm from server
  → Player A sees their own crops, decorations, pets

Player B joins cozyfarm.dcl.eth (same instance)
  → Scene loads Player B's farm from server
  → Player B sees their own crops, decorations, pets

Player A and Player B see each other's AVATARS walking around (DCL native)
Player A does NOT see Player B's crops — they each see their own farm
```

---

## Connected Players

DCL natively provides a list of players in the current World instance. CozyFarm uses this to build the "Visit a Farm" feature.

```typescript
import { getConnectedPlayers } from '~system/Players'
// Returns: [{ userId, displayName }] for everyone currently in the scene
```

This list powers the social UI panel — players can see who is online and jump to their farm.

---

## Visiting a Friend's Farm

### Trigger Options
1. **Click their avatar** in the 3D world → a popup appears: "Visit [Name]'s Farm?"
2. **Social panel** (new bottom nav tab or sub-panel in computer UI) → shows connected players → "Visit" button next to each name

### View Switch Flow
1. Player A clicks "Visit Bob's Farm"
2. Confirmation: "Switch to Bob's farm? You can return anytime."
3. Player A's own farm entities despawn (state is cached in memory — no re-fetch needed on return)
4. `GET /api/player/snapshot?wallet=<bob_wallet>` fetched (public read, no auth)
5. Bob's farm entities spawn in visitor mode (read-only: no harvesting, no selling, no buying)
6. `playerState.visitingWallet = bob_wallet`
7. Visitor HUD activates (see below)

### Return to Own Farm
Player clicks "Return to My Farm" in the visitor HUD:
1. Bob's farm entities despawn
2. Player A's cached farm state re-spawns
3. `playerState.visitingWallet = null`
4. Normal HUD restored

---

## Visitor Mode

When `playerState.visitingWallet !== null`, the player is in visitor mode.

### What Visitors Can Do
- Walk around and see the farm (crops, decorations, pets)
- Water crops that need watering (limited: see rules below)
- Leave a like

### What Visitors Cannot Do
- Plant, harvest, sell, buy (those interact with own state only)
- Access own inventory or shop
- Place or move decorations

### Visitor HUD
```
┌────────────────────────────────────────────────┐
│  Visiting Bob's Farm   Beauty: Charming  ❤️ 14  │
│  [Water a Crop]   [Like this Farm ❤️]           │
│                          [Return to My Farm →]  │
└────────────────────────────────────────────────┘
```

---

## Watering (Visitor Action)

### UX Flow
1. Visitor clicks a plot that needs watering on the friend's farm
2. Prompt: "Water this crop for Bob? He'll get a seed reward in his mailbox."
3. Visitor confirms → watering VFX plays, water count shows updated

### Server Call
```
POST /api/social/water
Body: { targetWallet, plotIndex }
Headers: x-identity-auth-chain (signedFetch — visitor's wallet)
```

### Server Logic
- Verify visitor signature
- Load target farm's plot state
- Check: plot needs watering + hasn't been visitor-watered this grow cycle
- Advance `waterCount` on target's saved plot state
- Queue mailbox reward for target: `{ type: 'seeds', cropType: sameAsCrop, amount: 1–3 }`
- Return: `{ success: true, newWaterCount: N }`

### Real-Time Feedback (if owner is online)
```typescript
import { MessageBus } from '@dcl/sdk/message-bus'

// Visitor sends:
bus.emit('visitorWatered', { plotIndex: 5, visitorName: 'Alice' })

// Owner receives (if connected to same instance):
bus.on('visitorWatered', (data) => {
  // Show watering VFX on plot + toast: "Alice watered your Tomato!"
})
```

If the owner is offline, the watering is still saved server-side. They'll see it in the mailbox when they log back in.

### Limits
- 1 visitor watering per plot per grow cycle (spam prevention)
- Max 5 plots watered per visit session
- Visitor's own water count is not affected

---

## Likes

### UX Flow
1. "Like this Farm" button in visitor HUD
2. Sends like to server → toast: "You liked Bob's farm!"
3. Button grays out (already liked today)

### Server Call
```
POST /api/social/like
Body: { targetWallet }
Headers: x-identity-auth-chain (signedFetch — visitor's wallet)
```

### Server Logic
- Rate limit: 1 like per (visitorWallet + targetWallet) per 24h
- Increment `totalLikesReceived` for target
- Queue mailbox reward: `{ type: 'coins', amount: 10–25 }`
- Log visitor name in `recentVisitors` for target's stats panel

---

## Mailbox

### Physical Entity
A mailbox model sits near the farm entrance. It has two visual states:
- **Empty:** Flag down
- **Reward pending:** Flag raised — click to collect

Flag state is set on scene load from `playerState.mailbox.length > 0`. Only visible on own farm (not in visitor mode).

### Mailbox UI
```
┌────────────────────────────────────────┐
│  📬 Your Mailbox                        │
│                                        │
│  Alice watered 3 of your Tomatoes      │
│  Reward: +3 Tomato Seeds               │
│                                        │
│  Carol watered your Corn               │
│  Reward: +2 Corn Seeds                 │
│                                        │
│  Dave liked your farm ❤️               │
│  Reward: +15 Coins                     │
│                                        │
│  [Collect All]                         │
└────────────────────────────────────────┘
```

"Collect All" calls `POST /api/player/mailbox/collect`, adds rewards to playerState, triggers auto-save.

---

## Social Panel (UI)

A new tab accessible from the computer or bottom nav: "Neighbours".

```
┌─────────────────────────────────────────┐
│  Neighbours Online (3)                   │
│                                         │
│  🟢 Alice          [Visit Farm]         │
│  🟢 Bob            [Visit Farm]         │
│  🟢 Carol          [Visit Farm]         │
│                                         │
│  Recent Visitors                        │
│  Dave visited 2 hours ago               │
│  Alice visited yesterday                │
└─────────────────────────────────────────┘
```

"Online" list comes from `getConnectedPlayers()`.
"Recent Visitors" comes from `playerState.recentVisitors` loaded from server.

---

## Reward Design

| Visitor Action | Farm Owner Gets | Visitor Gets |
|---|---|---|
| Water a crop | 1–3 seeds (matching crop type) | — |
| Leave a like | 10–25 coins | — |
| 5+ likes in one day | +50 bonus coins | — |
| Be visited for the first time today | +5 coins (discovery bonus) | — |

Visitor rewards are kept small for now. A future update can add a "generous helper" reward if the ecosystem grows.

---

## Anti-Abuse

| Abuse Vector | Protection |
|---|---|
| Alt wallets liking own farm | 1 like per (visitor + target) per 24h |
| Spam watering | 1 visitor watering per plot per cycle; 5 plots max per session |
| Bot visitors | signedFetch requires DCL client; bots can't sign |
| View-switch abuse | Snapshot endpoint is public read — no coins or state can be manipulated via it |

---

## Implementation Checklist

- [ ] Add `visitingWallet: string | null` to `gameState.ts`
- [ ] Add `USE_SIGNED_FETCH` to `scene.json` (shared with save system)
- [ ] Create `src/services/socialService.ts` — water, like, mailbox API wrappers
- [ ] Add avatar click handler → "Visit Farm?" popup (`interactionSetup.ts` or new system)
- [ ] Create `src/ui/SocialPanel.tsx` — online players list + recent visitors
- [ ] Create visitor HUD variant in `TopHud.tsx` (shown when `visitingWallet !== null`)
- [ ] Implement visit view switch: despawn own entities → fetch snapshot → spawn visitor farm
- [ ] Implement return: despawn visitor entities → respawn cached own entities
- [ ] Add watering prompt in visitor mode (confirmation before watering)
- [ ] Add "Like Farm" button in visitor HUD
- [ ] Wire MessageBus broadcast on visitor watering (for real-time owner feedback)
- [ ] Add mailbox entity to scene (physical model + flag raise/lower)
- [ ] Create `src/ui/MailboxPanel.tsx` — reward list + collect button
- [ ] Add `mailbox: MailboxReward[]` and `recentVisitors` to `gameState.ts`
- [ ] Backend: `POST /api/social/water`, `POST /api/social/like`, `GET /api/player/snapshot`, `POST /api/player/mailbox/collect`
