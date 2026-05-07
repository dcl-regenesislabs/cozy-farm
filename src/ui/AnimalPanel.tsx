import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { COINS_IMAGE, CHICKEN_ICON, PIG_ICON, EGG_ICON, GRAIN_ICON, MANURE_ICON } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'
import {
  EGG_CYCLE_MS, PIG_CYCLE_MS,
  CHICKEN_COOP_UNLOCK_LEVEL, PIG_PEN_UNLOCK_LEVEL,
  BUILDING_BUY_PRICE, ANIMAL_BUY_PRICE, MAX_ANIMALS_PER_BUILDING,
  getPigStage, PIG_BREED_COOLDOWN,
} from '../data/animalData'
import { buyAnimal, breedPigs, harvestPig } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'

// ---------------------------------------------------------------------------
// Per-panel tab state
// ---------------------------------------------------------------------------

const pigTab = { value: 'overview' as 'overview' | 'breeding' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0)  return `${h}h ${m}m`
  if (m > 0)  return `${m}m ${s}s`
  return `${s}s`
}

function nextEggMs(lastEggAt: number): number {
  if (lastEggAt <= 0) return EGG_CYCLE_MS
  return Math.max(0, lastEggAt + EGG_CYCLE_MS - Date.now())
}

function nextManureMs(lastManureAt: number): number {
  if (lastManureAt <= 0) return PIG_CYCLE_MS
  return Math.max(0, lastManureAt + PIG_CYCLE_MS - Date.now())
}

const PIG_STAGE_LABELS: Record<string, string> = {
  piglet:      'Piglet',
  adolescent:  'Adolescent',
  adult:       'Adult',
  harvestable: 'Ready to harvest',
}

// ---------------------------------------------------------------------------
// Section header with icon
// ---------------------------------------------------------------------------

const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 12 } }}>
    <UiEntity
      uiTransform={{ width: 36, height: 36, margin: { right: 10 }, flexShrink: 0 }}
      uiBackground={{ texture: { src: icon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />
    <Label value={title} fontSize={26} color={C.header} />
  </UiEntity>
)

// ---------------------------------------------------------------------------
// Info row
// ---------------------------------------------------------------------------

const InfoRow = ({ label, value }: { key?: string | number; label: string; value: string }) => (
  <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 4 } }}>
    <Label value={label} fontSize={18} color={C.textMute} uiTransform={{ width: 160 }} />
    <Label value={value} fontSize={18} color={C.textMain} />
  </UiEntity>
)

// ---------------------------------------------------------------------------
// Square action card (replaces the old thin ActionButton)
// ---------------------------------------------------------------------------

const ActionCard = ({
  icon, label, sublabel, cost, enabled, onPress,
}: {
  icon?: string
  label: string
  sublabel?: string
  cost?: number
  enabled: boolean
  onPress: () => void
}) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 190,
      height: 190,
      margin: { right: 14, bottom: 14 },
      padding: { top: 14, bottom: 14, left: 10, right: 10 },
    }}
    uiBackground={{ color: enabled ? C.rowBg : { r: 0.12, g: 0.1, b: 0.08, a: 1 } }}
    onMouseDown={enabled ? () => { playSound('buttonclick'); onPress() } : undefined}
  >
    {icon && (
      <UiEntity
        uiTransform={{ width: 60, height: 60, margin: { bottom: 8 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: icon, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: enabled ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
        }}
      />
    )}
    <Label
      value={label}
      fontSize={20}
      color={enabled ? C.textMain : C.textMute}
      textAlign="middle-center"
    />
    {sublabel && (
      <Label
        value={sublabel}
        fontSize={16}
        color={C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
    )}
    {cost !== undefined && (
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8 } }}>
        <Label value={`${cost}`} fontSize={22} color={enabled ? C.gold : C.textMute} uiTransform={{ margin: { right: 6 } }} />
        <UiEntity
          uiTransform={{ width: 24, height: 24 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      </UiEntity>
    )}
  </UiEntity>
)

// ---------------------------------------------------------------------------
// Chicken section
// ---------------------------------------------------------------------------

const ChickenSection = () => {
  const now = Date.now()
  const canBuyMore = playerState.chickens.length < MAX_ANIMALS_PER_BUILDING

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { bottom: 20 } }}>
      <SectionHeader icon={CHICKEN_ICON} title="Chicken Coop" />

      <InfoRow label="Chickens" value={`${playerState.chickens.length} / ${MAX_ANIMALS_PER_BUILDING}`} />
      <InfoRow label="Food in bowl" value={`${playerState.chickenFoodInBowl} units`} />
      <InfoRow label="Eggs ready" value={`${playerState.eggsCount}`} />

      {playerState.chickens.map((chicken, i) => (
        <InfoRow
          key={chicken.id}
          label={`Chicken ${i + 1}`}
          value={playerState.chickenFoodInBowl > 0 ? formatMs(nextEggMs(chicken.lastEggAt)) : 'No food'}
        />
      ))}

      {/* Dirt warning with poop icon */}
      {playerState.chickenCoopDirtyAt > 0 && (
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8, bottom: 6 } }}>
          <UiEntity
            uiTransform={{ width: 26, height: 26, margin: { right: 8 }, flexShrink: 0 }}
            uiBackground={{ texture: { src: MANURE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          <Label
            value="Coop needs cleaning! Click the dirt in the scene."
            fontSize={17}
            color={{ r: 1, g: 0.6, b: 0.1, a: 1 }}
          />
        </UiEntity>
      )}

      {/* Action cards */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', margin: { top: 10 } }}>
        {canBuyMore && (
          <ActionCard
            icon={CHICKEN_ICON}
            label="Buy Chicken"
            cost={ANIMAL_BUY_PRICE}
            enabled={playerState.coins >= ANIMAL_BUY_PRICE}
            onPress={() => buyAnimal('chicken')}
          />
        )}
        <ActionCard
          icon={EGG_ICON}
          label="Feed Chickens"
          sublabel="Click bowl in scene"
          enabled={false}
          onPress={() => {}}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Pig overview
// ---------------------------------------------------------------------------

const PigOverview = () => {
  const now = Date.now()
  const canBuyMore = playerState.pigs.length < MAX_ANIMALS_PER_BUILDING

  const eligibleCount = playerState.pigs.filter((p) => {
    const stage = getPigStage(p, now)
    return (stage === 'adult' || stage === 'harvestable') && (now - p.lastBreedAt) >= PIG_BREED_COOLDOWN
  }).length
  const canBreed = eligibleCount >= 2 && playerState.pigs.length < MAX_ANIMALS_PER_BUILDING

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <InfoRow label="Pigs" value={`${playerState.pigs.length} / ${MAX_ANIMALS_PER_BUILDING}`} />
      <InfoRow label="Food in bowl" value={`${playerState.pigFoodInBowl} units`} />

      {playerState.pigs.map((pig, i) => {
        const stage = getPigStage(pig, now)
        const stageLabel = PIG_STAGE_LABELS[stage] ?? stage
        const canHarvest = stage === 'harvestable'
        const manureTimer = (stage === 'adult' || stage === 'harvestable')
          ? formatMs(nextManureMs(pig.lastManureAt))
          : 'Not producing yet'
        return (
          <UiEntity key={pig.id} uiTransform={{ flexDirection: 'column', margin: { bottom: 8 }, padding: { left: 8 }, borderWidth: { left: 2 } }}>
            <InfoRow label={`Pig ${i + 1}`} value={stageLabel} />
            {(stage === 'adult' || stage === 'harvestable') && (
              <InfoRow label="Next manure" value={playerState.pigFoodInBowl > 0 ? manureTimer : 'No food'} />
            )}
            {canHarvest && (
              <ActionCard
                icon={PIG_ICON}
                label="Harvest for Meat"
                enabled={true}
                onPress={() => harvestPig(pig.id)}
              />
            )}
          </UiEntity>
        )
      })}

      {/* Dirt warning with poop icon */}
      {playerState.pigPenDirtyAt > 0 && (
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8, bottom: 6 } }}>
          <UiEntity
            uiTransform={{ width: 26, height: 26, margin: { right: 8 }, flexShrink: 0 }}
            uiBackground={{ texture: { src: MANURE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          <Label
            value="Pen needs cleaning! Click the dirt in the scene."
            fontSize={17}
            color={{ r: 1, g: 0.6, b: 0.1, a: 1 }}
          />
        </UiEntity>
      )}

      {/* Action cards */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', margin: { top: 10 } }}>
        {canBuyMore && (
          <ActionCard
            icon={PIG_ICON}
            label="Buy Pig"
            cost={ANIMAL_BUY_PRICE}
            enabled={playerState.coins >= ANIMAL_BUY_PRICE}
            onPress={() => buyAnimal('pig')}
          />
        )}
        <ActionCard
          icon={GRAIN_ICON}
          label="Feed Pigs"
          sublabel="Click bowl in scene"
          enabled={false}
          onPress={() => {}}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Pig breeding tab
// ---------------------------------------------------------------------------

const PigBreeding = () => {
  const now = Date.now()
  const eligibleCount = playerState.pigs.filter((p) => {
    const stage = getPigStage(p, now)
    return (stage === 'adult' || stage === 'harvestable') && (now - p.lastBreedAt) >= PIG_BREED_COOLDOWN
  }).length
  const canBreed = eligibleCount >= 2 && playerState.pigs.length < MAX_ANIMALS_PER_BUILDING

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <InfoRow label="Adult pigs ready" value={`${eligibleCount}`} />
      <InfoRow label="Capacity" value={`${playerState.pigs.length} / ${MAX_ANIMALS_PER_BUILDING}`} />

      {playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING && (
        <Label
          value="Pen is full — harvest a pig to make room."
          fontSize={18}
          color={{ r: 0.9, g: 0.3, b: 0.3, a: 1 }}
          uiTransform={{ margin: { top: 8, bottom: 8 } }}
        />
      )}

      {eligibleCount < 2 && playerState.pigs.length < MAX_ANIMALS_PER_BUILDING && (
        <Label
          value="Need 2 adult pigs off cooldown to breed."
          fontSize={18}
          color={C.textMute}
          uiTransform={{ margin: { top: 8, bottom: 8 } }}
        />
      )}

      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', margin: { top: 10 } }}>
        <ActionCard
          icon={PIG_ICON}
          label="Breed Pigs"
          sublabel={canBreed ? `${eligibleCount} pigs ready` : `${eligibleCount} / 2 ready`}
          enabled={canBreed}
          onPress={() => breedPigs()}
        />
      </UiEntity>

      <Label
        value="Breeding produces a piglet that grows over 3 days. Piglets inherit feed bonuses."
        fontSize={17}
        color={C.textMute}
        uiTransform={{ margin: { top: 12 } }}
      />
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Pig section with Overview / Breeding tabs
// ---------------------------------------------------------------------------

const PigSection = () => {
  const tab = pigTab.value

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { bottom: 20 } }}>
      <SectionHeader icon={PIG_ICON} title="Pig Pen" />

      {/* Sub-tabs */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 16 } }}>
        <UiEntity
          uiTransform={{ width: 160, height: 48, margin: { right: 10 }, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: tab === 'overview' ? { r: 0.6, g: 0.35, b: 0.05, a: 1 } : { r: 0.18, g: 0.14, b: 0.08, a: 1 } }}
          onMouseDown={() => { playSound('buttonclick'); pigTab.value = 'overview' }}
        >
          <Label value="Overview" fontSize={21} color={tab === 'overview' ? C.textMain : C.textMute} textAlign="middle-center" />
        </UiEntity>
        <UiEntity
          uiTransform={{ width: 160, height: 48, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: tab === 'breeding' ? { r: 0.6, g: 0.35, b: 0.05, a: 1 } : { r: 0.18, g: 0.14, b: 0.08, a: 1 } }}
          onMouseDown={() => { playSound('buttonclick'); pigTab.value = 'breeding' }}
        >
          <Label value="Breeding" fontSize={21} color={tab === 'breeding' ? C.textMain : C.textMute} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {tab === 'overview' && <PigOverview />}
      {tab === 'breeding' && <PigBreeding />}
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Locked / available sections
// ---------------------------------------------------------------------------

const LockedSection = ({ icon, label, level }: { icon: string; label: string; level: number }) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: { top: 24, bottom: 24 },
      margin: { bottom: 16 },
    }}
    uiBackground={{ color: { r: 0.08, g: 0.06, b: 0.04, a: 1 } }}
  >
    <UiEntity
      uiTransform={{ width: 52, height: 52, margin: { bottom: 10 }, flexShrink: 0 }}
      uiBackground={{ texture: { src: icon, wrapMode: 'clamp' }, textureMode: 'stretch', color: { r: 1, g: 1, b: 1, a: 0.25 } }}
    />
    <Label value={label} fontSize={24} color={C.textMute} textAlign="middle-center" />
    <Label value={`Unlocks at Level ${level}`} fontSize={19} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
  </UiEntity>
)

const AvailableSection = ({ icon, label, price, onBuy }: { icon: string; label: string; price: number; onBuy: () => void }) => {
  const canAfford = playerState.coins >= price
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        padding: { top: 28, bottom: 28 },
        margin: { bottom: 16 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 80, height: 80, margin: { bottom: 12 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: icon, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`${label} available!`} fontSize={26} color={C.header} textAlign="middle-center" uiTransform={{ margin: { bottom: 10 } }} />
      {!canAfford && (
        <Label
          value={`Need ${price - playerState.coins} more coins`}
          fontSize={18}
          color={{ r: 0.9, g: 0.3, b: 0.3, a: 1 }}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 6 } }}
        />
      )}
      <UiEntity
        uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 240, height: 60 }}
        uiBackground={{ color: canAfford ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
        onMouseDown={canAfford ? () => { playSound('buttonclick'); onBuy() } : undefined}
      >
        <Label value={`${price}`} fontSize={24} color={canAfford ? C.textMain : C.textMute} uiTransform={{ margin: { right: 8 } }} />
        <UiEntity
          uiTransform={{ width: 30, height: 30 }}
          uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const AnimalPanel = () => {
  const chickenOwned    = playerState.chickenCoopOwned
  const pigOwned        = playerState.pigPenOwned
  const chickenAvail    = !chickenOwned && playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL
  const pigAvail        = !pigOwned && playerState.level >= PIG_PEN_UNLOCK_LEVEL

  return (
    <PanelShell title="Animals" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', padding: { left: 16, right: 16, top: 8 } }}>

        {/* Chicken Coop */}
        {chickenOwned ? (
          <ChickenSection />
        ) : chickenAvail ? (
          <AvailableSection
            icon={CHICKEN_ICON}
            label="Chicken Coop"
            price={BUILDING_BUY_PRICE}
            onBuy={() => { /* purchaseBuilding called from store or scene */ }}
          />
        ) : (
          <LockedSection icon={CHICKEN_ICON} label="Chicken Coop" level={CHICKEN_COOP_UNLOCK_LEVEL} />
        )}

        {/* Pig Pen */}
        {pigOwned ? (
          <PigSection />
        ) : pigAvail ? (
          <AvailableSection
            icon={PIG_ICON}
            label="Pig Pen"
            price={BUILDING_BUY_PRICE}
            onBuy={() => { /* purchaseBuilding called from store or scene */ }}
          />
        ) : (
          <LockedSection icon={PIG_ICON} label="Pig Pen" level={PIG_PEN_UNLOCK_LEVEL} />
        )}

        {/* Pig Meat inventory */}
        {playerState.pigMeatCount > 0 && (
          <UiEntity uiTransform={{ flexDirection: 'column', margin: { bottom: 16 } }}>
            <SectionHeader icon={PIG_ICON} title="Pig Meat" />
            <InfoRow label="In inventory" value={`${playerState.pigMeatCount} (sell in market)`} />
          </UiEntity>
        )}

      </UiEntity>
    </PanelShell>
  )
}
