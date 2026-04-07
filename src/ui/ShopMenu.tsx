import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { buySeed, buyDog } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'

const TIER_COLOR: Record<1 | 2 | 3, { r: number; g: number; b: number; a: number }> = {
  1: { r: 0.4,  g: 1,    b: 0.4,  a: 1 },
  2: { r: 1,    g: 0.85, b: 0.2,  a: 1 },
  3: { r: 1,    g: 0.45, b: 0.2,  a: 1 },
}

type ShopCardProps = {
  key?: string | number
  cropType: CropType
  unlocked: boolean
}

const ShopCard = ({ cropType, unlocked }: ShopCardProps) => {
  const def       = CROP_DATA.get(cropType)!
  const canAfford = playerState.coins >= def.seedCost
  const imgSrc    = CROP_SEED_IMAGES[cropType]

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
      uiBackground={{ color: unlocked ? C.rowBg : { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
    >
      {/* Crop image */}
      <UiEntity
        uiTransform={{ width: 62, height: 62, margin: { bottom: 6 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: unlocked ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />

      {/* Name */}
      <Label
        value={def.name}
        fontSize={12}
        color={unlocked ? C.textMain : C.textMute}
        textAlign="middle-center"
      />

      {/* Tier badge */}
      <Label
        value={`Tier ${def.tier}`}
        fontSize={10}
        color={unlocked ? TIER_COLOR[def.tier] : C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 2 } }}
      />

      {unlocked ? (
        <Button
          value={`${def.seedCost} 🪙`}
          variant={canAfford ? 'primary' : 'secondary'}
          disabled={!canAfford}
          fontSize={12}
          uiTransform={{ width: 90, height: 28, margin: { top: 6 } }}
          onMouseDown={() => buySeed(cropType, 1)}
        />
      ) : (
        <Label
          value="🔒 Locked"
          fontSize={11}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 8 } }}
        />
      )}
    </UiEntity>
  )
}

export const ShopMenu = () => {
  const visibleCrops = ALL_CROP_TYPES.filter((ct) => {
    const def = CROP_DATA.get(ct)!
    return def.tier === 1 || playerState.cropsUnlocked
  })
  const lockedCrops = ALL_CROP_TYPES.filter((ct) => {
    const def = CROP_DATA.get(ct)!
    return def.tier > 1 && !playerState.cropsUnlocked
  })
  const allDisplayed = [...visibleCrops, ...lockedCrops]

  return (
    <PanelShell title="Seed Shop" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Coins row */}
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
        />
      </UiEntity>

      {/* Pets section */}
      <Label
        value="🐾 Pets"
        fontSize={15}
        color={C.textMain}
        textAlign="middle-left"
        uiTransform={{ width: '100%', margin: { bottom: 8 } }}
      />
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          margin: { bottom: 16 },
          padding: { top: 10, bottom: 10, left: 12, right: 12 },
        }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label
          value="🐕 Dog"
          fontSize={14}
          color={C.textMain}
          textAlign="middle-left"
          uiTransform={{ flexGrow: 1 }}
        />
        {playerState.dogOwned ? (
          <Label
            value="🐾 Owned"
            fontSize={13}
            color={{ r: 0.5, g: 0.8, b: 0.5, a: 1 }}
            textAlign="middle-right"
          />
        ) : (
          <Button
            value="500 🪙"
            variant={playerState.coins >= 500 ? 'primary' : 'secondary'}
            disabled={playerState.coins < 500}
            fontSize={13}
            uiTransform={{ width: 90, height: 30 }}
            onMouseDown={() => buyDog()}
          />
        )}
      </UiEntity>

      {/* Seed grid */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {visibleCrops.map((ct) => (
          <ShopCard key={`u${ct}`} cropType={ct} unlocked={true} />
        ))}
        {lockedCrops.map((ct) => (
          <ShopCard key={`l${ct}`} cropType={ct} unlocked={false} />
        ))}
      </UiEntity>

      {!playerState.cropsUnlocked && (
        <UiEntity
          uiTransform={{ padding: { top: 8, bottom: 8, left: 14, right: 14 }, margin: { top: 4 } }}
          uiBackground={{ color: { r: 0.18, g: 0.12, b: 0.04, a: 1 } }}
        >
          <Label
            value="Tier 2 & 3 seeds are locked — visit the For Sale Sign to unlock them"
            fontSize={13}
            color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
            textAlign="middle-center"
          />
        </UiEntity>
      )}
    </PanelShell>
  )
}
