# CozyFarm MVP Development Plan

## Context

CozyFarm is a Decentraland SDK7 farming game on a 32x32 parcel scene. The scene has 33 GLB models already placed via Creator Hub (28 soil plots, computer, truck, farm, bed, box) and 27 crop sprout models (9 crops x 3 growth stages). The codebase is an empty template — `src/index.ts` and `src/ui.tsx` are stubs with no logic. The goal is to build a playable MVP implementing the core farming loop: plant, water, grow, harvest, sell, buy seeds.

**What's in scope:** Core single-player farming loop with UI.
**What's out of scope (for now):** Workers, NPCs/quests, beauty system, fertilizer, land expansions, pets, multiplayer sync, spoilage/wilting.

---

## Phase 1: Data Layer & Project Structure

**Goal:** Define all static data, custom components, and module structure. Verify it compiles.

### New files to create:

```
src/
  index.ts                    (modify existing)
  ui.tsx                      (modify existing)
  data/
    cropData.ts               -- CropType enum, CropDefinition interface, CROP_DATA map
    modelPaths.ts             -- GLB path constants for soil + all crop stages
  components/
    farmComponents.ts         -- PlotState custom ECS component
  systems/
    growthSystem.ts           -- Growth timer system
    interactionSetup.ts       -- Entity discovery + pointer events
  game/
    gameState.ts              -- Player singleton (coins, seeds, harvested, menu state)
    actions.ts                -- plantSeed, waterCrop, harvestCrop, buySeed, sellCrop
  ui/
    Hud.tsx                   -- Coins + inventory display
    PlantMenu.tsx             -- Seed selection popup
    ShopMenu.tsx              -- Computer buy seeds UI
    SellMenu.tsx              -- Truck sell crops UI
```

### Key definitions:

- **CropType enum:** Onion, Potato, Garlic, Tomato, Carrot, Corn, Lavender, Pumpkin, Sunflower
- **CropDefinition:** type, tier, growTimeMs, wateringsRequired, seedCost, sellPrice, yieldMin, yieldMax
- **PlotState component** (on each soil entity): cropType, growthStage (0=empty,1-3), plantedAt, waterCount, isUnlocked, plotIndex
- **playerState** (module singleton): coins (start 100), seeds map, harvested map, activeMenu, activePlotEntity

**Verify:** `npm run build` compiles with no errors.

---

## Phase 2: Entity Discovery & Interactions

**Goal:** Find scene entities at runtime, attach components, register click handlers.

### Entity discovery via `engine.getEntityOrNullByName()`:
- Computer: `"Computer.glb"`
- Truck: `"Truck01.glb"`
- Soil plots: `"Soil01.glb"`, `"Soil01.glb_2"` through `"Soil01.glb_27"` (28 total)

### Attach PlotState to each soil entity:
- First 6 plots: `isUnlocked: true`
- Remaining 22: `isUnlocked: false` (locked for MVP)

### Pointer events (`pointerEventsSystem.onPointerDown`):
- **Soil click →** `handlePlotClick(entity)`:
  - Empty + unlocked → open PlantMenu
  - Growing + needs water → water it
  - Stage 3 (ready) → harvest it
- **Computer click →** open ShopMenu
- **Truck click →** open SellMenu

**Verify:** Run scene, click entities, confirm events fire (console.log).

---

## Phase 3: Core Game Actions & Growth System

**Goal:** Implement all gameplay actions and the growth timer.

### Actions (in `src/game/actions.ts`):

| Action | Key Logic |
|--------|-----------|
| `plantSeed(entity, cropType)` | Deduct seed, set PlotState, swap GltfContainer to Sprout01 |
| `waterCrop(entity)` | Increment waterCount (only if < required) |
| `harvestCrop(entity)` | Calculate yield (watering ratio affects it), add to inventory, reset plot to soil |
| `buySeed(cropType, qty)` | Deduct coins, add seeds |
| `sellCrop(cropType, qty)` | Remove from inventory, add coins |

### Model swapping pattern:
```ts
GltfContainer.createOrReplace(entity, { src: 'assets/scene/Models/OnionSprout02/OnionSprout02.glb' })
```
Entity keeps its Transform position from the composite — only the model changes.

### Growth system (`engine.addSystem`):
- Runs every frame, iterates all entities with PlotState
- Calculates `progress = (now - plantedAt) / growTimeMs`
- Stage transitions: `<50%` → stage 1, `50-99%` → stage 2, `≥100%` → stage 3
- On transition: swap GltfContainer to matching sprout model

**Verify:** Plant a Tier 1 crop (2 min), watch it progress through 3 visual stages, harvest it.

---

## Phase 4: UI (React-ECS)

**Goal:** Build all screen-space UI panels.

### Components:

- **Hud** (always visible, top-left): Coin count, seed inventory, harvested crop counts
- **PlantMenu** (modal): Lists seeds player owns, click to plant on selected plot, cancel button
- **ShopMenu** (modal): All 9 crops with name/cost/buy button, disabled if insufficient coins
- **SellMenu** (modal): Harvested crops with sell-all buttons, shows coin value

### UI rendering pattern:
```tsx
const MainUi = () => (
  <UiEntity>
    <Hud />
    {playerState.activeMenu === 'plant' && <PlantMenu />}
    {playerState.activeMenu === 'shop' && <ShopMenu />}
    {playerState.activeMenu === 'sell' && <SellMenu />}
  </UiEntity>
)
```
React-ECS re-renders every frame — reading `playerState` directly works without state management.

**Verify:** Full loop — see HUD, open each menu, buy seeds, plant, wait, harvest, sell, confirm coins update.

---

## Phase 5: Integration & Polish

**Goal:** Wire everything in `main()`, handle edge cases, dynamic hover text.

### Entry point (`src/index.ts`):
```ts
export function main() {
  setupUi()
  setupEntities()
}
```

### Dynamic hover text:
Update pointer event hover text after state changes: "Plant" → "Water" → "Harvest" → "Plant"

### Edge cases to handle:
- Clicking locked plots → ignore or show "Locked" message
- No seeds → PlantMenu shows "No seeds! Visit the shop."
- No harvested crops → SellMenu shows "Nothing to sell."
- Insufficient coins → Buy button disabled

### Starter resources:
- 100 coins + 5 Onion seeds → enough to experience full loop immediately

---

## Crop Data Reference (from dev-docs)

| Crop | Tier | Grow Time | Waterings | Seed Cost | Sell Price |
|------|------|-----------|-----------|-----------|------------|
| Onion | 1 | 2 min | 1 | 3 | 8 |
| Potato | 1 | 3 min | 1 | 5 | 12 |
| Garlic | 1 | 5 min | 1 | 8 | 18 |
| Tomato | 2 | 1 hr | 2 | 15 | 45 |
| Carrot | 2 | 3 hr | 2 | 25 | 80 |
| Corn | 2 | 8 hr | 3 | 50 | 150 |
| Lavender | 3 | 24 hr | 3 | 100 | 300 |
| Pumpkin | 3 | 30 hr | 3 | 150 | 450 |
| Sunflower | 3 | 36 hr | 3 | 180 | 600 |

---

## End-to-End Verification

After all phases, test the full loop:
1. Scene loads → HUD shows 100 coins, 5 onion seeds
2. Click empty soil → PlantMenu → select Onion → soil becomes OnionSprout01
3. Click growing crop → waters it
4. Wait ~1 min → model changes to OnionSprout02
5. Wait ~2 min total → model changes to OnionSprout03
6. Click ready crop → harvests, reverts to Soil01, inventory updates
7. Click Truck → SellMenu → sell onions → coins increase
8. Click Computer → ShopMenu → buy new seeds
9. Repeat with different crops

---

## Post-MVP Roadmap (future phases)

Once MVP is stable, layer on systems in this order:
1. **Land expansions** — unlock more plots with coins
2. **Fertilizer system** — speed/quality/spoilage protection
3. **Tutorial flow** — guided first-time experience
4. **Spoilage/wilting** — crops decay if not harvested in time
5. **NPC quest system** — Gerald, Rosa, Marco, etc.
6. **Worker system** — hired NPCs to auto-farm expansions
7. **Beauty system** — decorations and pets
8. **Multiplayer sync** — shared state between players
