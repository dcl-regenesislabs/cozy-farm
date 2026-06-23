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

// ─── Atlas frame ──────────────────────────────────────────────────────────────
// The atlas has an X circle baked into the top-right corner of the frame.
// The close button is a purely transparent hitbox placed over that artwork.
const PROFILE_ATLAS    = 'assets/images/ui_loading/profile_atlas_extended.png'
const ATLAS_SIZE       = 1024
// h=700 cuts cleanly above the two button-state strips that live below the wooden frame in the atlas
const BG_RECT          = { x: 14, y: 14, w: 996, h: 700 } as const
const UI_SCALE         = 0.8
const ss               = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1120)
const PANEL_H          = Math.round(PANEL_W * BG_RECT.h / BG_RECT.w)
const PANEL_TOP_MARGIN = 48

// Content insets — must clear the wooden border art and baked-in "Profile" header
const CONTENT_LEFT   = 78
const CONTENT_RIGHT  = 78
const CONTENT_TOP    = 98
const CONTENT_BOTTOM = 95   // panel is 27px shorter; slight reduction keeps content inset proportional
const CONTENT_W      = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT   // 740
const CONTENT_H      = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM   // 459

// ─── Card grid — width matches the tab bar so everything lines up ─────────────
// Tab bar total: 3 × TAB_W + 2 × TAB_GAP = 3×188 + 2×10 = 584
// Card row must fit: 3 × (CARD_W + CARD_GAP) ≤ GRID_W
const CARD_GAP = 14
const GRID_W   = 3 * 188 + 2 * 10                                // 584 — same as tab bar
const CARD_W   = Math.floor((GRID_W - 3 * CARD_GAP) / 3)        // 180 (accounts for right margin on all 3 cards)
const CARD_H   = 86
const GRID_ML  = Math.floor((CONTENT_W - GRID_W) / 2)           // 78 — centres grid

// ─── Close button — transparent hitbox over the atlas's baked-in X circle ────
// Use `left` not `right`: DCL's yoga resolves `right` from the screen edge, not the panel.
// X circle is at ~94% of BG_RECT width → panel x ≈ 843, y ≈ 26
const CLOSE_SIZE = ss(74)   // 59
const CLOSE_LEFT = 813 - 59  // = 754 — shifted left by one hitbox width to centre on atlas X
const CLOSE_TOP  = 0

// ─── Warm card palette ────────────────────────────────────────────────────────
const CARD_BORDER      = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL        = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
// Mobile: dark background so the bright stat colours stand out
const CARD_FILL_MOBILE = { r: 0.15, g: 0.09, b: 0.03, a: 0.93 }
const CARD_TEXT_MUTE   = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
// On a light card the off-white C.textMain is invisible — use this dark version instead
const CARD_TEXT_DARK   = { r: 0.20, g: 0.11, b: 0.03, a: 1 }
const FRAME_THICKNESS  = 4

// ─── Farm-style chip buttons (Prev/Next, Refresh) ────────────────────────────
const BTN_ON   = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_OFF  = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TAB_H           = 46
const TAB_W           = 188
const TAB_GAP         = 10
const TAB_MARGIN_BOT  = 14
const TAB_ACTIVE_BG   = { r: 0.45, g: 0.26, b: 0.06, a: 0.9 }
const TAB_IDLE_BG     = { r: 0.58, g: 0.38, b: 0.12, a: 0.72 }
const TAB_ACTIVE_TEXT = { r: 0.97, g: 0.90, b: 0.68, a: 1 }
const TAB_IDLE_TEXT   = { r: 0.97, g: 0.90, b: 0.68, a: 0.65 }

// Rewards: 9 per page (3 rows × 3 cols)
const REWARDS_PAGE_SIZE = 9
const rewardsPage = { value: 0 }

// Leaderboard: 5 per page
const LB_PAGE_SIZE    = 5
const LB_CONTENT_H    = CONTENT_H - TAB_H - TAB_MARGIN_BOT  // 377 — fixed height so absolute PageNav stays at bottom
const lbPage = { value: 0 }

const tabState = { value: 'stats' as 'stats' | 'rewards' | 'ranking' }
const TAB_LABELS: Record<'stats' | 'rewards' | 'ranking', string> = {
  stats:   'Stats',
  rewards: 'Rewards',
  ranking: '✦ Leaderboard',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

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
  const clS = mob ? CLOSE_SIZE_M : CLOSE_SIZE
  const clL = mob ? CLOSE_LEFT_M : CLOSE_LEFT
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

      {/* Atlas panel frame */}
      <UiEntity
        uiTransform={{
          width: pW,
          height: pH,
          margin: { top },
          pointerFilter: 'block',
        }}
        uiBackground={{
          texture: { src: PROFILE_ATLAS, wrapMode: 'clamp' },
          textureMode: 'stretch',
          uvs: bgUvs(BG_RECT),
        }}
      >
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

        {/* Transparent hitbox over the atlas's baked-in X circle */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: clL, top: CLOSE_TOP },
            width: clS,
            height: clS,
          }}
          onMouseDown={() => { playSound('buttonclick'); onClose() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── TabBar ───────────────────────────────────────────────────────────────────
const TabBar = ({ hasUnclaimedReward }: { hasUnclaimedReward: boolean }) => {
  const mob = isMobile()
  const tH  = mob ? TAB_H_M          : TAB_H
  const tW  = mob ? TAB_W_M          : TAB_W
  const tG  = mob ? TAB_GAP_M        : TAB_GAP
  const tMB = mob ? TAB_MARGIN_BOT_M : TAB_MARGIN_BOT
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        height: tH,
        margin: { bottom: tMB },
        flexShrink: 0,
      }}
    >
      {(['stats', 'rewards', 'ranking'] as const).map((t) => {
        const active = tabState.value === t
        return (
          <UiEntity key={t} uiTransform={{ margin: { right: tG } }}>
            <UiEntity
              uiTransform={{ width: tW, height: tH, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
              uiBackground={{ color: active ? TAB_ACTIVE_BG : TAB_IDLE_BG }}
              onMouseDown={() => { playSound('buttonclick'); tabState.value = t }}
            >
              <Label value={TAB_LABELS[t]} fontSize={22} color={active ? TAB_ACTIVE_TEXT : TAB_IDLE_TEXT} textAlign="middle-center" />
            </UiEntity>
            {t === 'rewards' && hasUnclaimedReward && <BadgeDot />}
          </UiEntity>
        )
      })}
    </UiEntity>
  )
}

// ─── PageNav — compact Farm-style chip buttons ────────────────────────────────
const PageNav = ({
  page, lastPage, onPrev, onNext,
}: { page: number; lastPage: number; onPrev: () => void; onNext: () => void }) => {
  const mob     = isMobile()
  const canPrev = page > 0
  const canNext = page < lastPage
  const disabledColor = mob ? { r: 1, g: 1, b: 1, a: 0.35 } : CARD_TEXT_MUTE
  const pageColor     = mob ? { r: 1, g: 1, b: 1, a: 0.80 } : CARD_TEXT_MUTE
  return (
    <UiEntity
      uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 50, flexShrink: 0 }}
    >
      <UiEntity
        uiTransform={{ width: 110, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: { right: 20 } }}
        uiBackground={{ color: canPrev ? BTN_ON : BTN_OFF }}
        onMouseDown={canPrev ? () => { playSound('buttonclick'); onPrev() } : undefined}
      >
        <Label value="< Prev" fontSize={20} color={canPrev ? BTN_TEXT : disabledColor} textAlign="middle-center" />
      </UiEntity>
      <Label value={`${page + 1} / ${lastPage + 1}`} fontSize={20} color={pageColor} textAlign="middle-center" uiTransform={{ width: 80, height: 40 }} />
      <UiEntity
        uiTransform={{ width: 110, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: { left: 20 } }}
        uiBackground={{ color: canNext ? BTN_ON : BTN_OFF }}
        onMouseDown={canNext ? () => { playSound('buttonclick'); onNext() } : undefined}
      >
        <Label value="Next >" fontSize={20} color={canNext ? BTN_TEXT : disabledColor} textAlign="middle-center" />
      </UiEntity>
    </UiEntity>
  )
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Crops Harvested', key: 'totalCropsHarvested', color: C.green },
  { label: 'Seeds Planted',   key: 'totalSeedPlanted',    color: { r: 0.7, g: 1, b: 0.5, a: 1 } },
  { label: 'Times Watered',   key: 'totalWaterCount',     color: C.blue },
  { label: 'Crops Sold',      key: 'totalSellCount',      color: C.orange },
  { label: 'Coins Earned',    key: 'totalCoinsEarned',    color: C.gold },
  { label: 'Beauty Score ✦',  key: 'beautyScore',         color: { r: 1, g: 0.72, b: 0.9, a: 1 } },
] as const

const StatsTab = () => {
  const xp     = getXpProgress()
  const pct    = xp.needed > 0 ? Math.min(100, Math.floor((xp.current / xp.needed) * 100)) : 100
  const maxLv  = playerState.level >= 100
  const mobile = isMobile()
  const gW  = mobile ? GRID_W_M  : GRID_W
  const gML = mobile ? GRID_ML_M : GRID_ML
  const cW  = mobile ? CARD_W_M  : CARD_W
  const cH  = mobile ? CARD_H_M  : CARD_H
  const cG  = mobile ? CARD_GAP_M : CARD_GAP

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
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 16 } }}>
        <UiEntity
          uiTransform={{ padding: { top: 8, bottom: 8, left: 18, right: 18 }, margin: { right: 18 }, alignItems: 'center', flexShrink: 0, borderRadius: 6 }}
          uiBackground={{ color: { r: 0.72, g: 0.52, b: 0.04, a: 1 } }}
        >
          <Label value={`Level  ${playerState.level}`} fontSize={24} color={{ r: 0.05, g: 0.03, b: 0, a: 1 }} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label
            value={maxLv ? 'Max Level!' : `XP: ${xp.current} / ${xp.needed}`}
            fontSize={18}
            color={C.textMain}
            uiTransform={{ margin: { bottom: 6 } }}
          />
          {!maxLv && (
            <UiEntity uiTransform={{ width: '100%', height: 16, borderRadius: 8 }} uiBackground={{ color: { r: 0.12, g: 0.08, b: 0.04, a: 1 } }}>
              <UiEntity uiTransform={{ width: `${pct}%`, height: '100%', borderRadius: 8 }} uiBackground={{ color: C.green }} />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>

      {/* Stats grid 3×2 */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {STATS.map((s) => {
          const val = playerState[s.key]
          return (
            <UiEntity
              key={s.label}
              uiTransform={{
                flexDirection: 'column',
                width: cW,
                height: cH,
                margin: { right: cG, bottom: 12 },
                padding: { top: 12, bottom: 10, left: 14, right: 14 },
                borderWidth: 3,
                borderColor: CARD_BORDER,
                borderRadius: 10,
              }}
              uiBackground={{ color: mobile ? CARD_FILL_MOBILE : CARD_FILL }}
            >
              <Label value={`${val}`} fontSize={30} color={s.color} />
              <Label value={s.label} fontSize={17} color={mobile ? { r: 1, g: 1, b: 1, a: 0.80 } : CARD_TEXT_MUTE} uiTransform={{ margin: { top: 4 } }} />
            </UiEntity>
          )
        })}
      </UiEntity>
    </UiEntity>
  )
}

// ─── RewardsTab ───────────────────────────────────────────────────────────────
const RWD_H = 95

type RewardCardProps = { key?: string | number; reward: (typeof LEVEL_REWARDS)[number] }

const RewardCard = ({ reward: r }: RewardCardProps) => {
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

  const baseW = mobile ? CARD_W_M : CARD_W
  const baseH = mobile ? RWD_H_M : RWD_H
  const w = Math.round(baseW * scale)
  const h = Math.round(baseH * scale)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: w,
        height: h,
        margin: { right: CARD_GAP, bottom: 10 },
        padding: { top: 8, bottom: 6, left: 8, right: 8 },
        borderWidth: 2,
        borderColor,
        borderRadius: 10,
      }}
      uiBackground={{ color: bg }}
      onMouseDown={claimable ? () => {
        if (isZooming(zoomKey)) return
        playSound('buttonclick')
        triggerCardZoom(zoomKey)
        setTimeout(() => claimReward(r.level), 290)
      } : undefined}
    >
      <Label value={`Lv ${r.level}`} fontSize={18} color={claimable ? C.gold : claimed ? C.green : (mobile ? C.textMain : CARD_TEXT_MUTE)} />
      <Label value={r.label} fontSize={15} color={descColor} textAlign="middle-center" uiTransform={{ margin: { top: 3 } }} />
      {isUnlocker && (
        <Label value={`Unlocks ${cropDef!.name}`} fontSize={13} color={claimed ? C.green : claimable ? C.gold : (mobile ? C.textMain : CARD_TEXT_MUTE)} textAlign="middle-center" uiTransform={{ margin: { top: 2 } }} />
      )}
      {claimed   && <Label value="Claimed" fontSize={14} color={C.green} uiTransform={{ margin: { top: 3 } }} />}
      {claimable && <Label value="Tap!" fontSize={14} color={C.gold}  uiTransform={{ margin: { top: 3 } }} />}
      {!unlocked && <Label value={`Lv ${r.level}`} fontSize={13} color={mobile ? C.textMain : CARD_TEXT_MUTE} uiTransform={{ margin: { top: 3 } }} />}
    </UiEntity>
  )
}

const RewardsTab = () => {
  const page      = rewardsPage.value
  const lastPage  = Math.max(0, Math.ceil(LEVEL_REWARDS.length / REWARDS_PAGE_SIZE) - 1)
  const slice     = LEVEL_REWARDS.slice(page * REWARDS_PAGE_SIZE, (page + 1) * REWARDS_PAGE_SIZE)
  const mob       = isMobile()
  const contentH  = mob ? LB_CONT_H_M : LB_CONTENT_H
  const gW        = mob ? GRID_W_M    : GRID_W
  const gML       = mob ? GRID_ML_M   : GRID_ML

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', height: contentH }}>
      {/* Centered card grid — paddingBottom reserves space for the absolute PageNav */}
      <UiEntity
        uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: gW, margin: { left: gML }, flex: 1, alignContent: 'flex-start', padding: { bottom: 58 } }}
      >
        {slice.map((r) => <RewardCard key={r.level} reward={r} />)}
      </UiEntity>
      {/* PageNav pinned absolutely to the bottom — same height as leaderboard's */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { bottom: 0, left: 0 },
          width: '100%',
          height: 50,
        }}
      >
        <PageNav
          page={page}
          lastPage={lastPage}
          onPrev={() => { rewardsPage.value-- }}
          onNext={() => { rewardsPage.value++ }}
        />
      </UiEntity>
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

// ─── Mobile overrides — everything 10% bigger, pushed down to clear DCL's player profile UI ──
// All pixel values scale proportionally; derived constants recalculate from their scaled bases.
const M_FACTOR         = 1.1
const PANEL_W_M        = Math.round(PANEL_W * M_FACTOR)                                            // 986
const PANEL_H_M        = Math.round(PANEL_W_M * BG_RECT.h / BG_RECT.w)                            // 693
const PANEL_TOP_M      = 80
const CONT_LEFT_M      = Math.round(CONTENT_LEFT * M_FACTOR)                                       // 86
const CONT_TOP_M       = Math.round(CONTENT_TOP * M_FACTOR)                                        // 108
const CONT_BOT_M       = Math.round(CONTENT_BOTTOM * M_FACTOR)                                     // 105
const CONT_W_M         = PANEL_W_M - CONT_LEFT_M * 2                                              // 814
const CONT_H_M         = PANEL_H_M - CONT_TOP_M - CONT_BOT_M                                     // 480
const CLOSE_SIZE_M     = Math.round(CLOSE_SIZE * M_FACTOR)                                         // 65
const CLOSE_LEFT_M     = Math.round(CLOSE_LEFT * M_FACTOR)                                         // 829
const TAB_H_M          = Math.round(TAB_H * M_FACTOR)                                              // 51
const TAB_W_M          = Math.round(TAB_W * M_FACTOR)                                              // 207
const TAB_GAP_M        = Math.round(TAB_GAP * M_FACTOR)                                            // 11
const TAB_MARGIN_BOT_M = Math.round(TAB_MARGIN_BOT * M_FACTOR)                                     // 15
const CARD_GAP_M       = Math.round(CARD_GAP * M_FACTOR)                                           // 15
const GRID_W_M         = 3 * TAB_W_M + 2 * TAB_GAP_M                                             // 643
const CARD_W_M         = Math.floor((GRID_W_M - 3 * CARD_GAP_M) / 3)                             // 199
const CARD_H_M         = Math.round(CARD_H * M_FACTOR)                                             // 95
const GRID_ML_M        = Math.floor((CONT_W_M - GRID_W_M) / 2)                                   // 85
const RWD_H_M          = Math.round(RWD_H * M_FACTOR)                                              // 105
const LB_CONT_H_M      = CONT_H_M - TAB_H_M - TAB_MARGIN_BOT_M                                  // 414
const LB_ROW_H_M       = Math.round(LB_ROW_H * M_FACTOR)                                          // 53
const LB_ROW_GAP_M     = Math.round(LB_ROW_GAP * M_FACTOR)                                        // 9
const LB_SCORE_W_M     = Math.round(LB_SCORE_W * M_FACTOR)                                        // 88
const LB_NAME_W_M      = GRID_W_M - 8 - (Math.round(44 * M_FACTOR) + Math.round(14 * M_FACTOR)) - LB_SCORE_W_M  // 484

const LeaderboardTab = () => {
  if (!lbState.loaded && !lbState.loading) requestLeaderboard()

  const mob       = isMobile()
  const page      = lbPage.value
  const entries   = lbState.entries
  const lastPage  = Math.max(0, Math.ceil(entries.length / LB_PAGE_SIZE) - 1)
  const slice     = entries.slice(page * LB_PAGE_SIZE, (page + 1) * LB_PAGE_SIZE)
  const contentH  = mob ? LB_CONT_H_M  : LB_CONTENT_H
  const gW        = mob ? GRID_W_M     : GRID_W
  const gML       = mob ? GRID_ML_M    : GRID_ML
  const rowH      = mob ? LB_ROW_H_M   : LB_ROW_H
  const rowG      = mob ? LB_ROW_GAP_M : LB_ROW_GAP
  const scoreW    = mob ? LB_SCORE_W_M : LB_SCORE_W
  const nameW     = mob ? LB_NAME_W_M  : LB_NAME_W
  const badgeW    = mob ? Math.round(44 * M_FACTOR) : 44
  const badgeH    = mob ? Math.round(36 * M_FACTOR) : 36
  const badgeMR   = mob ? Math.round(14 * M_FACTOR) : 14

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
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%', padding: { bottom: 58 } }}>
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
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { bottom: 0, left: 0 },
          width: '100%',
          height: 50,
        }}
      >
        <PageNav
          page={page}
          lastPage={lastPage}
          onPrev={() => { if (lbPage.value > 0) lbPage.value-- }}
          onNext={() => { if (lbPage.value < lastPage) lbPage.value++ }}
        />
      </UiEntity>
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
