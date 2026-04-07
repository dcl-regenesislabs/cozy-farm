import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { COINS_IMAGE } from '../data/imagePaths'
import { navAnim, triggerBtnAnim } from './navAnimSystem'

export const TopHud = () => {
  const xp       = getXpProgress()
  const xpPct    = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const isMaxLvl = playerState.level >= 20

  return (
    // Outer wrapper — pointerFilter:block on avatar only; rest passes through
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 10, left: 750 },
        height: 120,
        flexDirection: 'row',
        alignItems: 'center',
        pointerFilter: 'none',
      }}
      uiBackground={{ color: { r: 0.05, g: 0.04, b: 0.02, a: 0.88 } }}
    >
      {/* ── Avatar square — clickable to open/close stats panel ── */}
      <UiEntity
        uiTransform={{
          width: 87,
          height: 87,
          margin: { left: 9, right: 15 },
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          pointerFilter: 'block',
        }}
        uiBackground={
          playerState.avatarUrl
            ? {
                texture: { src: playerState.avatarUrl, wrapMode: 'clamp' },
                textureMode: 'stretch',
              }
            : { color: { r: 0.52, g: 0.37, b: 0.04, a: 1 } }
        }
        onMouseDown={() => {
          triggerBtnAnim('stats')
          playerState.activeMenu = playerState.activeMenu === 'stats' ? 'none' : 'stats'
        }}
      >
        {/* Level badge — bottom-right corner of avatar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: -6, right: -6 },
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.82, g: 0.58, b: 0.04, a: 1 } }}
        >
          <Label
            value={`${playerState.level}`}
            fontSize={16}
            color={{ r: 0.04, g: 0.02, b: 0, a: 1 }}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      {/* ── Right content column ── */}
      <UiEntity
        uiTransform={{
          width: 300,
          flexDirection: 'column',
          justifyContent: 'center',
          margin: { right: 18 },
        }}
      >
        {/* Top row: level label + coins side by side */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: { bottom: 6 },
          }}
        >
          <Label
            value={isMaxLvl ? 'MAX LEVEL' : `Lv ${playerState.level}  →  ${playerState.level + 1}`}
            fontSize={18}
            color={{ r: 1, g: 0.85, b: 0.42, a: 1 }}
          />
          <UiEntity
            uiTransform={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <UiEntity
              uiTransform={{ width: 30, height: 30, margin: { right: 6 } }}
              uiBackground={{
                texture: { src: COINS_IMAGE, wrapMode: 'clamp' },
                textureMode: 'stretch',
              }}
            />
            <Label
              value={`${playerState.coins}`}
              fontSize={24}
              color={{ r: 1, g: 0.88, b: 0.2, a: 1 }}
            />
          </UiEntity>
        </UiEntity>

        {/* XP bar */}
        <UiEntity
          uiTransform={{ width: '100%', height: 27 }}
          uiBackground={{ color: { r: 0.14, g: 0.12, b: 0.08, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${xpPct}%`, height: '100%' }}
            uiBackground={{ color: { r: 0.18, g: 0.82, b: 0.26, a: 1 } }}
          />
        </UiEntity>

        <Label
          value={isMaxLvl ? '' : `${xp.current} / ${xp.needed} XP`}
          fontSize={15}
          color={{ r: 0.58, g: 0.58, b: 0.58, a: 1 }}
          uiTransform={{ margin: { top: 5 } }}
        />
      </UiEntity>
    </UiEntity>
  )
}
