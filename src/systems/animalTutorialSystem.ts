import { engine } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { animalTutorialState, animalTutorialCallbacks, type ChickenTutorialStep, type PigTutorialStep } from '../game/animalTutorialState'
import { initNpcSystem, departAllActiveNpcs } from './npcSystem'
import { MAYOR_DEF } from '../data/npcData'
import { setArrowTarget, initTutorialArrow } from './tutorialArrowSystem'
import { playSound } from './sfxSystem'
import { getCoopAreaEntity, getPenAreaEntity, getCoopFoodEntity, getPenFoodEntity } from './animalSystem'
import { saveFarm } from '../services/saveService'
import { CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL } from '../data/animalData'
import { progressionEventState } from '../game/progressionEventState'
import { tutorialState } from '../game/tutorialState'
import { t, tList } from '../i18n'

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
function showDialog(text: string | string[], buttonLabel: string, onButton: () => void): void {
  const pages = Array.isArray(text) ? text : [text]
  npcDialogState.npcName             = MAYOR_DEF.name
  npcDialogState.npcId               = MAYOR_DEF.id
  npcDialogState.npcHeadImage        = MAYOR_DEF.headImage
  npcDialogState.tutorialPages       = pages
  npcDialogState.tutorialPage        = 0
  npcDialogState.tutorialFinalButtonLabel = buttonLabel
  npcDialogState.dialogLine          = pages[0]
  npcDialogState.mode                = 'tutorial'
  npcDialogState.tutorialButtonLabel = pages.length > 1 ? t('tutorial.nextButton') : buttonLabel
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
  // Player may already own the coop (e.g. bought it before this tutorial step
  // ever registered its watch callback) — skip ahead instead of waiting on a
  // purchase event that will never fire again.
  if (playerState.chickenCoopOwned) { goToChickenBuyChicken(); return }
  setChickenStep('buy_coop')

  const coopEntity = getCoopAreaEntity()
  setArrowTarget(coopEntity)

  showDialog(
    tList('animalTutorial.chickenBuyCoop.pages'),
    t('animalTutorial.chickenBuyCoop.button'),
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
  // Player may already own chickens (up to the 5-per-coop cap) — the watch
  // callback only fires on the 0→1 transition, so if they're already past
  // that point (or capped out) it can never fire again. Skip ahead.
  if (playerState.chickens.length > 0) { goToChickenFeed(); return }
  setChickenStep('buy_chicken')

  const computer = engine.getEntityOrNullByName('Computer.glb')
  setArrowTarget(computer)

  showDialog(
    t('animalTutorial.chickenBuyChicken.text'),
    t('animalTutorial.chickenBuyChicken.button'),
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onFirstChickenBought = () => {
    animalTutorialCallbacks.onFirstChickenBought = () => {}
    setArrowTarget(null)
    goToChickenFeed()
  }
}

function goToChickenFeed(): void {
  // Bowl may already have food in it — same "already satisfied" guard.
  if (playerState.chickenFoodInBowl > 0) { goToChickenCleanIntro(); return }
  setChickenStep('feed_chicken')

  const foodEntity = getCoopFoodEntity()
  setArrowTarget(foodEntity)

  showDialog(
    tList('animalTutorial.chickenFeed.pages'),
    t('animalTutorial.chickenFeed.button'),
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
    tList('animalTutorial.chickenCleanIntro.pages'),
    t('animalTutorial.chickenCleanIntro.button'),
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
        t('animalTutorial.chickenMayorClick.buyCoop'),
        t('animalTutorial.chickenMayorClick.gotItButton'),
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'buy_chicken') {
      showDialog(
        t('animalTutorial.chickenMayorClick.buyChicken'),
        t('animalTutorial.chickenMayorClick.onItButton'),
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'feed_chicken') {
      showDialog(
        t('animalTutorial.chickenMayorClick.feedChicken'),
        t('animalTutorial.chickenMayorClick.gotItButton'),
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

  // Same guard as triggerChickenTutorial — without it, any NPC left over from
  // another code path (e.g. the regular quest rotation) sits alongside the
  // freshly spawned Mayor instead of being evicted first.
  departAllActiveNpcs()

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
  // Same "already satisfied" guard as the chicken coop step.
  if (playerState.pigPenOwned) { goToPigBuyPig(); return }
  setPigStep('buy_pen')

  const penEntity = getPenAreaEntity()
  setArrowTarget(penEntity)

  showDialog(
    tList('animalTutorial.pigBuyPen.pages'),
    t('animalTutorial.pigBuyPen.button'),
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
  // Same "already satisfied" guard as the chicken step — the watch callback
  // only fires on the 0→1 transition, so a player already past it (or capped
  // out at 5 pigs) would otherwise be stuck here forever.
  if (playerState.pigs.length > 0) { goToPigFeed(); return }
  setPigStep('buy_pig')

  const computer = engine.getEntityOrNullByName('Computer.glb')
  setArrowTarget(computer)

  showDialog(
    tList('animalTutorial.pigBuyPig.pages'),
    t('animalTutorial.pigBuyPig.button'),
    () => { playerState.activeMenu = 'none' }
  )

  animalTutorialCallbacks.onFirstPigBought = () => {
    animalTutorialCallbacks.onFirstPigBought = () => {}
    setArrowTarget(null)
    goToPigFeed()
  }
}

function goToPigFeed(): void {
  if (playerState.pigFoodInBowl > 0) { goToPigCleanIntro(); return }
  setPigStep('feed_pig')

  const foodEntity = getPenFoodEntity()
  setArrowTarget(foodEntity)

  showDialog(
    tList('animalTutorial.pigFeed.pages'),
    t('animalTutorial.pigFeed.button'),
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
    tList('animalTutorial.pigCleanIntro.pages'),
    t('animalTutorial.pigCleanIntro.button'),
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
    tList('animalTutorial.pigGrowthExplained.pages'),
    t('animalTutorial.pigGrowthExplained.button'),
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
    tList('animalTutorial.pigBreedExplained.pages'),
    t('animalTutorial.pigBreedExplained.button'),
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
    t('animalTutorial.pigHarvestExplained.text'),
    t('animalTutorial.pigHarvestExplained.button'),
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
        t('animalTutorial.pigMayorClick.buyPen'),
        t('animalTutorial.pigMayorClick.gotItButton'),
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'buy_pig') {
      showDialog(
        t('animalTutorial.pigMayorClick.buyPig'),
        t('animalTutorial.pigMayorClick.onItButton'),
        () => { playerState.activeMenu = 'none' }
      )
    } else if (step === 'feed_pig') {
      showDialog(
        t('animalTutorial.pigMayorClick.feedPig'),
        t('animalTutorial.pigMayorClick.gotItButton'),
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

  departAllActiveNpcs()

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
  // Ensure the compass arrow entity exists — it's normally created by the
  // main tutorial system, but that only runs when the welcome tutorial is
  // active. Players past Level 8/12 need it for animal tutorials too.
  initTutorialArrow()

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
