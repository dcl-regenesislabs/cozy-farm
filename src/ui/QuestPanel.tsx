import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { QUEST_DEFINITIONS } from '../data/questData'
import { questProgressMap } from '../game/questState'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'
import { NPC_ROSTER } from '../data/npcData'
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

export const QuestPanel = () => {
  const visible = QUEST_DEFINITIONS.filter((d) => {
    const qp = questProgressMap.get(d.id)
    return qp && qp.status !== 'available'
  })

  return (
    <PanelShell title="Quests" onClose={() => { playerState.activeMenu = 'none' }}>
      {visible.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Label value="No active quests" fontSize={18} color={C.textMute} textAlign="middle-center" />
          <Label
            value="Talk to villagers to receive quests!"
            fontSize={14}
            color={{ r: 0.4, g: 0.4, b: 0.4, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 10 } }}
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
                uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 10 } }}
                uiBackground={{ color: rowBg }}
              >
                {/* Left accent bar */}
                <UiEntity
                  uiTransform={{ width: 4, alignSelf: 'stretch', flexShrink: 0 }}
                  uiBackground={{ color: accentColor }}
                />

                {/* NPC portrait */}
                <UiEntity
                  uiTransform={{ width: 64, height: 64, margin: { top: 12, bottom: 12, left: 14 }, flexShrink: 0 }}
                  uiBackground={{ texture: { src: npcHead, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />

                {/* Quest info */}
                <UiEntity
                  uiTransform={{
                    flex: 1, flexDirection: 'column',
                    padding: { top: 12, bottom: 12, left: 14, right: 10 },
                  }}
                >
                  <Label value={def.npcName} fontSize={11} color={C.orange} />
                  <Label
                    value={def.title}
                    fontSize={15}
                    color={C.textMain}
                    uiTransform={{ margin: { top: 3, bottom: 8 } }}
                  />

                  {/* Progress bar */}
                  {isActive && (
                    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
                      <UiEntity
                        uiTransform={{ width: '100%', height: 8, margin: { bottom: 5 } }}
                        uiBackground={{ color: { r: 0.12, g: 0.10, b: 0.07, a: 1 } }}
                      >
                        <UiEntity
                          uiTransform={{ width: `${pct}%`, height: '100%' }}
                          uiBackground={{ color: C.blue }}
                        />
                      </UiEntity>
                      <Label value={`${qp.current} / ${def.target}`} fontSize={11} color={C.blue} />
                    </UiEntity>
                  )}

                  {/* Claimable / completed badge */}
                  {!isActive && (
                    <Label value={statusText} fontSize={13} color={statusColor} />
                  )}

                  {/* Reward row */}
                  {!isDone && (
                    <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8 } }}>
                      <UiEntity
                        uiTransform={{ width: 18, height: 18, margin: { right: 5 }, flexShrink: 0 }}
                        uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                      />
                      <Label value={`${def.rewardCoins}`} fontSize={13} color={C.gold} />
                      <Label
                        value={`+ ${def.rewardXp} XP`}
                        fontSize={12}
                        color={C.textMute}
                        uiTransform={{ margin: { left: 12 } }}
                      />
                    </UiEntity>
                  )}
                </UiEntity>

                {/* Quest type / crop icon */}
                <UiEntity
                  uiTransform={{ width: 56, height: 56, margin: { top: 14, bottom: 14, right: 16 }, flexShrink: 0 }}
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
