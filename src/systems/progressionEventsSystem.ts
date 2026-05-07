import { engine, Transform } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { progressionEventState, type ProgressionEventStep } from '../game/progressionEventState'
import { onLevelUp } from './levelingSystem'
import { initNpcSystem, requestNpcDeparture, departAllActiveNpcs, walkNpcToPosition } from './npcSystem'
import { MAYOR_DEF } from '../data/npcData'
import { setCompostBinVisible, getCompostBinEntity, getSoilEntities } from './interactionSetup'
import { playSound } from './sfxSystem'
import { setArrowTarget } from './tutorialArrowSystem'
import { setOnBuyCompostBin } from '../game/actions'
import { setOnNextPlant, setOnNextWater, setOnNextFertilize, unlockFertilizerQuest } from '../game/questState'
import { PlotState } from '../components/farmComponents'

// ---------------------------------------------------------------------------
// Called when the progression event chain fully completes and Mayor departs.
// Wired from index.ts to resume normal NPC rotation.
// ---------------------------------------------------------------------------
let onEventCompleteCb: (() => void) | null = null
export function setOnProgressionEventComplete(cb: () => void): void {
  onEventCompleteCb = cb
}

// ---------------------------------------------------------------------------
// Compost event hooks — allow CompostBinMenu to signal progression steps
// ---------------------------------------------------------------------------
let onCompostWasteAddedCb: (() => void) | null = null
let onCompostCollectedCb:  (() => void) | null = null

export function setOnCompostWasteAdded(cb: () => void): void { onCompostWasteAddedCb = cb }
export function setOnCompostCollected(cb: () => void):  void { onCompostCollectedCb  = cb }

export function fireCompostWasteAdded(): void {
  onCompostWasteAddedCb?.()
}

export function fireCompostCollected(): void {
  const cb = onCompostCollectedCb
  onCompostCollectedCb = null
  cb?.()
}

// ---------------------------------------------------------------------------
// Dialog helper
// ---------------------------------------------------------------------------
function showProgressionDialog(text: string, buttonLabel: string, onButton: () => void): void {
  npcDialogState.npcName             = MAYOR_DEF.name
  npcDialogState.npcId               = MAYOR_DEF.id
  npcDialogState.npcHeadImage        = MAYOR_DEF.headImage
  npcDialogState.dialogLine          = text
  npcDialogState.mode                = 'tutorial'
  npcDialogState.tutorialButtonLabel = buttonLabel
  npcDialogState.onClose             = onButton
  npcDialogState.onAccept            = null
  npcDialogState.onClaim             = null
  playSound('menu')
  playerState.activeMenu             = 'npcDialog'
}

// ---------------------------------------------------------------------------
// Step: rot_intro_active — Mayor arrived, tell player to buy the compost bin
// ---------------------------------------------------------------------------
function goToBuyCompostBin(): void {
  progressionEventState.step       = 'rot_intro_active'
  playerState.progressionEventStep = 'rot_intro_active'

  if (playerState.compostBinUnlocked) {
    // Player already owns one (e.g. reconnect after purchase) — skip to waste step
    goToWasteStep()
    return
  }

  const computer = getComputerEntityForArrow()
  setArrowTarget(computer)

  showProgressionDialog(
    "Wow, you've been busy! Looks like your farm has really grown since we last spoke!\n\nNow that you're levelling up, crops will start to rot if left unharvested too long. Let me help you deal with that.\n\nHead to the shop and buy a Compost Bin — it turns rotten crops into powerful fertilizers!",
    "Let's go!",
    () => {
      // Arrow hides when shop opens; reappears when shop closes without buying
      playerState.activeMenu = 'none'
      watchForCompostBinPurchase()
    }
  )
}

function watchForCompostBinPurchase(): void {
  // Hide arrow when shop UI is open — player is browsing
  let shopWasOpen = false
  engine.addSystem(function shopOpenWatcher(dt: number) {
    const shopOpen = playerState.activeMenu === 'shop'
    if (shopOpen && !shopWasOpen) {
      setArrowTarget(null)
      shopWasOpen = true
    } else if (!shopOpen && shopWasOpen) {
      // Shop closed without buying — re-show arrow to computer
      if (!playerState.compostBinUnlocked) {
        setArrowTarget(getComputerEntityForArrow())
      }
      shopWasOpen = false
    }
    if (playerState.compostBinUnlocked) {
      engine.removeSystem(shopOpenWatcher)
      setArrowTarget(null)
      goToWasteStep()
    }
  })

  setOnBuyCompostBin(() => {
    // This fires the moment the purchase completes (the watcher above also handles it, belt-and-suspenders)
  })
}

// ---------------------------------------------------------------------------
// Step: compost_quest — give organic waste, guide to compost bin
// ---------------------------------------------------------------------------
function goToWasteStep(): void {
  progressionEventState.step       = 'compost_quest'
  playerState.progressionEventStep = 'compost_quest'

  playerState.organicWaste += 3
  playerState.tutorialCompostCycle = true

  const binEntity = getCompostBinEntity()
  setArrowTarget(binEntity)

  showProgressionDialog(
    "Great, you bought the Compost Bin! I've added 3 organic waste to your inventory.\n\nOpen the compost bin and add all 3 units — I've set it to process quickly so you can see how it works!",
    "Got it!",
    () => {
      playerState.activeMenu = 'none'
      watchForWasteAdded()
    }
  )
}

function watchForWasteAdded(): void {
  let wasteAdded = 0
  const binEntity = getCompostBinEntity()

  function binOpenWatcher(_dt: number) {
    const binOpen = playerState.activeMenu === 'compost'
    if (binOpen) {
      setArrowTarget(null)
    } else if (wasteAdded < 3) {
      setArrowTarget(binEntity)
    }
  }
  engine.addSystem(binOpenWatcher)

  function onWasteAdded() {
    wasteAdded++
    if (wasteAdded >= 3) {
      engine.removeSystem(binOpenWatcher)
      setArrowTarget(null)
      goToCollectStep()
    } else {
      setOnCompostWasteAdded(onWasteAdded)
    }
  }

  setOnCompostWasteAdded(onWasteAdded)
}

// ---------------------------------------------------------------------------
// Step: waste_quest — waiting for fertilizer to be ready and collected
// ---------------------------------------------------------------------------
function goToCollectStep(): void {
  progressionEventState.step       = 'waste_quest'
  playerState.progressionEventStep = 'waste_quest'

  const binEntity = getCompostBinEntity()
  setArrowTarget(binEntity)

  showProgressionDialog(
    "The compost bin is processing! Give it a few seconds, then open it and collect your fertilizer.",
    "I'm watching!",
    () => {
      playerState.activeMenu = 'none'
      setOnCompostCollected(() => {
        setArrowTarget(null)
        playerState.tutorialCompostCycle = false
        goToFertilizeStep()
      })
    }
  )
}

// ---------------------------------------------------------------------------
// Step: collect_quest — plant, water, fertilize a crop
// ---------------------------------------------------------------------------
function goToFertilizeStep(): void {
  progressionEventState.step       = 'collect_quest'
  playerState.progressionEventStep = 'collect_quest'

  // Find first empty unlocked soil plot
  const soilEntities = getSoilEntities()
  let targetPlot: ReturnType<typeof engine.addEntity> | null = null
  for (const entity of soilEntities) {
    const plot = PlotState.getOrNull(entity)
    if (plot && plot.isUnlocked && plot.cropType === -1) {
      targetPlot = entity
      break
    }
  }

  if (targetPlot) {
    const pos = Transform.getOrNull(targetPlot)?.position
    if (pos) walkNpcToPosition('mayorchen', pos)
    setArrowTarget(targetPlot)
  }

  showProgressionDialog(
    "Excellent! Now let me show you how to use fertilizer.\n\nPlant a seed in any soil plot — I'll wait here.",
    "Planting now!",
    () => {
      playerState.activeMenu = 'none'
      if (targetPlot) setArrowTarget(targetPlot)
      setOnNextPlant(() => {
        if (targetPlot) setArrowTarget(targetPlot)
        showProgressionDialog(
          "Nice planting! Now water it — the fertilizer menu opens automatically after you water.",
          "Watering!",
          () => {
            playerState.activeMenu = 'none'
            setOnNextWater(() => {
              if (targetPlot) setArrowTarget(targetPlot)
              showProgressionDialog(
                "Perfect! Now apply a fertilizer to this crop — tap the plot to open the fertilizer menu.",
                "Fertilizing!",
                () => {
                  playerState.activeMenu = 'none'
                  setOnNextFertilize(() => {
                    setArrowTarget(null)
                    completeProgressionChain()
                  })
                }
              )
            })
          }
        )
      })
    }
  )
}

// ---------------------------------------------------------------------------
// Final step — give the fertilizer quest and let Mayor depart
// ---------------------------------------------------------------------------
function completeProgressionChain(): void {
  playerState.rotSystemUnlocked    = true
  progressionEventState.step       = 'complete'
  playerState.progressionEventStep = 'complete'

  // Unlock the Mayor fertilizer quest (auto-start it as active)
  unlockFertilizerQuest()

  showProgressionDialog(
    "Incredible work! Your farm is really coming together.\n\nRemember — crops will rot if left too long after harvest. Use RotShield fertilizer to prevent it, or just stay on top of your harvests!\n\nI've left you with a challenge: generate 5 more fertilizers. Come find me when you're done and I'll make it worth your while!",
    "Thanks, Mayor!",
    () => {
      playerState.activeMenu     = 'none'
      progressionEventState.active = false
      departAllActiveNpcs()
    }
  )
}

// ---------------------------------------------------------------------------
// Called when player clicks Mayor mid-event (re-shows current step dialog)
// ---------------------------------------------------------------------------
export function getProgressionEventMayorClickHandler(): () => void {
  return () => {
    const step = progressionEventState.step as ProgressionEventStep
    if (step === 'rot_intro_active') {
      showProgressionDialog(
        "Head to the shop (the computer) and buy the Compost Bin for 300 coins!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'compost_quest') {
      showProgressionDialog(
        "Open the compost bin and add all 3 organic waste units. I've put them in your inventory!",
        "On it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'waste_quest') {
      showProgressionDialog(
        "The bin is working — open it and collect your fertilizer once it's ready!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'collect_quest') {
      showProgressionDialog(
        "Plant a seed, water it, then apply a fertilizer. I'm waiting right here!",
        "On it!",
        () => { playerState.activeMenu = 'none' }
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Resume after reconnect
// ---------------------------------------------------------------------------
function resumeProgressionEvent(): void {
  progressionEventState.active = true
  const step = playerState.progressionEventStep as ProgressionEventStep

  initNpcSystem(MAYOR_DEF, () => {
    progressionEventState.active = false
    onEventCompleteCb?.()
  })

  let waitTimer = 4.0
  engine.addSystem(function waitForMayorOnResume(dt: number) {
    waitTimer -= dt
    if (waitTimer > 0) return
    engine.removeSystem(waitForMayorOnResume)

    if (step === 'rot_intro_active') {
      goToBuyCompostBin()
    } else if (step === 'compost_quest') {
      goToWasteStep()
    } else if (step === 'waste_quest') {
      playerState.tutorialCompostCycle = true   // not saved — must re-set on resume
      goToCollectStep()
    } else if (step === 'collect_quest') {
      goToFertilizeStep()
    }
  })
}

// ---------------------------------------------------------------------------
// Level 5 trigger
// ---------------------------------------------------------------------------
function triggerLevel5Event(): void {
  progressionEventState.active     = true

  departAllActiveNpcs()

  initNpcSystem(MAYOR_DEF, () => {
    progressionEventState.active = false
    onEventCompleteCb?.()
  })

  let timer = 4.0
  engine.addSystem(function waitForMayorArrival(dt: number) {
    timer -= dt
    if (timer > 0) return
    engine.removeSystem(waitForMayorArrival)
    goToBuyCompostBin()
  })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function initProgressionEventsSystem(): void {
  const step = playerState.progressionEventStep as ProgressionEventStep

  if (step !== '' && step !== 'complete') {
    resumeProgressionEvent()
    return
  }

  // Migration: if player has rotSystemUnlocked but fertilizer quest is still hidden
  if (playerState.rotSystemUnlocked) {
    unlockFertilizerQuest()
  }

  onLevelUp((newLevel: number) => {
    if (newLevel === 5 && !playerState.rotSystemUnlocked) {
      triggerLevel5Event()
    }
  })
}

// ---------------------------------------------------------------------------
// Helper — get computer entity for arrow (computer = shop entry point)
// ---------------------------------------------------------------------------
function getComputerEntityForArrow() {
  return engine.getEntityOrNullByName('Computer.glb')
}
