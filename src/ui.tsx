import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from './game/gameState'
import { TopHud }        from './ui/TopHud'
import { BottomNav }     from './ui/BottomNav'
import { PlantMenu }     from './ui/PlantMenu'
import { ShopMenu }      from './ui/ShopMenu'
import { SellMenu }      from './ui/SellMenu'
import { UnlockMenu }    from './ui/UnlockMenu'
import { FarmerMenu }    from './ui/FarmerMenu'
import { NpcDialogMenu } from './ui/NpcDialogMenu'
import { InventoryPanel } from './ui/InventoryPanel'
import { StatsPanel }    from './ui/StatsPanel'
import { QuestPanel }    from './ui/QuestPanel'
import { FarmPanel }     from './ui/FarmPanel'

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
    <BottomNav />

    {/* World-interaction menus (triggered by clicking scene objects) */}
    {playerState.activeMenu === 'plant'     && <PlantMenu />}
    {playerState.activeMenu === 'shop'      && <ShopMenu />}
    {playerState.activeMenu === 'sell'      && <SellMenu />}
    {playerState.activeMenu === 'unlock'    && <UnlockMenu />}
    {playerState.activeMenu === 'farmer'    && <FarmerMenu />}
    {playerState.activeMenu === 'npcDialog' && <NpcDialogMenu />}

    {/* Bottom-nav panels */}
    {playerState.activeMenu === 'inventory' && <InventoryPanel />}
    {playerState.activeMenu === 'stats'     && <StatsPanel />}
    {playerState.activeMenu === 'quests'    && <QuestPanel />}
    {playerState.activeMenu === 'farm'      && <FarmPanel />}
  </UiEntity>
)
