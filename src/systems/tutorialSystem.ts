import { engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import { npcDialogState } from '../game/npcDialogState'
import { tutorialState, TutorialActionType, tutorialCallbacks } from '../game/tutorialState'
import { CropType } from '../data/cropData'
import { MAYOR_DEF } from '../data/npcData'
import { setOnQuestAccepted, setOnQuestClaimed } from '../game/questState'
import { walkNpcToPosition, requestNpcDeparture } from './npcSystem'
import { PlotState } from '../components/farmComponents'

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
  playerState.activeMenu             = 'npcDialog'
}

// ---------------------------------------------------------------------------
// Mayor walk helper — uses entity name to avoid circular import
// ---------------------------------------------------------------------------
function walkMayorToSoil(offsetX: number, offsetZ: number) {
  const soil = engine.getEntityOrNullByName('Soil01.glb')
  if (!soil) return
  const pos = Transform.get(soil).position
  walkNpcToPosition('mayorchen', Vector3.create(pos.x + offsetX, pos.y, pos.z + offsetZ))
}

// ---------------------------------------------------------------------------
// Step transition functions
// ---------------------------------------------------------------------------

function goToPlantFirst() {
  tutorialState.step = 'plant_first'
  walkMayorToSoil(1.5, 0.5)
  showTutorialDialog(
    "Excellent! Now come here to this soil plot and try to plant your first seed.\n\nClick the soil to open the planting menu, then select Onion.",
    "On my way!",
    () => {},
  )
}

function goToWaterFirst() {
  tutorialState.step = 'water_first'
  showTutorialDialog(
    "Your seed is in the ground!\n\nNow water it — click the plot again to use your watering can.",
    "On it!",
    () => {},
  )
}

function goToWaitGrow() {
  tutorialState.step = 'wait_grow'
  tutorialCallbacks.unlockSoilsPhase1()
  showTutorialDialog(
    "Well watered! Now we wait for it to grow.\n\nIn the meantime, I've unlocked two more soil plots for you — go ahead and practice planting more seeds!",
    "More space, nice!",
    () => {},
  )
}

function goToHarvestFirst() {
  tutorialState.step = 'harvest_first'
  walkMayorToSoil(1.5, 0.5)
  showTutorialDialog(
    "Your first Onion is ready! Come and harvest it!\n\nClick the soil plot with the glowing hand icon.",
    "Let's harvest!",
    () => {},
  )
}

function goToHarvestMore() {
  tutorialState.step             = 'harvest_more'
  tutorialState.harvestMoreCount = 0
  showTutorialDialog(
    "Amazing! You're a real farmer now, these are the basics of farming!\n\nLet's keep practicing — harvest 3 more onions!",
    "I'm on fire!",
    () => {},
  )
}

function goToOpenQuests() {
  tutorialState.step = 'open_quests'
  showTutorialDialog(
    "On your farm you'll get a lot of nearby visitors and neighbours with requests!\n\nOpen the Quests panel using the button at the bottom of the screen to see what awaits you.",
    "Show me!",
    () => {},
  )
}

function goToTalkMayor() {
  tutorialState.step = 'talk_mayor'

  // Pre-register both quest callbacks before opening the dialog.
  // setOnQuestAccepted fires when Mayor's quest is accepted.
  // setOnQuestClaimed fires when Mayor's quest reward is collected.
  setOnQuestAccepted(() => {
    tutorialState.step = 'sell_quest'
    // No extra dialog — the quest panel will show progress
  })

  setOnQuestClaimed(() => {
    // Unlock final 3 soil plots and complete the tutorial
    tutorialCallbacks.unlockSoilsPhase2()
    tutorialState.step   = 'complete'
    tutorialState.active = false
    // Mayor is already walking away (departure was triggered by closeDialog)
    showTutorialDialog(
      "You've done it! You're a true farmer now.\n\nI've unlocked three more soil plots for you. The town of CozyFarm is proud of you — good luck on your farming endeavours!",
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

    case 'wait_grow': {
      // Poll Soil01.glb until its crop is ready to harvest
      const soil = engine.getEntityOrNullByName('Soil01.glb')
      if (!soil) return
      const plot = PlotState.getOrNull(soil)
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
      goToWaterFirst()
      break
    }

    case 'water': {
      if (tutorialState.step !== 'water_first') return
      goToWaitGrow()
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

  // Register the per-frame watcher
  engine.addSystem(tutorialWatcherSystem, 5, 'tutorialWatcherSystem')

  // Step 1: Welcome dialog — Mayor is already walking into the scene
  showTutorialDialog(
    "Welcome to CozyFarm! I'm Mayor Chen, and I'll guide you through the basics.\n\nHere are 15 coins to get you started — go inside your house and log into your computer to buy 5 Onion seeds on El Amazonas!",
    "Thanks, Mayor!",
    () => {
      playerState.coins += STARTER_COINS
      tutorialState.step = 'buy_seeds'
    },
  )
}

// ---------------------------------------------------------------------------
// Skip — triggered by clicking the Bed 3 times
// ---------------------------------------------------------------------------

export function skipTutorial() {
  tutorialState.active = false
  tutorialState.step   = 'complete'
  playerState.coins    = 2000
  playerState.seeds.set(CropType.Onion, 5)
  playerState.activeMenu = 'none'
  tutorialCallbacks.unlockSoilsAll6()
  requestNpcDeparture()
  console.log('CozyFarm Tutorial: skipped via Bed (3 clicks)')
}
