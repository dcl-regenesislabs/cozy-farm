import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { ALL_CROP_TYPES, CROP_NAMES, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, CROP_HARVEST_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { updateFarmerInventoryDisplay } from '../systems/farmerSystem'

const HIRE_COST = 100

function giveSeeds(cropType: CropType, amount: number) {
  const playerCount = playerState.seeds.get(cropType) ?? 0
  const toGive      = Math.min(amount, playerCount)
  if (toGive <= 0) return
  playerState.seeds.set(cropType, playerCount - toGive)
  const farmerCount = playerState.farmerSeeds.get(cropType) ?? 0
  playerState.farmerSeeds.set(cropType, farmerCount + toGive)
}

function collectAll() {
  playerState.farmerInventory.forEach((count, cropType) => {
    if (count <= 0) return
    const current = playerState.harvested.get(cropType) ?? 0
    playerState.harvested.set(cropType, current + count)
    playerState.farmerInventory.set(cropType, 0)
  })
  updateFarmerInventoryDisplay()
}

type SeedGiveCardProps = { key?: string | number; cropType: CropType; playerCount: number; farmerCount: number }

const SeedGiveCard = ({ cropType, playerCount, farmerCount }: SeedGiveCardProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      width: 120,
      height: 175,
      margin: { right: 10, bottom: 10 },
      padding: { top: 10, bottom: 10, left: 6, right: 6 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    {/* Seed image */}
    <UiEntity
      uiTransform={{ width: 62, height: 62, margin: { bottom: 6 }, flexShrink: 0 }}
      uiBackground={{
        texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />

    {/* Name */}
    <Label value={CROP_NAMES[cropType]} fontSize={12} color={C.textMain} textAlign="middle-center" />

    {/* Player stock */}
    <Label
      value={`You: x${playerCount}`}
      fontSize={11}
      color={{ r: 0.55, g: 1, b: 0.35, a: 1 }}
      textAlign="middle-center"
      uiTransform={{ margin: { top: 2 } }}
    />

    {/* Farmer stock */}
    <Label
      value={`Farmer: x${farmerCount}`}
      fontSize={11}
      color={C.gold}
      textAlign="middle-center"
      uiTransform={{ margin: { top: 2 } }}
    />

    {/* Buttons */}
    <UiEntity uiTransform={{ flexDirection: 'row', margin: { top: 6 } }}>
      <Button
        value="+1"
        variant="primary"
        fontSize={12}
        uiTransform={{ width: 44, height: 28, margin: { right: 4 } }}
        onMouseDown={() => giveSeeds(cropType, 1)}
      />
      <Button
        value="All"
        variant="primary"
        fontSize={12}
        uiTransform={{ width: 44, height: 28 }}
        onMouseDown={() => giveSeeds(cropType, playerCount)}
      />
    </UiEntity>
  </UiEntity>
)

type CollectCardProps = { key?: string | number; cropType: CropType; count: number }

const CollectCard = ({ cropType, count }: CollectCardProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: 52,
      margin: { bottom: 6 },
      padding: { left: 10, right: 10 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    {/* Crop icon */}
    <UiEntity
      uiTransform={{ width: 36, height: 36, margin: { right: 10 }, flexShrink: 0 }}
      uiBackground={{
        texture: { src: CROP_HARVEST_IMAGES[cropType], wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />
    {/* Name */}
    <Label
      value={CROP_NAMES[cropType]}
      fontSize={14}
      color={C.textMain}
      uiTransform={{ flex: 1 }}
    />
    {/* Count badge */}
    <Label
      value={`x${count}`}
      fontSize={16}
      color={C.gold}
      textAlign="middle-right"
    />
  </UiEntity>
)

export const FarmerMenu = () => {
  const availableToGive     = ALL_CROP_TYPES.filter((ct) => (playerState.seeds.get(ct) ?? 0) > 0)
  const collectedEntries    = ALL_CROP_TYPES.filter((ct) => (playerState.farmerInventory.get(ct) ?? 0) > 0)
  const hasCollected        = collectedEntries.length > 0

  return (
    <PanelShell title="Farmer" onClose={() => { playerState.activeMenu = 'none' }}>

      {!playerState.farmerHired ? (

        /* ── Hire screen ── */
        <UiEntity
          uiTransform={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label
            value="I can work these fields for you."
            fontSize={18}
            color={C.textMain}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 6 } }}
          />
          <Label
            value="Pay me 100 coins and give me seeds to get started."
            fontSize={15}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 30 } }}
          />

          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: { bottom: 30 },
            }}
          >
            <UiEntity
              uiTransform={{ width: 28, height: 28, margin: { right: 8 } }}
              uiBackground={{
                texture: { src: COINS_IMAGE, wrapMode: 'clamp' },
                textureMode: 'stretch',
              }}
            />
            <Label
              value={`${playerState.coins} / ${HIRE_COST} coins`}
              fontSize={18}
              color={playerState.coins >= HIRE_COST ? C.gold : { r: 1, g: 0.4, b: 0.4, a: 1 }}
              textAlign="middle-left"
            />
          </UiEntity>

          <Button
            value={`Hire for ${HIRE_COST} coins`}
            variant={playerState.coins >= HIRE_COST ? 'primary' : 'secondary'}
            disabled={playerState.coins < HIRE_COST}
            fontSize={18}
            uiTransform={{ width: 240, height: 50 }}
            onMouseDown={() => {
              if (playerState.coins < HIRE_COST) return
              playerState.coins -= HIRE_COST
              playerState.farmerHired = true
            }}
          />
        </UiEntity>

      ) : (

        /* ── Hired screen ── */
        <UiEntity uiTransform={{ flex: 1, flexDirection: 'column', width: '100%' }}>

          {/* ─ Collected Harvest section ─ */}
          <Label
            value="Collected Harvest"
            fontSize={15}
            color={C.textMain}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 8 } }}
          />

          {hasCollected ? (
            <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { bottom: 8 } }}>
              {collectedEntries.map((ct) => (
                <CollectCard
                  key={ct}
                  cropType={ct}
                  count={playerState.farmerInventory.get(ct) ?? 0}
                />
              ))}
              <Button
                value="Collect All"
                variant="primary"
                fontSize={14}
                uiTransform={{ width: 140, height: 38, margin: { top: 6 } }}
                onMouseDown={collectAll}
              />
            </UiEntity>
          ) : (
            <Label
              value="Nothing collected yet."
              fontSize={13}
              color={C.textMute}
              textAlign="top-left"
              uiTransform={{ margin: { bottom: 16 } }}
            />
          )}

          {/* ─ Divider ─ */}
          <UiEntity
            uiTransform={{ width: '100%', height: 1, margin: { bottom: 12 } }}
            uiBackground={{ color: { r: 1, g: 1, b: 1, a: 0.08 } }}
          />

          {/* ─ Give Seeds section ─ */}
          <Label
            value="Give Seeds to Farmer"
            fontSize={15}
            color={C.textMain}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 8 } }}
          />

          {availableToGive.length === 0 ? (
            <Label
              value="You have no seeds to give."
              fontSize={13}
              color={C.textMute}
              textAlign="top-left"
            />
          ) : (
            <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
              {availableToGive.map((ct) => (
                <SeedGiveCard
                  key={ct}
                  cropType={ct}
                  playerCount={playerState.seeds.get(ct) ?? 0}
                  farmerCount={playerState.farmerSeeds.get(ct) ?? 0}
                />
              ))}
            </UiEntity>
          )}

        </UiEntity>

      )}
    </PanelShell>
  )
}
