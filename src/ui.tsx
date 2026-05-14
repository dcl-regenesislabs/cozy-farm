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
import { FarmSelectPanel }  from './ui/FarmSelectPanel'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(MainUi, { virtualWidth: 1920, virtualHeight: 1080 })
}

const MainUi = () => (
  <UiEntity
    uiTransform={{
      width: '100%',
      height: '100%',
      pointerFilter: 'none',
    }}
  >
    {/* Always-visible chrome */}
    <TopHud />
    <VisitHud />
    <BottomNav />

    {/* World-interaction menus (triggered by clicking scene objects) */}
    {playerState.activeMenu === 'plant'     && <PlantMenu />}
    {playerState.activeMenu === 'fertilize' && <FertilizeMenu />}
    {playerState.activeMenu === 'shop'      && <ShopMenu />}
    {playerState.activeMenu === 'sell'      && <SellMenu />}
    {playerState.activeMenu === 'unlock'         && <UnlockMenu />}
    {playerState.activeMenu === 'plotGroupUnlock' && <PlotGroupUnlockMenu />}
    {(playerState.activeMenu === 'expansion1' || playerState.activeMenu === 'expansion2') && <ExpansionMenu />}
    {playerState.activeMenu === 'farmer'    && <FarmerMenu />}
    {playerState.activeMenu === 'npcDialog' && <NpcDialogMenu />}

    {/* World-object menus (continued) */}
    {playerState.activeMenu === 'jukebox'   && <JukeboxMenu />}
    {playerState.activeMenu === 'mailbox'   && <MailboxMenu />}
    {playerState.activeMenu === 'compost'   && <CompostBinMenu />}
    {playerState.activeMenu === 'chickenCoop' && <ChickenCoopPanel />}
    {playerState.activeMenu === 'pigPen'      && <PigPenPanel />}
    {playerState.activeMenu === 'feedBowl'  && <FeedBowlMenu />}

    {/* Leaderboard panel */}
    {playerState.activeMenu === 'leaderboard' && <LeaderboardPanel />}

    {/* Farm selection — shown on first load if player has no slot */}
    {playerState.activeMenu === 'farmSelect' && <FarmSelectPanel />}

    {/* Bottom-nav panels */}
    {playerState.activeMenu === 'inventory' && <InventoryPanel />}
    {playerState.activeMenu === 'stats'     && <StatsPanel />}
    {playerState.activeMenu === 'quests'    && <QuestPanel />}
    {playerState.activeMenu === 'farm'      && <FarmPanel />}
  </UiEntity>
)
