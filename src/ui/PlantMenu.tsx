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
        width: 248,
        height: 275,
        margin: { right: 23, bottom: 23 },
        padding: { top: 23, bottom: 18, left: 14, right: 14 },
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
        uiTransform={{ width: 140, height: 140, margin: { bottom: 14 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={CROP_NAMES[cropType]} fontSize={36} color={C.textMain} textAlign="middle-center" />
      <Label
        value={`x${count}`}
        fontSize={33}
        color={{ r: 0.55, g: 1, b: 0.35, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 5 } }}
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
        <UiEntity
          uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
        >
          <Label
            value="No seeds in inventory!"
            fontSize={45}
            color={C.textMute}
            textAlign="middle-center"
          />
          <Label
            value="Visit the Seed Shop to buy some."
            fontSize={33}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 18 } }}
          />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <Label
            value="Click a seed to plant it:"
            fontSize={33}
            color={C.textMute}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 27 } }}
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
