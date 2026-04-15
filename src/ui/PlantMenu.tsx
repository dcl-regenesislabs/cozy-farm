import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { plantSeed } from '../game/actions'
import { CropType, CROP_NAMES, ALL_CROP_TYPES } from '../data/cropData'
import { CROP_SEED_IMAGES } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { triggerCardShake, getShakeOffset } from './cardShakeSystem'

type SeedCardProps = { key?: string | number; cropType: CropType; count: number }

const SeedCard = ({ cropType, count }: SeedCardProps) => {
  const shakeKey = `plant_${cropType}`
  const offsetX  = getShakeOffset(shakeKey)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 200,
        height: 215,
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 10, right: 10 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: C.rowBg }}
      onMouseDown={() => {
        if (playerState.activePlotEntity) {
          triggerCardShake(shakeKey)
          plantSeed(playerState.activePlotEntity, cropType)
        }
      }}
    >
      <UiEntity
        uiTransform={{ width: 108, height: 108, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={CROP_NAMES[cropType]} fontSize={25} color={C.textMain} textAlign="middle-center" />
      <Label
        value={`x${count}`}
        fontSize={22}
        color={{ r: 0.55, g: 1, b: 0.35, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
    </UiEntity>
  )
}

export const PlantMenu = () => {
  const availableSeeds = ALL_CROP_TYPES.filter((ct) => (playerState.seeds.get(ct) ?? 0) > 0)

  return (
    <PanelShell title="Plant Seeds" onClose={() => {
      playerState.activeMenu       = 'none'
      playerState.activePlotEntity = null
    }}>
      {availableSeeds.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Label value="No seeds in inventory!" fontSize={32} color={C.textMute} textAlign="middle-center" />
          <Label
            value="Visit the Seed Shop to buy some."
            fontSize={24}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 12 } }}
          />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <Label
            value="Click a seed to plant it:"
            fontSize={24}
            color={C.textMute}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 16 } }}
          />
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {availableSeeds.map((ct) => (
              <SeedCard key={ct} cropType={ct} count={playerState.seeds.get(ct)!} />
            ))}
          </UiEntity>
        </UiEntity>
      )}
    </PanelShell>
  )
}
