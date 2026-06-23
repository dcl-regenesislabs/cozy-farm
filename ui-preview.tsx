// Preview-only panels for `npm run ui-preview`. This file is not part of the deployed scene.
import { setupUi } from './src/ui'
import { playerState } from './src/game/gameState'
import { CropType } from './src/data/cropData'
import { FertilizerType } from './src/data/fertilizerData'
import { npcDialogState } from './src/game/npcDialogState'
import { questProgressMap } from './src/game/questState'
import { lbState } from './src/ui/LeaderboardPanel'
import type { FarmSlot, LeaderboardEntry } from './src/shared/farmMessages'

setupUi()

const NOW = Date.parse('2026-06-23T12:00:00Z')

const FARM_SLOTS: FarmSlot[] = [
  { slotId: 0, wallet: '0x1234567890abcdef1234567890abcdef12345678', displayName: 'Agu', claimedAt: NOW - 18 * 86400000 },
  { slotId: 1, wallet: '0x9c8f7e6d5c4b3a29181716151413121110ffeedd', displayName: 'Luna', claimedAt: NOW - 9 * 86400000 },
  { slotId: 2, wallet: '', displayName: '', claimedAt: 0 },
  { slotId: 3, wallet: '0x1111111111111111111111111111111111111111', displayName: 'Marco', claimedAt: NOW - 30 * 86400000 },
  { slotId: 4, wallet: '', displayName: '', claimedAt: 0 },
  { slotId: 5, wallet: '0x2222222222222222222222222222222222222222', displayName: 'Rosa', claimedAt: NOW - 5 * 86400000 },
  { slotId: 6, wallet: '0x3333333333333333333333333333333333333333', displayName: 'Gerald', claimedAt: NOW - 14 * 86400000 },
  { slotId: 7, wallet: '', displayName: '', claimedAt: 0 },
]

const FULL_FARM_SLOTS: FarmSlot[] = FARM_SLOTS.map((slot, index) =>
  slot.wallet
    ? slot
    : {
        slotId: slot.slotId,
        wallet: `0x${String(index + 4).repeat(40).slice(0, 40)}`,
        displayName: `Farmer ${index + 1}`,
        claimedAt: NOW - (index + 2) * 86400000,
      }
)

const LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, address: '0x1111111111111111111111111111111111111111', displayName: 'Marco', beautyScore: 980 },
  { rank: 2, address: '0x1234567890abcdef1234567890abcdef12345678', displayName: 'Agu', beautyScore: 910 },
  { rank: 3, address: '0x2222222222222222222222222222222222222222', displayName: 'Rosa', beautyScore: 860 },
  { rank: 4, address: '0x3333333333333333333333333333333333333333', displayName: 'Gerald', beautyScore: 820 },
]

function setMap<K, V>(target: Map<K, V>, entries: [K, V][]) {
  target.clear()
  for (const [key, value] of entries) {
    target.set(key, value)
  }
}

function resetQuestPreview() {
  for (const progress of questProgressMap.values()) {
    progress.current = 0
    progress.status = progress.id === 'mayorchen_fertilizer' ? 'completed' : 'available'
  }

  const rosa = questProgressMap.get('rosa')
  if (rosa) {
    rosa.current = 3
    rosa.status = 'active'
  }

  const marco = questProgressMap.get('marco')
  if (marco) {
    marco.current = 10
    marco.status = 'claimable'
  }

  const mayor = questProgressMap.get('mayorchen')
  if (mayor) {
    mayor.current = 5
    mayor.status = 'completed'
  }
}

function resetNpcDialog() {
  npcDialogState.npcName = ''
  npcDialogState.npcId = ''
  npcDialogState.npcHeadImage = ''
  npcDialogState.dialogLine = ''
  npcDialogState.mode = 'greeting'
  npcDialogState.tutorialPages = []
  npcDialogState.tutorialPage = 0
  npcDialogState.tutorialFinalButtonLabel = 'Got it!'
  npcDialogState.tutorialButtonLabel = 'Got it!'
  npcDialogState.onClose = null
  npcDialogState.onAccept = null
  npcDialogState.onClaim = null
}

function resetLeaderboardPreview() {
  lbState.entries = LEADERBOARD_ENTRIES
  lbState.currentRank = 2
  lbState.currentScore = 910
  lbState.loading = false
  lbState.loaded = true
}

function resetPreviewState() {
  playerState.coins = 1240
  playerState.activeMenu = 'none'
  playerState.activePlotEntity = null
  playerState.cropsUnlocked = true
  playerState.expansion1Unlocked = true
  playerState.expansion2Unlocked = false
  playerState.farmerHired = true
  playerState.workerOutstandingWages = 90
  playerState.workerUnpaidDays = 2
  playerState.workerLastWageProcessedAt = NOW - 2 * 86400000
  playerState.xp = 840
  playerState.level = 6
  playerState.wallet = '0x1234567890abcdef1234567890abcdef12345678'
  playerState.userId = 'preview-user'
  playerState.avatarUrl = ''
  playerState.displayName = 'Agustin'
  playerState.dogOwned = true
  playerState.totalCropsHarvested = 124
  playerState.totalWaterCount = 88
  playerState.totalSeedPlanted = 133
  playerState.totalSellCount = 39
  playerState.totalCoinsEarned = 3240
  playerState.claimedRewards = [2, 4]
  playerState.beautyScore = 910
  playerState.beautySlots = [1, 4, 9]
  playerState.totalLikesReceived = 17
  playerState.mailbox = [
    {
      id: 'mail-1',
      type: 'coins',
      reason: 'like',
      amount: 25,
      cropType: -1,
      fromAddress: '0x2222222222222222222222222222222222222222',
      fromName: 'Rosa',
      createdAt: NOW - 7200000,
    },
    {
      id: 'mail-2',
      type: 'seeds',
      reason: 'visit_water',
      amount: 3,
      cropType: CropType.Tomato,
      fromAddress: '0x3333333333333333333333333333333333333333',
      fromName: 'Gerald',
      createdAt: NOW - 3600000,
    },
  ]
  playerState.mailboxSeenCount = 0
  playerState.serverConnected = true
  playerState.mySlotId = 0
  playerState.farmSlots = FARM_SLOTS.map((slot) => ({ ...slot }))
  playerState.socialToastText = ''
  playerState.socialToastExpiresAt = 0
  playerState.levelUpToastText = ''
  playerState.levelUpToastExpiresAt = 0
  playerState.viewingFarm = null
  playerState.organicWaste = 6
  playerState.compostWasteCount = 4
  playerState.compostLastCollectedAt = NOW - 20 * 60000
  playerState.chickenCoopOwned = true
  playerState.chickens = [
    { id: 'hen-1', lastEggAt: NOW - 3600000 },
    { id: 'hen-2', lastEggAt: NOW - 1800000 },
  ]
  playerState.chickenFoodInBowl = 9
  playerState.chickenCoopDirtyAt = NOW - 600000
  playerState.pigPenOwned = true
  playerState.pigs = [
    {
      id: 'pig-1',
      purchasedAt: NOW - 12 * 86400000,
      bornAt: 0,
      becameAdultAt: NOW - 10 * 86400000,
      feedScore: 0.72,
      lastBreedAt: NOW - 4 * 86400000,
      lastManureAt: NOW - 5400000,
    },
  ]
  playerState.pigFoodInBowl = 6
  playerState.pigPenDirtyAt = NOW - 900000
  playerState.grainCount = 11
  playerState.veggieScrapCount = 8
  playerState.eggsCount = 5
  playerState.pigMeatCount = 2
  playerState.compostBinUnlocked = true
  playerState.coopDirtAccumMs = 0
  playerState.penDirtAccumMs = 0
  playerState.activeFeedBowl = null
  playerState.rotSystemUnlocked = true
  playerState.progressionEventStep = 'complete'
  playerState.chickenTutorialStep = 'done'
  playerState.pigTutorialStep = 'done'
  playerState.lastNpcVisitAt = NOW - 86400000
  playerState.npcScheduleIndex = 2
  playerState.viewingFarmDisplayName = ''
  playerState.visitorSessionWaterCount = 2
  playerState.tutorialCompostCycle = false
  playerState.unlockedPlotGroups = ['north-field']
  playerState.activePlotGroupName = 'north-field'
  playerState.farmAssignmentOverlayActive = false
  playerState.farmAssignmentOverlaySlotId = -1
  playerState.farmAssignmentOverlayStartedAt = 0
  playerState.farmAssignmentOverlayDurationMs = 0
  playerState.farmGameplayUiReady = true
  playerState.menuInputLockDisabled = false
  playerState.plazaMapMinimized = false
  playerState.freeSlotNotification = null

  setMap(playerState.seeds, [
    [CropType.Onion, 12],
    [CropType.Potato, 9],
    [CropType.Garlic, 6],
    [CropType.Tomato, 5],
    [CropType.Carrot, 3],
  ])

  setMap(playerState.harvested, [
    [CropType.Onion, 18],
    [CropType.Potato, 14],
    [CropType.Garlic, 11],
    [CropType.Tomato, 7],
    [CropType.Carrot, 4],
    [CropType.Corn, 2],
  ])

  playerState.unlockedCrops = new Set([
    CropType.Onion,
    CropType.Potato,
    CropType.Garlic,
    CropType.Tomato,
    CropType.Carrot,
    CropType.Corn,
  ])

  setMap(playerState.farmerSeeds, [
    [CropType.Onion, 8],
    [CropType.Tomato, 4],
  ])

  setMap(playerState.farmerInventory, [
    [CropType.Onion, 7],
    [CropType.Potato, 5],
  ])

  setMap(playerState.fertilizers, [
    [FertilizerType.GrowthBoost, 4],
    [FertilizerType.YieldBoost, 1],
  ])

  resetQuestPreview()
  resetNpcDialog()
  resetLeaderboardPreview()
}

function ownFarmUi() {
  resetPreviewState()
}

function waitingForSlotUi() {
  resetPreviewState()
  playerState.farmGameplayUiReady = false
  playerState.mySlotId = -1
  playerState.wallet = ''
  playerState.displayName = ''
  playerState.farmSlots = FULL_FARM_SLOTS.map((slot) => ({ ...slot }))
  playerState.plazaMapMinimized = false
}

function farmMapUi() {
  resetPreviewState()
  playerState.activeMenu = 'farmSelect'
  playerState.plazaMapMinimized = false
}

function plantMenuUi() {
  resetPreviewState()
  playerState.activeMenu = 'plant'
}

function shopMenuUi() {
  resetPreviewState()
  playerState.activeMenu = 'shop'
}

function inventoryUi() {
  resetPreviewState()
  playerState.activeMenu = 'inventory'
}

function statsUi() {
  resetPreviewState()
  playerState.activeMenu = 'stats'
}

function questsUi() {
  resetPreviewState()
  playerState.activeMenu = 'quests'
}

function farmPanelUi() {
  resetPreviewState()
  playerState.activeMenu = 'farm'
}

function chickenCoopUi() {
  resetPreviewState()
  playerState.activeMenu = 'chickenCoop'
}

function pigPenUi() {
  resetPreviewState()
  playerState.activeMenu = 'pigPen'
}

function feedChickensUi() {
  resetPreviewState()
  playerState.activeFeedBowl = 'chicken'
  playerState.activeMenu = 'feedBowl'
}

function npcQuestUi() {
  resetPreviewState()
  playerState.activeMenu = 'npcDialog'
  npcDialogState.npcName = 'Rosa'
  npcDialogState.npcId = 'rosa'
  npcDialogState.npcHeadImage = 'assets/images/npcs/rosa.png'
  npcDialogState.dialogLine = "Could you harvest 5 onions for me, dear?\nI'm making soup for the whole plaza."
  npcDialogState.mode = 'quest_offer'
  npcDialogState.onAccept = () => {}
  const rosa = questProgressMap.get('rosa')
  if (rosa) {
    rosa.current = 3
    rosa.status = 'available'
  }
}

function leaderboardUi() {
  resetPreviewState()
  playerState.activeMenu = 'leaderboard'
}

function visitorHudUi() {
  resetPreviewState()
  playerState.viewingFarm = '0x2222222222222222222222222222222222222222'
  playerState.viewingFarmDisplayName = 'Rosa'
  playerState.farmGameplayUiReady = false
  playerState.activeMenu = 'none'
}

export default {
  'Own farm HUD': ownFarmUi,
  'Waiting for slot': waitingForSlotUi,
  'Farm map': farmMapUi,
  'Plant menu': plantMenuUi,
  Shop: shopMenuUi,
  Inventory: inventoryUi,
  Stats: statsUi,
  Quests: questsUi,
  'Farm panel': farmPanelUi,
  'Chicken coop': chickenCoopUi,
  'Pig pen': pigPenUi,
  'Feed chickens': feedChickensUi,
  'NPC quest offer': npcQuestUi,
  Leaderboard: leaderboardUi,
  'Visitor HUD': visitorHudUi,
}
