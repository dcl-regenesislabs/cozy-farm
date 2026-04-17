# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start      # local preview (Creator Hub or browser)
npm run build      # type-check + bundle (catches errors before deploy)
npm run deploy     # deploy to Decentraland World (mendoexit.dcl.eth)
```

## SDK Version — Important

This project uses a **pre-release SDK** to get the `@dcl/sdk/server` module (auth server + Storage API). The installed versions are:

```bash
@dcl/sdk          → @auth-server tag  (7.21.1-22918726402.commit-ee210ee)
@dcl/js-runtime   → same pre-release  (7.21.1-22918726402.commit-ee210ee)
```

**Both packages must be on the same pre-release version.** If you ever run `npm install` and get TypeScript errors about duplicate identifiers (`Entity`, `DEBUG`, `RequestRedirect`, etc.), it means npm created a nested copy of `@dcl/js-runtime` inside `@dcl/sdk/node_modules/`. Fix it by pinning both to the same version:

```bash
npm install --save-dev @dcl/sdk@auth-server @dcl/js-runtime@7.21.1-22918726402.commit-ee210ee
```

Do **not** run `npm run upgrade-sdk` — it will downgrade to `latest` which lacks `@dcl/sdk/server`.

## Architecture

### Client / Server Split

`src/index.ts` is the entry point for both the client and the headless server. The split is controlled by a single guard:

```ts
if (isServer()) {
  setupFarmServer()
  return           // server never runs any client code
}
// everything below is client-only
```

When deployed, DCL spins up the server automatically because `scene.json` has `"authoritativeMultiplayer": true`. No external hosting is needed.

### Save / Persistence Flow

The save system is the spine of the project. Understanding this flow is essential before touching anything that persists data:

```
Client boots
  → playerState.wallet is set from PlayerIdentityData / getUserData
  → initSaveService() registers farmStateLoaded listener
  → sends playerLoadFarm {} to server

Server (farmServer.ts)
  → receives playerLoadFarm, calls store.load(address)
  → FarmProgressStore checks cache, then Storage.player.get()
  → normalizeFarm() fills missing fields (schema migration guard)
  → sends farmStateLoaded payload back to client

Client
  → applyPayload() writes payload into playerState + ECS PlotState components
  → restorePlotStates() recalculates crop growth based on elapsed real time
  → onLoaded() callback fires → tutorialSystem and NPC rotation start

Auto-save
  → client: setTimeout every 60s → saveFarm() → room.send('playerSaveFarm', payload)
  → server: ECS system every 20s → store.saveDirty() → Storage.player.set()
```

### Adding a New Saved Field

Every saved field touches **four files** in lockstep:

1. **`src/shared/farmMessages.ts`** — add field to `FarmStateSchema` and `FarmStatePayload` type
2. **`src/server/storage/playerFarm.ts`** — add to `FarmSaveV1`, `emptyFarm()`, `normalizeFarm()`, `farmSaveToPayload()`, and `applyPayload()`
3. **`src/game/gameState.ts`** — add to `playerState` if it's player-facing
4. **`src/services/saveService.ts`** — add to `buildSavePayload()` and `applyPayload()`

The storage key is `farm_v1`. If you make a breaking schema change (removing or renaming fields), bump `SCHEMA_VERSION` in `playerFarm.ts` — `normalizeFarm()` resets to `emptyFarm()` when the version doesn't match, so old saves are wiped cleanly.

### State Management

`playerState` (in `src/game/gameState.ts`) is the single source of truth for all client-side game state. It is a plain mutable object — no reactive system, no pub/sub. UI components read from it each render frame via React-ECS. Always mutate `playerState` directly and let the UI re-render naturally.

ECS components are used for **world-space entities only** (soil plots, NPCs, VFX). `PlotState` (in `src/components/farmComponents.ts`) is the ECS component attached to each soil entity — it mirrors the save state for active crops and is the source of truth for plot logic.

### Adding New Gameplay (Client-Only)

Most features (new UI panels, new systems, new 3D interactions) are client-only and don't require server changes. The pattern is:

- New game logic → `src/game/actions.ts` (exported functions)
- New ECS system → `src/systems/` (import in `src/index.ts`)
- New UI panel → `src/ui/` (React-ECS component, registered in `src/ui.tsx`)
- New static data → `src/data/` (pure data files, no side effects)

### Circular Dependency Pattern

`tutorialSystem` → `interactionSetup` → `actions` → `tutorialSystem` is a known circular import. It is broken with callback stubs in `tutorialState.ts`:

```ts
export const tutorialCallbacks = {
  unlockSoilsPhase1: () => {},
  getFirstSoilEntity: (): AnyEntity | null => null,
  // ...
}
```

These are wired in `index.ts` after all modules are loaded. Follow this pattern if you hit similar circular deps.

### UI System

UI is built with **React-ECS** (JSX rendered to screen-space). All panels are toggled via `playerState.activeMenu` (type `MenuType`). The bottom nav and `PanelShell` handle open/close animations. To add a new panel:

1. Create the component in `src/ui/`
2. Add its `MenuType` string to `gameState.ts`
3. Render it conditionally in `src/ui.tsx`
4. Add a nav button in `src/ui/BottomNav.tsx`

### Crop System

Crops are defined in `src/data/cropData.ts`. Each `CropDefinition` has tier (1/2/3), `growTimeMs`, `wateringsRequired`, `seedCost`, `sellPrice`, and yield range. Watering windows are time-based: window `k` opens at `k/N * growTimeMs` and closes at `(k+1)/N * growTimeMs`. Missing a window permanently reduces yield (not penalized further).

### NPC System

NPCs are spawned via `initNpcSystem()`. The Mayor is the tutorial guide. After the tutorial completes, `REGULAR_NPC_ROSTER` cycles through NPCs on a 30-second interval. NPC dialog is driven by `npcDialogState` (in `src/game/npcDialogState.ts`) and rendered by `NpcDialogMenu.tsx`.
