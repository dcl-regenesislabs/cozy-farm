import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { PanelShell, C } from './PanelShell'
import { triggerCardShake, getShakeOffset, isShaking } from './cardShakeSystem'
import { playSound } from '../systems/sfxSystem'

const tabState = { value: 'stats' as 'stats' | 'rewards' }

function claimReward(level: number): void {
  if (playerState.claimedRewards.includes(level)) return
  const reward = LEVEL_REWARDS.find((r) => r.level === level)
  if (!reward) return
  playerState.claimedRewards.push(level)
  if (reward.type === 'seeds' && reward.cropType !== null) {
    const current = playerState.seeds.get(reward.cropType) ?? 0
    playerState.seeds.set(reward.cropType, current + reward.amount)
  } else if (reward.type === 'coins') {
    playerState.coins += reward.amount
    playerState.totalCoinsEarned += reward.amount
  }
}

const StatsTab = () => {
  const xp    = getXpProgress()
  const pct   = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const maxLv = playerState.level >= 20

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      {/* Level + XP row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 30 } }}>
        <UiEntity
          uiTransform={{
            padding: { top: 14, bottom: 14, left: 34, right: 34 },
            margin: { right: 34 },
            alignItems: 'center',
            flexShrink: 0,
          }}
          uiBackground={{ color: { r: 0.72, g: 0.52, b: 0.04, a: 1 } }}
        >
          <Label value={`Level  ${playerState.level}`} fontSize={38} color={{ r: 0.05, g: 0.03, b: 0, a: 1 }} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label
            value={maxLv ? 'Max Level Reached!' : `XP: ${xp.current} / ${xp.needed}`}
            fontSize={24}
            color={C.textMain}
            uiTransform={{ margin: { bottom: 10 } }}
          />
          {!maxLv && (
            <UiEntity uiTransform={{ width: '100%', height: 28 }} uiBackground={{ color: { r: 0.15, g: 0.13, b: 0.09, a: 1 } }}>
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
            uiTransform={{ flexDirection: 'column', width: '30%', margin: { right: '3%', bottom: 24 }, padding: 24 }}
            uiBackground={{ color: C.rowBg }}
          >
            <Label value={`${s.value}`} fontSize={42} color={s.color} />
            <Label value={s.label} fontSize={20} color={C.textMute} uiTransform={{ margin: { top: 9 } }} />
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

const RewardsTab = () => (
  <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
    {LEVEL_REWARDS.map((r) => {
      const unlocked  = playerState.level >= r.level
      const claimed   = playerState.claimedRewards.includes(r.level)
      const claimable = unlocked && !claimed
      const shakeKey  = `reward_${r.level}`
      const offsetX   = getShakeOffset(shakeKey)

      const bg = claimed   ? { r: 0.07, g: 0.18, b: 0.07, a: 1 }
               : claimable ? { r: 0.52, g: 0.37, b: 0.02, a: 1 }
               :             C.rowBg

      return (
        <UiEntity
          key={r.level}
          uiTransform={{
            flexDirection: 'column',
            alignItems: 'center',
            width: 220,
            height: 165,
            margin: { right: 15, bottom: 15 },
            padding: { top: 20, bottom: 16, left: 14, right: 14 },
            positionType: 'relative',
            position: { left: offsetX },
          }}
          uiBackground={{ color: bg }}
          onMouseDown={claimable ? () => {
            if (isShaking(shakeKey)) return
            playSound('buttonclick')
            triggerCardShake(shakeKey)
            setTimeout(() => claimReward(r.level), 320)
          } : undefined}
        >
          <Label
            value={`Lv ${r.level}`}
            fontSize={26}
            color={claimable ? C.gold : claimed ? C.green : C.textMute}
          />
          <Label
            value={r.label}
            fontSize={22}
            color={unlocked ? C.textMain : C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 10 } }}
          />
          {claimed && (
            <Label value="Claimed ✓" fontSize={20} color={C.green} uiTransform={{ margin: { top: 8 } }} />
          )}
          {claimable && (
            <Label value="Tap to claim!" fontSize={20} color={C.gold} uiTransform={{ margin: { top: 8 } }} />
          )}
          {!unlocked && (
            <Label value="Locked" fontSize={20} color={C.textMute} uiTransform={{ margin: { top: 8 } }} />
          )}
        </UiEntity>
      )
    })}
  </UiEntity>
)

export const StatsPanel = () => (
  <PanelShell title="Profile" onClose={() => { playerState.activeMenu = 'none' }}>
    <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 24 } }}>
      {(['stats', 'rewards'] as const).map((tab) => (
        <Button
          key={tab}
          value={tab === 'stats' ? 'Stats' : 'Rewards'}
          variant={tabState.value === tab ? 'primary' : 'secondary'}
          fontSize={24}
          uiTransform={{ width: 240, height: 65, margin: { right: 15 } }}
          onMouseDown={() => { playSound('buttonclick'); tabState.value = tab }}
        />
      ))}
    </UiEntity>
    {tabState.value === 'stats'   && <StatsTab />}
    {tabState.value === 'rewards' && <RewardsTab />}
  </PanelShell>
)
