import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { ALL_CROP_TYPES, CropType } from '../data/cropData'
import { PIG_BREED_COOLDOWN, PIG_CYCLE_MS } from '../data/animalData'
import { ALL_FERTILIZER_TYPES, FertilizerType } from '../data/fertilizerData'
import { playerState } from '../game/gameState'
import type { FarmStatePayload, MailboxReward, PlayerEntry } from '../shared/farmMessages'
import { getVisitedPayload, setVisitedPayloadForDebug } from '../services/visitService'
import { playSound } from '../systems/sfxSystem'
import { AnimalPanel } from './AnimalPanel'
import { ExpansionMenu } from './ExpansionMenu'
import { FeedBowlMenu } from './FeedBowlMenu'
import { FertilizeMenu } from './FertilizeMenu'
import { MailboxMenu, ensureMailboxDebugState, resetMailboxState } from './MailboxMenu'
import { C } from './PanelShell'
import { PlotGroupUnlockMenu } from './PlotGroupUnlockMenu'
import { UnlockMenu } from './UnlockMenu'
import { VisitHud } from './VisitHud'

export const UI_DEBUG_SHOWCASE_ENABLED = false

type ShowcasePanelKey =
  | 'animal'
  | 'fertilize'
  | 'feedBowl'
  | 'unlock'
  | 'plotGroupUnlock'
  | 'expansion'
  | 'mailbox'
  | 'visitHud'

type ShowcaseButton = { key: ShowcasePanelKey; label: string }

const SHOWCASE_BUTTONS: ShowcaseButton[] = [
  { key: 'animal', label: 'Animals' },
  { key: 'fertilize', label: 'Fertilize' },
  { key: 'feedBowl', label: 'Feed Bowl' },
  { key: 'unlock', label: 'Land Unlock' },
  { key: 'plotGroupUnlock', label: 'Plot Unlock' },
  { key: 'expansion', label: 'Expansion' },
  { key: 'mailbox', label: 'Mailbox' },
  { key: 'visitHud', label: 'Visit HUD' }
]

const OWNER_WALLET = '0x11111111111111111111111111111111111111aa'
const VISIT_WALLET = '0x22222222222222222222222222222222222222bb'

const showcaseState = {
  selected: 'animal' as ShowcasePanelKey,
  seededKey: '',
  reseedVersion: 0
}

function cropCounts(seedBase: number, step: number): Map<CropType, number> {
  const map = new Map<CropType, number>()
  ALL_CROP_TYPES.forEach((cropType, index) => {
    map.set(cropType, seedBase + index * step)
  })
  return map
}

function fertilizerCounts(base: number): Map<FertilizerType, number> {
  const map = new Map<FertilizerType, number>()
  ALL_FERTILIZER_TYPES.forEach((fertType, index) => {
    map.set(fertType, base + index * 3)
  })
  return map
}

function mailboxRewards(now: number): MailboxReward[] {
  return [
    {
      id: 'mail_like_1',
      type: 'coins',
      reason: 'like',
      amount: 250,
      cropType: -1,
      fromAddress: '0x33333333333333333333333333333333333333cc',
      fromName: 'Rosa',
      createdAt: now - 60_000
    },
    {
      id: 'mail_water_1',
      type: 'seed',
      reason: 'visit_water',
      amount: 12,
      cropType: CropType.Pumpkin,
      fromAddress: '0x44444444444444444444444444444444444444dd',
      fromName: 'Gerald',
      createdAt: now - 180_000
    },
    {
      id: 'mail_like_2',
      type: 'coins',
      reason: 'like',
      amount: 500,
      cropType: -1,
      fromAddress: '0x55555555555555555555555555555555555555ee',
      fromName: 'Mayor Chen',
      createdAt: now - 360_000
    },
    {
      id: 'mail_water_2',
      type: 'seed',
      reason: 'visit_water',
      amount: 7,
      cropType: CropType.Sunflower,
      fromAddress: '0x66666666666666666666666666666666666666ff',
      fromName: 'Animal Guide',
      createdAt: now - 720_000
    }
  ]
}

function mailboxPlayers(): PlayerEntry[] {
  return [
    { address: '0x77777777777777777777777777777777777777aa', displayName: 'Rosa', level: 18 },
    { address: '0x88888888888888888888888888888888888888bb', displayName: 'Gerald', level: 21 },
    { address: '0x99999999999999999999999999999999999999cc', displayName: 'Mayor Chen', level: 30 },
    { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', displayName: 'Animal Guide', level: 16 },
    { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', displayName: 'Coop Master', level: 24 },
    { address: '0xcccccccccccccccccccccccccccccccccccccccc', displayName: 'Pumpkin Lord', level: 27 }
  ]
}

function buildVisitedPayload(now: number): FarmStatePayload {
  const seeds = cropCounts(20, 9)
  const harvested = cropCounts(14, 6)
  const fertilizers = fertilizerCounts(4)

  return {
    wallet: VISIT_WALLET,
    coins: 84250,
    seeds: Array.from(seeds.entries()).map(([cropType, count]) => ({ cropType, count })),
    harvested: Array.from(harvested.entries()).map(([cropType, count]) => ({ cropType, count })),
    xp: 9120,
    level: 24,
    cropsUnlocked: true,
    expansion1Unlocked: true,
    expansion2Unlocked: true,
    unlockedPlotGroups: [
      'PlotGroup_Starter',
      'PlotGroup_TutorialA',
      'PlotGroup_Level_5',
      'PlotGroup_Level_10',
      'PlotGroup_Level_15',
      'PlotGroup_Level_20',
      'PlotGroup_Buy_A',
      'PlotGroup_Buy_B',
      'PlotGroup_Buy_C',
      'PlotGroup_Buy_D',
      'PlotGroup_Buy_E',
      'PlotGroup_Buy_F',
      'PlotGroup_Buy_G'
    ],
    unlockedCrops: ALL_CROP_TYPES,
    farmerHired: true,
    farmerSeeds: Array.from(seeds.entries()).map(([cropType, count]) => ({ cropType, count: Math.max(0, count - 3) })),
    farmerInventory: Array.from(harvested.entries()).map(([cropType, count]) => ({ cropType, count: Math.max(0, count - 2) })),
    workerOutstandingWages: 0,
    workerUnpaidDays: 0,
    workerLastWageProcessedAt: now - 4 * 60 * 60 * 1000,
    dogOwned: true,
    totalCropsHarvested: 1450,
    totalWaterCount: 920,
    totalSeedPlanted: 1180,
    totalSellCount: 760,
    totalCoinsEarned: 152000,
    tutorialComplete: true,
    tutorialStep: 'done',
    tutorialSeedsBought: 5,
    tutorialHarvestMore: 5,
    claimedRewards: [2, 3, 5, 7, 10, 12, 15, 18, 20],
    rotSystemUnlocked: true,
    progressionEventStep: 'complete',
    chickenTutorialStep: 'done',
    pigTutorialStep: 'done',
    lastNpcVisitAt: now - 60 * 60 * 1000,
    npcScheduleIndex: 4,
    plotStates: [],
    questProgress: [],
    musicSongId: 'cozy-morning',
    musicMuted: false,
    musicVolume: 0.8,
    organicWaste: 240,
    fertilizers: Array.from(fertilizers.entries()).map(([fertilizerType, count]) => ({ fertilizerType, count })),
    compostWasteCount: 120,
    compostLastCollectedAt: now - 30 * 60 * 1000,
    chickenCoopOwned: true,
    chickens: [
      { id: 'visit_chicken_1', lastEggAt: now - 2 * 60 * 60 * 1000 },
      { id: 'visit_chicken_2', lastEggAt: now - 5 * 60 * 60 * 1000 },
      { id: 'visit_chicken_3', lastEggAt: now - 8 * 60 * 60 * 1000 }
    ],
    chickenFoodInBowl: 12,
    chickenCoopDirtyAt: 0,
    pigPenOwned: true,
    pigs: [
      {
        id: 'visit_pig_1',
        purchasedAt: now - 11 * 24 * 60 * 60 * 1000,
        bornAt: 0,
        becameAdultAt: now - 10 * 24 * 60 * 60 * 1000,
        feedScore: 28,
        lastBreedAt: now - 3 * 24 * 60 * 60 * 1000,
        lastManureAt: now - PIG_CYCLE_MS
      }
    ],
    pigFoodInBowl: 10,
    pigPenDirtyAt: 0,
    grainCount: 45,
    veggieScrapCount: 70,
    eggsCount: 8,
    pigMeatCount: 2,
    compostBinUnlocked: true,
    beautyScore: 92,
    beautySlots: [1, 3, 4],
    totalLikesReceived: 128,
    mailbox: []
  }
}

function seedBaseAdvancedState(): void {
  const now = Date.now()
  const seeds = cropCounts(48, 11)
  const harvested = cropCounts(32, 9)
  const fertilizers = fertilizerCounts(9)

  playerState.coins = 250000
  playerState.seeds = seeds
  playerState.harvested = harvested
  playerState.unlockedCrops = new Set<CropType>(ALL_CROP_TYPES)
  playerState.activeMenu = 'none'
  playerState.activePlotEntity = null
  playerState.cropsUnlocked = true
  playerState.expansion1Unlocked = true
  playerState.expansion2Unlocked = true
  playerState.farmerHired = true
  playerState.farmerSeeds = cropCounts(12, 4)
  playerState.farmerInventory = cropCounts(9, 3)
  playerState.workerOutstandingWages = 300
  playerState.workerUnpaidDays = 2
  playerState.workerLastWageProcessedAt = now - 26 * 60 * 60 * 1000
  playerState.xp = 12480
  playerState.level = 25
  playerState.wallet = OWNER_WALLET
  playerState.userId = 'debug-user'
  playerState.avatarUrl = ''
  playerState.displayName = 'Debug Farmer'
  playerState.dogOwned = true
  playerState.totalCropsHarvested = 1842
  playerState.totalWaterCount = 1264
  playerState.totalSeedPlanted = 1590
  playerState.totalSellCount = 1034
  playerState.totalCoinsEarned = 286400
  playerState.claimedRewards = [2, 3, 5, 7, 10, 12, 15, 18, 20]
  playerState.beautyScore = 148
  playerState.beautySlots = [1, 2, 4]
  playerState.totalLikesReceived = 57
  playerState.mailbox = mailboxRewards(now)
  playerState.mailboxSeenCount = 0
  playerState.serverConnected = true
  playerState.socialToastText = ''
  playerState.socialToastExpiresAt = 0
  playerState.levelUpToastText = ''
  playerState.levelUpToastExpiresAt = 0
  playerState.viewingFarm = null
  playerState.organicWaste = 320
  playerState.fertilizers = fertilizers
  playerState.compostWasteCount = 170
  playerState.compostLastCollectedAt = now - 45 * 60 * 1000
  playerState.chickenCoopOwned = true
  playerState.chickens = [
    { id: 'chicken_1', lastEggAt: now - 1 * 60 * 60 * 1000 },
    { id: 'chicken_2', lastEggAt: now - 3 * 60 * 60 * 1000 },
    { id: 'chicken_3', lastEggAt: now - 6 * 60 * 60 * 1000 },
    { id: 'chicken_4', lastEggAt: now - 8 * 60 * 60 * 1000 },
    { id: 'chicken_5', lastEggAt: now - 12 * 60 * 60 * 1000 }
  ]
  playerState.chickenFoodInBowl = 18
  playerState.chickenCoopDirtyAt = now - 3 * 60 * 60 * 1000
  playerState.pigPenOwned = true
  playerState.pigs = [
    {
      id: 'pig_1',
      purchasedAt: now - 12 * 60 * 60 * 1000,
      bornAt: now - 12 * 60 * 60 * 1000,
      becameAdultAt: 0,
      feedScore: 8,
      lastBreedAt: 0,
      lastManureAt: 0
    },
    {
      id: 'pig_2',
      purchasedAt: now - 36 * 60 * 60 * 1000,
      bornAt: now - 36 * 60 * 60 * 1000,
      becameAdultAt: 0,
      feedScore: 14,
      lastBreedAt: 0,
      lastManureAt: 0
    },
    {
      id: 'pig_3',
      purchasedAt: now - 5 * 24 * 60 * 60 * 1000,
      bornAt: 0,
      becameAdultAt: now - 5 * 24 * 60 * 60 * 1000,
      feedScore: 22,
      lastBreedAt: now - 2 * PIG_BREED_COOLDOWN,
      lastManureAt: now - 2 * 60 * 60 * 1000
    },
    {
      id: 'pig_4',
      purchasedAt: now - 8 * 24 * 60 * 60 * 1000,
      bornAt: 0,
      becameAdultAt: now - 8 * 24 * 60 * 60 * 1000,
      feedScore: 31,
      lastBreedAt: now - 3 * PIG_BREED_COOLDOWN,
      lastManureAt: now - PIG_CYCLE_MS
    },
    {
      id: 'pig_5',
      purchasedAt: now - 12 * 24 * 60 * 60 * 1000,
      bornAt: 0,
      becameAdultAt: now - 11 * 24 * 60 * 60 * 1000,
      feedScore: 44,
      lastBreedAt: now - 4 * PIG_BREED_COOLDOWN,
      lastManureAt: now - PIG_CYCLE_MS
    }
  ]
  playerState.pigFoodInBowl = 16
  playerState.pigPenDirtyAt = now - 2 * 60 * 60 * 1000
  playerState.grainCount = 95
  playerState.veggieScrapCount = 140
  playerState.eggsCount = 22
  playerState.pigMeatCount = 6
  playerState.compostBinUnlocked = true
  playerState.coopDirtAccumMs = 0
  playerState.penDirtAccumMs = 0
  playerState.activeFeedBowl = null
  playerState.rotSystemUnlocked = true
  playerState.progressionEventStep = 'complete'
  playerState.chickenTutorialStep = 'done'
  playerState.pigTutorialStep = 'done'
  playerState.lastNpcVisitAt = now - 2 * 60 * 60 * 1000
  playerState.npcScheduleIndex = 3
  playerState.viewingFarmDisplayName = ''
  playerState.visitorSessionWaterCount = 0
  playerState.tutorialCompostCycle = false
  playerState.unlockedPlotGroups = [
    'PlotGroup_Starter',
    'PlotGroup_TutorialA',
    'PlotGroup_Level_5',
    'PlotGroup_Level_10',
    'PlotGroup_Level_15',
    'PlotGroup_Level_20',
    'PlotGroup_Buy_A',
    'PlotGroup_Buy_B',
    'PlotGroup_Buy_C',
    'PlotGroup_Buy_D',
    'PlotGroup_Buy_E',
    'PlotGroup_Buy_F',
    'PlotGroup_Buy_G',
    'PlotGroup_Buy_H',
    'PlotGroup_Buy_I'
  ]
  playerState.activePlotGroupName = ''
  playerState.farmReady = true
  playerState.loadingOverlayActive = false
  playerState.menuInputLockDisabled = true

  resetMailboxState()
  setVisitedPayloadForDebug(null)
}

function applyPanelOverrides(selected: ShowcasePanelKey): void {
  switch (selected) {
    case 'animal':
      break
    case 'fertilize':
      playerState.activeMenu = 'fertilize'
      break
    case 'feedBowl':
      playerState.activeMenu = 'feedBowl'
      playerState.activeFeedBowl = 'pig'
      break
    case 'unlock':
      playerState.activeMenu = 'unlock'
      playerState.cropsUnlocked = false
      playerState.farmerHired = false
      playerState.coins = 18000
      break
    case 'plotGroupUnlock':
      playerState.activeMenu = 'plotGroupUnlock'
      playerState.activePlotGroupName = 'PlotGroup_Buy_J'
      playerState.coins = 6500
      break
    case 'expansion':
      playerState.activeMenu = 'expansion2'
      playerState.expansion1Unlocked = true
      playerState.expansion2Unlocked = false
      playerState.coins = 5000
      break
    case 'mailbox':
      playerState.activeMenu = 'mailbox'
      break
    case 'visitHud':
      playerState.viewingFarm = VISIT_WALLET
      playerState.viewingFarmDisplayName = 'Pumpkin Lord'
      playerState.visitorSessionWaterCount = 3
      break
  }
}

function seedPanelIfNeeded(): void {
  const seedKey = `${showcaseState.selected}:${showcaseState.reseedVersion}`
  if (showcaseState.seededKey === seedKey) return
  seedBaseAdvancedState()
  applyPanelOverrides(showcaseState.selected)
  showcaseState.seededKey = seedKey
}

function ensureMailboxRuntimeState(): void {
  ensureMailboxDebugState({
    tab: 'mailbox',
    page: 1,
    totalPages: 2,
    players: mailboxPlayers(),
    mailboxHint: '4 rewards queued from likes and visitors'
  })
}

function ensureVisitRuntimeState(): void {
  if (playerState.viewingFarm !== VISIT_WALLET) {
    playerState.viewingFarm = VISIT_WALLET
    playerState.viewingFarmDisplayName = 'Pumpkin Lord'
    playerState.visitorSessionWaterCount = 3
  }
  const payload = getVisitedPayload()
  if (!payload || payload.wallet !== VISIT_WALLET) {
    setVisitedPayloadForDebug(buildVisitedPayload(Date.now()))
  }
}

function ensurePanelRuntimeState(): void {
  if (showcaseState.selected === 'mailbox') ensureMailboxRuntimeState()
  if (showcaseState.selected === 'visitHud') ensureVisitRuntimeState()
}

function renderSelectedPanel() {
  switch (showcaseState.selected) {
    case 'animal':
      return <AnimalPanel />
    case 'fertilize':
      return <FertilizeMenu />
    case 'feedBowl':
      return <FeedBowlMenu />
    case 'unlock':
      return <UnlockMenu />
    case 'plotGroupUnlock':
      return <PlotGroupUnlockMenu />
    case 'expansion':
      return <ExpansionMenu />
    case 'mailbox':
      return <MailboxMenu />
    case 'visitHud':
      return <VisitHud />
  }
}

function switchPanel(key: ShowcasePanelKey): void {
  if (showcaseState.selected === key) {
    showcaseState.reseedVersion += 1
  } else {
    showcaseState.selected = key
  }
  showcaseState.seededKey = ''
}

function cyclePanel(): void {
  const currentIndex = SHOWCASE_BUTTONS.findIndex((button) => button.key === showcaseState.selected)
  const nextIndex = (currentIndex + 1) % SHOWCASE_BUTTONS.length
  switchPanel(SHOWCASE_BUTTONS[nextIndex].key)
}

const ShowcaseSwitcher = () => {
  const mobile = isMobile()
  const currentLabel = SHOWCASE_BUTTONS.find((button) => button.key === showcaseState.selected)?.label ?? ''

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { right: 18, top: 0 },
        width: mobile ? 150 : 120,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none'
      }}
    >
      <UiEntity
        uiTransform={{
          width: mobile ? 140 : 110,
          height: mobile ? 58 : 46,
          alignItems: 'center',
          justifyContent: 'center',
          pointerFilter: 'block'
        }}
        uiBackground={{ color: { r: 0.18, g: 0.14, b: 0.09, a: 0.92 } }}
        onMouseDown={() => {
          playSound('buttonclick')
          cyclePanel()
        }}
      >
        <Label
          value={currentLabel}
          fontSize={mobile ? 19 : 16}
          color={C.textMain}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  )
}

export const UiDebugShowcase = () => {
  seedPanelIfNeeded()
  ensurePanelRuntimeState()

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        pointerFilter: 'none'
      }}
    >
      {renderSelectedPanel()}
      <ShowcaseSwitcher />
    </UiEntity>
  )
}
