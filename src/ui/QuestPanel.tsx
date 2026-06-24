import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { QUEST_DEFINITIONS } from '../data/questData'
import { questProgressMap } from '../game/questState'
import { playerState } from '../game/gameState'
import { tutorialState, TUTORIAL_MILESTONES, getTutorialMilestoneStatus } from '../game/tutorialState'
import {
  progressionEventState,
  PROGRESSION_MILESTONES,
  getProgressionMilestoneStatus,
} from '../game/progressionEventState'
import {
  animalTutorialState,
  CHICKEN_MILESTONES,
  PIG_MILESTONES,
  getChickenMilestoneStatus,
  getPigMilestoneStatus,
} from '../game/animalTutorialState'
import { NPC_ROSTER, MAYOR_DEF } from '../data/npcData'
import {
  CROP_HARVEST_IMAGES,
  COINS_IMAGE,
  SOIL_ICON,
  WATERINGCAN_ICON,
  BOX_CROPS_ICON,
  SHOPINGCART_ICON,
} from '../data/imagePaths'
import { playSound } from '../systems/sfxSystem'

const NPC_HEAD: Record<string, string> = {}
for (const npc of NPC_ROSTER) NPC_HEAD[npc.id] = npc.headImage

// ─── Atlas ────────────────────────────────────────────────────────────────────
const QUEST_ATLAS      = 'assets/images/ui_loading/quest_atlas.png'
const ATLAS_SIZE       = 1024
const BG_RECT          = { x: 57, y: 15, w: 909, h: 678 } as const
const UI_SCALE         = 0.8
const ss               = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1189)
const PANEL_H          = Math.round((PANEL_W * BG_RECT.h) / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(120)
const CONTENT_LEFT     = ss(72)
const CONTENT_RIGHT    = ss(72)
const CONTENT_TOP      = ss(100)
const CONTENT_BOTTOM   = ss(68)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)
const CLOSE_BTN_IMG    = 'assets/images/ui_loading/closebutton.png'

// Mobile pagination bar (big buttons like farm)
const MOB_PAGINAV_H    = ss(80)
const DSK_PAGINAV_H    = ss(56)

// ─── Palette ──────────────────────────────────────────────────────────────────
const CARD_FILL      = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const MOB_CARD_FILL  = { r: 0.18, g: 0.11, b: 0.04, a: 0.92 }
const CARD_TEXT      = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const TRACK_COLOR    = { r: 0.55, g: 0.38, b: 0.15, a: 0.6 }
const COIN_GOLD      = { r: 0.92, g: 0.72, b: 0.10, a: 1 }
const WHITE          = { r: 1, g: 1, b: 1, a: 1 }
const WHITE_MUTE     = { r: 1, g: 1, b: 1, a: 0.65 }
const WHITE_DIM      = { r: 1, g: 1, b: 1, a: 0.35 }
const CARD_BORDER    = { r: 0.92, g: 0.72, b: 0.10, a: 0.95 }
const COL_DONE       = { r: 0.30, g: 0.78, b: 0.30, a: 0.95 }
const BTN_ON         = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_OFF        = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT       = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

type RGBA = { r: number; g: number; b: number; a: number }

const QUEST_DEBUG = false

// ─── Pagination + expand state ────────────────────────────────────────────────
const questPage      = { value: 0 }
const expandedQuests = new Set<string>()
const ITEMS_PER_PAGE = 4

// ─── Item types ───────────────────────────────────────────────────────────────
type MilestoneItem = {
  kind:       'milestone'
  key:        string
  title:      string
  avatarSrc:  string
  milestones: { label: string }[]
  getStatus:  (m: any) => string
}
type QuestItem = {
  kind: 'quest'
  key:  string
  def:  typeof QUEST_DEFINITIONS[number]
  qp:   { current: number; status: string }
}
type AnyItem = MilestoneItem | QuestItem

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── Single checklist item ────────────────────────────────────────────────────
const ChecklistRow = ({ label, status, fontSize }: { key?: string; label: string; status: string; fontSize: number }) => {
  const icon  = status === 'done' ? '✓' : status === 'current' ? '▶' : '○'
  const color = status === 'done' ? COL_DONE : status === 'current' ? COIN_GOLD : WHITE_MUTE
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(10) } }}>
      <Label value={icon}  fontSize={fontSize} color={color} uiTransform={{ width: ss(28), flexShrink: 0 }} />
      <Label value={label} fontSize={fontSize} color={color} />
    </UiEntity>
  )
}

// ─── Checklist — single column (desktop) or two columns (mobile) ──────────────
const Checklist = ({
  milestones,
  getStatus,
}: {
  milestones: { label: string }[]
  getStatus: (m: any) => string
}) => {
  const mob = isMobile()
  const fs  = mob ? ss(26) : ss(20)

  if (!mob) {
    return (
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
        {milestones.map((m) => <ChecklistRow key={m.label} label={m.label} status={getStatus(m)} fontSize={fs} />)}
      </UiEntity>
    )
  }

  // Mobile: two columns
  const half  = Math.ceil(milestones.length / 2)
  const left  = milestones.slice(0, half)
  const right = milestones.slice(half)
  const colW  = Math.floor((CONTENT_W - ss(44)) / 2)  // ~400px each

  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: '100%' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', width: colW, margin: { right: ss(16) } }}>
        {left.map((m) => <ChecklistRow key={m.label} label={m.label} status={getStatus(m)} fontSize={fs} />)}
      </UiEntity>
      <UiEntity uiTransform={{ flexDirection: 'column', width: colW }}>
        {right.map((m) => <ChecklistRow key={m.label} label={m.label} status={getStatus(m)} fontSize={fs} />)}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ pct, fill }: { pct: number; fill: RGBA }) => (
  <UiEntity
    uiTransform={{ width: '100%', height: ss(12), borderRadius: ss(6), margin: { bottom: ss(6) }, overflow: 'hidden' }}
    uiBackground={{ color: TRACK_COLOR }}
  >
    <UiEntity uiTransform={{ width: `${pct}%`, height: '100%', borderRadius: ss(6) }} uiBackground={{ color: fill }} />
  </UiEntity>
)

// ─── Expanded quest details ───────────────────────────────────────────────────
const QuestExpanded = ({
  def, qp,
}: {
  def: typeof QUEST_DEFINITIONS[number]
  qp: { current: number; status: string }
}) => {
  const mob      = isMobile()
  const pct      = Math.min(100, Math.floor((qp.current / def.target) * 100))
  const isActive = qp.status === 'active'
  const isDone   = qp.status === 'completed'

  let questIcon = BOX_CROPS_ICON
  if (def.type === 'harvest_crop' && def.cropType !== null) questIcon = CROP_HARVEST_IMAGES[def.cropType]
  else if (def.type === 'water_total')  questIcon = WATERINGCAN_ICON
  else if (def.type === 'plant_total')  questIcon = SOIL_ICON
  else if (def.type === 'sell_total')   questIcon = SHOPINGCART_ICON

  const textFs = mob ? ss(26) : ss(19)

  return (
    <UiEntity uiTransform={{ flexDirection: 'row', padding: { left: ss(14), right: ss(14), bottom: ss(16) } }}>
      <UiEntity
        uiTransform={{ width: ss(52), height: ss(52), flexShrink: 0, margin: { right: ss(14) } }}
        uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: CONTENT_W - ss(52) - ss(14) - ss(28) }}>
        {isActive && (
          <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
            <ProgressBar pct={pct} fill={CARD_BORDER} />
            <Label value={`${qp.current} / ${def.target}`} fontSize={textFs} color={mob ? WHITE_MUTE : CARD_TEXT_MUTE} />
          </UiEntity>
        )}
        {qp.status === 'claimable' && (
          <Label value="Ready to Claim!" fontSize={mob ? ss(28) : ss(22)} color={COIN_GOLD} />
        )}
        {!isDone && (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: ss(10) } }}>
            <UiEntity
              uiTransform={{ width: ss(24), height: ss(24), margin: { right: ss(6) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={`${def.rewardCoins}`}    fontSize={mob ? ss(26) : ss(21)} color={COIN_GOLD} />
            <Label value={`  +${def.rewardXp} XP`} fontSize={mob ? ss(26) : ss(19)} color={mob ? WHITE_MUTE : CARD_TEXT_MUTE} />
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Item row (header always visible, content expands on tap) ─────────────────
const ItemRow = ({ item }: { key?: string; item: AnyItem }) => {
  const mob      = isMobile()
  const expanded = expandedQuests.has(item.key)

  let avatarSrc   = ''
  let title       = ''
  let subtitle    = ''
  let subtitleCol = mob ? WHITE_MUTE : CARD_TEXT_MUTE

  if (item.kind === 'milestone') {
    avatarSrc = item.avatarSrc
    title     = item.title
    const done = item.milestones.filter(m => item.getStatus(m) === 'done').length
    subtitle   = `${done} / ${item.milestones.length} done`
  } else {
    const { def, qp } = item
    avatarSrc = NPC_HEAD[def.npcId ?? def.id] ?? ''
    title     = def.title
    if (qp.status === 'claimable') {
      subtitle    = 'Ready to claim!'
      subtitleCol = COIN_GOLD
    } else if (qp.status === 'completed') {
      subtitle    = 'Completed ✓'
      subtitleCol = COL_DONE
    } else {
      subtitle = `${qp.current} / ${def.target}`
    }
  }

  const toggle = () => {
    playSound('buttonclick')
    if (expandedQuests.has(item.key)) expandedQuests.delete(item.key)
    else expandedQuests.add(item.key)
  }

  // Middle width = card width - padding - avatar - chevron
  const midW = CONTENT_W - ss(14) - ss(10) - ss(52) - ss(14) - ss(44)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        margin: { bottom: ss(12) },
        borderWidth: mob ? 0 : 3,
        borderColor: CARD_BORDER,
        borderRadius: mob ? 0 : 12,
        overflow: 'hidden',
      }}
      uiBackground={{ color: mob ? MOB_CARD_FILL : CARD_FILL }}
    >
      {/* Collapsed header row */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          height: ss(76),
          padding: { left: ss(14), right: ss(10) },
        }}
        onMouseDown={toggle}
      >
        <UiEntity
          uiTransform={{ width: ss(52), height: ss(52), flexShrink: 0, margin: { right: ss(14) } }}
          uiBackground={{ texture: { src: avatarSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <UiEntity uiTransform={{ flexDirection: 'column', width: midW }}>
          <Label value={title}    fontSize={mob ? ss(26) : ss(21)} color={mob ? WHITE : CARD_TEXT} />
          <Label value={subtitle} fontSize={mob ? ss(26) : ss(19)} color={subtitleCol} uiTransform={{ margin: { top: ss(4) } }} />
        </UiEntity>
        <Label
          value={expanded ? '▲' : '▼'}
          fontSize={ss(22)}
          color={mob ? WHITE_DIM : CARD_TEXT_MUTE}
          uiTransform={{ width: ss(44), flexShrink: 0 }}
          textAlign="middle-center"
        />
      </UiEntity>

      {/* Expanded milestone content */}
      {expanded && item.kind === 'milestone' && (
        <UiEntity uiTransform={{ flexDirection: 'column', padding: { left: ss(14), right: ss(14), bottom: ss(16) } }}>
          <Checklist milestones={item.milestones} getStatus={item.getStatus} />
        </UiEntity>
      )}

      {/* Expanded quest content */}
      {expanded && item.kind === 'quest' && (
        <QuestExpanded def={item.def} qp={item.qp} />
      )}
    </UiEntity>
  )
}

// ─── Pagination nav ───────────────────────────────────────────────────────────
const QuestPageNav = ({ page, lastPage }: { page: number; lastPage: number }) => {
  const mob     = isMobile()
  const canPrev = page > 0
  const canNext = page < lastPage

  if (mob) {
    const btnW = ss(200), btnH = ss(64)
    return (
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: MOB_PAGINAV_H, flexShrink: 0 }}>
        <UiEntity
          uiTransform={{ width: btnW, height: btnH, alignItems: 'center', justifyContent: 'center', borderRadius: 12, margin: { right: ss(24) } }}
          uiBackground={{ color: canPrev ? BTN_ON : BTN_OFF }}
          onMouseDown={canPrev ? () => { playSound('buttonclick'); questPage.value-- } : undefined}
        >
          <Label value="< Prev" fontSize={ss(26)} color={canPrev ? WHITE : WHITE_DIM} textAlign="middle-center" />
        </UiEntity>
        <Label value={`${page + 1} / ${lastPage + 1}`} fontSize={ss(26)} color={{ r: 1, g: 1, b: 1, a: 0.8 }} textAlign="middle-center" uiTransform={{ width: ss(100) }} />
        <UiEntity
          uiTransform={{ width: btnW, height: btnH, alignItems: 'center', justifyContent: 'center', borderRadius: 12, margin: { left: ss(24) } }}
          uiBackground={{ color: canNext ? BTN_ON : BTN_OFF }}
          onMouseDown={canNext ? () => { playSound('buttonclick'); questPage.value++ } : undefined}
        >
          <Label value="Next >" fontSize={ss(26)} color={canNext ? WHITE : WHITE_DIM} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>
    )
  }

  const disabledCol = CARD_TEXT_MUTE
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: DSK_PAGINAV_H, flexShrink: 0 }}>
      <UiEntity
        uiTransform={{ width: ss(130), height: ss(44), alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: { right: ss(20) } }}
        uiBackground={{ color: canPrev ? BTN_ON : BTN_OFF }}
        onMouseDown={canPrev ? () => { playSound('buttonclick'); questPage.value-- } : undefined}
      >
        <Label value="< Prev" fontSize={ss(22)} color={canPrev ? BTN_TEXT : disabledCol} textAlign="middle-center" />
      </UiEntity>
      <Label value={`${page + 1} / ${lastPage + 1}`} fontSize={ss(22)} color={CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ width: ss(90), height: ss(44) }} />
      <UiEntity
        uiTransform={{ width: ss(130), height: ss(44), alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: { left: ss(20) } }}
        uiBackground={{ color: canNext ? BTN_ON : BTN_OFF }}
        onMouseDown={canNext ? () => { playSound('buttonclick'); questPage.value++ } : undefined}
      >
        <Label value="Next >" fontSize={ss(22)} color={canNext ? BTN_TEXT : disabledCol} textAlign="middle-center" />
      </UiEntity>
    </UiEntity>
  )
}

// ─── Panel frame ─────────────────────────────────────────────────────────────
const QuestPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => (
  <UiEntity
    uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', pointerFilter: 'none' }}
  >
    <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', pointerFilter: 'block' }} />
    <UiEntity
      uiTransform={{ width: PANEL_W, height: PANEL_H, margin: { top: PANEL_TOP_MARGIN }, pointerFilter: 'block' }}
      uiBackground={{ texture: { src: QUEST_ATLAS, wrapMode: 'clamp' }, textureMode: 'stretch', uvs: bgUvs(BG_RECT) }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: CONTENT_LEFT, top: CONTENT_TOP },
          width: CONTENT_W,
          height: CONTENT_H,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: isMobile() ? { right: ss(20), top: ss(8) } : { right: CLOSE_RIGHT, top: CLOSE_TOP },
          width: isMobile() ? ss(90) : CLOSE_SIZE,
          height: isMobile() ? ss(90) : CLOSE_SIZE,
        }}
        uiBackground={isMobile() ? { texture: { src: CLOSE_BTN_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' } : undefined}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  </UiEntity>
)

// ─── Main panel ───────────────────────────────────────────────────────────────
export const QuestPanel = () => {
  const mob       = isMobile()
  const paginH    = mob ? MOB_PAGINAV_H : DSK_PAGINAV_H
  const listH     = CONTENT_H - paginH

  // Build unified item list
  const items: AnyItem[] = []

  if (QUEST_DEBUG || tutorialState.active) {
    items.push({ kind: 'milestone', key: 'tutorial', title: 'Tutorial', avatarSrc: MAYOR_DEF.headImage, milestones: TUTORIAL_MILESTONES, getStatus: getTutorialMilestoneStatus })
  }
  if (QUEST_DEBUG || progressionEventState.active) {
    items.push({ kind: 'milestone', key: 'fert', title: 'Fertilizer Tutorial', avatarSrc: MAYOR_DEF.headImage, milestones: PROGRESSION_MILESTONES, getStatus: getProgressionMilestoneStatus })
  }
  if (QUEST_DEBUG || animalTutorialState.chickenActive) {
    items.push({ kind: 'milestone', key: 'chicken', title: 'Chicken Tutorial', avatarSrc: MAYOR_DEF.headImage, milestones: CHICKEN_MILESTONES, getStatus: getChickenMilestoneStatus })
  }
  if (QUEST_DEBUG || animalTutorialState.pigActive) {
    items.push({ kind: 'milestone', key: 'pig', title: 'Pig Tutorial', avatarSrc: MAYOR_DEF.headImage, milestones: PIG_MILESTONES, getStatus: getPigMilestoneStatus })
  }

  if (QUEST_DEBUG) {
    for (const def of QUEST_DEFINITIONS) {
      items.push({ kind: 'quest', key: def.id, def, qp: { current: Math.floor(def.target / 2), status: 'active' } })
    }
  } else {
    for (const def of QUEST_DEFINITIONS) {
      const qp = questProgressMap.get(def.id)
      if (qp && qp.status !== 'available' && qp.status !== 'completed') {
        items.push({ kind: 'quest', key: def.id, def, qp })
      }
    }
  }

  const page     = questPage.value
  const lastPage = Math.max(0, Math.ceil(items.length / ITEMS_PER_PAGE) - 1)
  if (page > lastPage) questPage.value = lastPage
  const pageSlice = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <QuestPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Quest list — scrollable within the page in case expanded items overflow */}
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', height: listH, overflow: 'scroll' }}>
        {items.length === 0 && (
          <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', alignItems: 'center', margin: { top: ss(80) } }}>
            <Label value="No active quests" fontSize={ss(27)} color={mob ? WHITE_MUTE : CARD_TEXT_MUTE} textAlign="middle-center" />
            <Label value="Talk to villagers to receive quests!" fontSize={ss(20)} color={mob ? WHITE_MUTE : CARD_TEXT_MUTE} textAlign="middle-center"
              uiTransform={{ margin: { top: ss(12) } }} />
          </UiEntity>
        )}
        {pageSlice.map((item) => <ItemRow key={item.key} item={item} />)}
      </UiEntity>

      {/* Pagination — always shown at bottom */}
      <QuestPageNav page={page} lastPage={lastPage} />

    </QuestPanelFrame>
  )
}
