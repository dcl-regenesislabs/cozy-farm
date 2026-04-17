import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { buySeed, buyDog } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE, DOG01_ICON } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { tutorialState } from '../game/tutorialState'
import { triggerCardShake, getShakeOffset } from './cardShakeSystem'
import { playSound } from '../systems/sfxSystem'

const shopTab  = { value: 'seeds' as 'seeds' | 'pets' }
const shopPage = { seeds: 0, pets: 0 }

// 5 cards per row × 2 rows = 10 per page
const SHOP_PAGE_SIZE = 10

type BuyButtonProps = { cost: number; canAfford: boolean; onPress: () => void }

const BuyButton = ({ cost, canAfford, onPress }: BuyButtonProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: 175,
      height: 58,
      margin: { top: 10 },
    }}
    uiBackground={{
      color: canAfford
        ? { r: 0.2, g: 0.55, b: 0.2, a: 1 }
        : { r: 0.25, g: 0.25, b: 0.25, a: 1 },
    }}
    onMouseDown={canAfford ? () => { playSound('buttonclick'); onPress() } : undefined}
  >
    <Label
      value={`${cost}`}
      fontSize={24}
      color={canAfford ? C.textMain : C.textMute}
      textAlign="middle-center"
      uiTransform={{ margin: { right: 8 } }}
    />
    <UiEntity
      uiTransform={{ width: 34, height: 34 }}
      uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
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
        width: 200,
        height: 245,
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 10, right: 10 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: unlocked ? C.rowBg : { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
    >
      <UiEntity
        uiTransform={{ width: 108, height: 108, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: unlocked ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />
      <Label
        value={def.name}
        fontSize={25}
        color={unlocked ? C.textMain : C.textMute}
        textAlign="middle-center"
      />
      {unlocked ? (
        <BuyButton
          cost={def.seedCost}
          canAfford={canAfford}
          onPress={() => { triggerCardShake(shakeKey); buySeed(cropType, 1) }}
        />
      ) : (
        <Label value="Locked" fontSize={20} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
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
        uiBackground={{ texture: { src: DOG01_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Dog" fontSize={25} color={C.textMain} textAlign="middle-center" />
      {playerState.dogOwned ? (
        <Label value="Owned" fontSize={20} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : (
        <BuyButton cost={500} canAfford={canAfford} onPress={() => { triggerCardShake('shop_dog'); buyDog() }} />
      )}
    </UiEntity>
  )
}

const PaginationBar = ({ page, lastPage, onPrev, onNext }: { page: number; lastPage: number; onPrev: () => void; onNext: () => void }) => (
  <UiEntity
    uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', margin: { top: 12 } }}
  >
    <Button value="< Prev" variant="secondary" fontSize={22} uiTransform={{ width: 160, height: 60, margin: { right: 24 } }} onMouseDown={() => { playSound('pagination'); playSound('buttonclick'); onPrev() }} />
    <Label value={`${page + 1} / ${lastPage + 1}`} fontSize={24} color={C.textMute} textAlign="middle-center" uiTransform={{ width: 100 }} />
    <Button value="Next >" variant="secondary" fontSize={22} uiTransform={{ width: 160, height: 60, margin: { left: 24 } }} onMouseDown={() => { playSound('pagination'); playSound('buttonclick'); onNext() }} />
  </UiEntity>
)

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

  const tab      = shopTab.value
  const allSeeds = [...visibleCrops.map(ct => ({ ct, unlocked: true })), ...lockedCrops.map(ct => ({ ct, unlocked: false }))]
  const seedPage  = shopPage.seeds
  const seedLast  = Math.max(0, Math.ceil(allSeeds.length / SHOP_PAGE_SIZE) - 1)
  const seedSlice = allSeeds.slice(seedPage * SHOP_PAGE_SIZE, (seedPage + 1) * SHOP_PAGE_SIZE)

  return (
    <PanelShell title="El Amazonas" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Tab bar */}
      <UiEntity uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 20 } }}>
        <Button
          value="Seeds"
          variant={tab === 'seeds' ? 'primary' : 'secondary'}
          fontSize={28}
          uiTransform={{ width: 240, height: 68, margin: { right: 12 } }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'seeds' }}
        />
        <Button
          value="Pets"
          variant={tab === 'pets' ? 'primary' : 'secondary'}
          fontSize={28}
          uiTransform={{ width: 240, height: 68 }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'pets' }}
        />
      </UiEntity>

      {/* Seeds tab */}
      {tab === 'seeds' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {seedSlice.map(({ ct, unlocked }) => (
              <ShopCard key={`${unlocked ? 'u' : 'l'}${ct}`} cropType={ct} unlocked={unlocked} />
            ))}
          </UiEntity>
          {seedLast > 0 && (
            <PaginationBar
              page={seedPage}
              lastPage={seedLast}
              onPrev={() => { if (shopPage.seeds > 0) shopPage.seeds-- }}
              onNext={() => { if (shopPage.seeds < seedLast) shopPage.seeds++ }}
            />
          )}
          {!playerState.cropsUnlocked && !tutorialActive && (
            <UiEntity
              uiTransform={{ padding: { top: 10, bottom: 10, left: 18, right: 18 }, margin: { top: 8 } }}
              uiBackground={{ color: { r: 0.18, g: 0.12, b: 0.04, a: 1 } }}
            >
              <Label
                value="Tier 2 & 3 seeds are locked — visit the For Sale Sign to unlock them"
                fontSize={20}
                color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
                textAlign="middle-center"
              />
            </UiEntity>
          )}
        </UiEntity>
      )}

      {/* Pets tab */}
      {tab === 'pets' && (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
          <DogCard />
        </UiEntity>
      )}

    </PanelShell>
  )
}
