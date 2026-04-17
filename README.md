# CozyFarm

A multiplayer farming game built on Decentraland SDK7, deployed to a DCL World at **pepino.dcl.eth**.

Players buy seeds, plant and water crops, hire a farmer, adopt a dog, complete quests, and level up — with progress saved server-side per wallet address.

## Getting Started

**Prerequisites:** Node.js ≥ 16, npm ≥ 6, and the [Decentraland Creator Hub](https://decentraland.org/download/) or the `dcl` CLI.

```bash
npm install
npm run start     # local preview
npm run build     # type-check + bundle
npm run deploy    # deploy to mendoexit.dcl.eth
```

## ⚠️ SDK Version — Read Before Installing Packages

This project uses a **pre-release SDK** for the authoritative server feature (`@dcl/sdk/server`). Both packages must stay on the same pre-release version:

```
@dcl/sdk         → 7.21.1-22918726402.commit-ee210ee  (auth-server tag)
@dcl/js-runtime  → 7.21.1-22918726402.commit-ee210ee  (must match)
```

**Do not run `npm run upgrade-sdk`** — it will downgrade to `latest` which lacks the server module and will break the build.

If after `npm install` you see TypeScript errors about duplicate identifiers (`Entity`, `DEBUG`, `RequestRedirect`…), it means the packages drifted apart. Fix with:

```bash
npm install --save-dev @dcl/sdk@auth-server @dcl/js-runtime@7.21.1-22918726402.commit-ee210ee
```

## How the Server Works

The scene runs an **authoritative headless server** hosted by Decentraland's infrastructure (no external hosting needed). This is enabled by `"authoritativeMultiplayer": true` in `scene.json`.

When a player enters the scene:
1. The client sends a `playerLoadFarm` message to the server
2. The server loads the player's farm from DCL Storage and sends it back
3. The client restores `playerState` and all crop progress (including offline growth)
4. The farm auto-saves every 60s from the client and every 20s from the server

## Gameplay

| Feature | Description |
|---|---|
| **Crops** | 9 crop types across 3 tiers (Onion → Sunflower). Each has a grow time, watering windows, and yield range |
| **Watering** | Crops must be watered at specific time windows. Missing a window reduces harvest yield |
| **Shop** | Buy seeds from the in-scene computer terminal |
| **Sell** | Sell harvested crops at the truck for coins |
| **Farmer** | Hire an automated farmer who plants and harvests on your behalf |
| **Dog** | Buy a dog companion for 500 coins |
| **Leveling** | Earn XP from planting, watering, and harvesting. Level up to unlock rewards |
| **Quests** | Complete daily/progression quests for bonus rewards |
| **Tutorial** | First-time players are guided by Mayor Chen through the full farming loop |

## NPCs

Six visiting characters arrive on a 30-second rotation after the tutorial completes: Rosa, Gerald, Marco, Lily, Dave, and Mayor Chen (tutorial guide). Each has a unique model and dialog.

## Project Layout

```
src/
  index.ts              ← entry point (client + server, split by isServer())
  game/                 ← state singletons and game logic
  server/               ← headless server + Storage persistence
  services/             ← client-side save/load service
  shared/               ← message schemas shared by client and server
  components/           ← ECS component definitions
  systems/              ← ECS systems (growth, VFX, audio, tutorial…)
  ui/                   ← React-ECS screen-space UI panels
  data/                 ← static data (crops, NPCs, quests, assets)
```

For a detailed architecture guide, see [AGENTS.md](./AGENTS.md). For Claude Code–specific guidance, see [CLAUDE.md](./CLAUDE.md).
