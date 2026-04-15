import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { buySeed, buyDog } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE, DOG01_ICON } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { tutorialState } from '../game/tutorialState'
import { triggerCardShake, getShakeOffset } from './cardShakeSystem'

const shopTab = { value: 'seeds' as 'seeds' | 'pets' }

type BuyButtonProps = { cost: number; canAfford: boolean; onPress: () => void }

const BuyButton = ({ cost, canAfford, onPress }: BuyButtonProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: 225,
      height: 78,
      margin: { top: 14 },
    }}
    uiBackground={{
      color: canAfford
        ? { r: 0.2, g: 0.55, b: 0.2, a: 1 }
        : { r: 0.25, g: 0.25, b: 0.25, a: 1 },
    }}
    onMouseDown={canAfford ? onPress : undefined}
  >
    <Label
      value={`${cost}`}
      fontSize={36}
      color={canAfford ? C.textMain : C.textMute}
      textAlign="middle-center"
      uiTransform={{ margin: { right: 12 } }}
    />
    <UiEntity
      uiTransform={{ width: 45, height: 45 }}
      uiBackground={{
        texture: { src: COINS_IMAGE, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />
  </UiEntity>
)

type ShopCardProps = { key?: string | number; cropType: CropType; unlocked: boolean }

const ShopCard = ({ cropType, unlocked }: ShopCardProps) => {
  const def       = CROP_DATA.get(cropType)!
  const canAfford = playerState.coins >= def.seedCost
  const imgSrc    = CROP_SEED_IMAGES[cropType]
  const shakeKey  = `shop_${cropType}`
  const offsetX   = getShakeOffset(shakeKey)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 248,
        height: 350,
        margin: { right: 23, bottom: 23 },
        padding: { top: 23, bottom: 23, left: 14, right: 14 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: unlocked ? C.rowBg : { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
    >
      <UiEntity
        uiTransform={{ width: 140, height: 140, margin: { bottom: 14 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: unlocked ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />

      <Label
        value={def.name}
        fontSize={36}
        color={unlocked ? C.textMain : C.textMute}
        textAlign="middle-center"
      />

      {unlocked ? (
        <BuyButton
          cost={def.seedCost}
          canAfford={canAfford}
          onPress={() => {
            triggerCardShake(shakeKey)
            buySeed(cropType, 1)
          }}
        />
      ) : (
        <Label
          value="Locked"
          fontSize={26}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 18 } }}
        />
      )}
    </UiEntity>
  )
}

const DogCard = () => {
  const canAfford = playerState.coins >= 500
  const offsetX   = getShakeOffset('shop_dog')

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 248,
        height: 350,
        margin: { right: 23, bottom: 23 },
        padding: { top: 23, bottom: 23, left: 14, right: 14 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 140, height: 140, margin: { bottom: 14 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: DOG01_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value="Dog" fontSize={36} color={C.textMain} textAlign="middle-center" />
      {playerState.dogOwned ? (
        <Label
          value="Owned"
          fontSize={26}
          color={C.green}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 18 } }}
        />
      ) : (
        <BuyButton
          cost={500}
          canAfford={canAfford}
          onPress={() => {
            triggerCardShake('shop_dog')
            buyDog()
          }}
        />
      )}
    </UiEntity>
  )
}

export const ShopMenu = () => {
  const tutorialActive = tutorialState.active

  const visibleCrops = ALL_CROP_TYPES.filter((ct) => {
    if (tutorialActive) return ct === CropType.Onion
    const def = CROP_DATA.get(ct)!
    return def.tier === 1 || playerState.cropsUnlocked
  })
  const lockedCrops = tutorialActive ? [] : ALL_CROP_TYPES.filter((ct) => {
    const def = CROP_DATA.get(ct)!
    return def.tier > 1 && !playerState.cropsUnlocked
  })

  return (
    <PanelShell title="El Amazonas" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Tab bar */}
      <UiEntity
        uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 32 } }}
      >
        <Button
          value="Seeds"
          variant={shopTab.value === 'seeds' ? 'primary' : 'secondary'}
          fontSize={42}
          uiTransform={{ width: 330, height: 90, margin: { right: 18 } }}
          onMouseDown={() => { shopTab.value = 'seeds' }}
        />
        <Button
          value="Pets"
          variant={shopTab.value === 'pets' ? 'primary' : 'secondary'}
          fontSize={42}
          uiTransform={{ width: 330, height: 90 }}
          onMouseDown={() => { shopTab.value = 'pets' }}
        />
      </UiEntity>

      {/* Seeds tab */}
      {shopTab.value === 'seeds' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {visibleCrops.map((ct) => (
              <ShopCard key={`u${ct}`} cropType={ct} unlocked={true} />
            ))}
            {lockedCrops.map((ct) => (
              <ShopCard key={`l${ct}`} cropType={ct} unlocked={false} />
            ))}
          </UiEntity>

          {!playerState.cropsUnlocked && !tutorialActive && (
            <UiEntity
              uiTransform={{ padding: { top: 18, bottom: 18, left: 32, right: 32 }, margin: { top: 9 } }}
              uiBackground={{ color: { r: 0.18, g: 0.12, b: 0.04, a: 1 } }}
            >
              <Label
                value="Tier 2 & 3 seeds are locked — visit the For Sale Sign to unlock them"
                fontSize={30}
                color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
                textAlign="middle-center"
              />
            </UiEntity>
          )}
        </UiEntity>
      )}

      {/* Pets tab */}
      {shopTab.value === 'pets' && (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
          <DogCard />
        </UiEntity>
      )}

    </PanelShell>
  )
}
