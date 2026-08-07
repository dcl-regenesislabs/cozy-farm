import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { NPC_ROSTER } from '../data/npcData'
import { QUEST_DEFINITIONS } from '../data/questData'
import { playerState } from '../game/gameState'
import {
  CHICKEN_MILESTONES,
  PIG_MILESTONES,
  animalTutorialState,
  getChickenMilestoneStatus,
  getPigMilestoneStatus,
} from '../game/animalTutorialState'
import {
  PROGRESSION_MILESTONES,
  progressionEventState,
  getProgressionMilestoneStatus,
} from '../game/progressionEventState'
import {
  isQuestPrerequisiteMet,
  type QuestProgress,
  type QuestStatus,
  questProgressMap,
} from '../game/questState'
import {
  TUTORIAL_MILESTONES,
  tutorialState,
  getTutorialMilestoneStatus,
} from '../game/tutorialState'
import { playSound } from '../systems/sfxSystem'
import {
  REVAMP_BG_IMG,
  REVAMP_CLOSE_HIT_PAD_MOBILE,
  REVAMP_CLOSE_RIGHT_MOBILE,
  REVAMP_CLOSE_SIZE_MOBILE,
  REVAMP_CLOSE_TOP_MOBILE,
  REVAMP_CONTENT_BOTTOM,
  REVAMP_CONTENT_LEFT,
  REVAMP_CONTENT_RIGHT,
  REVAMP_CONTENT_TOP,
  REVAMP_PANEL_H,
  REVAMP_PANEL_TOP_MARGIN,
  REVAMP_PANEL_W,
  RevampCloseButton,
  RevampPanelFrame,
  RevampTitlePlaque,
} from './RevampPanel'
import {
  SHARED_PAGINATION_HEIGHT_MOBILE,
  SharedPaginationBar,
} from './SharedPaginationBar'

const UI_SCALE = 0.9
const ss = (value: number) => Math.round(value * UI_SCALE)

const QUEST_DEBUG = false
const MOBILE_PAGINATION_BUTTON_IMG = 'assets/images/revamp/Type=Secondary, State=Default.png'
const MOBILE_PAGINATION_BUTTON_ASPECT = 366 / 84
const QUEST_MOBILE_FRAME_SCALE = 1.1
const QUEST_MOBILE_TOP_OFFSET = ss(18)
const QUEST_MOBILE_FONT_SCALE = 1.15

const QUEST_MOBILE_PANEL_W = Math.round(REVAMP_PANEL_W * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_PANEL_H = Math.round(REVAMP_PANEL_H * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_PANEL_TOP = Math.round(REVAMP_PANEL_TOP_MARGIN * QUEST_MOBILE_FRAME_SCALE) + QUEST_MOBILE_TOP_OFFSET
const QUEST_MOBILE_CONTENT_LEFT = Math.round(REVAMP_CONTENT_LEFT * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CONTENT_RIGHT = Math.round(REVAMP_CONTENT_RIGHT * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CONTENT_TOP = Math.round(REVAMP_CONTENT_TOP * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CONTENT_BOTTOM = Math.round(REVAMP_CONTENT_BOTTOM * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CONTENT_W = QUEST_MOBILE_PANEL_W - QUEST_MOBILE_CONTENT_LEFT - QUEST_MOBILE_CONTENT_RIGHT
const QUEST_MOBILE_CONTENT_H = QUEST_MOBILE_PANEL_H - QUEST_MOBILE_CONTENT_TOP - QUEST_MOBILE_CONTENT_BOTTOM
const QUEST_MOBILE_CLOSE_SIZE = Math.round(REVAMP_CLOSE_SIZE_MOBILE * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CLOSE_RIGHT = Math.round(REVAMP_CLOSE_RIGHT_MOBILE * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CLOSE_TOP = Math.round(REVAMP_CLOSE_TOP_MOBILE * QUEST_MOBILE_FRAME_SCALE)
const QUEST_MOBILE_CLOSE_HIT_PAD = Math.round(REVAMP_CLOSE_HIT_PAD_MOBILE * QUEST_MOBILE_FRAME_SCALE)
const qmf = (value: number) => Math.round(value * QUEST_MOBILE_FONT_SCALE)

const C = {
  panelText:         { r: 0.23, g: 0.12, b: 0.05, a: 1 },
  panelTextSoft:     { r: 0.45, g: 0.30, b: 0.14, a: 1 },
  panelTextMuted:    { r: 0.56, g: 0.42, b: 0.26, a: 1 },
  cream:             { r: 0.98, g: 0.93, b: 0.83, a: 0.99 },
  creamLine:         { r: 0.92, g: 0.78, b: 0.30, a: 1 },
  creamInnerLine:    { r: 0.83, g: 0.71, b: 0.52, a: 0.55 },
  chipGuide:         { r: 0.47, g: 0.29, b: 0.11, a: 1 },
  chipActive:        { r: 0.24, g: 0.54, b: 0.88, a: 1 },
  chipClaim:         { r: 0.90, g: 0.70, b: 0.16, a: 1 },
  chipAvailable:     { r: 0.61, g: 0.42, b: 0.17, a: 1 },
  chipDone:          { r: 0.29, g: 0.69, b: 0.30, a: 1 },
  chipTextDark:      { r: 0.22, g: 0.12, b: 0.04, a: 1 },
  chipTextLight:     { r: 0.99, g: 0.98, b: 0.96, a: 1 },
  barTrack:          { r: 0.77, g: 0.67, b: 0.50, a: 1 },
  barFill:           { r: 0.34, g: 0.74, b: 0.29, a: 1 },
  blue:              { r: 0.20, g: 0.49, b: 0.98, a: 1 },
  gold:              { r: 0.94, g: 0.72, b: 0.12, a: 1 },
  green:             { r: 0.28, g: 0.72, b: 0.25, a: 1 },
  paginationText:    { r: 0.34, g: 0.20, b: 0.10, a: 1 },
  paginationDisabled:{ r: 0.53, g: 0.39, b: 0.25, a: 0.72 },
  paginationChipBg:  { r: 0.34, g: 0.18, b: 0.07, a: 0.96 },
  paginationChipBd:  { r: 0.95, g: 0.90, b: 0.80, a: 0.98 },
  paginationChipTx:  { r: 1.00, g: 1.00, b: 1.00, a: 1 },
}

type ChecklistStatus = 'done' | 'current' | 'todo'

type ChecklistEntry = {
  label: string
  status: ChecklistStatus
}

type GuideItem = {
  kind: 'guide'
  key: string
  ownerLabel: string
  title: string
  avatarSrc: string
  current: number
  total: number
  note: string
  entries: ChecklistEntry[]
}

type QuestItem = {
  kind: 'quest'
  key: string
  ownerLabel: string
  title: string
  avatarSrc: string
  current: number
  total: number
  status: QuestStatus
  description: string
  rewardCoins: number
  rewardXp: number
}

type QuestPanelItem = GuideItem | QuestItem

const expandedQuestKey = { value: '' }
const mobileQuestPage = { value: 0 }

const NPC_HEADS = new Map(NPC_ROSTER.map((npc) => [npc.id, npc.headImage]))
const DEFAULT_HEAD = NPC_HEADS.get('mayorchen') ?? ''

function getNpcHead(npcId: string): string {
  return NPC_HEADS.get(npcId) ?? DEFAULT_HEAD
}

function buildSampleChecklist(labels: string[], currentIndex: number): ChecklistEntry[] {
  const clampedCurrent = Math.max(0, Math.min(currentIndex, labels.length - 1))
  return labels.map((label, index) => ({
    label,
    status: index < clampedCurrent ? 'done' : index === clampedCurrent ? 'current' : 'todo',
  }))
}

function buildGuideItems(): GuideItem[] {
  const items: GuideItem[] = []

  const tutorialEntries = tutorialState.active
    ? TUTORIAL_MILESTONES.map((m) => ({ label: m.label, status: getTutorialMilestoneStatus(m) }))
    : buildSampleChecklist(TUTORIAL_MILESTONES.map((m) => m.label), 4)

  // These three guides are only ever rendered once the player has actually
  // started or finished the flow (see the `xxxOwned` / `rotSystemUnlocked`
  // OR-conditions below), so the real per-step status is always meaningful —
  // no need for a fake placeholder once `active` (mid-session-resume only)
  // goes back to false on a later reconnect.
  const progressionEntries = PROGRESSION_MILESTONES.map((m) => ({ label: m.label, status: getProgressionMilestoneStatus(m) }))
  const chickenEntries = CHICKEN_MILESTONES.map((m) => ({ label: m.label, status: getChickenMilestoneStatus(m) }))
  const pigEntries = PIG_MILESTONES.map((m) => ({ label: m.label, status: getPigMilestoneStatus(m) }))

  if (tutorialState.active || QUEST_DEBUG) {
    items.push(makeGuideItem(
      'guide-tutorial',
      'Mayor Chen',
      'Tutorial',
      getNpcHead('mayorchen'),
      tutorialEntries,
      'Core onboarding checklist for the farm loop.',
    ))
  }

  if (progressionEventState.active || playerState.rotSystemUnlocked || QUEST_DEBUG) {
    items.push(makeGuideItem(
      'guide-fertilizer',
      'Mayor Chen',
      'Fertilizer Guide',
      getNpcHead('mayorchen'),
      progressionEntries,
      'Unlock compost, collect fertilizer and use it on crops.',
    ))
  }

  if (animalTutorialState.chickenActive || playerState.chickenCoopOwned || QUEST_DEBUG) {
    items.push(makeGuideItem(
      'guide-chicken',
      'Animal Guide',
      'Chicken Coop',
      getNpcHead('rosa'),
      chickenEntries,
      'Coop basics: build, buy, feed and keep it clean.',
    ))
  }

  if (animalTutorialState.pigActive || playerState.pigPenOwned || QUEST_DEBUG) {
    items.push(makeGuideItem(
      'guide-pig',
      'Animal Guide',
      'Pig Pen',
      getNpcHead('marco'),
      pigEntries,
      'Pen basics plus growth, breeding and meat harvesting.',
    ))
  }

  return items
}

function makeGuideItem(
  key: string,
  ownerLabel: string,
  title: string,
  avatarSrc: string,
  entries: ChecklistEntry[],
  note: string,
): GuideItem {
  const current = entries.filter((entry) => entry.status === 'done').length
  return {
    kind: 'guide',
    key,
    ownerLabel,
    title,
    avatarSrc,
    current,
    total: entries.length,
    note,
    entries,
  }
}

function buildDebugQuestProgress(index: number, target: number): QuestProgress {
  const pattern: QuestStatus[] = ['active', 'claimable', 'available', 'active', 'available', 'claimable']
  const status = pattern[index % pattern.length]
  const current = status === 'claimable'
    ? target
    : status === 'available'
      ? 0
      : Math.max(1, Math.floor(target * 0.55))

  return { id: `debug-${index}`, current, status }
}

function buildQuestItems(): QuestItem[] {
  return QUEST_DEFINITIONS
    .map((def, index) => {
      const qp = QUEST_DEBUG
        ? buildDebugQuestProgress(index, def.target)
        : questProgressMap.get(def.id)

      if (!qp) return null
      if (!QUEST_DEBUG && (!isQuestPrerequisiteMet(def) || qp.status === 'completed')) return null

      return {
        kind: 'quest' as const,
        key: def.id,
        ownerLabel: def.npcName,
        title: def.title,
        avatarSrc: getNpcHead(def.npcId ?? def.id),
        current: Math.min(qp.current, def.target),
        total: def.target,
        status: qp.status,
        description: def.description.replace(/\n/g, ' '),
        rewardCoins: def.rewardCoins,
        rewardXp: def.rewardXp,
      }
    })
    .filter((item): item is QuestItem => item !== null)
}

function buildPanelItems(): QuestPanelItem[] {
  return [...buildGuideItems(), ...buildQuestItems()]
}

function getStatusText(item: QuestPanelItem): string {
  if (item.kind === 'guide') return 'Guide'

  switch (item.status) {
    case 'claimable': return 'Claim'
    case 'completed': return 'Done'
    case 'available': return 'New'
    case 'active':
    default:
      return 'Active'
  }
}

function getStatusChipColors(item: QuestPanelItem) {
  if (item.kind === 'guide') {
    return { bg: C.chipGuide, text: C.chipTextLight }
  }

  switch (item.status) {
    case 'claimable':
      return { bg: C.chipClaim, text: C.chipTextDark }
    case 'completed':
      return { bg: C.chipDone, text: C.chipTextLight }
    case 'available':
      return { bg: C.chipAvailable, text: C.chipTextLight }
    case 'active':
    default:
      return { bg: C.chipActive, text: C.chipTextLight }
  }
}

function getStatusNote(item: QuestPanelItem): string {
  if (item.kind === 'guide') return item.note

  switch (item.status) {
    case 'claimable':
      return 'Return to this NPC to claim the reward.'
    case 'completed':
      return 'Reward already collected.'
    case 'available':
      return 'Talk to this NPC to accept the quest.'
    case 'active':
    default:
      return 'Keep progressing to complete this quest.'
  }
}

function estimateWrappedLines(text: string, charsPerLine: number): number {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length === 0) return 1
  return Math.max(1, Math.ceil(compact.length / charsPerLine))
}

function getQuestDescriptionBlockHeight(text: string): number {
  const mobile = isMobile()
  const lines = estimateWrappedLines(text, mobile ? 46 : 84)
  return lines * (mobile ? ss(20) : ss(18))
}

function getQuestNoteBlockHeight(text: string): number {
  const mobile = isMobile()
  const lines = estimateWrappedLines(text, mobile ? 42 : 72)
  return lines * (mobile ? ss(19) : ss(17))
}

function getRowHeight(item: QuestPanelItem, expanded: boolean): number {
  const collapsed = isMobile() ? ss(74) : ss(76)
  if (!expanded) return collapsed

  if (item.kind === 'guide') {
    return collapsed + (isMobile() ? ss(94 + item.entries.length * 26) : ss(78 + item.entries.length * 22))
  }

  const note = getStatusNote(item)
  return collapsed
    + (isMobile() ? ss(84) : ss(72))
    + getQuestDescriptionBlockHeight(item.description)
    + getQuestNoteBlockHeight(note)
}

function getProgressPct(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)))
}

function getChipWidth(text: string): number {
  return Math.max(ss(88), Math.min(ss(132), ss(34) + text.length * ss(11)))
}

function getTitleFont(title: string): number {
  if (isMobile()) {
    if (title.length > 24) return ss(14)
    if (title.length > 18) return ss(16)
    return ss(18)
  }
  if (title.length > 28) return ss(15)
  if (title.length > 20) return ss(17)
  return ss(19)
}

function getMobilePageTitleFont(title: string): number {
  if (title.length > 24) return qmf(ss(22))
  if (title.length > 18) return qmf(ss(24))
  return qmf(ss(27))
}

function getMobileChecklistEntryHeight(label: string): number {
  return Math.max(qmf(ss(28)), estimateWrappedLines(label, 30) * qmf(ss(24)))
}

function ChecklistBullet({ status }: { status: ChecklistStatus }) {
  const bg = status === 'done' ? C.green : { r: 0, g: 0, b: 0, a: 0 }
  const border = status === 'done' ? C.green : status === 'current' ? C.gold : C.panelTextMuted

  return (
    <UiEntity
      uiTransform={{
        width: ss(16),
        height: ss(16),
        borderRadius: ss(8),
        borderWidth: ss(2),
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        margin: { right: ss(9) },
        flexShrink: 0,
      }}
      uiBackground={status === 'done' ? { color: bg } : undefined}
    />
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = getProgressPct(current, total)

  return (
    <UiEntity
      uiTransform={{
        flex: 1,
        height: ss(12),
        borderRadius: ss(8),
        overflow: 'hidden',
      }}
      uiBackground={{ color: C.barTrack }}
    >
      <UiEntity
        uiTransform={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: ss(8),
        }}
        uiBackground={{ color: C.barFill }}
      />
    </UiEntity>
  )
}

function GuideExpandedContent({ item }: { item: GuideItem }) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        margin: { top: ss(10) },
        padding: { top: ss(10) },
        borderWidth: { top: 1 },
        borderColor: C.creamInnerLine,
      }}
    >
      {item.entries.map((entry, index) => (
        <UiEntity
          key={`${item.key}-entry-${index}`}
          uiTransform={{
            width: '100%',
            minHeight: ss(22),
            flexDirection: 'row',
            alignItems: 'center',
            margin: { bottom: index === item.entries.length - 1 ? 0 : ss(6) },
          }}
        >
          <ChecklistBullet status={entry.status} />
          <Label
            value={entry.label}
            fontSize={isMobile() ? ss(16) : ss(17)}
            color={
              entry.status === 'done'
                ? C.panelText
                : entry.status === 'current'
                  ? C.panelText
                  : C.panelTextSoft
            }
            textAlign="middle-left"
            textWrap="nowrap"
            uiTransform={{ flex: 1, height: ss(22) }}
          />
        </UiEntity>
      ))}
    </UiEntity>
  )
}

function QuestExpandedContent({ item }: { item: QuestItem }) {
  const descriptionHeight = getQuestDescriptionBlockHeight(item.description)
  const noteText = getStatusNote(item)
  const noteHeight = getQuestNoteBlockHeight(noteText)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        margin: { top: ss(12) },
        padding: {
          top: ss(12),
          left: ss(6),
          right: ss(6),
          bottom: ss(8),
        },
        borderWidth: { top: 1 },
        borderColor: C.creamInnerLine,
      }}
    >
      <UiEntity uiTransform={{ width: '100%', height: descriptionHeight, margin: { bottom: ss(16) } }}>
        <Label
          value={item.description}
          fontSize={isMobile() ? ss(17) : ss(18)}
          color={C.panelTextSoft}
          textAlign="top-left"
          textWrap="wrap"
          uiTransform={{ width: '100%', height: descriptionHeight }}
        />
      </UiEntity>

      <UiEntity uiTransform={{ width: '100%', height: noteHeight, margin: { bottom: ss(20) } }}>
        <Label
          value={noteText}
          fontSize={isMobile() ? ss(16) : ss(17)}
          color={C.panelTextMuted}
          textAlign="top-left"
          textWrap="wrap"
          uiTransform={{ width: '100%', height: noteHeight }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          margin: { top: ss(10) },
        }}
      >
        <Label
          value={`<b>${item.rewardCoins}</b> coins`}
          fontSize={isMobile() ? ss(21) : ss(22)}
          color={C.gold}
          textAlign="middle-center"
          uiTransform={{ margin: { right: ss(24) } }}
        />
        <Label
          value={`<b>+${item.rewardXp}</b> XP`}
          fontSize={isMobile() ? ss(21) : ss(22)}
          color={C.panelText}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  )
}

function QuestAccordionRow({
  item,
  expanded,
  onToggle,
}: {
  item: QuestPanelItem
  expanded: boolean
  onToggle: () => void
}) {
  const rowHeight = getRowHeight(item, expanded)
  const chipText = getStatusText(item)
  const chip = getStatusChipColors(item)
  const mobile = isMobile()
  const chevron = expanded ? '▲' : '▼'

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: rowHeight,
        flexDirection: 'column',
        padding: {
          top: mobile ? ss(10) : ss(9),
          bottom: mobile ? ss(10) : ss(9),
          left: mobile ? ss(16) : ss(18),
          right: mobile ? ss(16) : ss(18),
        },
        margin: { bottom: ss(8) },
        borderRadius: ss(18),
        borderWidth: ss(3),
        borderColor: C.creamLine,
      }}
      uiBackground={{ color: C.cream }}
      onMouseDown={() => {
        playSound('buttonclick')
        onToggle()
      }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          positionType: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: ss(34),
        }}
      >
        <UiEntity
          uiTransform={{
            width: mobile ? ss(38) : ss(40),
            height: mobile ? ss(38) : ss(40),
            borderRadius: ss(14),
            overflow: 'hidden',
            flexShrink: 0,
          }}
          uiBackground={{
            texture: { src: item.avatarSrc, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        />

        <UiEntity
          uiTransform={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            margin: { left: ss(12), right: mobile ? ss(110) : ss(118) },
          }}
        >
          <Label
            value={`<b>${item.title}</b>`}
            fontSize={getTitleFont(item.title)}
            color={C.panelText}
            textAlign="middle-left"
            textWrap="nowrap"
            uiTransform={{ margin: { right: ss(8) } }}
          />

          <Label
            value={item.ownerLabel}
            fontSize={mobile ? ss(12) : ss(14)}
            color={C.panelTextMuted}
            textAlign="middle-left"
            textWrap="nowrap"
            uiTransform={{ margin: { right: ss(8) } }}
          />

          <UiEntity
            uiTransform={{
              width: getChipWidth(chipText) - ss(18),
              height: mobile ? ss(24) : ss(22),
              borderRadius: ss(12),
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            uiBackground={{ color: chip.bg }}
          >
            <Label
              value={`<b>${chipText}</b>`}
              fontSize={mobile ? ss(14) : ss(15)}
              color={chip.text}
              textAlign="middle-center"
            />
          </UiEntity>
        </UiEntity>

        <UiEntity
          uiTransform={{
            width: mobile ? ss(92) : ss(98),
            height: '100%',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: { right: mobile ? ss(34) : ss(38) },
            flexShrink: 0,
          }}
        >
          <Label
            value={`<b>${item.current}</b> / ${item.total}`}
            fontSize={mobile ? ss(15) : ss(16)}
            color={item.current >= item.total ? C.green : C.panelText}
            textAlign="middle-right"
            textWrap="nowrap"
            uiTransform={{ flexShrink: 0 }}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: mobile ? ss(0) : ss(2), top: 0 },
            width: mobile ? ss(30) : ss(28),
            height: ss(34),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label
            value={chevron}
            fontSize={mobile ? ss(42) : ss(36)}
            color={C.panelTextMuted}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      <UiEntity uiTransform={{ width: '100%', margin: { top: ss(7) } }}>
        <ProgressBar current={item.current} total={item.total} />
      </UiEntity>

      {expanded && (
        <UiEntity uiTransform={{ width: '100%', overflow: 'hidden' }}>
          {item.kind === 'guide'
            ? <GuideExpandedContent item={item} />
            : <QuestExpandedContent item={item} />}
        </UiEntity>
      )}
    </UiEntity>
  )
}

function MobileQuestDetailCard({ item }: { item: QuestPanelItem }) {
  const chipText = getStatusText(item)
  const chip = getStatusChipColors(item)
  const countColor = item.kind === 'quest' && item.current >= item.total ? C.green : C.panelText
  const mobileCountText = `${item.current} / ${item.total}`

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        padding: {
          top: ss(16),
          bottom: ss(18),
          left: ss(20),
          right: ss(20),
        },
        borderRadius: ss(20),
        borderWidth: ss(3),
        borderColor: C.creamLine,
      }}
      uiBackground={{ color: C.cream }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          margin: { bottom: ss(14) },
        }}
      >
        <UiEntity
          uiTransform={{
            width: ss(56),
            height: ss(56),
            borderRadius: ss(17),
            overflow: 'hidden',
            margin: { bottom: ss(10) },
          }}
          uiBackground={{
            texture: { src: item.avatarSrc, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        />

        <Label
          value={`<b>${item.title}</b>`}
          fontSize={getMobilePageTitleFont(item.title)}
          color={C.panelText}
          textAlign="middle-center"
          textWrap="wrap"
          uiTransform={{ width: '100%', margin: { bottom: ss(4) } }}
        />

        <Label
          value={item.ownerLabel}
          fontSize={qmf(ss(18))}
          color={C.panelTextMuted}
          textAlign="middle-center"
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          margin: { bottom: ss(16) },
        }}
      >
        <UiEntity
          uiTransform={{
            minWidth: ss(102),
            height: ss(38),
            padding: { left: ss(16), right: ss(16) },
            borderRadius: ss(18),
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            margin: { right: ss(14) },
          }}
          uiBackground={{ color: chip.bg }}
        >
          <Label
            value={`<b>${chipText}</b>`}
            fontSize={qmf(ss(18))}
            color={chip.text}
            textAlign="middle-center"
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            minWidth: ss(86),
            height: ss(38),
            padding: { left: ss(14), right: ss(14) },
            borderRadius: ss(18),
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
          }}
          uiBackground={{ color: C.paginationChipBg }}
        >
          <Label
            value={`<b>${mobileCountText}</b>`}
            fontSize={qmf(ss(18))}
            color={countColor === C.green ? C.green : C.paginationChipTx}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      <UiEntity uiTransform={{ width: '100%', margin: { bottom: ss(18) } }}>
        <ProgressBar current={item.current} total={item.total} />
      </UiEntity>

      {item.kind === 'guide' ? (
        <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
          {item.entries.map((entry, index) => {
            const rowHeight = getMobileChecklistEntryHeight(entry.label)
            return (
              <UiEntity
                key={`${item.key}-mobile-entry-${index}`}
                uiTransform={{
                  width: '100%',
                  minHeight: rowHeight,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  margin: { bottom: index === item.entries.length - 1 ? 0 : ss(9) },
                }}
              >
                <UiEntity uiTransform={{ margin: { top: ss(4) } }}>
                  <ChecklistBullet status={entry.status} />
                </UiEntity>
                <Label
                  value={entry.label}
                  fontSize={qmf(ss(21))}
                  color={
                    entry.status === 'done'
                      ? C.panelText
                      : entry.status === 'current'
                        ? C.panelText
                        : C.panelTextSoft
                  }
                  textAlign="top-left"
                  textWrap="wrap"
                  uiTransform={{ flex: 1, height: rowHeight }}
                />
              </UiEntity>
            )
          })}
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
          {(() => {
            const descriptionHeight = Math.max(ss(74), estimateWrappedLines(item.description, 34) * qmf(ss(24)))
            const noteText = getStatusNote(item)
            const noteHeight = Math.max(ss(48), estimateWrappedLines(noteText, 32) * qmf(ss(22)))

            return (
              <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
                <UiEntity uiTransform={{ width: '100%', height: descriptionHeight, margin: { bottom: ss(16) } }}>
                  <Label
                    value={item.description}
                    fontSize={qmf(ss(20))}
                    color={C.panelTextSoft}
                    textAlign="top-left"
                    textWrap="wrap"
                    uiTransform={{ width: '100%', height: descriptionHeight }}
                  />
                </UiEntity>

                <UiEntity uiTransform={{ width: '100%', height: noteHeight, margin: { bottom: ss(20) } }}>
                  <Label
                    value={noteText}
                    fontSize={qmf(ss(18))}
                    color={C.panelTextMuted}
                    textAlign="top-left"
                    textWrap="wrap"
                    uiTransform={{ width: '100%', height: noteHeight }}
                  />
                </UiEntity>

                <UiEntity
                  uiTransform={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Label
                    value={`<b>${item.rewardCoins}</b> coins`}
                    fontSize={qmf(ss(24))}
                    color={C.gold}
                    textAlign="middle-center"
                    uiTransform={{ margin: { right: ss(28) } }}
                  />
                  <Label
                    value={`<b>+${item.rewardXp}</b> XP`}
                    fontSize={qmf(ss(24))}
                    color={C.panelText}
                    textAlign="middle-center"
                  />
                </UiEntity>
              </UiEntity>
            )
          })()}
        </UiEntity>
      )}
    </UiEntity>
  )
}

function MobileQuestPager({ items }: { items: QuestPanelItem[] }) {
  const lastPage = Math.max(0, items.length - 1)
  if (mobileQuestPage.value > lastPage) mobileQuestPage.value = lastPage

  const page = mobileQuestPage.value
  const item = items[page]
  const paginationHeight = SHARED_PAGINATION_HEIGHT_MOBILE

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'relative',
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: 0, top: 0, right: 0, bottom: paginationHeight + ss(10) },
          width: '100%',
          flexDirection: 'column',
          overflow: 'scroll',
        }}
      >
        <MobileQuestDetailCard item={item} />
      </UiEntity>

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: 0, right: 0, bottom: 0 },
          width: '100%',
          height: paginationHeight,
        }}
      >
        <SharedPaginationBar
          id="quest-mobile"
          page={page}
          lastPage={lastPage}
          onPrev={() => { mobileQuestPage.value -= 1 }}
          onNext={() => { mobileQuestPage.value += 1 }}
          mode="mobile"
          marginTop={0}
          buttonTextureSrc={MOBILE_PAGINATION_BUTTON_IMG}
          buttonDisabledTextureSrc={MOBILE_PAGINATION_BUTTON_IMG}
          buttonAspect={MOBILE_PAGINATION_BUTTON_ASPECT}
          buttonLabelTopOffset={-ss(1)}
          pageTextTopOffset={-ss(1)}
          buttonLabelColor={C.paginationText}
          buttonLabelDisabledColor={C.paginationDisabled}
          pageChipBgColor={C.paginationChipBg}
          pageChipBorderColor={C.paginationChipBd}
          pageChipTextColor={C.paginationChipTx}
          labelFontSize={qmf(21)}
          pageFontSize={qmf(20)}
        />
      </UiEntity>
    </UiEntity>
  )
}

function QuestPanelFrame({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) {
  const mobile = isMobile()

  if (!mobile) {
    return (
      <RevampPanelFrame name="quest" onClose={onClose}>
        {children}
      </RevampPanelFrame>
    )
  }

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
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          pointerFilter: 'block',
        }}
      />

      <UiEntity
        uiTransform={{
          width: QUEST_MOBILE_PANEL_W,
          height: QUEST_MOBILE_PANEL_H,
          margin: { top: QUEST_MOBILE_PANEL_TOP },
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: REVAMP_BG_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <RevampTitlePlaque name="quest" panelWidth={QUEST_MOBILE_PANEL_W} scale={QUEST_MOBILE_FRAME_SCALE} />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: QUEST_MOBILE_CONTENT_LEFT, top: QUEST_MOBILE_CONTENT_TOP },
            width: QUEST_MOBILE_CONTENT_W,
            height: QUEST_MOBILE_CONTENT_H,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        <RevampCloseButton
          onClose={onClose}
          size={QUEST_MOBILE_CLOSE_SIZE}
          right={QUEST_MOBILE_CLOSE_RIGHT}
          top={QUEST_MOBILE_CLOSE_TOP}
          hitPad={QUEST_MOBILE_CLOSE_HIT_PAD}
        />
      </UiEntity>
    </UiEntity>
  )
}

export const QuestPanel = () => {
  const mobile = isMobile()
  const items = buildPanelItems()
  if (!mobile && expandedQuestKey.value !== '' && !items.some((item) => item.key === expandedQuestKey.value)) {
    expandedQuestKey.value = ''
  }

  return (
    <QuestPanelFrame onClose={() => {
      playSound('buttonclick')
      playerState.activeMenu = 'none'
    }}>
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          padding: {
            top: mobile ? ss(10) : ss(8),
            left: mobile ? ss(2) : 0,
            right: mobile ? ss(2) : 0,
          },
        }}
      >
        {items.length === 0 ? (
          <UiEntity
            uiTransform={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Label
              value="No quests available right now"
              fontSize={mobile ? qmf(ss(30)) : ss(26)}
              color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
              textAlign="middle-center"
            />
            <Label
              value="Talk to visitors and progress through the farm to unlock more."
              fontSize={mobile ? qmf(ss(20)) : ss(19)}
              color={C.panelTextMuted}
              textAlign="middle-center"
              uiTransform={{ margin: { top: ss(10) } }}
            />
          </UiEntity>
        ) : mobile ? (
          <MobileQuestPager items={items} />
        ) : (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              flexDirection: 'column',
              overflow: 'scroll',
            }}
          >
            {items.map((item) => (
              <UiEntity key={item.key}>
                <QuestAccordionRow
                  item={item}
                  expanded={expandedQuestKey.value === item.key}
                  onToggle={() => {
                    expandedQuestKey.value = expandedQuestKey.value === item.key ? '' : item.key
                  }}
                />
              </UiEntity>
            ))}
          </UiEntity>
        )}
      </UiEntity>
    </QuestPanelFrame>
  )
}
