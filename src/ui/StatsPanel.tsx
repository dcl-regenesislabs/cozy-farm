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

// Tier sections — each becomes visible once the player is within 3 levels of its first reward
const TIER_SECTIONS = [
  { title: 'Tier 1  —  Starter',         subtitle: 'Always available',    visibleFrom: 1,  levels: [2, 3, 10, 18]  },
  { title: 'Tier 2  —  Advanced Crops',  subtitle: 'Unlocks at Level 5',  visibleFrom: 2,  levels: [5, 7, 12]      },
  { title: 'Tier 3  —  Prestige Crops',  subtitle: 'Unlocks at Level 15', visibleFrom: 12, levels: [15, 20, 25]    },
]

type RewardRowProps = { key?: string | number; level: number }

const RewardRow = ({ level }: RewardRowProps) => {
  const r        = LEVEL_REWARDS.find((x) => x.level === level)
  if (!r) return null

  const unlocked  = playerState.level >= r.level
  const claimed   = playerState.claimedRewards.includes(r.level)
  const claimable = unlocked && !claimed
  const zoomKey   = `reward_${r.level}`

  const cropDef    = r.cropType !== null ? CROP_DATA.get(r.cropType) : null
  const isUnlocker = cropDef !== null && cropDef !== undefined && cropDef.tier > 1

  const rowBg = claimed   ? { r: 0.07, g: 0.18, b: 0.07, a: 1 }
              : claimable ? { r: 0.22, g: 0.16, b: 0.02, a: 1 }
              :             { r: 0.08, g: 0.07, b: 0.05, a: 1 }

  const badgeBg = claimable ? { r: 0.72, g: 0.52, b: 0.04, a: 1 }
                : claimed   ? { r: 0.12, g: 0.36, b: 0.12, a: 1 }
                :             { r: 0.18, g: 0.16, b: 0.12, a: 1 }

  const badgeColor = (claimable || claimed)
    ? { r: 0.05, g: 0.03, b: 0, a: 1 }
    : C.textMute

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        padding: { top: 14, bottom: 14, left: 16, right: 20 },
        margin: { bottom: 6 },
      }}
      uiBackground={{ color: rowBg }}
      onMouseDown={claimable ? () => {
        if (isZooming(zoomKey)) return
        playSound('buttonclick')
        triggerCardZoom(zoomKey)
        setTimeout(() => claimReward(r.level), 290)
      } : undefined}
    >
      {/* Level badge */}
      <UiEntity
        uiTransform={{ width: 84, height: 50, alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: { right: 18 } }}
        uiBackground={{ color: badgeBg }}
      >
        <Label value={`Lv ${r.level}`} fontSize={22} color={badgeColor} textAlign="middle-center" />
      </UiEntity>

      {/* Main + sub labels */}
      <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
        <Label value={r.label} fontSize={24} color={unlocked ? C.textMain : C.textMute} />
        {isUnlocker && (
          <Label
            value={claimed ? `${cropDef!.name} unlocked in shop ✓` : `Unlocks ${cropDef!.name} in shop`}
            fontSize={18}
            color={claimed ? C.green : claimable ? C.gold : C.textMute}
            uiTransform={{ margin: { top: 4 } }}
          />
        )}
      </UiEntity>

      {/* Right-side state label */}
      {claimed && (
        <Label value="Claimed ✓" fontSize={20} color={C.green} uiTransform={{ flexShrink: 0 }} />
      )}
      {claimable && (
        <Label value="Tap to claim  →" fontSize={20} color={C.gold} uiTransform={{ flexShrink: 0 }} />
      )}
      {!unlocked && (
        <Label value={`Reach Level ${r.level}`} fontSize={18} color={C.textMute} uiTransform={{ flexShrink: 0 }} />
      )}
    </UiEntity>
  )
}

const TierDivider = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <UiEntity
    uiTransform={{ flexDirection: 'row', alignItems: 'center', width: '100%', margin: { top: 24, bottom: 10 } }}
  >
    <UiEntity uiTransform={{ flex: 1, height: 2 }} uiBackground={{ color: { r: 0.28, g: 0.24, b: 0.14, a: 1 } }} />
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: { left: 18, right: 18 } }}>
      <Label value={title} fontSize={22} color={C.gold} textAlign="middle-center" />
      <Label value={subtitle} fontSize={17} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 3 } }} />
    </UiEntity>
    <UiEntity uiTransform={{ flex: 1, height: 2 }} uiBackground={{ color: { r: 0.28, g: 0.24, b: 0.14, a: 1 } }} />
  </UiEntity>
)

const RewardsTab = () => (
  <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
    {TIER_SECTIONS.filter((tier) => playerState.level >= tier.visibleFrom).map((tier) => (
      <UiEntity key={tier.title} uiTransform={{ flexDirection: 'column', width: '100%' }}>
        <TierDivider title={tier.title} subtitle={tier.subtitle} />
        {tier.levels.map((lv) => <RewardRow key={lv} level={lv} />)}
      </UiEntity>
    ))}
  </UiEntity>
)

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
