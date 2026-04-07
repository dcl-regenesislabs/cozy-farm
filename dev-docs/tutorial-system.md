# Tutorial System — Mayor Chen Onboarding

## Overview
First-time players enter CozyFarm with no guidance. The tutorial is a linear, dialog-driven flow led by Mayor Chen that teaches the complete farming loop: plant → water → harvest → sell → buy seeds. Completion unlocks 6 additional plots as the first progression reward.

---

## When It Triggers

Checked on scene load, after `signedFetch` loads player state:

```typescript
if (!playerState.tutorialComplete && playerState.tutorialStep === 0) {
  startTutorial()
}
```

If `tutorialStep > 0` but `tutorialComplete === false` — the player disconnected mid-tutorial. Resume from the last saved step.

---

## Mayor Chen's Role

Mayor Chen is already in `npcData.ts` as the town authority who handles gate quests and special unlocks. During tutorial:
- He spawns **near the scene spawn point** (not at the wander zone like other NPCs)
- He has a quest icon above his head before the tutorial starts
- He guides the player step by step via dialog
- He waits patiently — no timer, no penalty for slow players
- After tutorial completes, he returns to his normal NPC behavior (gate quests)

---

## Tutorial Steps

### Step 0 — Welcome (auto-trigger on first enter)
Mayor Chen walks toward the player (or appears near spawn).

**Dialog:**
> "Ah, a new face! Welcome to CozyFarm. I'm Mayor Chen. This land is yours to farm — let me show you how it works. Follow me!"

**Arrow/highlight:** Points toward the 6 starter soil plots.

**Player action required:** Click "Let's go!" or walk toward plots.

---

### Step 1 — Plant Your First Seed
Mayor Chen walks to the plots area.

**Dialog:**
> "See these soil plots? You've got 6 Onion seeds in your pocket. Click one of the plots to plant!"

**UI highlight:** Soil plots glow / pulse.
**Blocker:** All other menus disabled until player plants.
**Player action:** Click an empty plot → PlantMenu opens → select Onion → confirm.

On plant action fired:
> "Excellent! The seed is in the ground. Now it needs water."

---

### Step 2 — Water the Crop
**Dialog:**
> "Click the plot again to water it. Onions only need watering once, then they'll grow on their own."

**UI highlight:** Water icon shown on the planted plot.
**Player action:** Click the plot to water it.

On water action fired:
> "Perfect. Now we wait for it to grow. Onions take about 2 minutes. You can plant more while you wait!"

---

### Step 3 — Plant More (optional nudge)
This step has no hard blocker — the player is free to plant the remaining 5 seeds.

If the player hasn't planted another seed within 30 seconds:
> "Go ahead and plant the rest of your seeds — the more you plant, the more you earn!"

The step completes as soon as the crop from Step 1 becomes ready (growth stage 3).

---

### Step 4 — Harvest
**Dialog (when first crop is ready):**
> "Your Onion is ready! Click the glowing plot to harvest it."

**UI highlight:** Ready plot pulses.
**Player action:** Click the ready crop.

On harvest fired:
> "Freshly harvested! Now let's turn those Onions into coins."

---

### Step 5 — Sell at the Truck
Mayor Chen walks toward / highlights the truck.

**Dialog:**
> "See that truck by the exit? Walk up and click it to sell your harvest."

**UI highlight:** Truck entity pulses.
**Player action:** Click the truck → SellMenu opens → sell Onions.

On sell action fired:
> "Well done! Every coin counts. Now let's get more seeds."

---

### Step 6 — Buy Seeds at the Computer
Mayor Chen points to the computer.

**Dialog:**
> "The computer over there is your seed shop. Click it to browse — Potatoes give better returns if you can wait a bit longer."

**Player action:** Click the computer → ShopMenu opens → buy any seed.

On buy action fired:
> "You're a natural! I think this farm is in good hands."

---

### Step 7 — Tutorial Complete
**Mayor Chen's closing dialog:**
> "You've mastered the basics. I'm officially opening up the rest of the field — six more plots for you, free of charge. The real adventure begins now. Come find me when you're ready for bigger challenges."

**Reward triggered:**
- 6 new plots unlocked (indices 6–11, matching the tutorial reward in economy.md)
- Onion seeds: +6 (starter boost for the new plots)
- `tutorialComplete = true` saved to server
- Mayor Chen transitions to normal NPC behavior (appears in NPC queue for gate quests)

**UI:** A reward popup shows: "Tutorial Complete! +6 plots unlocked, +6 Onion Seeds"

---

## Skip Option

After Step 0 (the welcome dialog), a "Skip Tutorial" button appears in the dialog.

- Clicking it: shows confirmation "Are you sure? You'll skip the free plot reward."
- If confirmed: `tutorialComplete = true`, `tutorialStep = 7`, save. Player keeps the 6 starter seeds but does NOT receive the bonus 6 plots (they must buy Expansion 1 normally).
- The skip option is for experienced players who recognize the scene.

---

## UI Requirements

### Tutorial Overlay
A subtle overlay highlights the target entity and grays out everything else. Not a full screen block — player can still move around freely.

```
activeHighlight: Entity | null   ← tracked in tutorialState
```

Highlighted entity gets a glowing billboard or pulsing alpha applied to it.

### Step Progress
- No visible step counter for the player — breaks immersion
- Mayor Chen's presence is the only UI signal that tutorial is active
- QuestPanel shows: "Tutorial — Talk to Mayor Chen" as an active quest

### Mayor Chen Dialog Style
Uses the existing `NpcDialogMenu.tsx` system with:
- Mode: custom `tutorial_step` mode
- No accept/reject choice for most steps — just a "Got it!" button
- Dialog auto-advances on player action in some steps (no button needed)

---

## State Fields (added to playerState)

```typescript
tutorialComplete: boolean     // false until step 7
tutorialStep: number          // 0–7, saved to resume after disconnect
```

---

## Implementation Checklist

- [ ] Add `tutorialComplete` and `tutorialStep` to `gameState.ts`
- [ ] Create `src/game/tutorialState.ts` — step machine + action hooks
- [ ] Add tutorial action hooks into `actions.ts` (onPlant, onWater, onHarvest, onSell, onBuy)
- [ ] Modify `npcSystem.ts`: spawn Mayor Chen near spawn on tutorial start, transition him to normal NPC queue after tutorial
- [ ] Add entity highlight system (billboard glow on target entity)
- [ ] Add tutorial quest to `questData.ts` ("Tutorial — Follow Mayor Chen")
- [ ] Add tutorial dialog lines to `npcData.ts` (or a new `tutorialDialogs.ts`)
- [ ] Add skip confirmation dialog
- [ ] Wire completion reward: unlock plots 6–11 + grant seeds
- [ ] Save `tutorialStep` to server on each step completion
