# Notification Badge System (Red Dots)

Red dot indicators on UI buttons and tabs that alert players when something needs their attention. The dot disappears once the player opens the relevant panel or takes the required action.

---

## Two Approaches — Pick the Right One

The badge system uses two distinct patterns. Choosing the wrong one causes stale badges (dot shows when nothing is actionable).

### 1. Event-driven — `badges` Set (`src/game/badgeSystem.ts`)

Use for **transient events**: something happened once, the player needs to acknowledge it, and there is no persistent state to re-derive the badge from.

```ts
import { showBadge, clearBadge } from '../game/badgeSystem'

showBadge('farm')    // event fires: a crop just became ready
clearBadge('farm')   // player opens the Farm panel
```

`BadgeKey` union: `'farm' | 'quests'`

| Key | Meaning | Set by | Cleared by |
|---|---|---|---|
| `'farm'` | At least one crop is ready to harvest | `growthSystem.ts` on `isReady = true`, or `recomputeStartupBadges()` on load | Farm nav button click |
| `'quests'` | An active quest just became claimable | `questState.ts` `checkCompletion()` on status → `'claimable'`, or `recomputeStartupBadges()` on load | Quests nav button click |

**Startup seeding:** `recomputeStartupBadges()` (called once in `index.ts` inside the `initSaveService` callback) scans ECS `PlotState` entities and `questProgressMap` to restore badges for state that changed while the player was offline.

### 2. Live-computed — derived directly in the component

Use for **persistent state**: the badge tracks a condition that exists in `playerState` and can be re-derived at any time. Putting this in the badge Set causes it to re-appear every session regardless of prior acknowledgements.

```tsx
// Computed fresh every render frame — always accurate, never stale
const hasUnclaimedReward = LEVEL_REWARDS.some(
  r => playerState.level >= r.level && !playerState.claimedRewards.includes(r.level)
)
{hasUnclaimedReward && <BadgeDot />}
```

Current live-computed badges:

| Location | Condition |
|---|---|
| Avatar button (TopHud) | Any `LEVEL_REWARDS` entry where player level ≥ reward level and reward not in `claimedRewards` |
| Rewards tab (StatsPanel) | Same condition — keeps avatar dot and tab dot in sync automatically |
| My Farm tab (FarmPanel) | Any plot in slots 0–11 has `isReady === true` |
| Expansion tab (FarmPanel) | Any plot in slots 12–35 has `isReady === true` |

---

## The `BadgeDot` Component

```tsx
import { BadgeDot } from './BadgeDot'

// Defaults: top=-5, right=-5, size=14 (fits on a square icon)
<BadgeDot />

// Custom placement for larger buttons
<BadgeDot top={-4} right={-4} size={16} />
```

A pure DCL `UiEntity` with `borderRadius: size/2` — no image asset required. Place it as the last child of a **relative-positioned** wrapper so it overlaps the top-right corner:

```tsx
<UiEntity uiTransform={{ margin: { right: 14 } }}>
  <Button value="My Farm" ... />
  {homeHasReady && <BadgeDot />}
</UiEntity>
```

> The parent wrapper must not clip overflow. Nav button wrappers and tab wrappers are safe. Avoid placing `BadgeDot` inside `PanelShell` or any container with fixed overflow.

---

## Shop Tab Dots — Session State

Some shop tabs need a dot when a feature first becomes available, but only until the player visits the tab once. These use a **module-level boolean** in `ShopMenu.tsx` (resets each session):

| Tab | Condition | Cleared when |
|---|---|---|
| Fertilizers | `rotSystemUnlocked && !fertilizerTabSeen` | Player clicks Fertilizers tab |

`fertilizerTabSeen` defaults to `false` each login. This means returning players who already know about fertilizers see the dot once per session until they click the tab — a deliberate reminder, not a persistent nag.

---

## Adding a New Badge

### If the badge is event-driven (crop ready, quest complete, etc.)

1. Add the key to `BadgeKey` in `src/game/badgeSystem.ts`
2. Call `showBadge('yourKey')` where the event fires
3. Call `clearBadge('yourKey')` in the button's `onMouseDown`
4. Render `{badges.has('yourKey') && <BadgeDot />}` inside a wrapper around the button
5. If the condition can be true on load, add the seed check to `recomputeStartupBadges()`

### If the badge tracks a persistent state (unclaimed reward, etc.)

1. Compute the condition inline in the component: `const hasSomething = playerState.xyz.some(...)`
2. Render `{hasSomething && <BadgeDot />}` — no badge Set entry needed
3. Do NOT add this to `recomputeStartupBadges()` — the live check already handles restoring correctly every session

### If the badge is a "seen this tab?" hint (shop feature unlock)

1. Add a module-level `let myTabSeen = false` in the menu file
2. Condition: `playerState.someUnlockFlag && !myTabSeen`
3. Set `myTabSeen = true` inside the tab's `onMouseDown`

---

## File Map

| File | Role |
|---|---|
| `src/game/badgeSystem.ts` | `BadgeKey` type, `badges` Set, `showBadge`, `clearBadge`, `hasBadge`, `recomputeStartupBadges` |
| `src/ui/BadgeDot.tsx` | Reusable red circle component |
| `src/ui/BottomNav.tsx` | Nav-level dots for `farm` and `quests` |
| `src/ui/TopHud.tsx` | Avatar button dot (live-computed — unclaimed level rewards) |
| `src/ui/FarmPanel.tsx` | My Farm and Expansion tab dots (live-computed from `PlotState`) |
| `src/ui/StatsPanel.tsx` | Rewards tab dot (live-computed — same condition as avatar dot) |
| `src/ui/ShopMenu.tsx` | Fertilizers tab dot (session-level `fertilizerTabSeen` flag) |
| `src/systems/growthSystem.ts` | Calls `showBadge('farm')` when a plot's `isReady` flips true |
| `src/game/questState.ts` | Calls `showBadge('quests')` when a quest status flips to `'claimable'` |
| `src/index.ts` | Calls `recomputeStartupBadges()` inside the `initSaveService` callback |
