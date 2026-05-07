import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'
import {
  PIG_CYCLE_MS, PIG_HARVEST_AGE_MS, PIG_PEN_UNLOCK_LEVEL, BUILDING_BUY_PRICE,
  MAX_ANIMALS_PER_BUILDING, getPigStage, PIG_BREED_COOLDOWN, getDirtIntervalMs, DIRT_BASE_INTERVAL_MS,
} from '../data/animalData'
import { PIG_ICON, MANURE_ICON, COINS_IMAGE } from '../data/imagePaths'
import { breedPigs, harvestPig, purchaseBuilding } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'
import type { PigData } from '../game/gameState'

// ---------------------------------------------------------------------------
// Tab state
// ---------------------------------------------------------------------------

const pigPenTab = { value: 'animals' as 'animals' | 'breeding' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const STAGE_LABEL: Record<string, string> = {
  piglet:      'Piglet',
  adolescent:  'Adolescent',
  adult:       'Adult',
  harvestable: 'Ready to harvest',
}

// ---------------------------------------------------------------------------
// Pig tile
// ---------------------------------------------------------------------------

type PigTileProps = { key?: string | number; pig: PigData; index: number; now: number }

const PigTile = ({ pig, index, now }: PigTileProps) => {
  const stage      = getPigStage(pig, now)
  const hasFood    = playerState.pigFoodInBowl > 0
  const canHarvest = stage === 'harvestable'

  let tileBg: { r: number; g: number; b: number; a: number }
  let midLabel: string
  let subLabel = ''
  let barPct   = 0
  let barColor: { r: number; g: number; b: number; a: number }

  if (stage === 'piglet') {
    const born    = pig.bornAt ?? now
    const elapsed = now - born
    const total   = 24 * 60 * 60 * 1000
    barPct   = Math.min(100, Math.floor((elapsed / total) * 100))
    barColor = { r: 0.8, g: 0.6, b: 0.9, a: 1 }
    tileBg   = { r: 0.14, g: 0.10, b: 0.16, a: 1 }
    midLabel = STAGE_LABEL.piglet
    subLabel = `Adolescent in ${formatMs(total - elapsed)}`
  } else if (stage === 'adolescent') {
    const born    = pig.bornAt ?? now
    const elapsed = now - born
    const total   = 3 * 24 * 60 * 60 * 1000
    barPct   = Math.min(100, Math.floor((elapsed / total) * 100))
    barColor = { r: 0.6, g: 0.5, b: 0.9, a: 1 }
    tileBg   = { r: 0.12, g: 0.10, b: 0.18, a: 1 }
    midLabel = STAGE_LABEL.adolescent
    subLabel = `Adult in ${formatMs(total - elapsed)}`
  } else if (stage === 'harvestable') {
    barPct   = 100
    barColor = C.green
    tileBg   = { r: 0.07, g: 0.18, b: 0.07, a: 1 }
    midLabel = STAGE_LABEL.harvestable
    subLabel = 'Tap harvest to collect meat'
  } else {
    const adultAt      = pig.becameAdultAt ?? pig.purchasedAt
    const timeAsAdult  = now - adultAt
    barPct   = Math.min(100, Math.floor((timeAsAdult / PIG_HARVEST_AGE_MS) * 100))
    barColor = C.gold
    tileBg   = { r: 0.14, g: 0.12, b: 0.04, a: 1 }
    midLabel = STAGE_LABEL.adult
    if (!hasFood) {
      subLabel = 'No food in bowl'
    } else if (pig.lastManureAt > 0) {
      const mRem = Math.max(0, pig.lastManureAt + PIG_CYCLE_MS - now)
      subLabel = mRem > 0 ? `Manure in ${formatMs(mRem)}` : 'Manure ready!'
    }
  }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column', alignItems: 'center',
        width: 260, height: 260,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 8 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`Pig ${index + 1}`} fontSize={21} color={C.textMain} textAlign="middle-center" />
      <Label
        value={midLabel} fontSize={19}
        color={canHarvest ? C.green : C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 3 } }}
      />
      {subLabel !== '' && (
        <Label value={subLabel} fontSize={15} color={C.textMute}
          textAlign="middle-center" uiTransform={{ margin: { top: 3 } }} />
      )}
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: 8 } }}>
        <UiEntity uiTransform={{ width: '100%', height: 10 }} uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}>
          <UiEntity uiTransform={{ width: `${barPct}%`, height: '100%' }} uiBackground={{ color: barColor }} />
        </UiEntity>
      </UiEntity>
      {canHarvest && (
        <UiEntity
          uiTransform={{ width: 200, height: 42, margin: { top: 8 }, justifyContent: 'center', alignItems: 'center' }}
          uiBackground={{ color: { r: 0.6, g: 0.25, b: 0.05, a: 1 } }}
          onMouseDown={() => { playSound('harvest'); harvestPig(pig.id) }}
        >
          <Label value="Harvest Meat" fontSize={19} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      )}
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Dirt tile — uses MANURE_ICON
// ---------------------------------------------------------------------------

const DirtTile = ({ now: _now }: { now: number }) => {
  const isDirty   = playerState.pigPenDirtyAt > 0
  const count     = playerState.pigs.length
  const interval  = count > 0 ? getDirtIntervalMs(count) : DIRT_BASE_INTERVAL_MS
  const accumMs   = playerState.penDirtAccumMs
  const barPct    = isDirty ? 100 : Math.min(100, Math.floor((accumMs / interval) * 100))
  const barColor  = isDirty ? { r: 0.85, g: 0.55, b: 0.1, a: 1 } : C.gold
  const tileBg    = isDirty ? { r: 0.22, g: 0.14, b: 0.04, a: 1 } : { r: 0.11, g: 0.14, b: 0.09, a: 1 }
  const hasFood   = playerState.pigFoodInBowl > 0
  const remaining = Math.max(0, interval - accumMs)

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column', alignItems: 'center',
        width: 260, height: 260,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 8 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: MANURE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch', color: isDirty ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 } }}
      />
      <Label value="Pen Cleanliness" fontSize={20} color={C.textMain} textAlign="middle-center" />
      <Label
        value={isDirty ? 'Needs cleaning!' : 'Clean'}
        fontSize={19}
        color={isDirty ? { r: 1, g: 0.6, b: 0.1, a: 1 } : C.green}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 3 } }}
      />
      <Label
        value={hasFood ? `Bowl: ${playerState.pigFoodInBowl} units` : 'Bowl empty — click in scene'}
        fontSize={15}
        color={hasFood ? C.gold : { r: 0.9, g: 0.35, b: 0.35, a: 1 }}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 3 } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: 8 } }}>
        <UiEntity uiTransform={{ width: '100%', height: 10 }} uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}>
          <UiEntity uiTransform={{ width: `${barPct}%`, height: '100%' }} uiBackground={{ color: barColor }} />
        </UiEntity>
        <Label
          value={isDirty ? 'Click the dirt pile in the scene' : (count > 0 ? `Next mess in ${formatMs(remaining)}` : 'No pigs')}
          fontSize={15} color={C.textMute}
          textAlign="middle-center" uiTransform={{ margin: { top: 5 } }} />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Breeding tab content
// ---------------------------------------------------------------------------

const BreedingTab = ({ now }: { now: number }) => {
  const eligibleCount = playerState.pigs.filter((p) => {
    const stage = getPigStage(p, now)
    return (stage === 'adult' || stage === 'harvestable') && (now - p.lastBreedAt) >= PIG_BREED_COOLDOWN
  }).length
  const atMax    = playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING
  const canBreed = eligibleCount >= 2 && !atMax

  return (
    <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
      {/* Breed tile */}
      <UiEntity
        uiTransform={{
          flexDirection: 'column', alignItems: 'center',
          width: 260, height: 260,
          margin: { right: 12, bottom: 12 },
          padding: { top: 14, bottom: 14, left: 12, right: 12 },
        }}
        uiBackground={{ color: canBreed ? { r: 0.07, g: 0.15, b: 0.20, a: 1 } : C.rowBg }}
      >
        <UiEntity
          uiTransform={{ width: 72, height: 72, margin: { bottom: 8 }, flexShrink: 0 }}
          uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label value="Breeding" fontSize={20} color={C.textMain} textAlign="middle-center" />
        <Label
          value={atMax ? `Pen full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})` :
                 canBreed ? `${eligibleCount} adults ready` :
                 `Need 2 adults (${eligibleCount} ready)`}
          fontSize={17}
          color={canBreed ? C.green : C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 4 } }}
        />
        <UiEntity
          uiTransform={{ width: 200, height: 42, margin: { top: 12 }, justifyContent: 'center', alignItems: 'center' }}
          uiBackground={{ color: canBreed ? { r: 0.2, g: 0.45, b: 0.6, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
          onMouseDown={canBreed ? () => { playSound('buttonclick'); breedPigs() } : undefined}
        >
          <Label value="Breed Pigs" fontSize={19} color={canBreed ? C.textMain : C.textMute} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {/* Info */}
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: 320,
          padding: { top: 14, bottom: 14, left: 14, right: 14 },
          margin: { bottom: 12 },
        }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label value="How breeding works" fontSize={20} color={C.header} uiTransform={{ margin: { bottom: 8 } }} />
        <Label value="Need 2 adult pigs, each off a 24h cooldown." fontSize={16} color={C.textMute} uiTransform={{ margin: { bottom: 4 } }} />
        <Label value="Produces a piglet that grows over 3 days." fontSize={16} color={C.textMute} uiTransform={{ margin: { bottom: 4 } }} />
        <Label value="Piglets inherit feed bonuses from parents." fontSize={16} color={C.textMute} />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const PigPenPanel = () => {
  const now = Date.now()
  const tab = pigPenTab.value

  if (!playerState.pigPenOwned) {
    const canAfford = playerState.coins >= BUILDING_BUY_PRICE
    const levelMet  = playerState.level >= PIG_PEN_UNLOCK_LEVEL
    return (
      <PanelShell title="Pig Pen" onClose={() => { playerState.activeMenu = 'none' }}>
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <UiEntity
            uiTransform={{ width: 90, height: 90, margin: { bottom: 16 }, flexShrink: 0 }}
            uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch', color: levelMet ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 } }}
          />
          {!levelMet ? (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Locked" fontSize={32} color={C.textMute} textAlign="middle-center" />
              <Label value={`Unlocks at Level ${PIG_PEN_UNLOCK_LEVEL}`} fontSize={24} color={C.textMute}
                textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
            </UiEntity>
          ) : (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Pig Pen available!" fontSize={30} color={C.textMain} textAlign="middle-center" />
              <Label value={`Cost: ${BUILDING_BUY_PRICE} coins`} fontSize={24} color={C.gold}
                textAlign="middle-center" uiTransform={{ margin: { top: 8, bottom: 20 } }} />
              <UiEntity
                uiTransform={{ width: 240, height: 60, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
                uiBackground={{ color: canAfford ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
                onMouseDown={canAfford ? () => { playSound('buttonclick'); purchaseBuilding('pig') } : undefined}
              >
                {canAfford ? (
                  <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Label value={`Buy for ${BUILDING_BUY_PRICE}`} fontSize={24} color={C.textMain} textAlign="middle-center" uiTransform={{ margin: { right: 8 } }} />
                    <UiEntity uiTransform={{ width: 28, height: 28 }} uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }} />
                  </UiEntity>
                ) : (
                  <Label value="Not enough coins" fontSize={24} color={C.textMute} textAlign="middle-center" />
                )}
              </UiEntity>
            </UiEntity>
          )}
        </UiEntity>
      </PanelShell>
    )
  }

  return (
    <PanelShell title="Pig Pen" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Tab bar */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 16 } }}>
        <UiEntity
          uiTransform={{ width: 180, height: 52, margin: { right: 12 }, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: tab === 'animals' ? { r: 0.6, g: 0.35, b: 0.05, a: 1 } : { r: 0.18, g: 0.14, b: 0.08, a: 1 } }}
          onMouseDown={() => { playSound('buttonclick'); pigPenTab.value = 'animals' }}
        >
          <Label value="Animals" fontSize={22} color={tab === 'animals' ? C.textMain : C.textMute} textAlign="middle-center" />
        </UiEntity>
        <UiEntity
          uiTransform={{ width: 180, height: 52, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: tab === 'breeding' ? { r: 0.6, g: 0.35, b: 0.05, a: 1 } : { r: 0.18, g: 0.14, b: 0.08, a: 1 } }}
          onMouseDown={() => { playSound('buttonclick'); pigPenTab.value = 'breeding' }}
        >
          <Label value="Breeding" fontSize={22} color={tab === 'breeding' ? C.textMain : C.textMute} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>

      {/* Animals tab */}
      {tab === 'animals' && (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
          <DirtTile now={now} />

          {playerState.pigs.length === 0 ? (
            <UiEntity
              uiTransform={{
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: 260, height: 260,
                margin: { right: 12, bottom: 12 },
                padding: { top: 14, bottom: 14, left: 12, right: 12 },
              }}
              uiBackground={{ color: { r: 0.11, g: 0.11, b: 0.11, a: 1 } }}
            >
              <Label value="No pigs yet" fontSize={22} color={C.textMute} textAlign="middle-center" />
              <Label value="Buy some in the Shop" fontSize={18} color={C.textMute}
                textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
            </UiEntity>
          ) : (
            playerState.pigs.map((pig, i) => (
              <PigTile key={pig.id} pig={pig} index={i} now={now} />
            ))
          )}

          {playerState.pigMeatCount > 0 && (
            <UiEntity
              uiTransform={{
                flexDirection: 'column', alignItems: 'center',
                width: 260, height: 260,
                margin: { right: 12, bottom: 12 },
                padding: { top: 14, bottom: 14, left: 12, right: 12 },
              }}
              uiBackground={{ color: { r: 0.16, g: 0.08, b: 0.05, a: 1 } }}
            >
              <UiEntity
                uiTransform={{ width: 72, height: 72, margin: { bottom: 8 }, flexShrink: 0 }}
                uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
              />
              <Label value="Pig Meat" fontSize={22} color={C.textMain} textAlign="middle-center" />
              <Label value={`x${playerState.pigMeatCount} — sell at market`} fontSize={17}
                color={C.orange} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
            </UiEntity>
          )}
        </UiEntity>
      )}

      {/* Breeding tab */}
      {tab === 'breeding' && <BreedingTab now={now} />}

    </PanelShell>
  )
}
