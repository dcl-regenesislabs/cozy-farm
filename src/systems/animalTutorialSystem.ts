import { engine } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { animalTutorialState, animalTutorialCallbacks, type ChickenTutorialStep, type PigTutorialStep } from '../game/animalTutorialState'
import { initNpcSystem, departAllActiveNpcs } from './npcSystem'
import { MAYOR_DEF } from '../data/npcData'
import { setArrowTarget } from './tutorialArrowSystem'
import { playSound } from './sfxSystem'
import { getEmptyCoopEntity, getEmptyPenEntity, getCoopFoodEntity, getPenFoodEntity } from './animalSystem'
import { saveFarm } from '../services/saveService'
import { CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL } from '../data/animalData'
import { progressionEventState } from '../game/progressionEventState'
import { tutorialState } from '../game/tutorialState'

// ---------------------------------------------------------------------------
// Called when the animal tutorial fully completes and Mayor departs.
// Wired from index.ts to resume normal NPC rotation.
// ---------------------------------------------------------------------------
let onChickenTutorialCompleteCb: (() => void) | null = null
let onPigTutorialCompleteCb:     (() => void) | null = null

export function setOnChickenTutorialComplete(cb: () => void): void { onChickenTutorialCompleteCb = cb }
export function setOnPigTutorialComplete(cb: () => void):     void { onPigTutorialCompleteCb     = cb }

// ---------------------------------------------------------------------------
// Dialog helper — identical pattern to progressionEventsSystem.ts
// ---------------------------------------------------------------------------
function showDialog(text: string, buttonLabel: string, onButton: () => void): void {
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

// ============================================================================
// CHICKEN TUTORIAL
// ============================================================================

function setChickenStep(step: ChickenTutorialStep): void {
  animalTutorialState.chickenStep          = step
  playerState.chickenTutorialStep          = step
}

function goToChickenBuyCoop(): void {
  setChickenStep('buy_coop')

  const coopEntity = getEmptyCoopEntity()
  setArrowTarget(coopEntity)

  showDialog(
    "Congratulations on reaching Level 8! You've unlocked the Chicken Coop!\n\nHead over to the coop plot and buy it — chickens will provide eggs and keep your farm buzzing with life!",
    "Let's go!",
    () => {
      playerState.activeMenu = 'none'
      // Arrow already pointing — just wait for the purchase hook
    }
  )

  // Re-register the callback so it fires exactly once
  animalTutorialCallbacks.onCoopPurchased = () => {
    animalTutorialCallbacks.onCoopPurchased = () => {}
    setArrowTarget(null)
    goToChickenBuyChicken()
  }
}

function goToChickenBuyChicken(): void {
  setChickenStep('buy_chicken')

  const computer = engine.getEntityOrNullByName('Computer.glb')
  setArrowTarget(computer)

  showDialog(
    "Excellent! The coop is built!\n\nNow head to the shop and buy your first chicken. You can have up to 5 chickens in one coop!",
    "To the shop!",
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onFirstChickenBought = () => {
    animalTutorialCallbacks.onFirstChickenBought = () => {}
    setArrowTarget(null)
    goToChickenFeed()
  }
}

function goToChickenFeed(): void {
  setChickenStep('feed_chicken')

  const foodEntity = getCoopFoodEntity()
  setArrowTarget(foodEntity)

  showDialog(
    "Welcome to the flock! Your chickens need grain to produce eggs — they lay 1-2 eggs every 6 hours while there's food in the bowl.\n\nFill up the food bowl to get them started!",
    "Fill the bowl!",
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onCoopFed = () => {
    animalTutorialCallbacks.onCoopFed = () => {}
    setArrowTarget(null)
    goToChickenCleanIntro()
  }
}

function goToChickenCleanIntro(): void {
  setChickenStep('clean_intro')
  setArrowTarget(null)

  showDialog(
    "Great! The chickens are eating!\n\nOne more thing — the coop gets dirty every 12 hours. When you see dirt appear, click it to clean up. You'll earn organic waste for your compost bin as a bonus!\n\nEnjoy your new flock!",
    "Thanks, Mayor!",
    () => {
      playerState.activeMenu = 'none'
      completeChickenTutorial()
    }
  )
}

function completeChickenTutorial(): void {
  setChickenStep('complete')
  animalTutorialState.chickenActive = false
  saveFarm()
  departAllActiveNpcs()
  onChickenTutorialCompleteCb?.()
}

export function getChickenTutorialMayorClickHandler(): () => void {
  return () => {
    const step = animalTutorialState.chickenStep
    if (step === 'buy_coop') {
      showDialog(
        "Head to the coop plot and tap to buy the Chicken Coop!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'buy_chicken') {
      showDialog(
        "Open the shop (the computer) and buy your first chicken!",
        "On it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'feed_chicken') {
      showDialog(
        "Tap the food bowl near the coop to deposit grain for your chickens!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    }
  }
}

function triggerChickenTutorial(onComplete: () => void): void {
  onChickenTutorialCompleteCb      = onComplete
  animalTutorialState.chickenActive = true

  departAllActiveNpcs()

  initNpcSystem(MAYOR_DEF, () => {
    animalTutorialState.chickenActive = false
    onComplete()
  })

  let timer = 4.0
  engine.addSystem(function waitForChickenMayorArrival(dt: number) {
    timer -= dt
    if (timer > 0) return
    engine.removeSystem(waitForChickenMayorArrival)
    goToChickenBuyCoop()
  })
}

function resumeChickenTutorial(onComplete: () => void): void {
  onChickenTutorialCompleteCb      = onComplete
  animalTutorialState.chickenActive = true

  initNpcSystem(MAYOR_DEF, () => {
    animalTutorialState.chickenActive = false
    onComplete()
  })

  let timer = 4.0
  engine.addSystem(function waitForChickenMayorResume(dt: number) {
    timer -= dt
    if (timer > 0) return
    engine.removeSystem(waitForChickenMayorResume)

    const step = animalTutorialState.chickenStep
    if (step === 'buy_coop')     goToChickenBuyCoop()
    else if (step === 'buy_chicken') goToChickenBuyChicken()
    else if (step === 'feed_chicken') goToChickenFeed()
    else if (step === 'clean_intro')  goToChickenCleanIntro()
  })
}

// ============================================================================
// PIG TUTORIAL
// ============================================================================

function setPigStep(step: PigTutorialStep): void {
  animalTutorialState.pigStep   = step
  playerState.pigTutorialStep   = step
}

function goToPigBuyPen(): void {
  setPigStep('buy_pen')

  const penEntity = getEmptyPenEntity()
  setArrowTarget(penEntity)

  showDialog(
    "Level 12 — you've truly become a seasoned farmer! You've unlocked the Pig Pen!\n\nHead over to the pig pen plot and buy it. Pigs are a rewarding long-term investment!",
    "Let's go!",
    () => {
      playerState.activeMenu = 'none'
    }
  )

  animalTutorialCallbacks.onPenPurchased = () => {
    animalTutorialCallbacks.onPenPurchased = () => {}
    setArrowTarget(null)
    goToPigBuyPig()
  }
}

function goToPigBuyPig(): void {
  setPigStep('buy_pig')

  const computer = engine.getEntityOrNullByName('Computer.glb')
  setArrowTarget(computer)

  showDialog(
    "The pen is ready!\n\nNow head to the shop and buy your first pig. You can have up to 5 pigs. They start as adults — the shop sells grown pigs!",
    "To the shop!",
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onFirstPigBought = () => {
    animalTutorialCallbacks.onFirstPigBought = () => {}
    setArrowTarget(null)
    goToPigFeed()
  }
}

function goToPigFeed(): void {
  setPigStep('feed_pig')

  const foodEntity = getPenFoodEntity()
  setArrowTarget(foodEntity)

  showDialog(
    "There's your pig!\n\nPigs eat grain, veggie scraps, and harvested crops. Feeding them harvested crops also raises their feed score — a higher score means bigger pigs and more meat at harvest time. Fill the bowl!",
    "Fill the bowl!",
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onPenFed = () => {
    animalTutorialCallbacks.onPenFed = () => {}
    setArrowTarget(null)
    goToPigCleanIntro()
  }
}

function goToPigCleanIntro(): void {
  setPigStep('clean_intro')
  setArrowTarget(null)

  showDialog(
    "Great job! The pigs are eating!\n\nKeep the pen clean — dirt appears over time and clicking it earns you organic waste for your compost bin. Adult pigs also produce manure every 8 hours automatically.",
    "Good to know!",
    () => {
      playerState.activeMenu = 'none'
      goToPigGrowthExplained()
    }
  )
}

function goToPigGrowthExplained(): void {
  setPigStep('growth_explained')
  setArrowTarget(null)

  showDialog(
    "Here's how pigs grow — shop-bought pigs start as adults. But if you breed them, piglets grow in stages:\n\n• Piglet → Adolescent in 24 hours\n• Adolescent → Adult in 72 hours\n\nFeed them well and watch them grow bigger as their feed score rises!",
    "Fascinating!",
    () => {
      playerState.activeMenu = 'none'
      goToPigBreedExplained()
    }
  )
}

function goToPigBreedExplained(): void {
  setPigStep('breed_explained')
  setArrowTarget(null)

  showDialog(
    "Once you have two adult pigs, you can breed them to get a free piglet — no coins needed! There's a cooldown between breeds, so plan ahead.\n\nOpen the animal panel and tap a pig to see breeding options.",
    "Got it!",
    () => {
      playerState.activeMenu = 'none'
      goToPigHarvestExplained()
    }
  )
}

function goToPigHarvestExplained(): void {
  setPigStep('harvest_explained')
  setArrowTarget(null)

  showDialog(
    "Last thing — after 7 days as an adult, a pig becomes ready to harvest for pig meat. Meat sells for a very good price!\n\nTap a harvestable pig and choose Harvest Meat. Your remaining pigs will keep living and producing manure. Good luck, farmer!",
    "Thanks, Mayor!",
    () => {
      playerState.activeMenu = 'none'
      completePigTutorial()
    }
  )
}

function completePigTutorial(): void {
  setPigStep('complete')
  animalTutorialState.pigActive = false
  saveFarm()
  departAllActiveNpcs()
  onPigTutorialCompleteCb?.()
}

export function getPigTutorialMayorClickHandler(): () => void {
  return () => {
    const step = animalTutorialState.pigStep
    if (step === 'buy_pen') {
      showDialog(
        "Head to the pig pen plot and tap to buy the Pig Pen!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'buy_pig') {
      showDialog(
        "Open the shop (the computer) and buy your first pig!",
        "On it!",
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'feed_pig') {
      showDialog(
        "Tap the food bowl near the pig pen to deposit food for your pigs!",
        "Got it!",
        () => { playerState.activeMenu = 'none' }
      )
    }
  }
}

function triggerPigTutorial(onComplete: () => void): void {
  onPigTutorialCompleteCb      = onComplete
  animalTutorialState.pigActive = true

  departAllActiveNpcs()

  initNpcSystem(MAYOR_DEF, () => {
    animalTutorialState.pigActive = false
    onComplete()
  })

  let timer = 4.0
  engine.addSystem(function waitForPigMayorArrival(dt: number) {
    timer -= dt
    if (timer > 0) return
    engine.removeSystem(waitForPigMayorArrival)
    goToPigBuyPen()
  })
}

function resumePigTutorial(onComplete: () => void): void {
  onPigTutorialCompleteCb      = onComplete
  animalTutorialState.pigActive = true

  initNpcSystem(MAYOR_DEF, () => {
    animalTutorialState.pigActive = false
    onComplete()
  })

  let timer = 4.0
  engine.addSystem(function waitForPigMayorResume(dt: number) {
    timer -= dt
    if (timer > 0) return
    engine.removeSystem(waitForPigMayorResume)

    const step = animalTutorialState.pigStep
    if (step === 'buy_pen')           goToPigBuyPen()
    else if (step === 'buy_pig')       goToPigBuyPig()
    else if (step === 'feed_pig')      goToPigFeed()
    else if (step === 'clean_intro')   goToPigCleanIntro()
    else if (step === 'growth_explained')  goToPigGrowthExplained()
    else if (step === 'breed_explained')   goToPigBreedExplained()
    else if (step === 'harvest_explained') goToPigHarvestExplained()
  })
}

// ============================================================================
// Entry point — called from index.ts after save loads
// ============================================================================
export function initAnimalTutorialSystem(onComplete: () => void): void {
  const chickenStep = animalTutorialState.chickenStep as ChickenTutorialStep
  const pigStep     = animalTutorialState.pigStep as PigTutorialStep

  // Resume in-progress chicken tutorial (player reconnected mid-flow)
  if (chickenStep !== '' && chickenStep !== 'complete') {
    resumeChickenTutorial(onComplete)
    return
  }

  // Resume in-progress pig tutorial
  if (pigStep !== '' && pigStep !== 'complete') {
    resumePigTutorial(onComplete)
    return
  }

  // Startup failsafe: player may already be at or past the unlock level when
  // this code first deploys (save loaded with level >= threshold, so onLevelUp
  // never fires). Check after a short delay to let the normal startup path
  // settle first (tutorial / progression event may also be active on load).
  const needsChicken = playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL && chickenStep === ''
  const needsPig     = playerState.level >= PIG_PEN_UNLOCK_LEVEL      && pigStep     === ''

  if (needsChicken || needsPig) {
    let delay = 8.0
    engine.addSystem(function animalTutorialStartupCheck(dt: number) {
      delay -= dt
      if (delay > 0) return
      engine.removeSystem(animalTutorialStartupCheck)

      // Abort if any other modal tutorial is already running
      if (tutorialState.active || progressionEventState.active) return

      if (
        needsChicken &&
        !animalTutorialState.chickenActive &&
        animalTutorialState.chickenStep === ''
      ) {
        triggerChickenTutorial(onComplete)
      } else if (
        needsPig &&
        !animalTutorialState.pigActive &&
        animalTutorialState.pigStep === ''
      ) {
        triggerPigTutorial(onComplete)
      }
    })
  }
}

export { triggerChickenTutorial, triggerPigTutorial }
