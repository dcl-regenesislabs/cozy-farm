import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from './game/gameState'
import { TopHud }        from './ui/TopHud'
import { BottomNav }     from './ui/BottomNav'
import { PlantMenu }     from './ui/PlantMenu'
import { FertilizeMenu } from './ui/FertilizeMenu'
import { ShopMenu }      from './ui/ShopMenu'
import { SellMenu }      from './ui/SellMenu'
import { UnlockMenu }          from './ui/UnlockMenu'
import { ExpansionMenu }       from './ui/ExpansionMenu'
import { PlotGroupUnlockMenu } from './ui/PlotGroupUnlockMenu'
import { FarmerMenu }    from './ui/FarmerMenu'
import { NpcDialogMenu } from './ui/NpcDialogMenu'
import { InventoryPanel } from './ui/InventoryPanel'
import { StatsPanel }    from './ui/StatsPanel'
import { QuestPanel }    from './ui/QuestPanel'
import { FarmPanel }     from './ui/FarmPanel'
import { JukeboxMenu }  from './ui/JukeboxMenu'
import { MailboxMenu }      from './ui/MailboxMenu'
import { CompostBinMenu }  from './ui/CompostBinMenu'
import { LeaderboardPanel } from './ui/LeaderboardPanel'
import { ChickenCoopPanel } from './ui/ChickenCoopPanel'
import { PigPenPanel }      from './ui/PigPenPanel'
import { FeedBowlMenu }    from './ui/FeedBowlMenu'
import { VisitHud }         from './ui/VisitHud'
import { MAILBOX_FEATURE_ENABLED } from './game/featureFlags'
import { PROFILE_HUD_DEBUG } from './debug/profileHudDebug'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(MainUi, { virtualWidth: 1920, virtualHeight: 1080 })
}

const MainUi = () => {
  const showVisitHud = playerState.viewingFarm !== null
  const showOwnFarmUi = PROFILE_HUD_DEBUG || (playerState.viewingFarm === null && playerState.farmReady)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        pointerFilter: 'none',
      }}
    >
      {showOwnFarmUi && <TopHud />}
      {showVisitHud && <VisitHud />}
      {showOwnFarmUi && !['npcDialog','shop','inventory','farm','quests','plant','sell','compost','jukebox'].includes(playerState.activeMenu) && <BottomNav />}

      {showOwnFarmUi && playerState.activeMenu === 'plant'     && <PlantMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'fertilize' && <FertilizeMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'shop'      && <ShopMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'sell'      && <SellMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'unlock'         && <UnlockMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'plotGroupUnlock' && <PlotGroupUnlockMenu />}
      {showOwnFarmUi && (playerState.activeMenu === 'expansion1' || playerState.activeMenu === 'expansion2') && <ExpansionMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'farmer'    && <FarmerMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'npcDialog' && <NpcDialogMenu />}

      {showOwnFarmUi && playerState.activeMenu === 'jukebox'   && <JukeboxMenu />}
      {showOwnFarmUi && MAILBOX_FEATURE_ENABLED && playerState.activeMenu === 'mailbox' && <MailboxMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'compost'   && <CompostBinMenu />}
      {showOwnFarmUi && playerState.activeMenu === 'chickenCoop' && <ChickenCoopPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'pigPen'      && <PigPenPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'feedBowl'  && <FeedBowlMenu />}

      {showOwnFarmUi && playerState.activeMenu === 'leaderboard' && <LeaderboardPanel />}

      {showOwnFarmUi && playerState.activeMenu === 'inventory' && <InventoryPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'stats'     && <StatsPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'quests'    && <QuestPanel />}
      {showOwnFarmUi && playerState.activeMenu === 'farm'      && <FarmPanel />}
    </UiEntity>
  )
}
