import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { QUEST_DEFINITIONS } from '../data/questData'
import { questProgressMap } from '../game/questState'
import { playerState } from '../game/gameState'
import { tutorialState, TUTORIAL_MILESTONES, getTutorialMilestoneStatus } from '../game/tutorialState'
import {
  progressionEventState,
  PROGRESSION_MILESTONES,
  getProgressionMilestoneStatus,
} from '../game/progressionEventState'
import { PanelShell, C } from './PanelShell'
import { NPC_ROSTER } from '../data/npcData'
import { MAYOR_DEF } from '../data/npcData'
import {
  CROP_HARVEST_IMAGES,
  COINS_IMAGE,
  SOIL_ICON,
  WATERINGCAN_ICON,
  BOX_CROPS_ICON,
  SHOPINGCART_ICON,
} from '../data/imagePaths'

const NPC_HEAD: Record<string, string> = {}
for (const npc of NPC_ROSTER) NPC_HEAD[npc.id] = npc.headImage

// ── Tutorial progress card ────────────────────────────────────────────────────
const TutorialQuestCard = () => {
  const doneCount = TUTORIAL_MILESTONES.filter(
    (m) => getTutorialMilestoneStatus(m) === 'done'
  ).length

  return (
    <UiEntity
      uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 15 } }}
      uiBackground={{ color: { r: 0.10, g: 0.08, b: 0.18, a: 1 } }}
    >
      {/* Left accent — purple/tutorial colour */}
      <UiEntity
        uiTransform={{ width: 6, alignSelf: 'stretch', flexShrink: 0 }}
        uiBackground={{ color: { r: 0.55, g: 0.35, b: 1.0, a: 1 } }}
      />

      {/* Mayor portrait */}
      <UiEntity
        uiTransform={{ width: 80, height: 80, margin: { top: 18, bottom: 18, left: 18 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: MAYOR_DEF.headImage, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />

      {/* Content */}
      <UiEntity
        uiTransform={{
          flex: 1, flexDirection: 'column',
          padding: { top: 14, bottom: 14, left: 18, right: 15 },
        }}
      >
        {/* Header row */}
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 10 } }}>
          <Label value="Mayor Chen" fontSize={16} color={{ r: 0.7, g: 0.55, b: 1.0, a: 1 }} />
          <Label
            value={`  ${doneCount} / ${TUTORIAL_MILESTONES.length}`}
            fontSize={15}
            color={C.textMute}
          />
        </UiEntity>
        <Label
          value="Tutorial"
          fontSize={21}
          color={C.textMain}
          uiTransform={{ margin: { bottom: 12 } }}
        />

        {/* Checklist */}
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          {TUTORIAL_MILESTONES.map((m) => {
            const status = getTutorialMilestoneStatus(m)
            const icon   = status === 'done' ? '✓' : status === 'current' ? '▶' : '○'
            const color  =
              status === 'done'    ? C.green :
              status === 'current' ? C.gold  :
              C.textMute
            return (
              <UiEntity
                key={m.label}
                uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 5 } }}
              >
                <Label value={icon}       fontSize={15} color={color} uiTransform={{ width: 22 }} />
                <Label value={m.label}    fontSize={16} color={color} />
              </UiEntity>
            )
          })}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ── Fertilizer tutorial progress card ────────────────────────────────────────
const ProgressionEventQuestCard = () => {
  const doneCount = PROGRESSION_MILESTONES.filter(
    (m) => getProgressionMilestoneStatus(m) === 'done'
  ).length

  return (
    <UiEntity
      uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 15 } }}
      uiBackground={{ color: { r: 0.06, g: 0.12, b: 0.10, a: 1 } }}
    >
      {/* Left accent — green */}
      <UiEntity
        uiTransform={{ width: 6, alignSelf: 'stretch', flexShrink: 0 }}
        uiBackground={{ color: { r: 0.25, g: 0.75, b: 0.35, a: 1 } }}
      />

      {/* Mayor portrait */}
      <UiEntity
        uiTransform={{ width: 80, height: 80, margin: { top: 18, bottom: 18, left: 18 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: MAYOR_DEF.headImage, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />

      {/* Content */}
      <UiEntity
        uiTransform={{
          flex: 1, flexDirection: 'column',
          padding: { top: 14, bottom: 14, left: 18, right: 15 },
        }}
      >
        {/* Header row */}
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 10 } }}>
          <Label value="Mayor Chen" fontSize={16} color={{ r: 0.35, g: 0.85, b: 0.5, a: 1 }} />
          <Label
            value={`  ${doneCount} / ${PROGRESSION_MILESTONES.length}`}
            fontSize={15}
            color={C.textMute}
          />
        </UiEntity>
        <Label
          value="Fertilizer Tutorial"
          fontSize={21}
          color={C.textMain}
          uiTransform={{ margin: { bottom: 12 } }}
        />

        {/* Checklist */}
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          {PROGRESSION_MILESTONES.map((m) => {
            const status = getProgressionMilestoneStatus(m)
            const icon   = status === 'done' ? '✓' : status === 'current' ? '▶' : '○'
            const color  =
              status === 'done'    ? C.green :
              status === 'current' ? C.gold  :
              C.textMute
            return (
              <UiEntity
                key={m.label}
                uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 5 } }}
              >
                <Label value={icon}    fontSize={15} color={color} uiTransform={{ width: 22 }} />
                <Label value={m.label} fontSize={16} color={color} />
              </UiEntity>
            )
          })}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export const QuestPanel = () => {
  const visible = QUEST_DEFINITIONS.filter((d) => {
    const qp = questProgressMap.get(d.id)
    return qp && qp.status !== 'available' && qp.status !== 'completed'
  })

  return (
    <PanelShell title="Quests" onClose={() => { playerState.activeMenu = 'none' }}>
      {/* Tutorial progress card — always shown while tutorial is active */}
      {tutorialState.active && <TutorialQuestCard />}

      {/* Fertilizer tutorial card — shown during Level 5 progression event */}
      {progressionEventState.active && <ProgressionEventQuestCard />}

      {visible.length === 0 && !tutorialState.active && !progressionEventState.active ? (
        <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Label value="No active quests" fontSize={27} color={C.textMute} textAlign="middle-center" />
          <Label
            value="Talk to villagers to receive quests!"
            fontSize={21}
            color={{ r: 0.4, g: 0.4, b: 0.4, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 15 } }}
          />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          {visible.map((def) => {
            const qp       = questProgressMap.get(def.id)!
            const pct      = Math.min(100, Math.floor((qp.current / def.target) * 100))
            const isDone   = qp.status === 'completed'
            const isClaim  = qp.status === 'claimable'
            const isActive = qp.status === 'active'

            const statusText  = isDone ? 'Completed ✓' : isClaim ? 'Ready to Claim!' : ''
            const statusColor = isDone ? C.green : isClaim ? C.gold : C.blue

            const rowBg =
              isClaim ? { r: 0.20, g: 0.15, b: 0.02, a: 1 } :
              isDone  ? { r: 0.07, g: 0.14, b: 0.07, a: 1 } :
                        C.rowBg

            const accentColor = isClaim ? C.gold : isDone ? C.green : C.blue

            const npcHead = NPC_HEAD[def.id] ?? ''

            let questIcon = BOX_CROPS_ICON
            if (def.type === 'harvest_crop' && def.cropType !== null) {
              questIcon = CROP_HARVEST_IMAGES[def.cropType]
            } else if (def.type === 'water_total') {
              questIcon = WATERINGCAN_ICON
            } else if (def.type === 'plant_total') {
              questIcon = SOIL_ICON
            } else if (def.type === 'sell_total') {
              questIcon = SHOPINGCART_ICON
            }

            return (
              <UiEntity
                key={def.id}
                uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 15 } }}
                uiBackground={{ color: rowBg }}
              >
                {/* Left accent bar */}
                <UiEntity
                  uiTransform={{ width: 6, alignSelf: 'stretch', flexShrink: 0 }}
                  uiBackground={{ color: accentColor }}
                />

                {/* NPC portrait */}
                <UiEntity
                  uiTransform={{ width: 96, height: 96, margin: { top: 18, bottom: 18, left: 21 }, flexShrink: 0 }}
                  uiBackground={{ texture: { src: npcHead, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />

                {/* Quest info */}
                <UiEntity
                  uiTransform={{
                    flex: 1, flexDirection: 'column',
                    padding: { top: 18, bottom: 18, left: 21, right: 15 },
                  }}
                >
                  <Label value={def.npcName} fontSize={17} color={C.orange} />
                  <Label
                    value={def.title}
                    fontSize={22}
                    color={C.textMain}
                    uiTransform={{ margin: { top: 5, bottom: 12 } }}
                  />

                  {/* Progress bar */}
                  {isActive && (
                    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
                      <UiEntity
                        uiTransform={{ width: '100%', height: 12, margin: { bottom: 8 } }}
                        uiBackground={{ color: { r: 0.12, g: 0.10, b: 0.07, a: 1 } }}
                      >
                        <UiEntity
                          uiTransform={{ width: `${pct}%`, height: '100%' }}
                          uiBackground={{ color: C.blue }}
                        />
                      </UiEntity>
                      <Label value={`${qp.current} / ${def.target}`} fontSize={17} color={C.blue} />
                    </UiEntity>
                  )}

                  {/* Claimable / completed badge */}
                  {!isActive && (
                    <Label value={statusText} fontSize={20} color={statusColor} />
                  )}

                  {/* Reward row */}
                  {!isDone && (
                    <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 12 } }}>
                      <UiEntity
                        uiTransform={{ width: 27, height: 27, margin: { right: 8 }, flexShrink: 0 }}
                        uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                      />
                      <Label value={`${def.rewardCoins}`} fontSize={20} color={C.gold} />
                      <Label
                        value={`+ ${def.rewardXp} XP`}
                        fontSize={18}
                        color={C.textMute}
                        uiTransform={{ margin: { left: 18 } }}
                      />
                    </UiEntity>
                  )}
                </UiEntity>

                {/* Quest type / crop icon */}
                <UiEntity
                  uiTransform={{ width: 84, height: 84, margin: { top: 21, bottom: 21, right: 24 }, flexShrink: 0 }}
                  uiBackground={{ texture: { src: questIcon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />
              </UiEntity>
            )
          })}
        </UiEntity>
      )}
    </PanelShell>
  )
}
