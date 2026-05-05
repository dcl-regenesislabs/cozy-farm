import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { CROP_DATA } from '../data/cropData'
import { PanelShell, C } from './PanelShell'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { LeaderboardContent } from './LeaderboardPanel'

const tabState = { value: 'stats' as 'stats' | 'rewards' | 'ranking' }

function claimReward(level: number): void {
  if (playerState.claimedRewards.includes(level)) return
  const reward = LEVEL_REWARDS.find((r) => r.level === level)
  if (!reward) return
  playerState.claimedRewards.push(level)
  if (reward.type === 'seeds' && reward.cropType !== null) {
    const current = playerState.seeds.get(reward.cropType) ?? 0
    playerState.seeds.set(reward.cropType, current + reward.amount)
    // Unlock crop in shop when claiming tier 2+ seeds reward
    const def = CROP_DATA.get(reward.cropType)
    if (def && def.tier > 1) playerState.unlockedCrops.add(reward.cropType)
  } else if (reward.type === 'coins') {
    playerState.coins += reward.amount
    playerState.totalCoinsEarned += reward.amount
  } else if (reward.type === 'unlock_crop' && reward.cropType !== null) {
    playerState.unlockedCrops.add(reward.cropType)
  }
}

const StatsTab = () => {
  const xp    = getXpProgress()
  const pct   = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const maxLv = playerState.level >= 100

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
          { label: 'Beauty Score ✦',  value: playerState.beautyScore, color: { r: 1, g: 0.72, b: 0.9, a: 1 } },
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

const REWARDS_PAGE_SIZE = 8
const rewardsPage = { value: 0 }

type RewardCardProps = { key?: string | number; reward: (typeof LEVEL_REWARDS)[number] }

const RewardCard = ({ reward: r }: RewardCardProps) => {
  const unlocked  = playerState.level >= r.level
  const claimed   = playerState.claimedRewards.includes(r.level)
  const claimable = unlocked && !claimed
  const zoomKey   = `reward_${r.level}`
  const scale     = getZoomScale(zoomKey)

  const cropDef    = r.cropType !== null ? CROP_DATA.get(r.cropType) : null
  const isUnlocker = cropDef != null && cropDef.tier > 1

  const bg = claimed   ? { r: 0.07, g: 0.18, b: 0.07, a: 1 }
           : claimable ? { r: 0.52, g: 0.37, b: 0.02, a: 1 }
           :             C.rowBg

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: Math.round(220 * scale),
        height: Math.round(190 * scale),
        margin: { right: 15, bottom: 15 },
        padding: { top: 20, bottom: 16, left: 14, right: 14 },
      }}
      uiBackground={{ color: bg }}
      onMouseDown={claimable ? () => {
        if (isZooming(zoomKey)) return
        playSound('buttonclick')
        triggerCardZoom(zoomKey)
        setTimeout(() => claimReward(r.level), 290)
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
      {isUnlocker && (
        <Label
          value={`Unlocks ${cropDef!.name}`}
          fontSize={17}
          color={claimed ? C.green : claimable ? C.gold : C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 5 } }}
        />
      )}
      {claimed   && <Label value="Claimed ✓"    fontSize={20} color={C.green}    uiTransform={{ margin: { top: 8 } }} />}
      {claimable && <Label value="Tap to claim!" fontSize={20} color={C.gold}     uiTransform={{ margin: { top: 8 } }} />}
      {!unlocked && <Label value={`Level ${r.level}`} fontSize={20} color={C.textMute} uiTransform={{ margin: { top: 8 } }} />}
    </UiEntity>
  )
}

const RewardsTab = () => {
  const page     = rewardsPage.value
  const lastPage = Math.max(0, Math.ceil(LEVEL_REWARDS.length / REWARDS_PAGE_SIZE) - 1)
  const slice    = LEVEL_REWARDS.slice(page * REWARDS_PAGE_SIZE, (page + 1) * REWARDS_PAGE_SIZE)

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {slice.map((r) => <RewardCard key={r.level} reward={r} />)}
      </UiEntity>
      {lastPage > 0 && (
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', margin: { top: 12 } }}>
          <Button
            value="< Prev"
            variant="secondary"
            fontSize={22}
            uiTransform={{ width: 160, height: 60, margin: { right: 24 } }}
            onMouseDown={() => { if (rewardsPage.value > 0) { playSound('pagination'); playSound('buttonclick'); rewardsPage.value-- } }}
          />
          <Label value={`${page + 1} / ${lastPage + 1}`} fontSize={24} color={C.textMute} textAlign="middle-center" uiTransform={{ width: 100 }} />
          <Button
            value="Next >"
            variant="secondary"
            fontSize={22}
            uiTransform={{ width: 160, height: 60, margin: { left: 24 } }}
            onMouseDown={() => { if (rewardsPage.value < lastPage) { playSound('pagination'); playSound('buttonclick'); rewardsPage.value++ } }}
          />
        </UiEntity>
      )}
    </UiEntity>
  )
}

const TAB_LABELS: Record<'stats' | 'rewards' | 'ranking', string> = {
  stats:   'Stats',
  rewards: 'Rewards',
  ranking: '✦ Leaderboard',
}

export const StatsPanel = () => (
  <PanelShell title="Profile" onClose={() => { playerState.activeMenu = 'none' }}>
    <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 24 } }}>
      {(['stats', 'rewards', 'ranking'] as const).map((tab) => (
        <Button
          key={tab}
          value={TAB_LABELS[tab]}
          variant={tabState.value === tab ? 'primary' : 'secondary'}
          fontSize={22}
          uiTransform={{ width: 220, height: 65, margin: { right: 15 } }}
          onMouseDown={() => { playSound('buttonclick'); tabState.value = tab }}
        />
      ))}
    </UiEntity>
    {tabState.value === 'stats'   && <StatsTab />}
    {tabState.value === 'rewards' && <RewardsTab />}
    {tabState.value === 'ranking' && <LeaderboardContent />}
  </PanelShell>
)
