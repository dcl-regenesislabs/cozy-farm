import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { applyFertilizer } from '../game/actions'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType } from '../data/fertilizerData'
import { PanelShell, C } from './PanelShell'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'

type FertCardProps = { key?: number; fertType: FertilizerType; count: number }

const FertCard = ({ fertType, count }: FertCardProps) => {
  const def     = FERTILIZER_DATA.get(fertType)!
  const zoomKey = `fert_${fertType}`
  const scale   = getZoomScale(zoomKey)
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: Math.round(220 * scale),
        height: Math.round(230 * scale),
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 10, right: 10 },
      }}
      uiBackground={{ color: C.rowBg }}
      onMouseDown={() => {
        if (isZooming(zoomKey)) return
        triggerCardZoom(zoomKey)
        const entity = playerState.activePlotEntity
        setTimeout(() => {
          if (entity) applyFertilizer(entity, fertType)
          // Only close the fertilize menu if no callback opened a new dialog
          if (playerState.activeMenu === 'fertilize') playerState.activeMenu = 'none'
          playerState.activePlotEntity = null
        }, 290)
      }}
    >
      <UiEntity
        uiTransform={{ width: 100, height: 100, margin: { bottom: 8 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={def.name} fontSize={22} color={C.textMain} textAlign="middle-center" />
      <Label value={def.description} fontSize={18} color={C.textMute} textAlign="middle-center" />
      <Label value={`x${count}`} fontSize={20} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
    </UiEntity>
  )
}

export const FertilizeMenu = () => {
  const availableFerts = ALL_FERTILIZER_TYPES.filter((f) => (playerState.fertilizers.get(f) ?? 0) > 0)

  const onClose = () => {
    playerState.activeMenu = 'none'
    playerState.activePlotEntity = null
  }

  return (
    <PanelShell title="Apply Fertilizer" onClose={onClose}>
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
        <Label
          value="Select a fertilizer to apply to this crop:"
          fontSize={24}
          color={C.textMute}
          uiTransform={{ margin: { bottom: 16 } }}
        />
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
          {availableFerts.map((f) => (
            <FertCard key={f} fertType={f} count={playerState.fertilizers.get(f)!} />
          ))}
        </UiEntity>
      </UiEntity>
    </PanelShell>
  )
}
