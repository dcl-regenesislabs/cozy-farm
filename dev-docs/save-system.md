# Save System — Auth & Server Persistence

## Overview
All player state currently resets on page reload. This document defines how CozyFarm persists progress using Decentraland's `signedFetch` for authentication and an external backend API for storage.

---

## How DCL Authentication Works

Decentraland provides `signedFetch` (from `@dcl/sdk/ecs`), a drop-in replacement for `fetch` that:
1. Takes the player's Ethereum wallet address
2. Signs the request body with their DCL identity
3. Sends the signature as a request header

The backend verifies the signature cryptographically — no login, no passwords. The wallet address IS the player ID.

**Permission required in `scene.json`:**
```json
"requiredPermissions": [
  "ALLOW_TO_TRIGGER_AVATAR_EMOTE",
  "ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE",
  "USE_SIGNED_FETCH"
]
```

---

## Backend Architecture

### Recommended Stack
- **Runtime:** Node.js / Express (or Cloudflare Workers for serverless)
- **Database:** Supabase (free tier — Postgres + REST API + row-level security)
- **Auth:** DCL signature verification via `@dcl/crypto` library
- **Hosting:** Railway, Render, or Fly.io (simple deploys, free tiers available)

### Endpoints

```
POST /api/player/load
  → Verify signature → Return player state JSON

POST /api/player/save
  → Verify signature → Upsert player state to DB

POST /api/player/action/water
  → Verify visitor signature → Record watering on target player's farm (social)

POST /api/player/mailbox/collect
  → Verify signature → Return pending rewards, clear mailbox

POST /api/player/like
  → Verify visitor signature → Record like on target player's farm
```

### Server Verification Flow
```
Client sends: POST /api/player/load
  Headers: x-identity-auth-chain: [...]  (added automatically by signedFetch)
  Body: { timestamp: Date.now() }

Server:
  1. Extract wallet address from auth-chain header
  2. Verify signature using @dcl/crypto (verifyAuthChain)
  3. Load player record from DB WHERE wallet = address
  4. Return player state (or defaults for new player)
```

---

## Player State Schema (what gets persisted)

```typescript
interface SavedPlayerState {
  wallet: string               // Primary key — DCL wallet address
  displayName: string          // From getUserData, cached for social display
  coins: number
  xp: number
  level: number
  seeds: Record<string, number>      // CropType → count
  harvested: Record<string, number>  // CropType → count

  // Progression
  tutorialComplete: boolean
  tutorialStep: number               // 0-N for partial tutorial state
  expansionsOwned: number            // 0=tutorial only, 1=Exp1, etc.
  farmerHired: boolean
  farmerInventory: Record<string, number>
  farmerSeeds: Record<string, number>
  freeExpansionPasses: number

  // Quests
  completedQuestIds: string[]
  activeQuestId: string | null
  questProgress: Record<string, number>  // questId → current count

  // Stats (for quest tracking)
  totalCropsHarvested: number
  totalWaterCount: number
  totalSeedPlanted: number
  totalSellCount: number
  totalCoinsEarned: number

  // Beauty
  ownedPets: string[]                // pet IDs (e.g. 'dog', 'cat')
  activePets: string[]               // currently on farm (dog can be stolen)
  placedDecorations: PlacedItem[]    // [{itemId, gridX, gridY}]
  beautyScore: number                // computed, cached

  // Social
  mailbox: MailboxReward[]           // pending uncollected rewards
  totalLikesReceived: number
  lastVisitorWallets: string[]       // for dedup/spam protection

  // Plots
  plotStates: PlotSaveState[]        // persist in-progress crops between sessions
}

interface PlacedItem {
  itemId: string     // e.g. 'garden_statue', 'windmill'
  gridX: number
  gridY: number
}

interface MailboxReward {
  type: 'seeds' | 'coins'
  cropType: string | null
  amount: number
  fromWallet: string
  fromName: string
  reason: 'visit_water' | 'like'
  timestamp: number
}

interface PlotSaveState {
  plotIndex: number
  cropType: number       // -1 = empty
  plantedAt: number      // timestamp
  waterCount: number
  growthStarted: boolean
  growthStage: number
}
```

---

## Save Triggers (Client Side)

```
On scene enter:    signedFetch('/api/player/load') → populate playerState
On scene exit:     signedFetch('/api/player/save') → full state flush
Every 60 seconds:  debounced auto-save (catches disconnects)

Immediate saves on:
  - Harvest (coins + inventory change)
  - Sell (coins change)
  - Land expansion purchase (major milestone)
  - Quest completion (major milestone)
  - Tutorial step completion
  - Decoration placed / pet purchased
  - Mailbox collected
```

**Do NOT save on every frame or every watering** — batch minor actions into the 60s auto-save.

---

## New Player Defaults

When `load` returns no record (first time):
```typescript
{
  coins: 50,
  seeds: { Onion: 6 },      // enough to start tutorial
  xp: 0, level: 1,
  tutorialComplete: false,
  tutorialStep: 0,
  expansionsOwned: 0,
  ...all zeros/empty
}
```

---

## Plot State Persistence

Crops in progress need to be restored between sessions. On save, serialize all active PlotState components. On load, restore them:
- Reconstruct ECS components from saved data
- Recalculate current growth stage based on `plantedAt` + elapsed time
- A crop planted 1h ago with 2h total grow time loads already 50% grown

---

## "Shared World, Individual Views" Model

All players connect to **one World URL** (e.g. `cozyfarm.dcl.eth`). There is no fixed "owner" — every player is the owner of their own farm view.

### On Scene Join
1. Player connects to the shared World
2. Scene calls `signedFetch('/api/player/load')` using the connecting player's own wallet
3. Server returns that player's saved farm state
4. Scene spawns farm entities (crops, decorations, pets) from the loaded state — locally only, not synced to other players
5. Other players' avatars are visible via DCL's native avatar system, but their farm entities are not shown

### Visiting a Friend's Farm
When a player wants to see a friend's farm:
1. Friend appears as an avatar walking in the shared world
2. Click their avatar (or pick from a "Connected Players" list in the UI) → "Visit [Name]'s Farm"
3. Scene despawns the visitor's own farm entities
4. Scene calls `GET /api/player/snapshot?wallet=<friendWallet>` (public read, no auth needed)
5. Scene spawns friend's farm entities in read-only visitor mode
6. `playerState.visitingWallet` is set to the friend's wallet
7. "Return to My Farm" button: despawns friend's entities, respawns cached own entities

This means each player always experiences exactly one farm at a time — their own or a friend's.

```typescript
// Added to playerState
visitingWallet: string | null  // null = own farm, wallet = visiting friend
```

---

## Offline Crop Growth

When the player logs back in after being away:
- Fetch save state from server
- Calculate `elapsed = now - plotSaveState.plantedAt`
- If `elapsed >= growTimeMs` → crop is ready (isReady: true)
- If watering windows were missed while offline → yield penalty applies

This means crops planted before logging out continue growing — players return to harvests waiting.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Server unreachable on load | Use last locally-cached state (if any); show "Playing offline" banner |
| Save fails | Retry up to 3 times with exponential backoff |
| Signature invalid | Server returns 401; client shows "Auth failed, reconnect" |
| DB write conflict | Last-write-wins (player is always single session) |

---

## Implementation Checklist

- [ ] Add `USE_SIGNED_FETCH` to `scene.json`
- [ ] Deploy backend API (Node/Express + Supabase)
- [ ] Implement `POST /api/player/load` + `save`
- [ ] Add `signedFetch` wrapper module to `/src/services/saveService.ts`
- [ ] Modify `src/index.ts` to await `loadPlayerState()` before scene init
- [ ] Add 60s debounced auto-save system
- [ ] Add scene exit save hook
- [ ] Extend `gameState.ts` with new fields (tutorialStep, expansionsOwned, placedDecorations, mailbox, etc.)
- [ ] Serialize/restore PlotState on save/load
