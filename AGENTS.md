# AGENTS.md

Context for AI coding agents (Cursor, Copilot, Windsurf, etc.) working in this repository.

## What This Is

CozyFarm is a **Decentraland SDK7 scene** — a multiplayer farming game deployed to a DCL World (`mendoexit.dcl.eth`). It uses TypeScript, React-ECS for UI, and a DCL-hosted authoritative server for save persistence.

## Commands

```bash
npm run start    # local preview
npm run build    # type-check + bundle (run before deploying)
npm run deploy   # deploy to Decentraland World
```

## Critical: SDK Version

This project is pinned to a **pre-release SDK** because it uses `@dcl/sdk/server` (not yet in the `latest` tag):

```
@dcl/sdk         → 7.21.1-22918726402.commit-ee210ee  (auth-server tag)
@dcl/js-runtime  → 7.21.1-22918726402.commit-ee210ee  (must match exactly)
```

**Do not upgrade the SDK** with `npm run upgrade-sdk` — it will break the server. If you see TypeScript errors about duplicate `Entity`, `DEBUG`, or `RequestRedirect` identifiers after an install, it means the two packages got out of sync. Fix by reinstalling both at the matching version:

```bash
npm install --save-dev @dcl/sdk@auth-server @dcl/js-runtime@7.21.1-22918726402.commit-ee210ee
```

## Project Structure

```
src/
  index.ts                  ← entry point for both client and server
  game/
    gameState.ts            ← playerState singleton (all client game state)
    actions.ts              ← all gameplay logic (plant, water, harvest, buy, sell)
    tutorialState.ts        ← tutorial step machine + callbacks
    questState.ts           ← quest tracking
    npcDialogState.ts       ← NPC dialog state
    musicState.ts           ← music system state
  server/
    farmServer.ts           ← server entry: handles load/save messages
    storage/playerFarm.ts   ← Storage read/write + cache + schema migration
  services/
    saveService.ts          ← client-side save/load orchestration
  shared/
    farmMessages.ts         ← message schemas + types (shared by client + server)
  components/
    farmComponents.ts       ← ECS component definitions (PlotState)
  systems/                  ← ECS systems (growth, NPC, VFX, audio, tutorial...)
  ui/                       ← React-ECS UI panels
  data/                     ← static data (crops, NPCs, quests, models, images)
```

## Client / Server Architecture

`src/index.ts` runs on both the client and the headless DCL server. The split is one `if` block:

```ts
import { isServer } from '@dcl/sdk/network'

if (isServer()) {
  setupFarmServer()
  return   // server exits here — never runs UI or systems
}
// client code below
```

The server is hosted automatically by Decentraland's infrastructure when `"authoritativeMultiplayer": true` is set in `scene.json`. You do not need to run or host the server manually.

## Save System — How It Works

Understanding this flow is essential for any feature that persists data:

| Step | What happens |
|---|---|
| Client boots | `playerState.wallet` is set from `PlayerIdentityData` / `getUserData` |
| `initSaveService()` | Registers `farmStateLoaded` listener, sends `playerLoadFarm` to server |
| Server | Loads from `Storage.player`, normalizes schema, sends `farmStateLoaded` back |
| Client | `applyPayload()` restores `playerState` + ECS `PlotState` components |
| `onLoaded` callback | Tutorial and NPC systems start (they depend on restored state) |
| Auto-save | Client: every 60s. Server: flushes dirty cache every 20s |

## Adding a Saved Field

Every new persisted field touches **four files**:

1. `src/shared/farmMessages.ts` — add to `FarmStateSchema` and `FarmStatePayload`
2. `src/server/storage/playerFarm.ts` — add to `FarmSaveV1`, `emptyFarm()`, `normalizeFarm()`, `farmSaveToPayload()`, `applyPayload()`
3. `src/game/gameState.ts` — add to `playerState` if client-facing
4. `src/services/saveService.ts` — add to `buildSavePayload()` and `applyPayload()`

Storage key is `farm_v1`. Bump `SCHEMA_VERSION` in `playerFarm.ts` for breaking changes — old saves reset to `emptyFarm()`.

## Key Patterns

**`playerState`** — plain mutable singleton, source of truth for all client game state. UI re-reads it each frame. Mutate directly.

**`PlotState` ECS component** — attached to each soil entity, mirrors crop state for world-space logic. Index 0–27.

**Circular import fix** — `tutorialCallbacks` in `tutorialState.ts` holds function stubs wired in `index.ts` after all modules load. Follow this pattern to break future circular deps.

**UI panels** — toggled via `playerState.activeMenu` (a `MenuType` string). Add new panels by: creating component in `src/ui/`, adding its string to `MenuType`, rendering in `src/ui.tsx`, and adding a nav button in `src/ui/BottomNav.tsx`.

**New crops** — add a `CropType` enum value to `src/data/cropData.ts`, add its `CropDefinition` to `CROP_DATA`, and add model paths to `src/data/modelPaths.ts` and image paths to `src/data/imagePaths.ts`.

## What Requires Server Changes vs. What Doesn't

| Change | Server? |
|---|---|
| New UI panel or visual | ❌ Client only |
| New 3D object / system / VFX | ❌ Client only |
| New gameplay that affects a saved field | ✅ Update save schema (4 files) |
| New multiplayer action seen by other players | ✅ New message in `farmMessages.ts` + handler in `farmServer.ts` |
