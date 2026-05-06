import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { COINS_IMAGE } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import { ANIMAL_DATA, AnimalType, GRAIN_BUY_PRICE, GRAIN_BULK_COUNT, GRAIN_BULK_PRICE } from '../data/animalData'
import { collectEggs, collectManure, buyGrain } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(lastProducedAt: number, cycleDurationMs: number): string {
  if (lastProducedAt <= 0) return '--'
  const nextAt    = lastProducedAt + cycleDurationMs
  const remaining = Math.max(0, nextAt - Date.now())
  if (remaining === 0) return 'Ready!'
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  const s = Math.floor((remaining % 60_000) / 1_000)
  return `${m}m ${s}s`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const GrainRow = () => {
  const canAfford1     = playerState.coins >= GRAIN_BUY_PRICE
  const canAffordBulk  = playerState.coins >= GRAIN_BULK_PRICE

  const btn = (label: string, cost: number, amount: number, canAfford: boolean) => (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 185,
        height: 54,
        margin: { right: 10 },
      }}
      uiBackground={{ color: canAfford ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
      onMouseDown={canAfford ? () => { playSound('buttonclick'); buyGrain(amount, cost) } : undefined}
    >
      <Label value={label} fontSize={21} color={canAfford ? C.textMain : C.textMute} textAlign="middle-center" />
      <UiEntity
        uiTransform={{ width: 28, height: 28, margin: { left: 6 } }}
        uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
    </UiEntity>
  )

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        padding: { top: 18, bottom: 18, left: 20, right: 20 },
        margin: { bottom: 16 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label value="🌾  Grain" fontSize={26} color={C.header} uiTransform={{ margin: { bottom: 10 } }} />
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 12 } }}>
        <Label value={`In stock: ${playerState.grainCount}`} fontSize={23} color={C.textMain} uiTransform={{ flex: 1 }} />
        <Label value={`Wallet: ${playerState.coins} 🪙`} fontSize={20} color={C.gold} />
      </UiEntity>
      <UiEntity uiTransform={{ flexDirection: 'row' }}>
        {btn(`Buy 1 — ${GRAIN_BUY_PRICE}`, GRAIN_BUY_PRICE, 1, canAfford1)}
        {btn(`Buy ${GRAIN_BULK_COUNT} — ${GRAIN_BULK_PRICE}`, GRAIN_BULK_PRICE, GRAIN_BULK_COUNT, canAffordBulk)}
      </UiEntity>
    </UiEntity>
  )
}

const ChickenSection = () => {
  const def         = ANIMAL_DATA.get(AnimalType.Chicken)!
  const hasEggs     = playerState.eggsCount > 0
  const countdown   = formatCountdown(playerState.chickenLastProducedAt, def.cycleDurationMs)
  const isFull      = playerState.eggsCount >= def.maxStockpile
  const noGrain     = playerState.grainCount === 0

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        padding: { top: 18, bottom: 18, left: 20, right: 20 },
        margin: { bottom: 16 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label value="🐔  Chicken Coop" fontSize={26} color={C.header} uiTransform={{ margin: { bottom: 10 } }} />

      {/* Status row */}
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 10 } }}>
        <Label
          value={`Eggs: ${playerState.eggsCount} / ${def.maxStockpile}`}
          fontSize={23}
          color={C.orange}
          uiTransform={{ flex: 1 }}
        />
        <Label
          value={isFull ? 'Coop full!' : noGrain ? 'Out of grain' : `Next: ${countdown}`}
          fontSize={20}
          color={isFull || noGrain ? { r: 0.9, g: 0.3, b: 0.3, a: 1 } : C.textMute}
        />
      </UiEntity>

      {/* Collect button */}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: 260,
          height: 56,
        }}
        uiBackground={{ color: hasEggs ? { r: 0.55, g: 0.35, b: 0.05, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
        onMouseDown={hasEggs ? () => { playSound('harvest'); collectEggs() } : undefined}
      >
        <Label
          value={hasEggs ? `Collect ${playerState.eggsCount} Egg${playerState.eggsCount !== 1 ? 's' : ''}` : 'No eggs yet'}
          fontSize={23}
          color={hasEggs ? C.textMain : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>

      <Label
        value={`Sell price: ${def.productSellPrice} 🪙 each  ·  Total collected: ${playerState.totalEggsCollected}`}
        fontSize={18}
        color={C.textMute}
        uiTransform={{ margin: { top: 8 } }}
      />
    </UiEntity>
  )
}

const PigSection = () => {
  const def          = ANIMAL_DATA.get(AnimalType.Pig)!
  const hasManure    = playerState.manureCount > 0
  const countdown    = formatCountdown(playerState.pigLastProducedAt, def.cycleDurationMs)
  const isFull       = playerState.manureCount >= def.maxStockpile
  const noFeed       = playerState.vegetableScraps === 0 && playerState.grainCount === 0
  const feedLabel    = playerState.vegetableScraps > 0
    ? `Veggie Scraps: ${playerState.vegetableScraps}`
    : `Grain: ${playerState.grainCount}`

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        padding: { top: 18, bottom: 18, left: 20, right: 20 },
        margin: { bottom: 16 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label value="🐷  Pig Pen" fontSize={26} color={C.header} uiTransform={{ margin: { bottom: 10 } }} />

      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 6 } }}>
        <Label
          value={`Manure: ${playerState.manureCount} / ${def.maxStockpile}`}
          fontSize={23}
          color={C.orange}
          uiTransform={{ flex: 1 }}
        />
        <Label
          value={isFull ? 'Pen full!' : noFeed ? 'No feed' : `Next: ${countdown}`}
          fontSize={20}
          color={isFull || noFeed ? { r: 0.9, g: 0.3, b: 0.3, a: 1 } : C.textMute}
        />
      </UiEntity>
      <Label value={feedLabel} fontSize={19} color={C.textMute} uiTransform={{ margin: { bottom: 10 } }} />

      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: 300,
          height: 56,
        }}
        uiBackground={{ color: hasManure ? { r: 0.3, g: 0.18, b: 0.04, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
        onMouseDown={hasManure ? () => { playSound('harvest'); collectManure() } : undefined}
      >
        <Label
          value={hasManure ? `Collect ${playerState.manureCount} Manure → Compost` : 'No manure yet'}
          fontSize={22}
          color={hasManure ? C.textMain : C.textMute}
          textAlign="middle-center"
        />
      </UiEntity>

      <Label
        value={`Manure goes to your Compost Bin as organic waste`}
        fontSize={17}
        color={C.textMute}
        uiTransform={{ margin: { top: 8 } }}
      />
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const LockedSection = ({ label, level }: { label: string; level: number }) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: { top: 30, bottom: 30, left: 20, right: 20 },
      margin: { bottom: 16 },
    }}
    uiBackground={{ color: { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
  >
    <Label value={`🔒  ${label}`} fontSize={28} color={C.textMute} textAlign="middle-center" />
    <Label
      value={`Unlocks at Level ${level}`}
      fontSize={21}
      color={C.textMute}
      textAlign="middle-center"
      uiTransform={{ margin: { top: 10 } }}
    />
  </UiEntity>
)

export const AnimalPanel = () => {
  const chickenUnlocked = playerState.chickenCoopUnlocked
  const showPig         = playerState.pigPenUnlocked

  return (
    <PanelShell title="Livestock" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity
        uiTransform={{ flexDirection: 'column', width: '100%', overflow: 'scroll' }}
      >
        {chickenUnlocked ? (
          <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
            <GrainRow />
            <ChickenSection />
          </UiEntity>
        ) : (
          <LockedSection label="Chicken Coop" level={8} />
        )}
        {showPig && <PigSection />}
        {!showPig && (
          <UiEntity
            uiTransform={{ padding: { top: 14, bottom: 14, left: 20, right: 20 } }}
            uiBackground={{ color: { r: 0.1, g: 0.1, b: 0.1, a: 0.6 } }}
          >
            <Label
              value="🔒  Pig Pen — unlocks at Level 12"
              fontSize={22}
              color={C.textMute}
            />
          </UiEntity>
        )}
      </UiEntity>
    </PanelShell>
  )
}
