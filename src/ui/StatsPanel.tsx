import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { PanelShell, C } from './PanelShell'

const tabState = { value: 'stats' as 'stats' | 'rewards' }

const StatsTab = () => {
  const xp    = getXpProgress()
  const pct   = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const maxLv = playerState.level >= 20

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      {/* Level + XP row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 18 } }}>
        <UiEntity
          uiTransform={{ padding: { top: 8, bottom: 8, left: 20, right: 20 }, margin: { right: 20 }, alignItems: 'center', flexShrink: 0 }}
          uiBackground={{ color: { r: 0.72, g: 0.52, b: 0.04, a: 1 } }}
        >
          <Label value={`Level  ${playerState.level}`} fontSize={22} color={{ r: 0.05, g: 0.03, b: 0, a: 1 }} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label value={maxLv ? 'Max Level Reached!' : `XP: ${xp.current} / ${xp.needed}`} fontSize={14} color={C.textMain} uiTransform={{ margin: { bottom: 6 } }} />
          {!maxLv && (
            <UiEntity uiTransform={{ width: '100%', height: 16 }} uiBackground={{ color: { r: 0.15, g: 0.13, b: 0.09, a: 1 } }}>
              <UiEntity uiTransform={{ width: `${pct}%`, height: '100%' }} uiBackground={{ color: C.green }} />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>

      {/* Stats grid — 3 columns */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {[
          { label: 'Crops Harvested', value: playerState.totalCropsHarvested, color: C.green  },
          { label: 'Seeds Planted',   value: playerState.totalSeedPlanted,    color: { r: 0.7, g: 1, b: 0.5, a: 1 } },
          { label: 'Times Watered',   value: playerState.totalWaterCount,     color: C.blue   },
          { label: 'Crops Sold',      value: playerState.totalSellCount,      color: C.orange },
          { label: 'Coins Earned',    value: playerState.totalCoinsEarned,    color: C.gold   },
        ].map((s) => (
          <UiEntity
            key={s.label}
            uiTransform={{ flexDirection: 'column', width: '30%', margin: { right: '3%', bottom: 14 }, padding: 14 }}
            uiBackground={{ color: C.rowBg }}
          >
            <Label value={`${s.value}`} fontSize={24} color={s.color} />
            <Label value={s.label} fontSize={11} color={C.textMute} uiTransform={{ margin: { top: 5 } }} />
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

const RewardsTab = () => (
  <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
    {LEVEL_REWARDS.map((r) => {
      const unlocked = playerState.level >= r.level
      return (
        <UiEntity
          key={r.level}
          uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 134, height: 96, margin: { right: 10, bottom: 10 }, padding: { top: 12, bottom: 10, left: 8, right: 8 } }}
          uiBackground={{ color: unlocked ? { r: 0.52, g: 0.37, b: 0.02, a: 1 } : C.rowBg }}
        >
          <Label value={`Lv ${r.level}`} fontSize={15} color={unlocked ? C.gold : C.textMute} />
          <Label value={r.label} fontSize={12} color={unlocked ? C.textMain : C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 6 } }} />
          {unlocked && <Label value="Claimed ✓" fontSize={11} color={C.green} uiTransform={{ margin: { top: 5 } }} />}
        </UiEntity>
      )
    })}
  </UiEntity>
)

export const StatsPanel = () => (
  <PanelShell title="Profile" onClose={() => { playerState.activeMenu = 'none' }}>
    <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 18 } }}>
      {(['stats', 'rewards'] as const).map((tab) => (
        <Button
          key={tab}
          value={tab === 'stats' ? 'Stats' : 'Rewards'}
          variant={tabState.value === tab ? 'primary' : 'secondary'}
          fontSize={14}
          uiTransform={{ width: 120, height: 38, margin: { right: 10 } }}
          onMouseDown={() => { tabState.value = tab }}
        />
      ))}
    </UiEntity>
    {tabState.value === 'stats'   && <StatsTab />}
    {tabState.value === 'rewards' && <RewardsTab />}
  </PanelShell>
)
