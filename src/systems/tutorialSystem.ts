import { engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { tutorialState, TutorialActionType, tutorialCallbacks, tutorialNavState } from '../game/tutorialState'
import { CropType } from '../data/cropData'
import { ALL_FERTILIZER_TYPES } from '../data/fertilizerData'
import { MAYOR_DEF } from '../data/npcData'
import { setOnQuestAccepted, setOnQuestClaimed, setOnQuestClaimable, resetQuestProgress } from '../game/questState'
import { walkNpcToPosition, requestNpcDeparture } from './npcSystem'
import { addXp } from './levelingSystem'
import { PlotState } from '../components/farmComponents'
import { playSound } from './sfxSystem'
import { initTutorialArrow, setArrowTarget } from './tutorialArrowSystem'
import { progressionEventState } from '../game/progressionEventState'
import { saveFarm } from '../services/saveService'

const STARTER_COINS         = 15   // exactly 5 onion seeds × 3 coins each
const SEEDS_TO_BUY          = 5
const HARVEST_MORE_TARGET   = 3

// ---------------------------------------------------------------------------
// Dialog helper — opens Mayor Chen's tutorial dialog panel
// ---------------------------------------------------------------------------
function showTutorialDialog(text: string, buttonLabel: string, onButton: () => void) {
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
// Mayor walk helper — uses tutorialCallbacks.getFirstSoilEntity() to avoid
// a circular import (interactionSetup ↔ tutorialSystem).
// The callback is wired in index.ts after both modules are loaded.
// ---------------------------------------------------------------------------
function walkMayorToSoil(offsetX: number, offsetZ: number) {
  const soil = tutorialCallbacks.getFirstSoilEntity()
  if (soil === null) return
  const pos = Transform.get(soil as import('@dcl/sdk/ecs').Entity).position
  walkNpcToPosition('mayorchen', Vector3.create(pos.x + offsetX, pos.y, pos.z + offsetZ))
}

// ---------------------------------------------------------------------------
// Step transition functions
// ---------------------------------------------------------------------------

function goToPlantFirst() {
  tutorialState.step = 'plant_first'
  walkMayorToSoil(0, -1.2)
  setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
  showTutorialDialog(
    "Excellent! Now come here to this soil plot and try to plant your first seed.\n\nClick the soil to open the planting menu, then select Onion.",
    "On my way!",
    () => {},
  )
}

function goToWaterFirst() {
  tutorialState.step = 'water_first'
  setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
  showTutorialDialog(
    "Once you plant a seed, you'll need to water it.\nAny plant needs water to grow — go ahead and use your watering can on it!",
    "On it!",
    () => {},
  )
}

function goToWaitGrow() {
  tutorialState.step = 'wait_grow'
  tutorialCallbacks.unlockSoilsPhase1()
  setArrowTarget(null)   // just waiting — no arrow needed
  showTutorialDialog(
    "Good — now it's time to wait for the plant to grow!\n\nI'll apply a quick Fertilizer to this soil so it goes faster. I've also unlocked two more plots for you — practice planting while you wait!",
    "Nice, let's go!",
    () => {},
  )
}

function goToHarvestFirst() {
  tutorialState.step = 'harvest_first'
  walkMayorToSoil(0, -1.2)
  setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
  showTutorialDialog(
    "Your first Onion is ready! Come and harvest it!\n\nClick the soil plot with the glowing hand icon.",
    "Let's harvest!",
    () => {},
  )
}

function goToHarvestMore() {
  tutorialState.step             = 'harvest_more'
  tutorialState.harvestMoreCount = 0
  setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
  showTutorialDialog(
    "Amazing! You're a real farmer now, these are the basics of farming!\n\nLet's keep practicing — harvest 3 more onions!",
    "I'm on fire!",
    () => {},
  )
}

function goToOpenQuests() {
  tutorialState.step = 'open_quests'
  setArrowTarget(null)                      // quests button is 2D UI — no 3D arrow
  tutorialNavState.highlightQuests = true   // dim other nav buttons, bounce quests
  showTutorialDialog(
    "On your farm you'll get a lot of nearby visitors and neighbours with requests!\n\nOpen the Quests panel using the button at the bottom of the screen to see what awaits you.",
    "Show me!",
    () => {},
  )
}

function goToTalkMayor() {
  tutorialState.step = 'talk_mayor'
  setArrowTarget((tutorialCallbacks.getMayorEntity() as import('@dcl/sdk/ecs').Entity | null))

  // Pre-register both quest callbacks before opening the dialog.
  // setOnQuestAccepted fires when Mayor's quest is accepted.
  // setOnQuestClaimed fires when Mayor's quest reward is collected.
  setOnQuestAccepted(() => {
    tutorialState.step = 'sell_quest'
    setArrowTarget((tutorialCallbacks.getTruckEntity() as import('@dcl/sdk/ecs').Entity | null))
    // Once the player sells enough, point back to Mayor to claim the reward
    setOnQuestClaimable(() => {
      setArrowTarget((tutorialCallbacks.getMayorEntity() as import('@dcl/sdk/ecs').Entity | null))
    })
  })

  setOnQuestClaimed(() => {
    // Unlock final 3 soil plots and complete the tutorial
    tutorialCallbacks.unlockSoilsPhase2()
    tutorialState.step   = 'complete'
    tutorialState.active = false
    setArrowTarget(null)   // tutorial done — hide arrow
    // Mayor is already walking away (departure was triggered by closeDialog)
    showTutorialDialog(
      "You've done it — you're a true farmer now! 🌱\n\nI've unlocked three more soil plots for you. Also, head to your shop computer — Onion, Potato and Garlic seeds are all available now! Tier 2 & 3 crops unlock later as you grow.\n\nThe town of CozyFarm is proud of you. Good luck!",
      "Thanks, Mayor!",
      () => {
        // If Mayor is somehow still idle, make sure he departs
        requestNpcDeparture()
      },
    )
  })

  showTutorialDialog(
    "The town market needs your participation!\n\nNow come and talk to me — I have an official quest for you.",
    "Coming!",
    () => {},
  )
}

// ---------------------------------------------------------------------------
// Engine watcher — polls for passive state changes each frame
// ---------------------------------------------------------------------------

function tutorialWatcherSystem(_dt: number) {
  if (!tutorialState.active) return

  switch (tutorialState.step) {

    case 'plant_vfx': {
      // Wait for the seed planting VFX to finish, then show the watering dialog.
      // (We can't show it immediately in onTutorialAction because plantSeed()
      //  resets activeMenu='none' right after the hook fires, hiding the dialog.)
      const soil = tutorialCallbacks.getFirstSoilEntity()
      if (soil === null) return
      const plot = PlotState.getOrNull(soil as import('@dcl/sdk/ecs').Entity)
      if (plot && !plot.isPlanting) {
        goToWaterFirst()
      }
      break
    }

    case 'water_vfx': {
      // Wait for the watering VFX to finish, THEN show the "wait for growth" dialog.
      // This gives the player 3.5 s to clearly see the timer start counting from 30 s
      // before Mayor Chen's dialog covers the screen.
      const soil = tutorialCallbacks.getFirstSoilEntity()
      if (soil === null) return
      const plot = PlotState.getOrNull(soil as import('@dcl/sdk/ecs').Entity)
      if (plot && !plot.isWatering) {
        goToWaitGrow()
      }
      break
    }

    case 'wait_grow': {
      // Poll the first soil plot until its crop is ready to harvest
      const soil = tutorialCallbacks.getFirstSoilEntity()
      if (soil === null) return
      const plot = PlotState.getOrNull(soil as import('@dcl/sdk/ecs').Entity)
      if (plot && plot.isReady) {
        goToHarvestFirst()
      }
      break
    }

    case 'open_quests': {
      // Advance once the player actually opens the quests panel
      if (playerState.activeMenu === 'quests') {
        tutorialState.step = 'close_quests'
      }
      break
    }

    case 'close_quests': {
      // Advance once the player closes the quests panel
      if (playerState.activeMenu !== 'quests') {
        tutorialNavState.highlightQuests = false
        goToTalkMayor()
      }
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Public API called from actions.ts hooks
// ---------------------------------------------------------------------------

export function onTutorialAction(action: TutorialActionType) {
  if (!tutorialState.active) return

  switch (action) {

    case 'buy_seeds': {
      if (tutorialState.step !== 'buy_seeds') return
      tutorialState.seedsBought++
      if (tutorialState.seedsBought >= SEEDS_TO_BUY) {
        goToPlantFirst()
      }
      break
    }

    case 'plant': {
      if (tutorialState.step !== 'plant_first') return
      // Don't show the dialog yet — plantSeed() resets activeMenu='none' right after
      // this hook fires, which would immediately hide the dialog.
      // Instead, set an intermediate step and let the watcher detect when the
      // seed VFX finishes (isPlanting=false), then show the watering dialog.
      tutorialState.step = 'plant_vfx'
      break
    }

    case 'water': {
      if (tutorialState.step !== 'water_first') return
      // Don't show the grow dialog immediately — waterCrop() is called in the same
      // frame as the tutorial action, and the dialog would open before the player
      // can even see the timer start counting.  Also, the 3D watering-can VFX model
      // sits right on the timer text for 3.5 s and would block it.
      // Instead, advance to an intermediate step and let the watcher detect when
      // isWatering=false (VFX done), then show the dialog.
      tutorialState.step = 'water_vfx'
      break
    }

    case 'harvest': {
      if (tutorialState.step === 'harvest_first') {
        goToHarvestMore()
      } else if (tutorialState.step === 'harvest_more') {
        tutorialState.harvestMoreCount++
        if (tutorialState.harvestMoreCount >= HARVEST_MORE_TARGET) {
          goToOpenQuests()
        }
      }
      break
    }

    case 'sell':
      // sell quest progression is driven by setOnQuestClaimed, not this hook
      break
  }
}

// ---------------------------------------------------------------------------
// Initialise — called once from index.ts after setupEntities()
// ---------------------------------------------------------------------------

export function initTutorialSystem() {
  if (!tutorialState.active) return

  initTutorialArrow()
  engine.addSystem(tutorialWatcherSystem, 5, 'tutorialWatcherSystem')

  // VFX steps are transient — if player disconnected mid-animation, roll back
  // to the step that triggers them so the dialog shows again on resume.
  if (tutorialState.step === 'plant_vfx') tutorialState.step = 'plant_first'
  if (tutorialState.step === 'water_vfx') tutorialState.step = 'water_first'

  // Resume from saved step — only show welcome dialog on a genuine first session
  switch (tutorialState.step) {
    case 'welcome':
      showTutorialDialog(
        "Welcome to CozyFarm! I'm Mayor Chen, and I'll guide you through the basics.\n\nHere are 15 coins to get you started — go inside your house and log into your computer to buy 5 Onion seeds on El Amazonas!",
        "Thanks, Mayor!",
        () => {
          playerState.coins += STARTER_COINS
          tutorialState.step = 'buy_seeds'
          setArrowTarget((tutorialCallbacks.getComputerEntity() as import('@dcl/sdk/ecs').Entity | null))
        },
      )
      break

    case 'buy_seeds':
      setArrowTarget((tutorialCallbacks.getComputerEntity() as import('@dcl/sdk/ecs').Entity | null))
      break

    case 'plant_first':
      walkMayorToSoil(0, -1.2)
      setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
      break

    case 'water_first':
      setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
      break

    case 'wait_grow':
      setArrowTarget(null)
      break

    case 'harvest_first':
      walkMayorToSoil(0, -1.2)
      setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
      break

    case 'harvest_more':
      setArrowTarget((tutorialCallbacks.getFirstSoilEntity() as import('@dcl/sdk/ecs').Entity | null))
      break

    case 'open_quests':
      tutorialNavState.highlightQuests = true
      setArrowTarget(null)
      break

    case 'close_quests':
      tutorialNavState.highlightQuests = true
      setArrowTarget(null)
      break

    case 'talk_mayor':
    case 'sell_quest':
      goToTalkMayor()
      break

    default:
      break
  }
}

// ---------------------------------------------------------------------------
// Skip — triggered by clicking the Bed 3 times
// ---------------------------------------------------------------------------

export function skipTutorial() {
  tutorialState.active = false
  tutorialState.step   = 'complete'
  playerState.coins    = 20000
  playerState.seeds.set(CropType.Onion, 10)
  playerState.seeds.set(CropType.Tomato, 5)
  ALL_FERTILIZER_TYPES.forEach((f) => playerState.fertilizers.set(f, 2))
  playerState.organicWaste = 10
  playerState.grainCount   = 10   // grain for chicken testing
  playerState.activeMenu = 'none'
  setArrowTarget(null)
  tutorialCallbacks.unlockSoilsAll6()
  requestNpcDeparture()
  addXp(3000)  // brings player to level 8 — unlocks Chicken Coop + all quest prerequisites
  console.log('CozyFarm Tutorial: skipped via Axe (3 clicks) — level 8, 20k coins, grain x10')
}

// ---------------------------------------------------------------------------
// Dev reset — 3 clicks on Bed resets all progress back to tutorial start
// ---------------------------------------------------------------------------
export function resetFarm() {
  // Despawn any active NPC and clear UI
  requestNpcDeparture(true)
  playerState.activeMenu = 'none'
  setArrowTarget(null)

  // Reset economy + inventory
  playerState.coins    = 0
  playerState.seeds.clear()
  playerState.harvested.clear()

  // Reset progression
  playerState.xp    = 0
  playerState.level = 1

  // Reset unlocks
  playerState.cropsUnlocked      = false
  playerState.expansion1Unlocked = false
  playerState.expansion2Unlocked = false

  // Reset farmer
  playerState.farmerHired                = false
  playerState.farmerSeeds.clear()
  playerState.farmerInventory.clear()
  playerState.workerOutstandingWages     = 0
  playerState.workerUnpaidDays           = 0
  playerState.workerLastWageProcessedAt  = 0

  // Reset lifetime stats
  playerState.totalCropsHarvested = 0
  playerState.totalWaterCount     = 0
  playerState.totalSeedPlanted    = 0
  playerState.totalSellCount      = 0
  playerState.totalCoinsEarned    = 0
  playerState.claimedRewards      = []
  playerState.beautyScore         = 0
  playerState.beautySlots         = [0, 0, 0]
  playerState.totalLikesReceived  = 0
  playerState.mailbox             = []
  playerState.mailboxSeenCount    = 0

  // Reset fertilizer system
  playerState.organicWaste            = 0
  playerState.fertilizers.clear()
  playerState.compostWasteCount       = 0
  playerState.compostLastCollectedAt  = 0
  playerState.compostBinUnlocked      = false
  playerState.tutorialCompostCycle    = false

  // Reset progression event
  progressionEventState.active = false
  progressionEventState.step   = ''
  playerState.rotSystemUnlocked      = false
  playerState.progressionEventStep   = ''
  playerState.lastNpcVisitAt         = 0
  playerState.npcScheduleIndex       = 0

  // Reset tutorial state
  tutorialState.active          = true
  tutorialState.step            = 'welcome'
  tutorialState.seedsBought     = 0
  tutorialState.harvestMoreCount = 0
  tutorialNavState.highlightQuests = false

  // Reset quests and plots via callbacks (avoids circular imports)
  resetQuestProgress()
  tutorialCallbacks.resetSoilPlots()

  // Persist the empty state to the server
  saveFarm()

  // Respawn Mayor and restart tutorial via index.ts callback
  tutorialCallbacks.onResetComplete()

  console.log('CozyFarm: Farm reset via Bed (3 clicks) — tutorial restarted')
}
