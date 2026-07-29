import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { getXpProgress } from '../systems/levelingSystem'
import { LEVEL_REWARDS } from '../data/levelRewardData'
import { CROP_DATA } from '../data/cropData'
import { C } from './PanelShell'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { playSound } from '../systems/sfxSystem'
import { lbState, requestLeaderboard } from './LeaderboardPanel'
import { BadgeDot } from './BadgeDot'
import { formatPlayerLabel } from '../utils/playerLabel'
import { getGameMaxLevel, getMobileDebugLevel } from '../game/mobileDebug'
import { OutlineLabel } from './OutlineLabel'
import {
  RevampCloseButton,
  RevampTitlePlaque,
  REVAMP_BG_IMG,
  REVAMP_PANEL_W,
  REVAMP_PANEL_H,
  REVAMP_PANEL_TOP_MARGIN,
  REVAMP_CONTENT_LEFT,
  REVAMP_CONTENT_RIGHT,
  REVAMP_CONTENT_TOP,
  REVAMP_CONTENT_BOTTOM,
  REVAMP_CLOSE_SIZE,
  REVAMP_CLOSE_RIGHT,
  REVAMP_CLOSE_TOP,
} from './RevampPanel'
import {
  SHARED_PAGINATION_HEIGHT_DESKTOP,
  SHARED_PAGINATION_HEIGHT_MOBILE,
  SharedPaginationBar,
} from './SharedPaginationBar'
import { lerpColor, setTabActive } from './tabFadeSystem'

const UI_SCALE = 0.8
const ss       = (v: number) => Math.round(v * UI_SCALE)

const PROFILE_PANEL_SCALE_DESKTOP = 1.08

const PANEL_W          = Math.round(REVAMP_PANEL_W * PROFILE_PANEL_SCALE_DESKTOP)
const PANEL_H          = Math.round(REVAMP_PANEL_H * PROFILE_PANEL_SCALE_DESKTOP)
const PANEL_TOP_MARGIN = REVAMP_PANEL_TOP_MARGIN

const CONTENT_LEFT   = REVAMP_CONTENT_LEFT
const CONTENT_RIGHT  = REVAMP_CONTENT_RIGHT
const CONTENT_TOP    = REVAMP_CONTENT_TOP
const CONTENT_BOTTOM = REVAMP_CONTENT_BOTTOM
const CONTENT_W      = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H      = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM

// ─── Card grid — width matches the tab bar so everything lines up ─────────────
// Tab bar total: 3 × TAB_W + 2 × TAB_GAP = 3×188 + 2×10 = 584
// Card row must fit: 3 × (CARD_W + CARD_GAP) ≤ GRID_W
const CARD_GAP = 14
const GRID_W   = 3 * 188 + 2 * 10                                // 584 — same as tab bar
const CARD_W   = Math.floor((GRID_W - 3 * CARD_GAP) / 3)        // 180 (accounts for right margin on all 3 cards)
const CARD_H   = 86
const GRID_ML  = Math.floor((CONTENT_W - GRID_W) / 2)           // centres grid

// ─── Close button — same image used everywhere, just resized on mobile ───────
const CLOSE_SIZE  = REVAMP_CLOSE_SIZE
const CLOSE_RIGHT = REVAMP_CLOSE_RIGHT
const CLOSE_TOP   = REVAMP_CLOSE_TOP

// ─── Warm card palette ────────────────────────────────────────────────────────
const CARD_BORDER      = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL        = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
// Mobile: dark background so the bright stat colours stand out
const CARD_FILL_MOBILE = { r: 0.15, g: 0.09, b: 0.03, a: 0.93 }
const CARD_TEXT_MUTE   = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
// On a light card the off-white C.textMain is invisible — use this dark version instead
const CARD_TEXT_DARK   = { r: 0.20, g: 0.11, b: 0.03, a: 1 }
const CARD_VALUE_OUTLINE = { r: 0.31, g: 0.18, b: 0.04, a: 0.92 }
const FRAME_THICKNESS  = 4
const PROFILE_LEVEL_BG = { r: 0.80, g: 0.58, b: 0.11, a: 0.98 }
const PROFILE_LEVEL_TEXT = { r: 0.14, g: 0.08, b: 0.03, a: 1 }
const PROFILE_XP_FILL = { r: 0.28, g: 0.74, b: 0.24, a: 1 }

// ─── Farm-style chip buttons (Prev/Next, Refresh) ────────────────────────────
const BTN_ON   = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_OFF  = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TAB_SELECTED_IMG = 'assets/images/revamp/selected.png'
const TAB_IDLE_IMG = 'assets/images/revamp/notselected.png'
const PAGINATION_BUTTON_IMG = 'assets/images/revamp/Type=Secondary, State=Default.png'
const PAGINATION_BUTTON_ASPECT = 366 / 84
const TAB_H           = 46
const TAB_W           = 168
const TAB_GAP         = 12
const TAB_MARGIN_BOT  = 14
const TAB_TEXT_IDLE     = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const TAB_TEXT_SELECTED = { r: 1, g: 1, b: 1, a: 1 }
const PAGINATION_TEXT = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const PAGINATION_TEXT_DISABLED = { r: 0.53, g: 0.39, b: 0.25, a: 0.72 }
const PAGINATION_CHIP_BG = { r: 0.34, g: 0.18, b: 0.07, a: 0.96 }
const PAGINATION_CHIP_BORDER = { r: 0.95, g: 0.90, b: 0.80, a: 0.98 }
const PAGINATION_CHIP_TEXT = { r: 1, g: 1, b: 1, a: 1 }

const PROFILE_TAB_W = 182
const PROFILE_TAB_H = Math.round(PROFILE_TAB_W / (151 / 68))
const PROFILE_TAB_GAP = 12
const PROFILE_TAB_MARGIN_BOT = 14
const PROFILE_GRID_W = 3 * PROFILE_TAB_W + 2 * PROFILE_TAB_GAP
const PROFILE_CARD_W = Math.floor((PROFILE_GRID_W - 3 * CARD_GAP) / 3)
const PROFILE_CARD_H = CARD_H
const PROFILE_GRID_ML = Math.floor((CONTENT_W - PROFILE_GRID_W) / 2)
const PROFILE_LB_CONTENT_H = CONTENT_H - PROFILE_TAB_H - PROFILE_TAB_MARGIN_BOT

// Rewards: 9 per page (3 rows × 3 cols)
const REWARDS_PAGE_SIZE_DESKTOP = 9
const REWARDS_PAGE_SIZE_MOBILE = 6
const rewardsPage = { value: 0 }

// Leaderboard: 5 per page
const LB_PAGE_SIZE    = 5
const LB_CONTENT_H    = CONTENT_H - TAB_H - TAB_MARGIN_BOT  // 377 — fixed height so absolute PageNav stays at bottom
const lbPage = { value: 0 }

const tabState = { value: 'stats' as 'stats' | 'rewards' | 'ranking' }
const TAB_LABELS: Record<'stats' | 'rewards' | 'ranking', string> = {
  stats:   'Stats',
  rewards: 'Rewards',
  ranking: 'Leaderboard',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function claimReward(level: number): void {
  if (playerState.claimedRewards.includes(level)) return
  const reward = LEVEL_REWARDS.find((r) => r.level === level)
  if (!reward) return
  playerState.claimedRewards.push(level)
  if (reward.type === 'seeds' && reward.cropType !== null) {
    const current = playerState.seeds.get(reward.cropType) ?? 0
    playerState.seeds.set(reward.cropType, current + reward.amount)
    const def = CROP_DATA.get(reward.cropType)
    if (def && def.tier > 1) playerState.unlockedCrops.add(reward.cropType)
  } else if (reward.type === 'coins') {
    playerState.coins += reward.amount
    playerState.totalCoinsEarned += reward.amount
  } else if (reward.type === 'unlock_crop' && reward.cropType !== null) {
    playerState.unlockedCrops.add(reward.cropType)
  }
}

// ─── ProfilePanelFrame ────────────────────────────────────────────────────────
const ProfilePanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mob = isMobile()
  const pW  = mob ? PANEL_W_M   : PANEL_W
  const pH  = mob ? PANEL_H_M   : PANEL_H
  const top = mob ? PANEL_TOP_M : PANEL_TOP_MARGIN
  const cL  = mob ? CONT_LEFT_M : CONTENT_LEFT
  const cT  = mob ? CONT_TOP_M  : CONTENT_TOP
  const cW  = mob ? CONT_W_M    : CONTENT_W
  const cH  = mob ? CONT_H_M    : CONTENT_H
  const clS = mob ? CLOSE_SIZE_M  : CLOSE_SIZE
  const clR = mob ? CLOSE_RIGHT_M : CLOSE_RIGHT
  const clT = mob ? CLOSE_TOP_M   : CLOSE_TOP
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none',
      }}
    >
      {/* Full-screen input blocker */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          pointerFilter: 'block',
        }}
      />

      {/* Shared revamp panel frame */}
      <UiEntity
        uiTransform={{
          width: pW,
          height: pH,
          margin: { top },
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: REVAMP_BG_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <RevampTitlePlaque name="profile" panelWidth={pW} scale={mob ? M_FACTOR : 1} />

        {/* Content area — clipped to stay inside wooden border */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: cL, top: cT },
            width: cW,
            height: cH,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        {/* Close button — same image on both desktop and mobile */}
        <RevampCloseButton
          onClose={onClose}
          right={mob ? undefined : clR}
          top={mob ? undefined : clT}
          size={mob ? undefined : clS}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── TabBar ───────────────────────────────────────────────────────────────────
const TabChip = ({
  tabKey,
  label,
  selected,
  onClick,
  showBadge = false,
}: {
  tabKey: 'stats' | 'rewards' | 'ranking'
  label: string
  selected: boolean
  onClick: () => void
  showBadge?: boolean
}) => {
  const mob = isMobile()
  const chipW = mob ? PROFILE_TAB_W_M : PROFILE_TAB_W
  const chipH = mob ? PROFILE_TAB_H_M : PROFILE_TAB_H
  const gap = mob ? PROFILE_TAB_GAP_M : PROFILE_TAB_GAP
  const hitW = mob ? chipW + 22 : chipW
  const hitH = mob ? chipH + 18 : chipH
  const hitLeft = Math.round((chipW - hitW) / 2)
  const fade = setTabActive(`stats-tab-${tabKey}`, selected)
  const fontSize = label.length > 9 ? (mob ? 22 : 20) : (mob ? 23 : 21)

  return (
    <UiEntity
      uiTransform={{
        width: chipW,
        height: hitH,
        margin: { right: gap, bottom: gap },
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: chipW,
          height: chipH,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: chipW, height: chipH }}
          uiBackground={{
            texture: { src: TAB_IDLE_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: 1 - fade },
          }}
        />
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: chipW, height: chipH }}
          uiBackground={{
            texture: { src: TAB_SELECTED_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: fade },
          }}
        />
        <Label
          value={`<b>${label}</b>`}
          fontSize={fontSize}
          color={lerpColor(TAB_TEXT_IDLE, TAB_TEXT_SELECTED, fade)}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            width: chipW - 18,
            height: chipH,
            alignItems: 'center',
            justifyContent: 'center',
            padding: { bottom: mob ? 12 : 10 },
          }}
        />
      </UiEntity>

      {showBadge && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { right: -4, top: -4 } }}>
          <BadgeDot />
        </UiEntity>
      )}

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: hitLeft },
          width: hitW,
          height: hitH,
        }}
        onMouseDown={() => {
          playSound('buttonclick')
          onClick()
        }}
      />
    </UiEntity>
  )
}

const TabBar = ({ hasUnclaimedReward }: { hasUnclaimedReward: boolean }) => {
  const mob = isMobile()
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        margin: { bottom: mob ? PROFILE_TAB_MARGIN_BOT_M : PROFILE_TAB_MARGIN_BOT },
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <TabChip tabKey="stats" label={TAB_LABELS.stats} selected={tabState.value === 'stats'} onClick={() => { tabState.value = 'stats' }} />
      <TabChip tabKey="rewards" label={TAB_LABELS.rewards} selected={tabState.value === 'rewards'} showBadge={hasUnclaimedReward} onClick={() => { tabState.value = 'rewards' }} />
      <TabChip tabKey="ranking" label={TAB_LABELS.ranking} selected={tabState.value === 'ranking'} onClick={() => { tabState.value = 'ranking' }} />
    </UiEntity>
  )
}

// ─── PageNav — compact Farm-style chip buttons ────────────────────────────────
const PageNav = ({
  page, lastPage, onPrev, onNext,
}: { page: number; lastPage: number; onPrev: () => void; onNext: () => void }) => {
  return (
    <SharedPaginationBar
      id="stats-panel"
      page={page}
      lastPage={lastPage}
      onPrev={onPrev}
      onNext={onNext}
      mode={isMobile() ? 'mobile' : 'desktop'}
      buttonTextureSrc={PAGINATION_BUTTON_IMG}
      buttonDisabledTextureSrc={PAGINATION_BUTTON_IMG}
      buttonAspect={PAGINATION_BUTTON_ASPECT}
      buttonLabelTopOffset={-ss(1)}
      buttonLabelColor={PAGINATION_TEXT}
      buttonLabelDisabledColor={PAGINATION_TEXT_DISABLED}
      pageChipBgColor={PAGINATION_CHIP_BG}
      pageChipBorderColor={PAGINATION_CHIP_BORDER}
      pageChipTextColor={PAGINATION_CHIP_TEXT}
      labelFontSize={isMobile() ? 22 : 18}
      pageFontSize={isMobile() ? 21 : 17}
    />
  )
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Crops Harvested', key: 'totalCropsHarvested', color: { r: 0.36, g: 0.63, b: 0.24, a: 1 } },
  { label: 'Seeds Planted',   key: 'totalSeedPlanted',    color: { r: 0.54, g: 0.59, b: 0.20, a: 1 } },
  { label: 'Times Watered',   key: 'totalWaterCount',     color: { r: 0.31, g: 0.50, b: 0.67, a: 1 } },
  { label: 'Crops Sold',      key: 'totalSellCount',      color: { r: 0.71, g: 0.44, b: 0.18, a: 1 } },
  { label: 'Coins Earned',    key: 'totalCoinsEarned',    color: { r: 0.73, g: 0.55, b: 0.14, a: 1 } },
  { label: 'Beauty Score ✦',  key: 'beautyScore',         color: { r: 1, g: 0.72, b: 0.9, a: 1 } },
] as const

const StatsTab = () => {
  const xp     = getXpProgress()
  const displayLevel = getMobileDebugLevel(playerState.level)
  const maxLv  = displayLevel >= getGameMaxLevel()
  const pct    = maxLv ? 100 : (xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100)
  const mobile = isMobile()
  const gW  = mobile ? PROFILE_GRID_W_M  : 748
  const gML = mobile ? PROFILE_GRID_ML_M : Math.floor((CONTENT_W - gW) / 2)
  const cW  = mobile ? PROFILE_CARD_W_M  : 238
  const cH  = mobile ? PROFILE_CARD_H_M  : 112
  const cG  = mobile ? CARD_GAP_M : 14
  const rowGap = mobile ? 12 : 18
  const headerGap = mobile ? 14 : 18
  const statDividerH = mobile ? 44 : 54
  const numberBoxW = mobile ? 68 : 92
  const labelFont = mobile ? 17 : 18
  const numberFont = mobile ? 31 : 54
  const xpTextColor = { r: 0.96, g: 0.91, b: 0.82, a: 1 }
  const headerRule = { r: 0.56, g: 0.36, b: 0.17, a: 0.55 }
  const cardBg = mobile ? { r: 0.18, g: 0.10, b: 0.04, a: 0.94 } : { r: 0.19, g: 0.11, b: 0.05, a: 0.88 }
  const cardBorder = { r: 0.56, g: 0.36, b: 0.17, a: 0.96 }
  const cardDivider = { r: 0.56, g: 0.36, b: 0.17, a: 0.55 }
  const statLabelColor = { r: 0.95, g: 0.90, b: 0.82, a: 1 }
  const statValueColors: Record<string, { r: number; g: number; b: number; a: number }> = {
    totalCropsHarvested: { r: 0.44, g: 0.84, b: 0.21, a: 1 },
    totalSeedPlanted: { r: 0.58, g: 0.87, b: 0.24, a: 1 },
    totalWaterCount: { r: 0.29, g: 0.63, b: 0.98, a: 1 },
    totalSellCount: { r: 0.96, g: 0.63, b: 0.16, a: 1 },
    totalCoinsEarned: { r: 0.98, g: 0.77, b: 0.16, a: 1 },
    beautyScore: { r: 0.90, g: 0.54, b: 0.77, a: 1 },
  }
  const statLabels: Record<string, [string, string] | string> = {
    totalCropsHarvested: ['Crops', 'Harvested'],
    totalSeedPlanted: ['Seeds', 'Planted'],
    totalWaterCount: ['Times', 'Watered'],
    totalSellCount: ['Crops', 'Sold'],
    totalCoinsEarned: ['Coins', 'Earned'],
    beautyScore: 'Beauty\nScore ✦',
  }

  return (
    // Centred column — same width as the card grid so level row aligns with cards
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: gW,
        margin: { left: gML },
      }}
    >
      {/* Level + XP — compact, same left edge as the grid */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', width: '100%', margin: { bottom: mobile ? 12 : 14 } }}>
        <UiEntity
          uiTransform={{ width: mobile ? 146 : 160, height: mobile ? 50 : 56, margin: { right: headerGap }, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 8, borderWidth: 2, borderColor: { r: 0.94, g: 0.72, b: 0.24, a: 0.75 } }}
          uiBackground={{ color: PROFILE_LEVEL_BG }}
        >
          <Label value={`<b>Level  ${displayLevel}</b>`} fontSize={mobile ? 22 : 24} color={PROFILE_LEVEL_TEXT} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label
            value={maxLv ? 'Max Level!' : `XP: ${xp.current} / ${xp.needed}`}
            fontSize={mobile ? 18 : 19}
            color={xpTextColor}
            uiTransform={{ margin: { bottom: 8 } }}
          />
          {!maxLv && (
            <UiEntity uiTransform={{ width: '100%', height: mobile ? 18 : 16, borderRadius: 8 }} uiBackground={{ color: { r: 0.12, g: 0.08, b: 0.04, a: 1 } }}>
              <UiEntity uiTransform={{ width: `${pct}%`, height: '100%', borderRadius: 8 }} uiBackground={{ color: PROFILE_XP_FILL }} />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>

      <UiEntity uiTransform={{ width: '100%', height: 1, margin: { bottom: mobile ? 14 : 20 } }} uiBackground={{ color: headerRule }} />
      {/* Stats grid 3×2 */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {STATS.map((s) => {
          const val = playerState[s.key]
          const valueText = `${val}`
          const valueBoxW = valueText.length >= 4
            ? (mobile ? 82 : 116)
            : valueText.length >= 3
              ? (mobile ? 76 : 106)
              : numberBoxW
          const valueFont = valueText.length >= 4
            ? (mobile ? 24 : 38)
            : valueText.length >= 3
              ? (mobile ? 27 : 46)
              : numberFont
          const valueColor = statValueColors[s.key] ?? s.color
          const rawLabel = statLabels[s.key] ?? [s.label, '']
          const labelLines = Array.isArray(rawLabel) ? rawLabel : String(rawLabel).split('\n')
          const idx = STATS.findIndex((entry) => entry.key === s.key)
          const isRowEnd = idx % 3 === 2
          return (
            <UiEntity
              key={s.label}
              uiTransform={{
                flexDirection: 'row',
                alignItems: 'center',
                width: cW,
                height: cH,
                margin: { right: isRowEnd ? 0 : cG, bottom: rowGap },
                padding: { top: 12, bottom: 12, left: 16, right: 18 },
                borderWidth: 2,
                borderColor: cardBorder,
                borderRadius: 14,
              }}
              uiBackground={{ color: cardBg }}
            >
              <UiEntity uiTransform={{ width: valueBoxW, height: '100%', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <OutlineLabel
                  value={`<b>${valueText}</b>`}
                  fontSize={valueFont}
                  color={valueColor}
                  outlineColor={CARD_VALUE_OUTLINE}
                  width={valueBoxW}
                  height={mobile ? 40 : 60}
                  textAlign="middle-center"
                  textWrap="nowrap"
                />
              </UiEntity>
              <UiEntity
                uiTransform={{ width: 2, height: statDividerH, margin: { left: mobile ? 6 : 10, right: mobile ? 10 : 16 }, flexShrink: 0 }}
                uiBackground={{ color: cardDivider }}
              />
              <UiEntity uiTransform={{ flex: 1, height: '100%', justifyContent: 'center', flexDirection: 'column' }}>
                <Label
                  value={`<b>${labelLines[0] ?? ''}</b>`}
                  fontSize={labelFont}
                  color={statLabelColor}
                  textAlign="middle-left"
                  textWrap="nowrap"
                  uiTransform={{ width: '100%', height: mobile ? 20 : 22 }}
                />
                <Label
                  value={`<b>${labelLines[1] ?? ''}</b>`}
                  fontSize={labelFont}
                  color={statLabelColor}
                  textAlign="middle-left"
                  textWrap="nowrap"
                  uiTransform={{ width: '100%', height: mobile ? 20 : 22, margin: { top: mobile ? 1 : 2 } }}
                />
              </UiEntity>
            </UiEntity>
          )
        })}
      </UiEntity>
    </UiEntity>
  )
}

// ─── RewardsTab ───────────────────────────────────────────────────────────────
const RWD_H = 95

type RewardCardProps = {
  key?: string | number
  reward: (typeof LEVEL_REWARDS)[number]
  marginRight?: number
  marginBottom?: number
}

const RewardCard = ({ reward: r, marginRight = CARD_GAP, marginBottom = 10 }: RewardCardProps) => {
  const unlocked  = playerState.level >= r.level
  const claimed   = playerState.claimedRewards.includes(r.level)
  const claimable = unlocked && !claimed
  const zoomKey   = `reward_${r.level}`
  const scale     = getZoomScale(zoomKey)
  const mobile    = isMobile()

  const cropDef    = r.cropType !== null ? CROP_DATA.get(r.cropType) : null
  const isUnlocker = cropDef != null && cropDef.tier > 1

  // Unclaimed cards use light fill — fully opaque on mobile so the dark atlas doesn't muddy it
  const bg = claimed   ? { r: 0.07, g: 0.18, b: 0.07, a: 1 }
           : claimable ? { r: 0.52, g: 0.37, b: 0.02, a: 1 }
           : mobile    ? CARD_FILL_MOBILE
           :             CARD_FILL

  const isLightCard = !claimed && !claimable
  const descColor   = mobile ? C.textMain : (isLightCard ? CARD_TEXT_DARK : (unlocked ? C.textMain : CARD_TEXT_MUTE))

  const borderColor = claimable ? { r: 0.82, g: 0.69, b: 0.20, a: 0.95 } : CARD_BORDER

  const baseW = mobile ? PROFILE_REWARD_CARD_W_M : PROFILE_CARD_W
  const baseH = mobile ? PROFILE_REWARD_CARD_H_M : PROFILE_RWD_H
  const w = Math.round(baseW * scale)
  const h = Math.round(baseH * scale)
  const levelFont = mobile ? 20 : 18
  const labelFont = mobile ? (r.label.length > 18 ? 15 : 17) : 15
  const unlockFont = mobile ? 14 : 13
  const statusFont = mobile ? 15 : 14
  const lockedFont = mobile ? 14 : 13

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        height: h,
        margin: { right: marginRight, bottom: marginBottom },
        padding: mobile
          ? { top: 10, bottom: 8, left: 10, right: 10 }
          : { top: 8, bottom: 6, left: 8, right: 8 },
        borderWidth: 2,
        borderColor,
        borderRadius: mobile ? 12 : 10,
      }}
      uiBackground={{ color: bg }}
      onMouseDown={claimable ? () => {
        if (isZooming(zoomKey)) return
        playSound('buttonclick')
        triggerCardZoom(zoomKey)
        setTimeout(() => claimReward(r.level), 290)
      } : undefined}
    >
      <Label value={`Lv ${r.level}`} fontSize={levelFont} color={claimable ? C.gold : claimed ? C.green : (mobile ? C.textMain : CARD_TEXT_MUTE)} />
      <Label value={r.label} fontSize={labelFont} color={descColor} textAlign="middle-center" textWrap="nowrap" uiTransform={{ margin: { top: mobile ? 4 : 3 } }} />
      {isUnlocker && (
        <Label value={`Unlocks ${cropDef!.name}`} fontSize={unlockFont} color={claimed ? C.green : claimable ? C.gold : (mobile ? C.textMain : CARD_TEXT_MUTE)} textAlign="middle-center" textWrap="nowrap" uiTransform={{ margin: { top: 3 } }} />
      )}
      {claimed   && <Label value="Claimed" fontSize={statusFont} color={C.green} uiTransform={{ margin: { top: mobile ? 4 : 3 } }} />}
      {claimable && <Label value="Tap!" fontSize={statusFont} color={C.gold}  uiTransform={{ margin: { top: mobile ? 4 : 3 } }} />}
      {!unlocked && <Label value={`Lv ${r.level}`} fontSize={lockedFont} color={mobile ? C.textMain : CARD_TEXT_MUTE} uiTransform={{ margin: { top: mobile ? 4 : 3 } }} />}
    </UiEntity>
  )
}

const RewardsTab = () => {
  const mob       = isMobile()
  const pageSize  = mob ? REWARDS_PAGE_SIZE_MOBILE : REWARDS_PAGE_SIZE_DESKTOP
  const lastPage  = Math.max(0, Math.ceil(LEVEL_REWARDS.length / pageSize) - 1)
  if (rewardsPage.value > lastPage) rewardsPage.value = lastPage
  const page      = rewardsPage.value
  const slice     = LEVEL_REWARDS.slice(page * pageSize, (page + 1) * pageSize)
  const contentH  = mob ? PROFILE_PAGED_CONTENT_H_M : PROFILE_LB_CONTENT_H
  const gW        = mob ? PROFILE_REWARD_GRID_W_M   : PROFILE_GRID_W
  const gML       = mob ? PROFILE_REWARD_GRID_ML_M  : PROFILE_GRID_ML
  const pageNavH  = mob ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const pageNavBottom = mob ? PROFILE_PAGE_NAV_BOTTOM_M : 0
  const showNav   = lastPage > 0
  const columns   = 3
  const rowGap    = mob ? 12 : 10
  const cardGap   = mob ? PROFILE_REWARD_GRID_GAP_M : CARD_GAP
  const rows: Array<Array<(typeof LEVEL_REWARDS)[number]>> = []

  for (let i = 0; i < slice.length; i += columns) {
    rows.push(slice.slice(i, i + columns))
  }

  return (
    <UiEntity uiTransform={{ positionType: 'relative', flexDirection: 'column', width: '100%', height: contentH, flexShrink: 0 }}>
      {/* Centered card grid — paddingBottom reserves space for the absolute PageNav */}
      <UiEntity
        uiTransform={{
          width: gW,
          margin: { left: gML, top: mob ? 6 : 0 },
          flexDirection: 'column',
          alignItems: 'center',
          padding: { bottom: showNav ? pageNavH + pageNavBottom : 0 },
        }}
      >
        {rows.map((row, rowIndex) => (
          <UiEntity
            key={`reward-row-${rowIndex}`}
            uiTransform={{
              width: gW,
              flexDirection: 'row',
              justifyContent: 'center',
              margin: { bottom: rowIndex < rows.length - 1 ? rowGap : 0 },
            }}
          >
            {row.map((r, idx) => (
              <RewardCard
                key={r.level}
                reward={r}
                marginRight={idx < row.length - 1 ? cardGap : 0}
                marginBottom={0}
              />
            ))}
          </UiEntity>
        ))}
      </UiEntity>
      {/* PageNav pinned absolutely to the bottom — same height as leaderboard's */}
      {showNav && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: pageNavBottom, left: 0 },
            width: '100%',
            height: pageNavH,
          }}
        >
          <PageNav
            page={page}
            lastPage={lastPage}
            onPrev={() => { rewardsPage.value-- }}
            onNext={() => { rewardsPage.value++ }}
          />
        </UiEntity>
      )}
    </UiEntity>
  )
}

// ─── LeaderboardTab ───────────────────────────────────────────────────────────
// Medals use coloured text badges — DCL does not render emoji reliably.
// Row names use C.textMain (off-white) to stay visible on the dark atlas background.
const LB_BADGE_COLORS: Record<number, { r: number; g: number; b: number; a: number }> = {
  1: { r: 0.72, g: 0.58, b: 0.05, a: 1 },   // gold
  2: { r: 0.55, g: 0.55, b: 0.60, a: 1 },   // silver
  3: { r: 0.65, g: 0.35, b: 0.10, a: 1 },   // bronze
}
const LB_BADGE_DEFAULT = { r: 0.22, g: 0.16, b: 0.10, a: 0.7 }
const LB_ROW_H   = 48
const LB_ROW_GAP = 8
// Row inner width = GRID_W - padding 4+4 = 576; badge+gap = 58; score = 80 → name = 438
const LB_SCORE_W = 80
const LB_NAME_W  = GRID_W - 8 - 58 - LB_SCORE_W  // 438
const PROFILE_RWD_H = RWD_H
const PROFILE_LB_NAME_W = PROFILE_GRID_W - 8 - 58 - LB_SCORE_W

// ─── Mobile overrides — everything 10% bigger, pushed down to clear DCL's player profile UI ──
// All pixel values scale proportionally; derived constants recalculate from their scaled bases.
const M_FACTOR         = 1.1
const PANEL_W_M        = Math.round(REVAMP_PANEL_W * M_FACTOR)
const PANEL_H_M        = Math.round(REVAMP_PANEL_H * M_FACTOR)
const PANEL_TOP_M      = Math.round(PANEL_TOP_MARGIN * M_FACTOR)
const CONT_LEFT_M      = Math.round(CONTENT_LEFT * M_FACTOR)                                       // 86
const CONT_TOP_M       = Math.round(CONTENT_TOP * M_FACTOR)                                        // 108
const CONT_BOT_M       = Math.round(CONTENT_BOTTOM * M_FACTOR)                                     // 105
const CONT_W_M         = PANEL_W_M - CONT_LEFT_M * 2                                              // 814
const CONT_H_M         = PANEL_H_M - CONT_TOP_M - CONT_BOT_M                                     // 480
const CLOSE_SIZE_M     = Math.round(CLOSE_SIZE * M_FACTOR)
const CLOSE_RIGHT_M    = Math.round(CLOSE_RIGHT * M_FACTOR)
const CLOSE_TOP_M      = Math.round(CLOSE_TOP * M_FACTOR)
const PROFILE_TAB_H_M          = Math.round(PROFILE_TAB_H * M_FACTOR)
const PROFILE_TAB_W_M          = Math.round(PROFILE_TAB_W * M_FACTOR)
const PROFILE_TAB_GAP_M        = Math.round(PROFILE_TAB_GAP * M_FACTOR)
const PROFILE_TAB_MARGIN_BOT_M = Math.round(PROFILE_TAB_MARGIN_BOT * M_FACTOR)
const CARD_GAP_M       = Math.round(CARD_GAP * M_FACTOR)                                           // 15
const PROFILE_GRID_W_M         = 3 * PROFILE_TAB_W_M + 2 * PROFILE_TAB_GAP_M
const PROFILE_CARD_W_M         = Math.floor((PROFILE_GRID_W_M - 3 * CARD_GAP_M) / 3)
const PROFILE_CARD_H_M         = Math.round(PROFILE_CARD_H * M_FACTOR)
const PROFILE_GRID_ML_M        = Math.floor((CONT_W_M - PROFILE_GRID_W_M) / 2)
const PROFILE_RWD_H_M          = Math.round(PROFILE_RWD_H * M_FACTOR)
const PROFILE_LB_CONT_H_M      = CONT_H_M - PROFILE_TAB_H_M - PROFILE_TAB_MARGIN_BOT_M
const PROFILE_PAGED_CONTENT_H_M = PROFILE_LB_CONT_H_M
const PROFILE_PAGE_NAV_BOTTOM_M = 16
const PROFILE_REWARD_GRID_GAP_M = 10
const PROFILE_REWARD_GRID_W_M   = CONT_W_M - 48
const PROFILE_REWARD_GRID_ML_M  = Math.floor((CONT_W_M - PROFILE_REWARD_GRID_W_M) / 2)
const PROFILE_REWARD_CARD_W_M   = Math.floor((PROFILE_REWARD_GRID_W_M - PROFILE_REWARD_GRID_GAP_M * 2) / 3)
const PROFILE_REWARD_CARD_H_M   = 132
const LB_ROW_H_M       = Math.round(LB_ROW_H * M_FACTOR)                                          // 53
const LB_ROW_GAP_M     = Math.round(LB_ROW_GAP * M_FACTOR)                                        // 9
const LB_SCORE_W_M     = Math.round(LB_SCORE_W * M_FACTOR)                                        // 88
const PROFILE_LB_NAME_W_M      = PROFILE_GRID_W_M - 8 - (Math.round(44 * M_FACTOR) + Math.round(14 * M_FACTOR)) - LB_SCORE_W_M

const LeaderboardTab = () => {
  if (!lbState.loaded && !lbState.loading) requestLeaderboard()

  const mob       = isMobile()
  const page      = lbPage.value
  const entries   = lbState.entries
  const lastPage  = Math.max(0, Math.ceil(entries.length / LB_PAGE_SIZE) - 1)
  const slice     = entries.slice(page * LB_PAGE_SIZE, (page + 1) * LB_PAGE_SIZE)
  const contentH  = mob ? PROFILE_PAGED_CONTENT_H_M  : PROFILE_LB_CONTENT_H
  const gW        = mob ? PROFILE_GRID_W_M     : PROFILE_GRID_W
  const gML       = mob ? PROFILE_GRID_ML_M    : PROFILE_GRID_ML
  const rowH      = mob ? LB_ROW_H_M   : LB_ROW_H
  const rowG      = mob ? LB_ROW_GAP_M : LB_ROW_GAP
  const scoreW    = mob ? LB_SCORE_W_M : LB_SCORE_W
  const nameW     = mob ? PROFILE_LB_NAME_W_M  : PROFILE_LB_NAME_W
  const badgeW    = mob ? Math.round(44 * M_FACTOR) : 44
  const badgeH    = mob ? Math.round(36 * M_FACTOR) : 36
  const badgeMR   = mob ? Math.round(14 * M_FACTOR) : 14
  const pageNavH  = mob ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const pageNavBottom = mob ? PROFILE_PAGE_NAV_BOTTOM_M : 0
  const showNav   = lastPage > 0

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: gW, margin: { left: gML }, height: contentH }}>

      {/* Header: rank summary + refresh */}
      <UiEntity
        uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 40, margin: { bottom: 14 }, flexShrink: 0 }}
      >
        <Label
          value={lbState.currentRank > 0 ? `Your rank: #${lbState.currentRank}  ·  Score: ${lbState.currentScore} ✦` : ' '}
          fontSize={20}
          color={C.green}
        />
        <UiEntity
          uiTransform={{ width: 116, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          uiBackground={{ color: lbState.loading ? BTN_OFF : BTN_ON }}
          onMouseDown={() => {
            if (lbState.loading) return
            playSound('buttonclick')
            lbPage.value = 0
            lbState.loaded = false
            setTimeout(requestLeaderboard, 290)
          }}
        >
          <Label value={lbState.loading ? 'Loading…' : '+ Refresh'} fontSize={19} color={lbState.loading ? CARD_TEXT_MUTE : BTN_TEXT} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {/* Entry list — paddingBottom reserves space for the absolute PageNav */}
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%', padding: { bottom: showNav ? pageNavH + pageNavBottom : 0 } }}>
        {lbState.loading && (
          <Label value="Loading rankings..." fontSize={22} color={C.textMute} textAlign="middle-center" uiTransform={{ width: '100%', margin: { top: 40 } }} />
        )}
        {!lbState.loading && entries.length === 0 && (
          <Label value="No rankings yet. Be the first!" fontSize={22} color={C.textMute} textAlign="middle-center" uiTransform={{ width: '100%', margin: { top: 40 } }} />
        )}
        {!lbState.loading && slice.map((entry) => {
          const isMe = entry.address === playerState.wallet
          const badgeBg = LB_BADGE_COLORS[entry.rank] ?? LB_BADGE_DEFAULT
          return (
            <UiEntity
              key={entry.address}
              uiTransform={{
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                height: rowH,
                margin: { bottom: rowG },
                padding: { left: 4, right: 4 },
                borderRadius: 8,
              }}
              uiBackground={{ color: isMe ? { r: 0.12, g: 0.22, b: 0.10, a: 0.7 } : { r: 0, g: 0, b: 0, a: 0 } }}
            >
              {/* Rank badge */}
              <UiEntity
                uiTransform={{ width: badgeW, height: badgeH, alignItems: 'center', justifyContent: 'center', borderRadius: 6, margin: { right: badgeMR }, flexShrink: 0 }}
                uiBackground={{ color: badgeBg }}
              >
                <Label value={`#${entry.rank}`} fontSize={18} color={{ r: 1, g: 0.95, b: 0.82, a: 1 }} textAlign="middle-center" />
              </UiEntity>
              {/* Name — fixed width, truncated so score column is always at the same x */}
              <Label
                value={(() => {
                  const base = formatPlayerLabel(entry.displayName, entry.address)
                  const t    = base.length > 15 ? base.slice(0, 13) + '..' : base
                  return isMe ? t + ' (you)' : t
                })()}
                fontSize={20}
                color={isMe ? C.green : C.textMain}
                uiTransform={{ width: nameW, flexShrink: 0 }}
                textAlign="middle-left"
              />
              {/* Score — fixed width + right-align so all numbers line up at the same edge */}
              <Label
                value={`✦ ${entry.beautyScore}`}
                fontSize={20}
                color={C.gold}
                uiTransform={{ width: scoreW, flexShrink: 0 }}
                textAlign="middle-right"
              />
            </UiEntity>
          )
        })}
      </UiEntity>

      {/* PageNav pinned absolutely to the bottom so it stays there regardless of entry count */}
      {showNav && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: pageNavBottom, left: 0 },
            width: '100%',
            height: pageNavH,
          }}
        >
          <PageNav
            page={page}
            lastPage={lastPage}
            onPrev={() => { if (lbPage.value > 0) lbPage.value-- }}
            onNext={() => { if (lbPage.value < lastPage) lbPage.value++ }}
          />
        </UiEntity>
      )}
    </UiEntity>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export const StatsPanel = () => {
  const hasUnclaimedReward = LEVEL_REWARDS.some(
    r => playerState.level >= r.level && !playerState.claimedRewards.includes(r.level)
  )

  return (
    <ProfilePanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      <TabBar hasUnclaimedReward={hasUnclaimedReward} />
      {tabState.value === 'stats'   && <StatsTab />}
      {tabState.value === 'rewards' && <RewardsTab />}
      {tabState.value === 'ranking' && <LeaderboardTab />}
    </ProfilePanelFrame>
  )
}
