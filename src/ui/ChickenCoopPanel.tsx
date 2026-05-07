import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'
import { EGG_CYCLE_MS, CHICKEN_COOP_UNLOCK_LEVEL, BUILDING_BUY_PRICE, getDirtIntervalMs } from '../data/animalData'
import { EGG_ICON, CHICKEN_ICON, MANURE_ICON, COINS_IMAGE } from '../data/imagePaths'
import { purchaseBuilding } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'

function formatMs(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------

type ChickenTileProps = { key?: string | number; index: number; lastEggAt: number; now: number }

const ChickenTile = ({ index, lastEggAt, now }: ChickenTileProps) => {
  const hasFood   = playerState.chickenFoodInBowl > 0
  const elapsed   = lastEggAt > 0 ? now - lastEggAt : 0
  const remaining = Math.max(0, EGG_CYCLE_MS - elapsed)
  const barPct    = lastEggAt > 0 ? Math.min(100, Math.floor((elapsed / EGG_CYCLE_MS) * 100)) : 0
  const isReady   = remaining === 0 && lastEggAt > 0

  let tileBg: { r: number; g: number; b: number; a: number }
  let midLabel: string
  let barColor: { r: number; g: number; b: number; a: number }

  if (!hasFood) {
    midLabel = 'No food in bowl'
    barColor = { r: 0.6, g: 0.2, b: 0.2, a: 1 }
    tileBg   = { r: 0.16, g: 0.08, b: 0.08, a: 1 }
  } else if (isReady) {
    midLabel = 'Egg ready!'
    barColor = C.green
    tileBg   = { r: 0.07, g: 0.18, b: 0.07, a: 1 }
  } else if (lastEggAt === 0) {
    midLabel = 'Starting...'
    barColor = C.textMute
    tileBg   = C.rowBg
  } else {
    midLabel = formatMs(remaining)
    barColor = C.gold
    tileBg   = { r: 0.14, g: 0.12, b: 0.04, a: 1 }
  }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column', alignItems: 'center',
        width: 260, height: 230,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: CHICKEN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`Chicken ${index + 1}`} fontSize={22} color={C.textMain} textAlign="middle-center" />
      <Label
        value={midLabel} fontSize={19}
        color={!hasFood ? { r: 0.9, g: 0.35, b: 0.35, a: 1 } : isReady ? C.green : C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
      <UiEntity uiTransform={{ width: '100%', margin: { top: 8 } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: 10 }}
          uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${barPct}%`, height: '100%' }}
            uiBackground={{ color: barColor }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

const DirtTile = ({ now }: { now: number }) => {
  const isDirty  = playerState.chickenCoopDirtyAt > 0
  const barPct   = isDirty ? 100 : 0
  const barColor = isDirty ? { r: 0.85, g: 0.55, b: 0.1, a: 1 } : C.textMute
  const tileBg   = isDirty ? { r: 0.22, g: 0.14, b: 0.04, a: 1 } : { r: 0.11, g: 0.14, b: 0.09, a: 1 }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column', alignItems: 'center',
        width: 260, height: 230,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: MANURE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch', color: isDirty ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 } }}
      />
      <Label value="Coop Cleanliness" fontSize={20} color={C.textMain} textAlign="middle-center" />
      <Label
        value={isDirty ? 'Needs cleaning!' : 'Clean'}
        fontSize={19}
        color={isDirty ? { r: 1, g: 0.6, b: 0.1, a: 1 } : C.green}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: 8 } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: 10 }}
          uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${barPct}%`, height: '100%' }}
            uiBackground={{ color: barColor }}
          />
        </UiEntity>
        {isDirty && (
          <Label value="Click the dirt pile in the scene"
            fontSize={15} color={C.textMute}
            textAlign="middle-center" uiTransform={{ margin: { top: 5 } }} />
        )}
      </UiEntity>
    </UiEntity>
  )
}

const EggsTile = () => {
  const count   = playerState.eggsCount
  const hasFood = playerState.chickenFoodInBowl > 0
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column', alignItems: 'center',
        width: 260, height: 230,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: count > 0 ? { r: 0.07, g: 0.18, b: 0.07, a: 1 } : C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{ texture: { src: EGG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Eggs" fontSize={22} color={C.textMain} textAlign="middle-center" />
      <Label
        value={count > 0 ? `${count} ready — sell at market` : 'None collected yet'}
        fontSize={17}
        color={count > 0 ? C.green : C.textMute}
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: 8 } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: 10 }}
          uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${Math.min(100, count * 10)}%`, height: '100%' }}
            uiBackground={{ color: C.green }}
          />
        </UiEntity>
        <Label
          value={hasFood ? `Bowl: ${playerState.chickenFoodInBowl} units` : 'Bowl empty — click in scene'}
          fontSize={15}
          color={hasFood ? C.gold : { r: 0.9, g: 0.35, b: 0.35, a: 1 }}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 5 } }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const ChickenCoopPanel = () => {
  const now = Date.now()

  if (!playerState.chickenCoopOwned) {
    const canAfford = playerState.coins >= BUILDING_BUY_PRICE
    const levelMet  = playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL
    return (
      <PanelShell title="Chicken Coop" onClose={() => { playerState.activeMenu = 'none' }}>
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          {!levelMet ? (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Locked" fontSize={32} color={C.textMute} textAlign="middle-center" />
              <Label value={`Unlocks at Level ${CHICKEN_COOP_UNLOCK_LEVEL}`} fontSize={24} color={C.textMute}
                textAlign="middle-center" uiTransform={{ margin: { top: 10 } }} />
            </UiEntity>
          ) : (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Chicken Coop available!" fontSize={30} color={C.textMain} textAlign="middle-center" />
              <Label value={`Cost: ${BUILDING_BUY_PRICE} coins`} fontSize={24} color={C.gold}
                textAlign="middle-center" uiTransform={{ margin: { top: 8, bottom: 20 } }} />
              <UiEntity
                uiTransform={{ width: 240, height: 60, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
                uiBackground={{ color: canAfford ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
                onMouseDown={canAfford ? () => { playSound('buttonclick'); purchaseBuilding('chicken') } : undefined}
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
    <PanelShell title="🐔 Chicken Coop" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>

        <EggsTile />
        <DirtTile now={now} />

        {playerState.chickens.length === 0 ? (
          <UiEntity
            uiTransform={{
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 260, height: 230,
              margin: { right: 12, bottom: 12 },
              padding: { top: 14, bottom: 14, left: 12, right: 12 },
            }}
            uiBackground={{ color: { r: 0.11, g: 0.11, b: 0.11, a: 1 } }}
          >
            <Label value="No chickens yet" fontSize={22} color={C.textMute} textAlign="middle-center" />
            <Label value="Buy some in the Shop" fontSize={18} color={C.textMute}
              textAlign="middle-center" uiTransform={{ margin: { top: 8 } }} />
          </UiEntity>
        ) : (
          playerState.chickens.map((chicken, i) => (
            <ChickenTile key={chicken.id} index={i} lastEggAt={chicken.lastEggAt} now={now} />
          ))
        )}

      </UiEntity>
    </PanelShell>
  )
}
