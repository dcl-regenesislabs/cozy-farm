import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { NPC_ROSTER } from '../data/npcData'
import {
  debugNpcIndex, debugModeIndex,
  debugNpcNext, debugNpcPrev,
  debugModeNext, debugModePrev,
} from '../debug/npcDialogDebug'

const MODES = ['greeting', 'quest_offer', 'quest_active', 'quest_claimable', 'tutorial']

const BG     = { r: 0.08, g: 0.08, b: 0.08, a: 0.85 }
const WHITE  = { r: 1,    g: 1,    b: 1,    a: 1 }
const YELLOW = { r: 1,    g: 0.85, b: 0.2,  a: 1 }
const BTN_BG = { r: 0.25, g: 0.25, b: 0.25, a: 1 }

function ArrowBtn(props: { label: string; onClick: () => void }) {
  return (
    <UiEntity
      uiTransform={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
      uiBackground={{ color: BTN_BG }}
      onMouseDown={props.onClick}
    >
      <Label value={props.label} fontSize={20} color={WHITE} textAlign="middle-center"
        uiTransform={{ width: 36, height: 36 }} />
    </UiEntity>
  )
}

export const NpcDialogDebugPanel = () => {
  const npcName  = NPC_ROSTER[debugNpcIndex].name
  const modeName = MODES[debugModeIndex]

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 16, right: 16 },
        width: 280,
        flexDirection: 'column',
        padding: { top: 10, bottom: 10, left: 12, right: 12 },
        alignItems: 'flex-start',
      }}
      uiBackground={{ color: BG }}
    >
      <Label value="NPC Dialog Debug" fontSize={13} color={YELLOW}
        uiTransform={{ width: 256, height: 20, margin: { bottom: 8 } }} />

      <Label value="NPC" fontSize={11} color={WHITE}
        uiTransform={{ width: 256, height: 16, margin: { bottom: 4 } }} />
      <UiEntity uiTransform={{ width: 256, height: 36, flexDirection: 'row', alignItems: 'center', margin: { bottom: 8 } }}>
        <ArrowBtn label="<" onClick={debugNpcPrev} />
        <Label value={npcName} fontSize={14} color={WHITE} textAlign="middle-center"
          uiTransform={{ width: 180, height: 36 }} />
        <ArrowBtn label=">" onClick={debugNpcNext} />
      </UiEntity>

      <Label value="Mode" fontSize={11} color={WHITE}
        uiTransform={{ width: 256, height: 16, margin: { bottom: 4 } }} />
      <UiEntity uiTransform={{ width: 256, height: 36, flexDirection: 'row', alignItems: 'center' }}>
        <ArrowBtn label="<" onClick={debugModePrev} />
        <Label value={modeName} fontSize={12} color={WHITE} textAlign="middle-center"
          uiTransform={{ width: 180, height: 36 }} />
        <ArrowBtn label=">" onClick={debugModeNext} />
      </UiEntity>
    </UiEntity>
  )
}
