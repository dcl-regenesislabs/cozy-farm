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
// Deposit row — one grain or one crop type
// ---------------------------------------------------------------------------

const DepositRow = ({
  label,
  imgSrc,
  inInventory,
  inBowl,
  onDepositOne,
  onDepositAll,
}: {
  key?: string | number
  label: string
  imgSrc: string
  inInventory: number
  inBowl: number
  onDepositOne: () => void
  onDepositAll: () => void
}) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
      margin: { bottom: 6 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    {/* Icon */}
    <UiEntity
      uiTransform={{ width: 42, height: 42, margin: { right: 12 }, flexShrink: 0 }}
      uiBackground={{ texture: { src: imgSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />
    {/* Name + counts */}
    <UiEntity uiTransform={{ flexDirection: 'column', flexGrow: 1 }}>
      <Label value={label} fontSize={20} color={C.textMain} />
      <Label value={`In inventory: ${inInventory}  |  In bowl: ${inBowl}`} fontSize={16} color={C.textMute} />
    </UiEntity>
    {/* +1 button */}
    <UiEntity
      uiTransform={{ width: 64, height: 40, margin: { right: 6 }, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={{ color: inInventory > 0 ? C.green : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
      onMouseDown={inInventory > 0 ? () => { playSound('buttonclick'); onDepositOne() } : undefined}
    >
      <Label value="+1" fontSize={20} color={inInventory > 0 ? C.textMain : C.textMute} textAlign="middle-center" />
    </UiEntity>
    {/* +All button */}
    <UiEntity
      uiTransform={{ width: 72, height: 40, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={{ color: inInventory > 0 ? C.blue : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
      onMouseDown={inInventory > 0 ? () => { playSound('buttonclick'); onDepositAll() } : undefined}
    >
      <Label value={`+${inInventory}`} fontSize={20} color={inInventory > 0 ? C.textMain : C.textMute} textAlign="middle-center" />
    </UiEntity>
  </UiEntity>
)

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const FeedBowlMenu = () => {
  const type = playerState.activeFeedBowl
  if (!type) return <UiEntity />

  const bowlAmount = type === 'chicken' ? playerState.chickenFoodInBowl : playerState.pigFoodInBowl
  const title = type === 'chicken' ? 'Feed Chickens' : 'Feed Pigs'

  const deposit = (grainAmt: number, cropType?: CropType, cropAmt?: number) => {
    const crops = new Map<number, number>()
    if (cropType !== undefined && cropAmt) crops.set(cropType, cropAmt)
    depositFoodInBowl(type, grainAmt, crops)
  }

  return (
    <PanelShell title={title} onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', padding: { left: 16, right: 16, top: 8 } }}>

        <Label
          value={`Food in bowl: ${bowlAmount} units`}
          fontSize={22}
          color={C.gold}
          uiTransform={{ margin: { bottom: 12 } }}
        />

        <Label
          value="Deposit food (1 unit = 1 production cycle)"
          fontSize={17}
          color={C.textMute}
          uiTransform={{ margin: { bottom: 8 } }}
        />

        {/* Grain row */}
        <DepositRow
          label="Grain"
          imgSrc={GRAIN_ICON}
          inInventory={playerState.grainCount}
          inBowl={bowlAmount}
          onDepositOne={() => deposit(1)}
          onDepositAll={() => deposit(playerState.grainCount)}
        />

        {/* Crop rows — show any crop in inventory */}
        {ALL_CROP_TYPES.map((cropType) => {
          const count = playerState.harvested.get(cropType) ?? 0
          if (count === 0) return null
          const def = CROP_DATA.get(cropType)!
          const imgSrc = CROP_HARVEST_IMAGES[cropType]
          return (
            <DepositRow
              key={cropType}
              label={def.name}
              imgSrc={imgSrc}
              inInventory={count}
              inBowl={bowlAmount}
              onDepositOne={() => deposit(0, cropType, 1)}
              onDepositAll={() => deposit(0, cropType, count)}
            />
          )
        })}

        {/* Empty state */}
        {playerState.grainCount === 0 && ALL_CROP_TYPES.every((c) => (playerState.harvested.get(c) ?? 0) === 0) && (
          <Label
            value="No food in inventory. Buy grain from the Shop!"
            fontSize={18}
            color={C.textMute}
            uiTransform={{ margin: { top: 12 } }}
          />
        )}

      </UiEntity>
    </PanelShell>
  )
}
