import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { GRAIN_ICON, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { GRAIN_BUY_PRICE } from '../data/animalData'
import { depositFoodInBowl } from '../systems/animalSystem'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_HARVEST_IMAGES } from '../data/imagePaths'
import { playSound } from '../systems/sfxSystem'

// ---------------------------------------------------------------------------
// Food card — one item (grain or crop) displayed as a store-style card
// ---------------------------------------------------------------------------

const FoodCard = ({
  label,
  imgSrc,
  inInventory,
  onDepositOne,
  onDepositAll,
}: {
  key?: string | number
  label: string
  imgSrc: string
  inInventory: number
  onDepositOne: () => void
  onDepositAll: () => void
}) => {
  const hasItems = inInventory > 0
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 190,
        height: 250,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 10, right: 10 },
      }}
      uiBackground={{ color: hasItems ? C.rowBg : { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
    >
      {/* Icon */}
      <UiEntity
        uiTransform={{ width: 90, height: 90, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: hasItems ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />
      {/* Name */}
      <Label value={label} fontSize={22} color={hasItems ? C.textMain : C.textMute} textAlign="middle-center" />
      {/* Count */}
      <Label
        value={`In stock: ${inInventory}`}
        fontSize={17}
        color={hasItems ? C.gold : C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4, bottom: 8 } }}
      />
      {/* Add 1 button */}
      <UiEntity
        uiTransform={{ width: 160, height: 40, margin: { bottom: 6 }, justifyContent: 'center', alignItems: 'center' }}
        uiBackground={{ color: hasItems ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
        onMouseDown={hasItems ? () => { playSound('buttonclick'); onDepositOne() } : undefined}
      >
        <Label value="Add 1" fontSize={19} color={hasItems ? C.textMain : C.textMute} textAlign="middle-center" />
      </UiEntity>
      {/* Add All button */}
      <UiEntity
        uiTransform={{ width: 160, height: 40, justifyContent: 'center', alignItems: 'center' }}
        uiBackground={{ color: hasItems ? { r: 0.18, g: 0.35, b: 0.65, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
        onMouseDown={hasItems ? () => { playSound('buttonclick'); onDepositAll() } : undefined}
      >
        <Label
          value={hasItems ? `Add all (${inInventory})` : 'None'}
          fontSize={17}
          color={hasItems ? C.textMain : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const FeedBowlMenu = () => {
  const type = playerState.activeFeedBowl
  if (!type) return <UiEntity />

  const bowlAmount = type === 'chicken' ? playerState.chickenFoodInBowl : playerState.pigFoodInBowl
  const title      = type === 'chicken' ? 'Feed Chickens' : 'Feed Pigs'
  const bowlBarPct = Math.min(100, Math.floor((bowlAmount / 20) * 100))

  const deposit = (grainAmt: number, cropType?: CropType, cropAmt?: number) => {
    const crops = new Map<number, number>()
    if (cropType !== undefined && cropAmt) crops.set(cropType, cropAmt)
    depositFoodInBowl(type, grainAmt, crops)
  }

  return (
    <PanelShell title={title} onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', padding: { left: 16, right: 16, top: 8 } }}>

        {/* Bowl status header */}
        <UiEntity
          uiTransform={{ flexDirection: 'column', width: '100%', margin: { bottom: 16 } }}
          uiBackground={{ color: { r: 0.1, g: 0.09, b: 0.06, a: 1 } }}
        >
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', padding: { left: 14, right: 14, top: 10, bottom: 6 } }}>
            <Label value="Food in bowl:" fontSize={20} color={C.textMute} uiTransform={{ margin: { right: 8 } }} />
            <Label value={`${bowlAmount} units`} fontSize={22} color={C.gold} />
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: 8 }} uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}>
            <UiEntity
              uiTransform={{ width: `${bowlBarPct}%`, height: '100%' }}
              uiBackground={{ color: bowlAmount > 0 ? C.gold : { r: 0.3, g: 0.3, b: 0.3, a: 1 } }}
            />
          </UiEntity>
        </UiEntity>

        {/* Card grid */}
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>

          {/* Grain card */}
          <FoodCard
            label="Grain"
            imgSrc={GRAIN_ICON}
            inInventory={playerState.grainCount}
            onDepositOne={() => deposit(1)}
            onDepositAll={() => deposit(playerState.grainCount)}
          />

          {/* Crop cards — only crops with inventory > 0 */}
          {ALL_CROP_TYPES.map((cropType) => {
            const count = playerState.harvested.get(cropType) ?? 0
            if (count === 0) return null
            const def    = CROP_DATA.get(cropType)!
            const imgSrc = CROP_HARVEST_IMAGES[cropType]
            return (
              <FoodCard
                key={cropType}
                label={def.name}
                imgSrc={imgSrc}
                inInventory={count}
                onDepositOne={() => deposit(0, cropType, 1)}
                onDepositAll={() => deposit(0, cropType, count)}
              />
            )
          })}

        </UiEntity>

        {/* Empty state */}
        {playerState.grainCount === 0 && ALL_CROP_TYPES.every((c) => (playerState.harvested.get(c) ?? 0) === 0) && (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8 } }}>
            <Label
              value="No food in inventory. Buy grain from the Shop!"
              fontSize={18}
              color={C.textMute}
            />
            <UiEntity uiTransform={{ width: 28, height: 28, margin: { left: 8 } }}
              uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }} />
          </UiEntity>
        )}

      </UiEntity>
    </PanelShell>
  )
}
