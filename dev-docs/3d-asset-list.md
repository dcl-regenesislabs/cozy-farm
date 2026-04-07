# 3D Asset List — Harvest World

## Environment & Farm Structure

| Asset | Notes |
|---|---|
| Farmhouse | Main building, player "home base". Should feel warm, lived-in |
| Barn / Stock Building | Storage area next to house. Visual indicator of crop stockpile levels (full vs empty look) |
| Farm Entrance Gate | Where NPC queue appears. Needs clear open/close state for NPC flow |
| Dirt Road / Path | Connects house, stock area, land expansions, and truck delivery zone |
| Truck Delivery Zone | Flat area where truck parks. Needs markings or visual anchor |
| Farm Perimeter Fence | Borders the entire player farm. Modular fence sections |
| Locked Land Sign | Sign with padlock, interactable. Shows expansion price. Used on each locked expansion |

---

## Land & Plots

| Asset | Notes |
|---|---|
| Dirt Plot (default) | A single 1x1 plot tile, tilled soil look |
| Seeded Plot | Plot with tiny visible seed/sprout |
| Watered Plot | Plot with darker, wet soil appearance |
| Growing Crop Stage 1 | Small sprout, generic (reused across crop types with color swap) |
| Growing Crop Stage 2 | Mid-growth plant, generic base |
| Growing Crop Stage 3 (Ready) | Full grown, harvest-ready plant |
| Wilted Crop | Dried-out, drooping plant — any crop that spoiled |
| Land Expansion Zone | Flat zone with slightly different ground texture, fenced off until unlocked |

---

## Crop Models (per crop — 3 growth stages each)
*9 crops total for launch. 3 per tier.*

### Tier 1
| Crop | Notes |
|---|---|
| Onion | Starter crop. Small round bulb look |
| Potato | Slightly larger, squat. Mostly underground look |
| Garlic | Tight cluster, white/purple tones |

### Tier 2
| Crop | Notes |
|---|---|
| Tomato | Vine-based, distinct red fruit |
| Carrot | Orange, leafy top visible |
| Corn | Tall stalk, distinctive silhouette |

### Tier 3
| Crop | Notes |
|---|---|
| Lavender | Purple, slender stalks — tied to specific land expansion |
| Pumpkin | Large, orange, sprawling |
| Sunflower | Tall, bright yellow head — very distinct look |

*Growth stages for all: Sprout → Mid-growth → Harvest-ready*

---

## Fertilizer & Items

| Asset | Notes |
|---|---|
| Fertilizer Bag (Tier 1) | Small bag, brown/basic look |
| Fertilizer Bag (Tier 2) | Medium bag, slightly branded look |
| Fertilizer Bag (Tier 3) | Larger, more premium appearance |
| Seed Packet (generic) | Small paper packet — reused per crop with label variation |
| Delivery Crate / Box | Wooden crate. Player opens it to receive purchased goods |

---

## Vehicles

| Asset | Notes |
|---|---|
| Delivery Truck | Arrives for purchases. Drops off crate and leaves |
| Selling Truck | Arrives when player sells. NPC walks out, loads goods, leaves |
| NPC Driver (generic) | Simple character for truck interactions |

---

## NPCs

| Asset | Notes |
|---|---|
| Gerald | Passive-aggressive neighbour. Middle-aged, frowning |
| Rosa | Sweet old lady. Shawl, basket |
| Marco | Competitive farmer type. Rugged, proud look |
| Lily | Chef. Apron, friendly expression |
| Dave | Clumsy everyman. Disheveled, always a bit of a mess |
| Mayor Chen | Authority figure. Smart casual, slightly formal |

*All NPCs need idle animation + walk animation for queue approach*

---

## Workers

| Asset | Notes |
|---|---|
| Worker (base model) | Generic farm worker character. Can be reused across expansions |
| Worker Tool (watering can) | Held item when watering |
| Worker Tool (harvest basket) | Held item when collecting |
| Worker Stock Area | Small crate/bin near each land expansion. Worker's personal inventory visual |

---

## Pets

| Asset | Notes |
|---|---|
| Dog | Wanders farm freely. Needs idle + walk animations |
| Cat | Same as dog — wanders, decorative |
| Chicken | Same — decorative wandering |
| Goat | Same — decorative wandering |

*All pets need: Idle, Walk, Sit (or rest) animations*

---

## Beauty / Decorative Items (examples — expandable)

| Asset | Notes |
|---|---|
| Garden Statue | Generic stone statue for beauty score |
| Flower Bed | Decorative flowers, placeable near farm |
| Windmill (decorative) | Adds charm, no function |
| Lantern Post | Lighting decoration |
| Painted Fence Section | Upgrade to basic fence — cosmetic |
| Scarecrow | Classic farm piece, beauty item |

---

## UI / Interaction Elements (3D in-world)

| Asset | Notes |
|---|---|
| Farm Computer | Main hub for buy/sell/hire. Needs screen-on state |
| Computer Screen (on state) | Screen texture showing UI — can be a flat 2D texture |
| Interactable Prompt (glow ring / pulse) | Visual indicator that something is interactable |

---

## Notes for Designer
- All crop models should share the same **plot footprint size** for grid alignment
- Growth stages should be **clearly distinguishable** from a top-down or slight isometric view — players need to identify readiness at a glance
- Worker and NPC characters don't need high-poly detail — readable silhouette is more important
- Truck needs a simple **enter and exit animation path** along the dirt road
- Beauty items should feel "farmcore" / cozy — rustic textures, warm tones
