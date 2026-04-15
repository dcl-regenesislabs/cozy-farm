import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { ALL_CROP_TYPES, CROP_NAMES, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, CROP_HARVEST_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { updateFarmerInventoryDisplay } from '../systems/farmerSystem'
import { triggerCardShake, getShakeOffset } from './cardShakeSystem'

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

const SeedGiveCard = ({ cropType, playerCount, farmerCount }: SeedGiveCardProps) => {
  const shakeKey = `farmer_${cropType}`
  const offsetX  = getShakeOffset(shakeKey)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 210,
        height: 300,
        margin: { right: 15, bottom: 15 },
        padding: { top: 15, bottom: 15, left: 9, right: 9 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 100, height: 100, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: CROP_SEED_IMAGES[cropType], wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      <Label value={CROP_NAMES[cropType]} fontSize={24} color={C.textMain} textAlign="middle-center" />

      <Label
        value={`You: x${playerCount}`}
        fontSize={20}
        color={{ r: 0.55, g: 1, b: 0.35, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />

      <Label
        value={`Farmer: x${farmerCount}`}
        fontSize={20}
        color={C.gold}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />

      <UiEntity uiTransform={{ flexDirection: 'row', margin: { top: 12 } }}>
        <Button
          value="+1"
          variant="primary"
          fontSize={22}
          uiTransform={{ width: 80, height: 52, margin: { right: 8 } }}
          onMouseDown={() => {
            triggerCardShake(shakeKey)
            giveSeeds(cropType, 1)
          }}
        />
        <Button
          value="All"
          variant="primary"
          fontSize={22}
          uiTransform={{ width: 80, height: 52 }}
          onMouseDown={() => {
            triggerCardShake(shakeKey)
            giveSeeds(cropType, playerCount)
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

type CollectCardProps = { key?: string | number; cropType: CropType; count: number }

const CollectCard = ({ cropType, count }: CollectCardProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: 90,
      margin: { bottom: 10 },
      padding: { left: 15, right: 15 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    <UiEntity
      uiTransform={{ width: 60, height: 60, margin: { right: 15 }, flexShrink: 0 }}
      uiBackground={{
        texture: { src: CROP_HARVEST_IMAGES[cropType], wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />
    <Label value={CROP_NAMES[cropType]} fontSize={26} color={C.textMain} uiTransform={{ flex: 1 }} />
    <Label value={`x${count}`} fontSize={28} color={C.gold} textAlign="middle-right" />
  </UiEntity>
)

export const FarmerMenu = () => {
  const availableToGive  = ALL_CROP_TYPES.filter((ct) => (playerState.seeds.get(ct) ?? 0) > 0)
  const collectedEntries = ALL_CROP_TYPES.filter((ct) => (playerState.farmerInventory.get(ct) ?? 0) > 0)
  const hasCollected     = collectedEntries.length > 0

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
            fontSize={32}
            color={C.textMain}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 10 } }}
          />
          <Label
            value="Pay me 100 coins and give me seeds to get started."
            fontSize={26}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 50 } }}
          />

          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: { bottom: 50 },
            }}
          >
            <UiEntity
              uiTransform={{ width: 44, height: 44, margin: { right: 12 } }}
              uiBackground={{
                texture: { src: COINS_IMAGE, wrapMode: 'clamp' },
                textureMode: 'stretch',
              }}
            />
            <Label
              value={`${playerState.coins} / ${HIRE_COST} coins`}
              fontSize={30}
              color={playerState.coins >= HIRE_COST ? C.gold : { r: 1, g: 0.4, b: 0.4, a: 1 }}
              textAlign="middle-left"
            />
          </UiEntity>

          <Button
            value={`Hire for ${HIRE_COST} coins`}
            variant={playerState.coins >= HIRE_COST ? 'primary' : 'secondary'}
            disabled={playerState.coins < HIRE_COST}
            fontSize={28}
            uiTransform={{ width: 400, height: 80 }}
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
            fontSize={28}
            color={C.textMain}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 12 } }}
          />

          {hasCollected ? (
            <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { bottom: 12 } }}>
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
                fontSize={24}
                uiTransform={{ width: 240, height: 62, margin: { top: 10 } }}
                onMouseDown={collectAll}
              />
            </UiEntity>
          ) : (
            <Label
              value="Nothing collected yet."
              fontSize={22}
              color={C.textMute}
              textAlign="top-left"
              uiTransform={{ margin: { bottom: 24 } }}
            />
          )}

          {/* ─ Divider ─ */}
          <UiEntity
            uiTransform={{ width: '100%', height: 2, margin: { bottom: 18 } }}
            uiBackground={{ color: { r: 1, g: 1, b: 1, a: 0.08 } }}
          />

          {/* ─ Give Seeds section ─ */}
          <Label
            value="Give Seeds to Farmer"
            fontSize={28}
            color={C.textMain}
            textAlign="top-left"
            uiTransform={{ margin: { bottom: 12 } }}
          />

          {availableToGive.length === 0 ? (
            <Label
              value="You have no seeds to give."
              fontSize={22}
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
