import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { buySeed, buyDog, buyOrnament } from '../game/actions'
import { ALL_CROP_TYPES, CROP_DATA, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE, DOG01_ICON } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { tutorialState } from '../game/tutorialState'
import { triggerCardShake, getShakeOffset } from './cardShakeSystem'
import { playSound } from '../systems/sfxSystem'
import { BEAUTY_OBJECTS, RARITY_COLOR, RARITY_LABEL } from '../data/beautyObjectData'
import { isOrnamentPlaced, hasEmptySlot } from '../systems/beautySpotSystem'
import { WORKER_DAILY_WAGE, WORKER_DEBUG_ENABLED, getWorkerDebtDays, getWorkerStatus } from '../shared/worker'
import { requestDebugWorkerAction, requestPayWorkerWages } from '../services/saveService'

const shopTab  = { value: 'seeds' as 'seeds' | 'pets' | 'ornaments' | 'workers' | 'debug' }
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

const OrnamentCard = ({ objectId }: { objectId: number }) => {
  const def       = BEAUTY_OBJECTS.get(objectId)!
  const placed    = isOrnamentPlaced(objectId)
  const full      = !hasEmptySlot()
  const canAfford = playerState.coins >= def.price
  const canBuy    = !placed && !full && canAfford
  const shakeKey  = `shop_ornament_${objectId}`
  const offsetX   = getShakeOffset(shakeKey)
  const rarityCol = RARITY_COLOR[def.rarity]

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 200,
        height: 265,
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 10, right: 10 },
        positionType: 'relative',
        position: { left: offsetX },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      {/* Rarity color swatch as visual */}
      <UiEntity
        uiTransform={{ width: 108, height: 108, margin: { bottom: 8 }, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{ color: rarityCol }}
      >
        <Label value="✦" fontSize={42} color={{ r: 1, g: 1, b: 1, a: 0.9 }} textAlign="middle-center" />
      </UiEntity>

      <Label value={def.name} fontSize={22} color={C.textMain} textAlign="middle-center" />

      {/* Rarity + beauty row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 4 } }}>
        <Label value={RARITY_LABEL[def.rarity]} fontSize={16} color={rarityCol} uiTransform={{ margin: { right: 8 } }} />
        <Label value={`✦ ${def.beautyValue}`} fontSize={16} color={C.gold} />
      </UiEntity>

      {placed ? (
        <Label value="Placed ✓" fontSize={20} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : full ? (
        <Label value="Slots Full" fontSize={18} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
      ) : (
        <BuyButton
          cost={def.price}
          canAfford={canAfford}
          onPress={() => { triggerCardShake(shakeKey); buyOrnament(objectId) }}
        />
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

const WorkerPanel = () => {
  if (!playerState.cropsUnlocked) {
    return (
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 22, bottom: 22, left: 22, right: 22 } }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label
          value="Unlock the farm expansion first. The worker payroll terminal becomes available once the worker area is open."
          fontSize={24}
          color={C.textMain}
          textAlign="middle-left"
        />
      </UiEntity>
    )
  }

  if (!playerState.farmerHired) {
    return (
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 22, bottom: 22, left: 22, right: 22 } }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label
          value="No worker hired yet. Talk to the farm worker in the expansion and hire them there."
          fontSize={24}
          color={C.textMain}
          textAlign="middle-left"
        />
      </UiEntity>
    )
  }

  const workerState = getWorkerStatus({
    farmerHired: playerState.farmerHired,
    workerUnpaidDays: playerState.workerUnpaidDays,
    farmerSeeds: playerState.farmerSeeds,
  })
  const outstanding = playerState.workerOutstandingWages
  const outstandingDays = getWorkerDebtDays(outstanding)
  const canPay = outstanding > 0 && playerState.coins >= outstanding
  const statusLabel =
    workerState === 'idle_unpaid'
      ? 'Idle (unpaid)'
      : workerState === 'idle_no_seeds'
        ? 'Idle (no seeds)'
        : 'Active'

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 20, bottom: 20, left: 20, right: 20 }, margin: { bottom: 16 } }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label value="Worker Payroll" fontSize={30} color={C.header} textAlign="middle-left" uiTransform={{ margin: { bottom: 10 } }} />
        <Label value={`Status: ${statusLabel}`} fontSize={24} color={workerState === 'idle_unpaid' ? C.orange : C.textMain} textAlign="middle-left" />
        <Label value={`Daily wage: ${WORKER_DAILY_WAGE} coins`} fontSize={22} color={C.textMute} textAlign="middle-left" uiTransform={{ margin: { top: 8 } }} />
        <Label value={`Outstanding wages: ${outstanding} coins`} fontSize={24} color={outstanding > 0 ? C.orange : C.green} textAlign="middle-left" uiTransform={{ margin: { top: 12 } }} />
        <Label
          value={`Missed wage days: ${playerState.workerUnpaidDays}`}
          fontSize={22}
          color={playerState.workerUnpaidDays >= 2 ? C.orange : C.textMute}
          textAlign="middle-left"
          uiTransform={{ margin: { top: 8 } }}
        />
        {outstanding > 0 && (
          <Label
            value={
              playerState.workerUnpaidDays >= 2
                ? `Worker stopped after ${outstandingDays} unpaid day${outstandingDays === 1 ? '' : 's'}. Clear all back-pay to reactivate them.`
                : `Back-pay accrued for ${outstandingDays} day${outstandingDays === 1 ? '' : 's'}.`
            }
            fontSize={20}
            color={C.textMute}
            textAlign="middle-left"
            uiTransform={{ margin: { top: 8 } }}
          />
        )}
      </UiEntity>

      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 18, bottom: 18, left: 20, right: 20 } }}
        uiBackground={{ color: { r: 0.1, g: 0.08, b: 0.05, a: 1 } }}
      >
        <Label value={`Balance: ${playerState.coins} coins`} fontSize={24} color={C.gold} textAlign="middle-left" uiTransform={{ margin: { bottom: 12 } }} />
        {outstanding > 0 && playerState.coins < outstanding && (
          <Label
            value="Insufficient balance. Sell crops or collect earnings before paying wages."
            fontSize={20}
            color={{ r: 1, g: 0.62, b: 0.52, a: 1 }}
            textAlign="middle-left"
            uiTransform={{ margin: { bottom: 14 } }}
          />
        )}
        <Button
          value={outstanding > 0 ? `Pay ${outstanding} coins` : 'No wages due'}
          variant={canPay ? 'primary' : 'secondary'}
          disabled={!canPay}
          fontSize={26}
          uiTransform={{ width: 340, height: 76 }}
          onMouseDown={() => { if (!canPay) return; playSound('buttonclick'); requestPayWorkerWages() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

const DebugActionButton = ({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Button
    value={label}
    variant={disabled ? 'secondary' : 'primary'}
    disabled={disabled}
    fontSize={22}
    uiTransform={{ width: 260, height: 68, margin: { right: 12, bottom: 12 } }}
    onMouseDown={() => { if (disabled) return; playSound('buttonclick'); onPress() }}
  />
)

const DebugPanel = () => (
  <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
    <UiEntity
      uiTransform={{ width: '100%', padding: { top: 18, bottom: 18, left: 20, right: 20 }, margin: { bottom: 16 } }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label value="Worker Debug" fontSize={30} color={C.header} textAlign="middle-left" uiTransform={{ margin: { bottom: 10 } }} />
      <Label
        value="Use this panel to prepare the worker test scenario without editing storage files. It mutates your saved farm state directly on the authoritative server."
        fontSize={21}
        color={C.textMain}
        textAlign="middle-left"
      />
      <Label
        value={`Live snapshot: coins=${playerState.coins}, hired=${playerState.farmerHired ? 'yes' : 'no'}, worker seeds=${Array.from(playerState.farmerSeeds.values()).reduce((sum, count) => sum + count, 0)}, debt=${playerState.workerOutstandingWages}, unpaidDays=${playerState.workerUnpaidDays}`}
        fontSize={19}
        color={C.textMute}
        textAlign="middle-left"
        uiTransform={{ margin: { top: 10 } }}
      />
    </UiEntity>

    <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
      <DebugActionButton label="Prepare Worker Test" onPress={() => { requestDebugWorkerAction('setup') }} />
      <DebugActionButton label="+1000 Coins" onPress={() => { requestDebugWorkerAction('add_coins', 1000) }} />
      <DebugActionButton label="Set Coins To 0" onPress={() => { requestDebugWorkerAction('set_coins', 0) }} />
      <DebugActionButton label="Load 20 Worker Seeds" onPress={() => { requestDebugWorkerAction('load_seeds', 20) }} />
      <DebugActionButton label="Clear Worker Seeds" onPress={() => { requestDebugWorkerAction('clear_seeds') }} />
      <DebugActionButton label="Advance 1 Day" onPress={() => { requestDebugWorkerAction('advance_days', 1) }} />
      <DebugActionButton label="Advance 2 Days" onPress={() => { requestDebugWorkerAction('advance_days', 2) }} />
      <DebugActionButton label="Clear Wage Debt" onPress={() => { requestDebugWorkerAction('clear_debt') }} />
      <DebugActionButton label="Simulate 4h Offline" onPress={() => { requestDebugWorkerAction('simulate_offline', 4) }} />
      <DebugActionButton label="Simulate 24h Offline" onPress={() => { requestDebugWorkerAction('simulate_offline', 24) }} />
    </UiEntity>
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
          fontSize={26}
          uiTransform={{ width: 220, height: 68, margin: { right: 12 } }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'seeds' }}
        />
        <Button
          value="Pets"
          variant={tab === 'pets' ? 'primary' : 'secondary'}
          fontSize={24}
          uiTransform={{ width: 200, height: 68, margin: { right: 12 } }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'pets' }}
        />
        <Button
          value="Ornaments"
          variant={tab === 'ornaments' ? 'primary' : 'secondary'}
          fontSize={24}
          uiTransform={{ width: 200, height: 68, margin: { right: 12 } }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'ornaments' }}
        />
        <Button
          value="Workers"
          variant={tab === 'workers' ? 'primary' : 'secondary'}
          fontSize={24}
          uiTransform={{ width: 200, height: 68, margin: { right: 12 } }}
          onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'workers' }}
        />
        {WORKER_DEBUG_ENABLED && (
          <Button
            value="Debug"
            variant={tab === 'debug' ? 'primary' : 'secondary'}
            fontSize={24}
            uiTransform={{ width: 200, height: 68 }}
            onMouseDown={() => { playSound('buttonclick'); shopTab.value = 'debug' }}
          />
        )}
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

      {/* Ornaments tab */}
      {tab === 'ornaments' && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {Array.from(BEAUTY_OBJECTS.keys()).map((id) => (
              <OrnamentCard objectId={id} />
            ))}
          </UiEntity>
          {!hasEmptySlot() && (
            <UiEntity
              uiTransform={{ padding: { top: 10, bottom: 10, left: 18, right: 18 }, margin: { top: 8 } }}
              uiBackground={{ color: { r: 0.18, g: 0.10, b: 0.04, a: 1 } }}
            >
              <Label
                value="All 3 decoration slots are full — future update will let you swap ornaments"
                fontSize={20}
                color={{ r: 0.8, g: 0.65, b: 0.3, a: 1 }}
                textAlign="middle-center"
              />
            </UiEntity>
          )}
        </UiEntity>
      )}

      {tab === 'workers' && <WorkerPanel />}

      {WORKER_DEBUG_ENABLED && tab === 'debug' && <DebugPanel />}

    </PanelShell>
  )
}
