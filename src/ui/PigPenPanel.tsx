import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import {
  PIG_HARVEST_AGE_MS, PIG_PEN_UNLOCK_LEVEL, BUILDING_BUY_PRICE,
  MAX_ANIMALS_PER_BUILDING, getPigStage, PIG_BREED_COOLDOWN, getDirtIntervalMs, DIRT_BASE_INTERVAL_MS,
  PIG_CYCLE_MS,
} from '../data/animalData'
import { PIG_ICON, MANURE_ICON, COINS_IMAGE } from '../data/imagePaths'
import { breedPigs, harvestPig, purchaseBuilding } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'
import { C } from './PanelShell'
import type { PigData } from '../game/gameState'

// ─── Pig atlas frame — same layout as chicken_atlas ───────────────────────────
const PIG_ATLAS       = 'assets/images/ui_loading/pig_atlas.png'
const ATLAS_SIZE      = 1024
const BG_RECT         = { x: 17, y: 13, w: 993, h: 682 } as const
const UI_SCALE        = 0.8
const ss              = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1290)
const PANEL_H          = Math.round((PANEL_W * BG_RECT.h) / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(120)
const CONTENT_LEFT     = ss(82)
const CONTENT_RIGHT    = ss(34)
const CONTENT_TOP      = ss(176)
const CONTENT_BOTTOM   = ss(74)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)
const CLOSE_BTN_IMG    = 'assets/images/ui_loading/closebutton.png'

// ─── Card colours ─────────────────────────────────────────────────────────────
const CARD_BORDER     = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL       = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT       = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE  = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const FRAME_THICKNESS = 4

// ─── Card dimensions ─────────────────────────────────────────────────────────
const CARD_W      = ss(210)
const CARD_H      = ss(256)
const CARD_MARGIN = ss(14)
const CARD_ICON   = ss(88)
const CARD_TITLE  = ss(24)
const CARD_STATUS = ss(21)
const CARD_SMALL  = ss(17)
const CARD_PAD_V  = ss(14)
const CARD_PAD_H  = ss(12)
const BAR_H       = 12
const BAR_RADIUS  = 6

type CardColor = { r: number; g: number; b: number; a: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

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

// ─── Tab state ────────────────────────────────────────────────────────────────
const pigPenTab = { value: 'animals' as 'animals' | 'breeding' }

// ─── PigCard ──────────────────────────────────────────────────────────────────
const PigCard = ({
  borderColor = CARD_BORDER,
  children,
}: {
  borderColor?: CardColor
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: CARD_W,
        height: CARD_H,
        margin: { right: CARD_MARGIN, bottom: CARD_MARGIN },
        padding: { top: CARD_PAD_V, bottom: CARD_PAD_V, left: CARD_PAD_H, right: CARD_PAD_H },
        borderWidth: 3,
        borderColor,
        borderRadius: 12,
      }}
      uiBackground={{ color: CARD_FILL }}
    >
      {children}
    </UiEntity>
  )
}

// ─── PigPanelFrame ────────────────────────────────────────────────────────────
const PigPanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: 0, left: 0 },
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      pointerFilter: 'none',
    }}
  >
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        pointerFilter: 'block',
      }}
    />
    <UiEntity
      uiTransform={{
        width: PANEL_W,
        height: PANEL_H,
        margin: { top: PANEL_TOP_MARGIN },
        pointerFilter: 'block',
      }}
      uiBackground={{
        texture: { src: PIG_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: bgUvs(BG_RECT),
      }}
    >
      {/* Content area */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: CONTENT_LEFT, top: CONTENT_TOP },
          width: CONTENT_W,
          height: CONTENT_H,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </UiEntity>

      {/* Close button hotspot */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: isMobile() ? { right: ss(20), top: ss(8) } : { right: CLOSE_RIGHT, top: CLOSE_TOP },
          width: isMobile() ? ss(90) : CLOSE_SIZE,
          height: isMobile() ? ss(90) : CLOSE_SIZE,
        }}
        uiBackground={isMobile() ? { texture: { src: CLOSE_BTN_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' } : undefined}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  </UiEntity>
)

// ─── PigTile ──────────────────────────────────────────────────────────────────
type PigTileProps = { key?: string | number; pig: PigData; index: number; now: number }

const PigTile = ({ pig, index, now }: PigTileProps) => {
  const stage      = getPigStage(pig, now)
  const hasFood    = playerState.pigFoodInBowl > 0
  const canHarvest = stage === 'harvestable'

  let midLabel: string
  let subLabel = ''
  let barPct   = 0
  let barColor: CardColor
  let borderColor: CardColor

  if (stage === 'piglet') {
    const born    = pig.bornAt ?? now
    const elapsed = now - born
    const total   = 24 * 60 * 60 * 1000
    barPct      = Math.min(100, Math.floor((elapsed / total) * 100))
    barColor    = { r: 0.7, g: 0.5, b: 0.9, a: 1 }
    borderColor = { r: 0.7, g: 0.5, b: 0.9, a: 0.95 }
    midLabel    = STAGE_LABEL.piglet
    subLabel    = `Adolescent in ${formatMs(total - elapsed)}`
  } else if (stage === 'adolescent') {
    const born    = pig.bornAt ?? now
    const elapsed = now - born
    const total   = 3 * 24 * 60 * 60 * 1000
    barPct      = Math.min(100, Math.floor((elapsed / total) * 100))
    barColor    = { r: 0.5, g: 0.5, b: 0.9, a: 1 }
    borderColor = { r: 0.5, g: 0.5, b: 0.9, a: 0.95 }
    midLabel    = STAGE_LABEL.adolescent
    subLabel    = `Adult in ${formatMs(total - elapsed)}`
  } else if (stage === 'harvestable') {
    barPct      = 100
    barColor    = C.green
    borderColor = { r: 0.32, g: 0.78, b: 0.32, a: 0.95 }
    midLabel    = STAGE_LABEL.harvestable
    subLabel    = 'Tap harvest to collect meat'
  } else {
    const adultAt     = pig.becameAdultAt ?? pig.purchasedAt
    const timeAsAdult = now - adultAt
    barPct      = Math.min(100, Math.floor((timeAsAdult / PIG_HARVEST_AGE_MS) * 100))
    barColor    = C.gold
    borderColor = !hasFood ? { r: 0.8, g: 0.32, b: 0.24, a: 0.95 } : CARD_BORDER
    midLabel    = STAGE_LABEL.adult
    if (!hasFood) {
      subLabel = 'No food in bowl'
    } else if (pig.lastManureAt > 0) {
      const mRem = Math.max(0, pig.lastManureAt + PIG_CYCLE_MS - now)
      subLabel = mRem > 0 ? `Manure in ${formatMs(mRem)}` : 'Manure ready!'
    }
  }

  return (
    <PigCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`Pig ${index + 1}`} fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
      <Label
        value={midLabel}
        fontSize={CARD_STATUS}
        color={canHarvest ? C.green : CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }}
      />
      {subLabel !== '' && (
        <Label value={subLabel} fontSize={CARD_SMALL} color={CARD_TEXT_MUTE}
          textAlign="middle-center" uiTransform={{ margin: { top: ss(3) } }} />
      )}
      <UiEntity uiTransform={{ width: '100%', margin: { top: ss(8) } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: BAR_H, borderRadius: BAR_RADIUS }}
          uiBackground={{ color: { r: 0.12, g: 0.08, b: 0.04, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${barPct}%`, height: '100%', borderRadius: BAR_RADIUS }}
            uiBackground={{ color: barColor }}
          />
        </UiEntity>
      </UiEntity>
      {canHarvest && (
        <UiEntity
          uiTransform={{
            width: ss(160), height: ss(38), margin: { top: ss(8) },
            justifyContent: 'center', alignItems: 'center', borderRadius: 8,
          }}
          uiBackground={{ color: { r: 0.45, g: 0.26, b: 0.06, a: 1 } }}
          onMouseDown={() => { playSound('harvest'); harvestPig(pig.id) }}
        >
          <Label value="Harvest Meat" fontSize={ss(18)} color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }} textAlign="middle-center" />
        </UiEntity>
      )}
    </PigCard>
  )
}

// ─── DirtTile ─────────────────────────────────────────────────────────────────
const DirtTile = ({ now: _now }: { now: number }) => {
  const isDirty   = playerState.pigPenDirtyAt > 0
  const count     = playerState.pigs.length
  const interval  = count > 0 ? getDirtIntervalMs(count) : DIRT_BASE_INTERVAL_MS
  const accumMs   = playerState.penDirtAccumMs
  const barPct    = isDirty ? 100 : Math.min(100, Math.floor((accumMs / interval) * 100))
  const remaining = Math.max(0, interval - accumMs)
  const barColor  = isDirty ? { r: 0.85, g: 0.55, b: 0.1, a: 1 } : C.gold
  const borderColor = isDirty
    ? { r: 0.85, g: 0.55, b: 0.1, a: 0.95 } as CardColor
    : CARD_BORDER

  return (
    <PigCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: MANURE_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: isDirty ? { r: 1, g: 1, b: 1, a: 1 } : { r: 0.65, g: 0.65, b: 0.65, a: 1 },
        }}
      />
      <Label value="Pen Cleanliness" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
      <Label
        value={isDirty ? 'Needs cleaning!' : 'Clean'}
        fontSize={CARD_STATUS}
        color={isDirty ? { r: 1, g: 0.6, b: 0.1, a: 1 } : C.green}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: ss(8) } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: BAR_H, borderRadius: BAR_RADIUS }}
          uiBackground={{ color: { r: 0.12, g: 0.08, b: 0.04, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${barPct}%`, height: '100%', borderRadius: BAR_RADIUS }}
            uiBackground={{ color: barColor }}
          />
        </UiEntity>
        <Label
          value={isDirty ? 'Click the dirt pile in the scene' : (count > 0 ? `Next mess in ${formatMs(remaining)}` : 'No pigs')}
          fontSize={CARD_SMALL}
          color={CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4) } }}
        />
      </UiEntity>
    </PigCard>
  )
}

// ─── MeatTile ─────────────────────────────────────────────────────────────────
const MeatTile = () => (
  <PigCard borderColor={{ r: 0.85, g: 0.45, b: 0.15, a: 0.95 }}>
    <UiEntity
      uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
      uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />
    <Label value="Pig Meat" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
    <Label
      value={`x${playerState.pigMeatCount} — sell at market`}
      fontSize={CARD_STATUS}
      color={C.orange}
      textAlign="middle-center"
      uiTransform={{ margin: { top: ss(4) } }}
    />
  </PigCard>
)

// ─── BreedingTab ──────────────────────────────────────────────────────────────
const BreedingTab = ({ now }: { now: number }) => {
  const eligibleCount = playerState.pigs.filter((p) => {
    const stage = getPigStage(p, now)
    return (stage === 'adult' || stage === 'harvestable') && (now - p.lastBreedAt) >= PIG_BREED_COOLDOWN
  }).length
  const atMax    = playerState.pigs.length >= MAX_ANIMALS_PER_BUILDING
  const canBreed = eligibleCount >= 2 && !atMax

  return (
    <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
      <PigCard borderColor={canBreed ? { r: 0.32, g: 0.78, b: 0.32, a: 0.95 } : CARD_BORDER}>
        <UiEntity
          uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
          uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
        <Label value="Breeding" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
        <Label
          value={atMax ? `Pen full (${MAX_ANIMALS_PER_BUILDING}/${MAX_ANIMALS_PER_BUILDING})` :
                 canBreed ? `${eligibleCount} adults ready` :
                 `Need 2 adults (${eligibleCount} ready)`}
          fontSize={CARD_STATUS}
          color={canBreed ? C.green : CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4) } }}
        />
        <UiEntity
          uiTransform={{
            width: ss(160), height: ss(38), margin: { top: ss(10) },
            justifyContent: 'center', alignItems: 'center', borderRadius: 8,
          }}
          uiBackground={{ color: canBreed ? { r: 0.45, g: 0.26, b: 0.06, a: 1 } : { r: 0.30, g: 0.22, b: 0.10, a: 1 } }}
          onMouseDown={canBreed ? () => { playSound('buttonclick'); breedPigs() } : undefined}
        >
          <Label value="Breed Pigs" fontSize={ss(18)} color={canBreed ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : CARD_TEXT_MUTE} textAlign="middle-center" />
        </UiEntity>
      </PigCard>

      {/* Info card */}
      <PigCard>
        <Label value="How it works" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center"
          uiTransform={{ margin: { bottom: ss(8) } }} />
        <Label value="Need 2 adult pigs off a 24h cooldown." fontSize={CARD_SMALL} color={CARD_TEXT_MUTE}
          uiTransform={{ margin: { bottom: ss(4) } }} />
        <Label value="Produces a piglet that grows over 3 days." fontSize={CARD_SMALL} color={CARD_TEXT_MUTE}
          uiTransform={{ margin: { bottom: ss(4) } }} />
        <Label value="Piglets inherit feed bonuses from parents." fontSize={CARD_SMALL} color={CARD_TEXT_MUTE} />
      </PigCard>
    </UiEntity>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
const TAB_H    = ss(44)
const TAB_W    = ss(160)
const TAB_GAP  = ss(10)

const TabBar = ({ tab }: { tab: 'animals' | 'breeding' }) => (
  <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: ss(14) }, flexShrink: 0 }}>
    <UiEntity
      uiTransform={{ width: TAB_W, height: TAB_H, margin: { right: TAB_GAP }, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
      uiBackground={{ color: tab === 'animals' ? { r: 0.45, g: 0.26, b: 0.06, a: 0.9 } : { r: 0.30, g: 0.18, b: 0.05, a: 0.5 } }}
      onMouseDown={() => { playSound('buttonclick'); pigPenTab.value = 'animals' }}
    >
      <Label value="Animals" fontSize={ss(20)} color={tab === 'animals' ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : CARD_TEXT_MUTE} textAlign="middle-center" />
    </UiEntity>
    <UiEntity
      uiTransform={{ width: TAB_W, height: TAB_H, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
      uiBackground={{ color: tab === 'breeding' ? { r: 0.45, g: 0.26, b: 0.06, a: 0.9 } : { r: 0.30, g: 0.18, b: 0.05, a: 0.5 } }}
      onMouseDown={() => { playSound('buttonclick'); pigPenTab.value = 'breeding' }}
    >
      <Label value="Breeding" fontSize={ss(20)} color={tab === 'breeding' ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : CARD_TEXT_MUTE} textAlign="middle-center" />
    </UiEntity>
  </UiEntity>
)

// ─── Main panel ───────────────────────────────────────────────────────────────
export const PigPenPanel = () => {
  const now = Date.now()
  const tab = pigPenTab.value

  if (!playerState.pigPenOwned) {
    const canAfford = playerState.coins >= BUILDING_BUY_PRICE
    const levelMet  = playerState.level >= PIG_PEN_UNLOCK_LEVEL
    return (
      <PigPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <UiEntity
            uiTransform={{ width: ss(100), height: ss(100), margin: { bottom: ss(16) }, flexShrink: 0 }}
            uiBackground={{
              texture: { src: PIG_ICON, wrapMode: 'clamp' },
              textureMode: 'stretch',
              color: levelMet ? { r: 1, g: 1, b: 1, a: 1 } : { r: 0.65, g: 0.65, b: 0.65, a: 1 },
            }}
          />
          {!levelMet ? (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Locked" fontSize={ss(32)} color={CARD_TEXT_MUTE} textAlign="middle-center" />
              <Label
                value={`Unlocks at Level ${PIG_PEN_UNLOCK_LEVEL}`}
                fontSize={ss(24)} color={CARD_TEXT_MUTE}
                textAlign="middle-center"
                uiTransform={{ margin: { top: ss(10) } }}
              />
            </UiEntity>
          ) : (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Pig Pen available!" fontSize={ss(30)} color={CARD_TEXT} textAlign="middle-center" />
              <Label
                value={`Cost: ${BUILDING_BUY_PRICE} coins`}
                fontSize={ss(24)} color={C.gold}
                textAlign="middle-center"
                uiTransform={{ margin: { top: ss(8), bottom: ss(20) } }}
              />
              <UiEntity
                uiTransform={{
                  width: ss(260), height: ss(64),
                  justifyContent: 'center', alignItems: 'center',
                  flexDirection: 'row', borderRadius: 10,
                }}
                uiBackground={{ color: canAfford ? { r: 0.45, g: 0.26, b: 0.06, a: 1 } : { r: 0.30, g: 0.22, b: 0.10, a: 1 } }}
                onMouseDown={canAfford ? () => { playSound('buttonclick'); purchaseBuilding('pig') } : undefined}
              >
                <Label
                  value={canAfford ? `Buy for ${BUILDING_BUY_PRICE}` : 'Not enough coins'}
                  fontSize={ss(24)}
                  color={canAfford ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : CARD_TEXT_MUTE}
                  textAlign="middle-center"
                  uiTransform={{ margin: { right: ss(8) } }}
                />
                {canAfford && (
                  <UiEntity
                    uiTransform={{ width: ss(28), height: ss(28), flexShrink: 0 }}
                    uiBackground={{ texture: { src: COINS_IMAGE, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                  />
                )}
              </UiEntity>
            </UiEntity>
          )}
        </UiEntity>
      </PigPanelFrame>
    )
  }

  return (
    <PigPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      <TabBar tab={tab} />

      {tab === 'animals' && (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'center', alignContent: 'flex-start' }}>
          <DirtTile now={now} />

          {playerState.pigs.length === 0 ? (
            <PigCard>
              <UiEntity
                uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
                uiBackground={{ texture: { src: PIG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch', color: { r: 0.65, g: 0.65, b: 0.65, a: 1 } }}
              />
              <Label value="No pigs yet" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
              <Label
                value="Buy some in the Shop"
                fontSize={CARD_STATUS} color={CARD_TEXT_MUTE}
                textAlign="middle-center"
                uiTransform={{ margin: { top: ss(8) } }}
              />
            </PigCard>
          ) : (
            playerState.pigs.map((pig, i) => (
              <PigTile key={pig.id} pig={pig} index={i} now={now} />
            ))
          )}

          {playerState.pigMeatCount > 0 && <MeatTile />}
        </UiEntity>
      )}

      {tab === 'breeding' && <BreedingTab now={now} />}
    </PigPanelFrame>
  )
}
