import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { isMobile as isMobilePlatform } from '@dcl/sdk/platform'
import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from './game/gameState'
import { TopHud } from './ui/TopHud'
import { BottomNav } from './ui/BottomNav'
import { PlantMenu } from './ui/PlantMenu'
import { FertilizeMenu } from './ui/FertilizeMenu'
import { ShopMenu } from './ui/ShopMenu'
import { SellMenu } from './ui/SellMenu'
import { UnlockMenu } from './ui/UnlockMenu'
import { ExpansionMenu } from './ui/ExpansionMenu'
import { PlotGroupUnlockMenu } from './ui/PlotGroupUnlockMenu'
import { FarmerMenu } from './ui/FarmerMenu'
import { NpcDialogMenu } from './ui/NpcDialogMenu'
import { InventoryPanel } from './ui/InventoryPanel'
import { StatsPanel } from './ui/StatsPanel'
import { QuestPanel } from './ui/QuestPanel'
import { FarmPanel } from './ui/FarmPanel'
import { JukeboxMenu } from './ui/JukeboxMenu'
import { MailboxMenu } from './ui/MailboxMenu'
import { CompostBinMenu } from './ui/CompostBinMenu'
import { LeaderboardPanel } from './ui/LeaderboardPanel'
import { ChickenCoopPanel } from './ui/ChickenCoopPanel'
import { PigPenPanel } from './ui/PigPenPanel'
import { FeedBowlMenu } from './ui/FeedBowlMenu'
import { VisitHud } from './ui/VisitHud'
import { LoadingOverlay } from './ui/LoadingOverlay'
import { LanguageSelectOverlay } from './ui/LanguageSelectOverlay'
import { MAILBOX_FEATURE_ENABLED } from './game/featureFlags'

let uiRendererSyncRegistered = false
let lastAppliedUiRendererSignature = ''

export function setupUi() {
  if (!uiRendererSyncRegistered) {
    uiRendererSyncRegistered = true
    engine.addSystem(syncUiRendererSystem)
  }
  applyUiRenderer(true)
}

function getUiCanvasInfo() {
  return UiCanvasInformation.getOrNull(engine.RootEntity)
}

function getMobileUiDensityScale(): number {
  if (!isMobilePlatform()) return 1
  const canvasInfo = getUiCanvasInfo()
  if (!canvasInfo) return 1
  return canvasInfo.devicePixelRatio > 0 ? canvasInfo.devicePixelRatio : 1
}

function getUiRendererConfig() {
  const densityScale = getMobileUiDensityScale()
  const isMobile = isMobilePlatform()
  const virtualWidth = isMobile ? Math.max(1, Math.round(1600 * densityScale)) : 1920
  const virtualHeightBase = isMobile ? Math.max(1, Math.round(720 * densityScale)) : 1080

  return {
    virtualWidth,
    // Keep the mobile virtual size off exact 16:9 so the SDK does not override it back to 1600x720.
    virtualHeight: isMobile ? virtualHeightBase + 1 : virtualHeightBase,
    screenInset: 'none' as const
  }
}

function applyUiRenderer(force: boolean = false): void {
  const config = getUiRendererConfig()
  const signature = `${isMobilePlatform()}:${config.virtualWidth}x${config.virtualHeight}:${config.screenInset}`
  if (!force && signature === lastAppliedUiRendererSignature) return

  ReactEcsRenderer.setUiRenderer(MainUi, config)
  lastAppliedUiRendererSignature = signature
}

function syncUiRendererSystem(): void {
  applyUiRenderer()
}

const MainUi = () => {
  const uiUnlocked = !playerState.loadingOverlayActive && !playerState.languagePickerOpen
  const languageChosen = playerState.preferredLanguage !== ''
  const showVisitHud = uiUnlocked && playerState.viewingFarm !== null
  const showOwnFarmUi = uiUnlocked && languageChosen && playerState.viewingFarm === null && playerState.farmReady

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        pointerFilter: 'none',
      }}
    >
      <LoadingOverlay />
      <LanguageSelectOverlay />
      {showOwnFarmUi && <TopHud />}
      {showVisitHud && <VisitHud />}
      {showOwnFarmUi && !['npcDialog', 'shop', 'inventory', 'farm', 'quests', 'plant', 'sell', 'compost', 'jukebox'].includes(playerState.activeMenu) && <BottomNav />}

      {showOwnFarmUi && playerState.activeMenu === 'plant' && <PlantMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'fertilize' && <FertilizeMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'shop' && <ShopMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'sell' && <SellMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'unlock' && <UnlockMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'plotGroupUnlock' && <PlotGroupUnlockMenu />}
      {showOwnFarmUi && (playerState.activeMenu === 'expansion1' || playerState.activeMenu === 'expansion2') && <ExpansionMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'farmer' && <FarmerMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'npcDialog' && <NpcDialogMenu />}

      {showOwnFarmUi && playerState.activeMenu === 'jukebox' && <JukeboxMenu />}
      {showOwnFarmUi && MAILBOX_FEATURE_ENABLED && playerState.activeMenu === 'mailbox' && <MailboxMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'compost' && <CompostBinMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'chickenCoop' && <ChickenCoopPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'pigPen' && <PigPenPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'feedBowl' && <FeedBowlMenu />}

      {showOwnFarmUi && playerState.activeMenu === 'leaderboard' && <LeaderboardPanel />}

      {showOwnFarmUi && playerState.activeMenu === 'inventory' && <InventoryPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'stats' && <StatsPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'quests' && <QuestPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'farm' && <FarmPanel />}
    </UiEntity>
  )
}
