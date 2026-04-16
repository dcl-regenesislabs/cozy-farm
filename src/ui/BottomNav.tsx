import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { BTN_INVENTORY, BTN_FARM, BTN_QUESTS } from '../data/imagePaths'
import type { MenuType } from '../game/gameState'
import { navAnim, triggerBtnAnim, BTN_BASE } from './navAnimSystem'
import { playSound } from '../systems/sfxSystem'
import { tutorialNavState } from '../game/tutorialState'

type NavBtn = { src: string; menu: MenuType }

const BUTTONS: NavBtn[] = [
  { src: BTN_INVENTORY, menu: 'inventory' },
  { src: BTN_FARM,      menu: 'farm'      },
  { src: BTN_QUESTS,    menu: 'quests'    },
]

type AnimKey = 'inventory' | 'farm' | 'quests' | 'stats'

export const BottomNav = () => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { bottom: 16 },
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      pointerFilter: 'none',
    }}
  >
    {BUTTONS.map((btn) => {
      const isActive  = playerState.activeMenu === btn.menu
      const size      = navAnim[btn.menu as AnimKey]?.size ?? BTN_BASE
      const isDimmed  = tutorialNavState.highlightQuests && btn.menu !== 'quests'
      return (
        <UiEntity
          key={btn.menu}
          uiTransform={{
            flexDirection: 'column',
            alignItems: 'center',
            margin: { left: 20, right: 20 },
            opacity: isDimmed ? 0.25 : 1,
          }}
          onMouseDown={() => {
            triggerBtnAnim(btn.menu as AnimKey)
            if (playerState.activeMenu !== btn.menu) playSound('menu')
            else playSound('buttonclick')
            playerState.activeMenu = playerState.activeMenu === btn.menu ? 'none' : btn.menu
          }}
        >
          {/* Icon — size driven by pop animation / tutorial bounce */}
          <UiEntity
            uiTransform={{ width: size, height: size }}
            uiBackground={{
              texture: { src: btn.src, wrapMode: 'clamp' },
              textureMode: 'stretch',
            }}
          />
          {/* Active indicator: golden bar below the icon */}
          <UiEntity
            uiTransform={{ width: BTN_BASE, height: 5, margin: { top: 6 } }}
            uiBackground={{
              color: isActive
                ? { r: 0.95, g: 0.72, b: 0.08, a: 1 }
                : { r: 0, g: 0, b: 0, a: 0 },
            }}
          />
        </UiEntity>
      )
    })}
  </UiEntity>
)
