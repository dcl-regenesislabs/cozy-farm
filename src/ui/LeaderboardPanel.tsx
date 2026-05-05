import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { room } from '../shared/farmMessages'
import { leaderboardCallbacks } from '../services/saveService'
import { PanelShell, C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale } from './cardZoomSystem'
import type { LeaderboardEntry } from '../shared/farmMessages'
import { formatPlayerLabel } from '../utils/playerLabel'

// ---------------------------------------------------------------------------
// Module-level state — survives re-renders, shared between panel and tab
// ---------------------------------------------------------------------------
export const lbState = {
  entries:      [] as LeaderboardEntry[],
  currentRank:  0,
  currentScore: 0,
  loading:      false,
  loaded:       false,
}

// Wire callback once at module load
leaderboardCallbacks.onBeautyLeaderboardLoaded = (data) => {
  lbState.entries      = data.entries
  lbState.currentRank  = data.currentRank
  lbState.currentScore = data.currentScore
  lbState.loading      = false
  lbState.loaded       = true
}

export function requestLeaderboard(): void {
  if (lbState.loading) return
  lbState.loading = true
  void room.send('loadBeautyLeaderboard', {})
}

// ---------------------------------------------------------------------------
// Medal colors for top 3
// ---------------------------------------------------------------------------
const MEDAL: Record<number, { bg: { r: number; g: number; b: number; a: number }; label: string }> = {
  1: { bg: { r: 0.72, g: 0.58, b: 0.05, a: 1 }, label: '🥇' },
  2: { bg: { r: 0.62, g: 0.62, b: 0.65, a: 1 }, label: '🥈' },
  3: { bg: { r: 0.68, g: 0.38, b: 0.12, a: 1 }, label: '🥉' },
}

const RankBadge = ({ rank }: { rank: number }) => {
  const medal = MEDAL[rank]
  return (
    <UiEntity
      uiTransform={{
        width: 44, height: 44,
        alignItems: 'center', justifyContent: 'center',
        margin: { right: 16 }, flexShrink: 0,
      }}
      uiBackground={{ color: medal ? medal.bg : { r: 0.2, g: 0.16, b: 0.1, a: 1 } }}
    >
      <Label
        value={medal ? medal.label : `#${rank}`}
        fontSize={medal ? 22 : 16}
        color={C.textMain}
        textAlign="middle-center"
      />
    </UiEntity>
  )
}

const EntryRow = ({ entry }: { entry: LeaderboardEntry }) => {
  const isMe = entry.address === playerState.wallet
  return (
    <UiEntity
      uiTransform={{
        width: '100%', height: 52,
        flexDirection: 'row', alignItems: 'center',
        padding: { left: 12, right: 20 },
        margin: { bottom: 5 },
      }}
      uiBackground={{ color: isMe ? { r: 0.18, g: 0.26, b: 0.10, a: 1 } : C.rowBg }}
    >
      <RankBadge rank={entry.rank} />
      <Label
        value={isMe ? `${formatPlayerLabel(entry.displayName, entry.address)} (you)` : formatPlayerLabel(entry.displayName, entry.address)}
        fontSize={20}
        color={isMe ? C.green : C.textMain}
        uiTransform={{ flex: 1 }}
      />
      <Label value="✦" fontSize={16} color={C.gold} uiTransform={{ margin: { right: 6 } }} />
      <Label value={`${entry.beautyScore}`} fontSize={22} color={C.gold} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// LeaderboardContent — reusable inner content (used as a tab in StatsPanel)
// ---------------------------------------------------------------------------
export const LeaderboardContent = () => {
  if (!lbState.loaded && !lbState.loading) requestLeaderboard()

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1 }}>
      {/* Refresh + rank summary row */}
      <UiEntity
        uiTransform={{
          width: '100%', flexDirection: 'row',
          alignItems: 'center', justifyContent: 'space-between',
          margin: { bottom: 12 },
        }}
      >
        {lbState.currentRank > 0 && (
          <Label
            value={`Your rank: #${lbState.currentRank}  ·  Score: ${lbState.currentScore} ✦`}
            fontSize={20}
            color={C.green}
          />
        )}
        <UiEntity
          uiTransform={{
            width: Math.round(130 * getZoomScale('lb_refresh')), height: Math.round(40 * getZoomScale('lb_refresh')),
            alignItems: 'center', justifyContent: 'center',
          }}
          uiBackground={{ color: lbState.loading ? { r: 0.18, g: 0.18, b: 0.18, a: 1 } : C.divider }}
          onMouseDown={() => {
            if (lbState.loading) return
            playSound('buttonclick')
            triggerCardZoom('lb_refresh')
            lbState.loaded = false
            setTimeout(requestLeaderboard, 290)
          }}
        >
          <Label
            value={lbState.loading ? 'Loading…' : '↺ Refresh'}
            fontSize={17}
            color={lbState.loading ? C.textMute : C.textMain}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      {/* List */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        {lbState.loading && (
          <Label value="Loading rankings…" fontSize={22} color={C.textMute}
            textAlign="middle-center" uiTransform={{ width: '100%', margin: { top: 60 } }} />
        )}
        {!lbState.loading && lbState.entries.length === 0 && (
          <Label value="No rankings yet. Be the first!" fontSize={22} color={C.textMute}
            textAlign="middle-center" uiTransform={{ width: '100%', margin: { top: 60 } }} />
        )}
        {!lbState.loading && lbState.entries.map((entry) => (
          <UiEntity key={entry.address} uiTransform={{ width: '100%' }}>
            <EntryRow entry={entry} />
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Standalone panel (kept for the TopHud button)
// ---------------------------------------------------------------------------
export const LeaderboardPanel = () => (
  <PanelShell
    title="✦  Beauty Leaderboard  ✦"
    onClose={() => { playerState.activeMenu = 'none' }}
  >
    <LeaderboardContent />
  </PanelShell>
)
