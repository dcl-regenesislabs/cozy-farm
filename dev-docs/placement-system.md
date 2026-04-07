# Placement System — Beauty Object & Decoration Mechanics

## Overview
Players purchase decorations (statues, windmills, flower beds, lanterns, fences) and pets (dog, cat, chicken, goat) from the shop. Decorations are placed on a grid in designated farm areas. Pets are not placed — they roam the farm automatically after purchase. All placements are saved to the server and contribute to the Beauty Score.

---

## What Can Be Placed

### Decorations (grid-placed)
| Item | Size | Beauty | Cost |
|---|---|---|---|
| Garden Statue | 1×1 | +50 | 150 coins |
| Windmill | 2×2 | +70 | 350 coins |
| Scarecrow | 1×1 | +30 | 100 coins |
| Flower Bed | 1×1 | +25 | 80 coins |
| Lantern Post | 1×1 | +35 | 120 coins |
| Painted Fence (section) | 1×1 | +10 | 30 coins |

### Pets (free-roaming, not placed)
| Pet | Beauty | Cost | Notes |
|---|---|---|---|
| Dog | +80 | 500 coins | Can be stolen (retribution quest) |
| Cat | +60 | 400 coins | |
| Chicken | +30 | 200 coins | |
| Goat | +40 | 300 coins | |

---

## Decoration Zones

The farm has a dedicated **decoration grid** separate from the crop plot area. This is a visual border/accent zone around the farm perimeter and any open space not used for crops.

**Grid layout:**
- Grid is defined in scene coordinates (e.g., 8×6 cells in the border zone)
- Each cell: 2×2 meters (matches typical DCL decoration footprint)
- Crop plots occupy the center — decoration cells wrap the edges and open areas
- Locked cells: expansion zones that aren't yet unlocked (decorations can't go there yet)

The exact grid bounds should be defined as constants in a new `src/data/decorationData.ts` file matching the actual scene layout.

---

## Placement Flow

### Step 1 — Buy from Shop
The Shop (computer) gains a new "Decorations" tab alongside Seeds.

Buying a decoration:
- Deducts coins
- Adds item to `playerState.ownedDecorations` (unplaced inventory)
- Shows in a new "Decor" inventory section — items with a "Place" button

### Step 2 — Enter Placement Mode
From the Inventory panel → "Decor" tab → click "Place" next to an owned unplaced item.

This enters **Placement Mode:**
- The decoration grid becomes visible (semi-transparent tile overlay on the ground)
- A ghost preview of the item follows the player's cursor position on the grid
- Valid cells: green tint. Invalid (occupied or out of bounds): red tint
- Bottom HUD shows: "[Click] Place    [Esc / B] Cancel"

**Implementation note:** Placement mode uses raycasting from the player's camera to find which grid cell the cursor is pointing at. The ghost item updates its position each frame.

### Step 3 — Confirm Placement
Player clicks a valid grid cell:
- Ghost becomes real (GltfContainer swaps from ghost/transparent to full model)
- Grid overlay hides
- `playerState.placedDecorations` updated: `[{ itemId, gridX, gridY }]`
- Beauty score recalculated
- Auto-save triggers

### Step 4 — Move or Remove
From the Decor inventory, placed items show a "Move" and "Remove" button:

- **Move:** Re-enters placement mode for that item, lifts it from its current cell
- **Remove:** Returns item to unplaced inventory (beauty points removed), model despawns

Removed items can be re-placed at any time — no cost to move or remove.

---

## Ghost Preview System

The ghost preview is a semi-transparent version of the decoration model:
- Uses the same GLB as the real item
- Apply a transparent/emissive material override (blue-tint, ~50% alpha)
- Updates position every frame based on raycasted grid cell
- Uses a `Billboard` component? No — decoration should face a fixed direction
- Default rotation: north-facing, but include a rotation key (R = rotate 90°)

```typescript
// Placement mode state
type PlacementModeState = {
  active: boolean
  itemId: string
  ghostEntity: Entity | null
  hoveredCell: { x: number, y: number } | null
}
```

---

## Grid Data Structure

```typescript
// In decorationData.ts
interface GridCell {
  gridX: number
  gridY: number
  worldX: number   // actual scene position
  worldZ: number
  locked: boolean  // locked until relevant expansion
}

// All valid decoration cells (defined from scene layout)
const DECORATION_GRID: GridCell[] = [ ... ]

// Runtime occupied state
const occupiedCells: Set<string> = new Set()  // "${gridX},${gridY}"
```

On scene load, populate `occupiedCells` from `playerState.placedDecorations`.

---

## Pets — Free-Roaming (No Placement)

Pets do not use the grid. After purchase:
- Pet entity spawns at a random point on the farm
- Pet uses a wandering AI similar to the NPC system (idle → walk → idle loop)
- Pet stays within the farm bounds (does not leave the scene)
- Multiple pets coexist and wander independently

**Dog specifics (see also quest-system.md):**
- Dog beauty +80 while present
- Dog can be "stolen" by a retribution quest — entity despawns, beauty score drops
- Dog returns after completing the dog ransom quest
- `playerState.activePets` tracks which pets are currently on the farm (vs. owned but stolen)

**Pet state in gameState:**
```typescript
ownedPets: string[]    // all purchased pets
activePets: string[]   // currently roaming (subset of owned)
```

---

## Beauty Score Calculation

Recalculated whenever placements/pets change:

```typescript
function calculateBeautyScore(state: PlayerState): number {
  let score = 0

  // Placed decorations
  for (const placed of state.placedDecorations) {
    score += DECORATION_BEAUTY[placed.itemId] ?? 0
  }

  // Active pets (not stolen)
  for (const pet of state.activePets) {
    score += PET_BEAUTY[pet] ?? 0
  }

  // Crop variety bonus
  const plantedTypes = getDistinctCropsCurrentlyPlanted()
  if (plantedTypes.length >= 3) score += 20
  if (hasAllThreeTiers(plantedTypes)) score += 50
  if (hasAllNineCropsEverPlanted(state)) score += 100  // one-time

  return score
}
```

Beauty score thresholds (from `beauty-system.md`):
- 0–99: Plain Farm
- 100–299: Tidy Farm (+5% quest coin rewards)
- 300–599: Charming Farm (+10% quest rewards)
- 600–999: Lovely Farm (+15% rewards, surprise gift from Rosa)
- 1000+: Dream Farm (+20% rewards, Mayor Chen exclusive quests)

---

## UI Components Needed

| Component | Purpose |
|---|---|
| `DecorationShopTab` | New tab in `ShopMenu.tsx` — buy decorations/pets |
| `DecorationInventoryTab` | Tab in `InventoryPanel.tsx` — owned items, place/move/remove |
| `PlacementOverlay` | World-space grid overlay + ghost entity during placement |
| `BeautyScoreDisplay` | Small badge near farm entrance sign (visible to visitors too) |

---

## Visitor Visibility

When a visitor enters the farm:
- Server snapshot includes `placedDecorations` and `activePets`
- Scene loads and renders all decorations and pets from the snapshot
- Visitors see the farm exactly as the owner has set it up
- Visitors cannot move, remove, or interact with decorations

---

## Implementation Checklist

- [ ] Create `src/data/decorationData.ts` — item definitions, grid layout, beauty values
- [ ] Add `ownedDecorations`, `placedDecorations`, `ownedPets`, `activePets` to `gameState.ts`
- [ ] Add "Decorations" tab to `ShopMenu.tsx`
- [ ] Add "Decor" tab to `InventoryPanel.tsx` with Place / Move / Remove buttons
- [ ] Create `src/systems/placementSystem.ts` — grid overlay, ghost entity, raycast, cell validation
- [ ] Create `src/systems/petSystem.ts` — pet entity spawning, wandering AI (similar to farmerSystem)
- [ ] Create `src/ui/BeautyScoreDisplay.tsx` — score badge
- [ ] Add beauty score calculation function
- [ ] Wire beauty score into quest reward multipliers (`questState.ts`)
- [ ] Sync placed decorations with save server on each placement action
- [ ] Load and render owner's decorations/pets in visitor mode
