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

// ─── Atlas frame ─────────────────────────────────────────────────────────────
const QUEST_ATLAS   = 'assets/images/ui_loading/quest_atlas.png'
const ATLAS_SIZE    = 1024
const BG_RECT       = { x: 57, y: 15, w: 909, h: 678 } as const
const UI_SCALE      = 0.8
const ss            = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1189)
const PANEL_H          = Math.round((PANEL_W * BG_RECT.h) / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(120)
const CONTENT_LEFT     = ss(72)
const CONTENT_RIGHT    = ss(72)
const CONTENT_TOP      = ss(100)
const CONTENT_BOTTOM   = ss(68)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)

// ─── Palette ──────────────────────────────────────────────────────────────────
const CARD_FILL      = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT      = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const TRACK_COLOR    = { r: 0.55, g: 0.38, b: 0.15, a: 0.6 }
const COIN_GOLD      = { r: 0.92, g: 0.72, b: 0.10, a: 1 }
const REWARD_MUTE    = { r: 0.50, g: 0.32, b: 0.10, a: 1 }
const FRAME_THICKNESS = 4

const CARD_BORDER    = { r: 0.92, g: 0.72, b: 0.10, a: 0.95 }
const COL_DONE       = { r: 0.30, g: 0.78, b: 0.30, a: 0.95 }

type RGBA = { r: number; g: number; b: number; a: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── QuestCard wrapper ────────────────────────────────────────────────────────
const QuestCard = ({
  borderColor,
  children,
}: {
  key?: string
  borderColor: RGBA
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        width: '100%',
        margin: { bottom: ss(16) },
        borderWidth: 3,
        borderColor,
        borderRadius: 12,
        overflow: 'hidden',
      }}
      uiBackground={{ color: CARD_FILL }}
    >
      {mobile && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width: '100%', height: '100%' }}>
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: CONTENT_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, bottom: 0 }, width: CONTENT_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: FRAME_THICKNESS, height: '100%' }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { right: 0, top: 0 },   width: FRAME_THICKNESS, height: '100%' }} uiBackground={{ color: borderColor }} />
        </UiEntity>
      )}
      {children}
    </UiEntity>
  )
}

// ─── Milestone checklist ──────────────────────────────────────────────────────
const Checklist = ({
  milestones,
  getStatus,
}: {
  milestones: { label: string }[]
  getStatus: (m: any) => 'done' | 'current' | string
}) => (
  <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
    {milestones.map((m) => {
      const status = getStatus(m)
      const icon  = status === 'done' ? '✓' : status === 'current' ? '▶' : '○'
      const color = status === 'done' ? COL_DONE : status === 'current' ? COIN_GOLD : CARD_TEXT_MUTE
      return (
        <UiEntity
          key={m.label}
          uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(9) } }}
        >
          <Label value={icon}    fontSize={ss(21)} color={color} uiTransform={{ width: ss(26) }} />
          <Label value={m.label} fontSize={ss(21)} color={color} />
        </UiEntity>
      )
    })}
  </UiEntity>
)

// ─── Tutorial-style cards (Mayor + milestone list) ────────────────────────────
const MilestoneCard = ({
  title,
  accent,
  milestones,
  getStatus,
}: {
  key?: string
  title: string
  accent: RGBA
  milestones: { label: string }[]
  getStatus: (m: any) => string
}) => {
  const done = milestones.filter((m) => getStatus(m) === 'done').length
  return (
    <QuestCard borderColor={accent}>
      <UiEntity
        uiTransform={{ width: ss(80), height: ss(80), margin: { top: ss(18), bottom: ss(18), left: ss(18) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: MAYOR_DEF.headImage, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', padding: { top: ss(16), bottom: ss(16), left: ss(18), right: ss(16) } }}>
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(12) } }}>
          <Label value={title}                            fontSize={ss(24)} color={CARD_TEXT} />
          <Label value={`  ${done}/${milestones.length}`} fontSize={ss(20)} color={CARD_TEXT_MUTE} />
        </UiEntity>
        <Checklist milestones={milestones} getStatus={getStatus} />
      </UiEntity>
    </QuestCard>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ pct, fill }: { pct: number; fill: RGBA }) => (
  <UiEntity
    uiTransform={{ width: '100%', height: ss(12), borderRadius: ss(6), margin: { bottom: ss(6) }, overflow: 'hidden' }}
    uiBackground={{ color: TRACK_COLOR }}
  >
    <UiEntity
      uiTransform={{ width: `${pct}%`, height: '100%', borderRadius: ss(6) }}
      uiBackground={{ color: fill }}
    />
  </UiEntity>
)

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
          height: PANEL_H - CONTENT_TOP - CONTENT_BOTTOM,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </UiEntity>
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { right: CLOSE_RIGHT, top: CLOSE_TOP }, width: CLOSE_SIZE, height: CLOSE_SIZE }}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  </UiEntity>
)

// ─── Main panel ───────────────────────────────────────────────────────────────
export const QuestPanel = () => {
  const visible = QUEST_DEFINITIONS.filter((d) => {
    const qp = questProgressMap.get(d.id)
    return qp && qp.status !== 'available' && qp.status !== 'completed'
  })

  const hasAnything =
    tutorialState.active ||
    progressionEventState.active ||
    animalTutorialState.chickenActive ||
    animalTutorialState.pigActive ||
    visible.length > 0

  return (
    <QuestPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      {!hasAnything && (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Label value="No active quests" fontSize={ss(27)} color={CARD_TEXT_MUTE} textAlign="middle-center" />
          <Label value="Talk to villagers to receive quests!" fontSize={ss(20)} color={CARD_TEXT_MUTE} textAlign="middle-center"
            uiTransform={{ margin: { top: ss(12) } }} />
        </UiEntity>
      )}

      {tutorialState.active && (
        <MilestoneCard key="tutorial" title="Tutorial" accent={CARD_BORDER}
          milestones={TUTORIAL_MILESTONES} getStatus={getTutorialMilestoneStatus} />
      )}

      {progressionEventState.active && (
        <MilestoneCard key="fert" title="Fertilizer Tutorial" accent={CARD_BORDER}
          milestones={PROGRESSION_MILESTONES} getStatus={getProgressionMilestoneStatus} />
      )}

      {animalTutorialState.chickenActive && (
        <MilestoneCard key="chicken" title="Chicken Tutorial" accent={CARD_BORDER}
          milestones={CHICKEN_MILESTONES} getStatus={getChickenMilestoneStatus} />
      )}

      {animalTutorialState.pigActive && (
        <MilestoneCard key="pig" title="Pig Tutorial" accent={CARD_BORDER}
          milestones={PIG_MILESTONES} getStatus={getPigMilestoneStatus} />
      )}

      {visible.map((def) => {
        const qp       = questProgressMap.get(def.id)!
        const pct      = Math.min(100, Math.floor((qp.current / def.target) * 100))
        const isDone   = qp.status === 'completed'
        const isActive = qp.status === 'active'
        const border   = CARD_BORDER

        let questIcon = BOX_CROPS_ICON
        if (def.type === 'harvest_crop' && def.cropType !== null) questIcon = CROP_HARVEST_IMAGES[def.cropType]
        else if (def.type === 'water_total') questIcon = WATERINGCAN_ICON
        else if (def.type === 'plant_total') questIcon = SOIL_ICON
        else if (def.type === 'sell_total') questIcon = SHOPINGCART_ICON

        return (
          <QuestCard key={def.id} borderColor={border}>
            {/* NPC portrait */}
            <UiEntity
              uiTransform={{ width: ss(86), height: ss(86), margin: { top: ss(18), bottom: ss(18), left: ss(18) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: NPC_HEAD[def.id] ?? '', wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />

            {/* Content */}
            <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', padding: { top: ss(16), bottom: ss(16), left: ss(18), right: ss(14) } }}>
              <Label value={def.npcName} fontSize={ss(19)} color={REWARD_MUTE} uiTransform={{ margin: { bottom: ss(5) } }} />
              <Label value={def.title}   fontSize={ss(25)} color={CARD_TEXT}   uiTransform={{ margin: { bottom: ss(12) } }} />

              {isActive && (
                <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
                  <ProgressBar pct={pct} fill={CARD_BORDER} />
                  <Label value={`${qp.current} / ${def.target}`} fontSize={ss(19)} color={CARD_TEXT_MUTE} />
                </UiEntity>
              )}
              {!isActive && (
                <Label value={isDone ? 'Completed ✓' : 'Ready to Claim!'} fontSize={ss(22)}
                  color={isDone ? COL_DONE : COIN_GOLD} />
              )}
              {!isDone && (
                <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: ss(12) } }}>
                  <UiEntity
                    uiTransform={{ width: ss(24), height: ss(24), margin: { right: ss(7) }, flexShrink: 0 }}
                    uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                  />
                  <Label value={`${def.rewardCoins}`}     fontSize={ss(22)} color={COIN_GOLD} />
                  <Label value={`  +${def.rewardXp} XP`}  fontSize={ss(20)} color={CARD_TEXT_MUTE} />
                </UiEntity>
              )}
            </UiEntity>

            {/* Quest icon */}
            <UiEntity
              uiTransform={{ width: ss(78), height: ss(78), margin: { top: ss(18), bottom: ss(18), right: ss(18) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
          </QuestCard>
        )
      })}
    </QuestPanelFrame>
  )
}
