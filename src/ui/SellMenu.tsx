import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { sellCrop } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_HARVEST_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { triggerCardShake, getShakeOffset, isShaking } from './cardShakeSystem'
import { playSound } from '../systems/sfxSystem'

const SHAKE_DURATION = 320

type SellCardProps = { key?: string | number; cropType: CropType; count: number }

const SellCard = ({ cropType, count }: SellCardProps) => {
  const def        = CROP_DATA.get(cropType)!
  const totalValue = def.sellPrice * count
  const shakeKey   = `sell_${cropType}`
  const offsetX    = getShakeOffset(shakeKey)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 200,
        height: 245,
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 10, right: 10 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 108, height: 108, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: CROP_HARVEST_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={def.name} fontSize={25} color={C.textMain} textAlign="middle-center" />
      <Label
        value={`x${count}`}
        fontSize={22}
        color={C.orange}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
      {/* Sell button */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: 175,
          height: 58,
          margin: { top: 10 },
        }}
        uiBackground={{ color: { r: 0.15, g: 0.45, b: 0.15, a: 1 } }}
        onMouseDown={() => {
          if (isShaking(shakeKey)) return
          playSound('buttonclick')
          triggerCardShake(shakeKey)
          setTimeout(() => sellCrop(cropType, count), SHAKE_DURATION)
        }}
      >
        <Label
          value={`${totalValue}`}
          fontSize={24}
          color={C.gold}
          textAlign="middle-center"
          uiTransform={{ margin: { right: 8 } }}
        />
        <UiEntity
          uiTransform={{ width: 34, height: 34 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      </UiEntity>
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
        uiTransform={{ flexDirection: 'row', alignItems: 'center', width: '100%', margin: { bottom: 20 } }}
      >
        <UiEntity
          uiTransform={{ width: 38, height: 38, margin: { right: 10 } }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label
          value={`${playerState.coins} coins`}
          fontSize={28}
          color={C.gold}
          textAlign="middle-left"
          uiTransform={{ flex: 1 }}
        />
        {harvestedCrops.length > 0 && (
          <Label value={`Total: ${totalValue} 🪙`} fontSize={22} color={C.orange} textAlign="middle-right" />
        )}
      </UiEntity>

      {harvestedCrops.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Label value="Nothing to sell." fontSize={32} color={C.textMute} textAlign="middle-center" />
          <Label
            value="Go harvest some crops first!"
            fontSize={24}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { top: 12 } }}
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
