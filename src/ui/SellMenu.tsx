import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { sellCrop } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_HARVEST_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'

type SellCardProps = { key?: string | number; cropType: CropType; count: number }

const SellCard = ({ cropType, count }: SellCardProps) => {
  const def        = CROP_DATA.get(cropType)!
  const totalValue = def.sellPrice * count

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 110,
        height: 155,
        margin: { right: 10, bottom: 10 },
        padding: { top: 10, bottom: 10, left: 6, right: 6 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      {/* Crop image */}
      <UiEntity
        uiTransform={{ width: 62, height: 62, margin: { bottom: 6 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: CROP_HARVEST_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      {/* Name + count */}
      <Label value={def.name} fontSize={12} color={C.textMain} textAlign="middle-center" />
      <Label
        value={`x${count}`}
        fontSize={14}
        color={C.orange}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 2 } }}
      />

      {/* Value */}
      <Label
        value={`${totalValue} 🪙`}
        fontSize={11}
        color={C.gold}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 2 } }}
      />

      <Button
        value="Sell All"
        variant="primary"
        fontSize={12}
        uiTransform={{ width: 90, height: 28, margin: { top: 6 } }}
        onMouseDown={() => sellCrop(cropType, count)}
      />
    </UiEntity>
  )
}

export const SellMenu = () => {
  const harvestedCrops = ALL_CROP_TYPES.filter((ct) => (playerState.harvested.get(ct) ?? 0) > 0)
  const totalValue     = harvestedCrops.reduce((sum, ct) => {
    const def = CROP_DATA.get(ct)!
    return sum + def.sellPrice * (playerState.harvested.get(ct) ?? 0)
  }, 0)

  return (
    <PanelShell title="Sell Crops" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Coins + total value row */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          margin: { bottom: 16 },
        }}
      >
        <UiEntity
          uiTransform={{ width: 24, height: 24, margin: { right: 6 } }}
          uiBackground={{
            texture: { src: COINS_IMAGE, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        />
        <Label
          value={`${playerState.coins} coins`}
          fontSize={18}
          color={C.gold}
          textAlign="middle-left"
          uiTransform={{ flex: 1 }}
        />
        {harvestedCrops.length > 0 && (
          <Label
            value={`Total: ${totalValue} 🪙`}
            fontSize={14}
            color={C.orange}
            textAlign="middle-right"
          />
        )}
      </UiEntity>

      {harvestedCrops.length === 0 ? (
        <UiEntity
          uiTransform={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Label
            value="Nothing to sell."
            fontSize={20}
            color={C.textMute}
            textAlign="middle-center"
          />
          <Label
            value="Go harvest some crops first!"
            fontSize={15}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 8 } }}
          />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
          {harvestedCrops.map((ct) => (
            <SellCard key={ct} cropType={ct} count={playerState.harvested.get(ct)!} />
          ))}
        </UiEntity>
      )}
    </PanelShell>
  )
}
