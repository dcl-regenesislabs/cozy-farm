import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { EGG_CYCLE_MS, CHICKEN_COOP_UNLOCK_LEVEL, BUILDING_BUY_PRICE, getDirtIntervalMs, DIRT_BASE_INTERVAL_MS } from '../data/animalData'
import { EGG_ICON, CHICKEN_ICON, MANURE_ICON, COINS_IMAGE } from '../data/imagePaths'
import { purchaseBuilding } from '../systems/animalSystem'
import { playSound } from '../systems/sfxSystem'
import { C } from './PanelShell'

function formatMs(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ─── Shop atlas frame — mirrors ShopMenu.tsx constants ───────────────────────
const SHOP_ATLAS      = 'assets/images/ui_loading/chicken_atlas.png'
const SHOP_ATLAS_SIZE = 1024
const SHOP_BG_RECT    = { x: 17, y: 13, w: 993, h: 682 } as const
const UI_SCALE        = 0.8
const ss              = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1290)
const PANEL_H          = Math.round((PANEL_W * SHOP_BG_RECT.h) / SHOP_BG_RECT.w)
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

const CARD_BORDER         = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL           = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT           = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE      = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const FRAME_THICKNESS     = 4

function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = SHOP_ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── Coop card dimensions ─────────────────────────────────────────────────────
const CARD_W      = ss(210)   // 168 — 5 per row in 939px content area
const CARD_H      = ss(256)   // 205
const CARD_MARGIN = ss(14)    // 11
const CARD_ICON   = ss(88)    // 70
const CARD_TITLE  = ss(24)    // 19
const CARD_STATUS = ss(21)    // 17
const CARD_SMALL  = ss(17)    // 14
const CARD_PAD_V  = ss(14)
const CARD_PAD_H  = ss(12)
const BAR_H       = 12
const BAR_RADIUS  = 6

type CardColor = { r: number; g: number; b: number; a: number }

// ─── CoopCard — shop-style card with variable state border ────────────────────
const CoopCard = ({
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

// ─── CoopPanelFrame — shop atlas background without tab chips ─────────────────
const CoopPanelFrame = ({
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
        texture: { src: SHOP_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: bgUvs(SHOP_BG_RECT),
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

      {/* Close button hotspot — aligned to the X drawn on the atlas */}
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

// ─── Tile components ──────────────────────────────────────────────────────────

type ChickenTileProps = { key?: string | number; index: number; lastEggAt: number; now: number }

const ChickenTile = ({ index, lastEggAt, now }: ChickenTileProps) => {
  const hasFood   = playerState.chickenFoodInBowl > 0
  const elapsed   = lastEggAt > 0 ? now - lastEggAt : 0
  const remaining = Math.max(0, EGG_CYCLE_MS - elapsed)
  const barPct    = lastEggAt > 0 ? Math.min(100, Math.floor((elapsed / EGG_CYCLE_MS) * 100)) : 0
  const isReady   = remaining === 0 && lastEggAt > 0

  let midLabel:    string
  let statusColor: CardColor
  let barColor:    CardColor
  let borderColor: CardColor

  if (!hasFood) {
    midLabel    = 'No food in bowl'
    statusColor = { r: 0.9,  g: 0.35, b: 0.35, a: 1    }
    barColor    = { r: 0.6,  g: 0.2,  b: 0.2,  a: 1    }
    borderColor = { r: 0.8,  g: 0.32, b: 0.24, a: 0.95 }
  } else if (isReady) {
    midLabel    = 'Egg ready!'
    statusColor = C.green
    barColor    = C.green
    borderColor = { r: 0.32, g: 0.78, b: 0.32, a: 0.95 }
  } else if (lastEggAt === 0) {
    midLabel    = 'Starting...'
    statusColor = CARD_TEXT_MUTE
    barColor    = CARD_TEXT_MUTE
    borderColor = CARD_BORDER
  } else {
    midLabel    = formatMs(remaining)
    statusColor = C.gold
    barColor    = C.gold
    borderColor = CARD_BORDER
  }

  return (
    <CoopCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: CHICKEN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={`Chicken ${index + 1}`} fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
      <Label
        value={midLabel}
        fontSize={CARD_STATUS}
        color={statusColor}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }}
      />
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
    </CoopCard>
  )
}

const DirtTile = ({ now: _now }: { now: number }) => {
  const isDirty  = playerState.chickenCoopDirtyAt > 0
  const count    = playerState.chickens.length
  const interval = count > 0 ? getDirtIntervalMs(count) : DIRT_BASE_INTERVAL_MS
  const accumMs  = playerState.coopDirtAccumMs
  const barPct   = isDirty ? 100 : Math.min(100, Math.floor((accumMs / interval) * 100))
  const remaining = Math.max(0, interval - accumMs)

  const barColor    = isDirty ? { r: 0.85, g: 0.55, b: 0.1, a: 1 } : C.gold
  const borderColor = isDirty
    ? { r: 0.85, g: 0.55, b: 0.1, a: 0.95 } as CardColor
    : CARD_BORDER

  return (
    <CoopCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: MANURE_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: isDirty ? { r: 1, g: 1, b: 1, a: 1 } : { r: 0.65, g: 0.65, b: 0.65, a: 1 },
        }}
      />
      <Label value="Coop Cleanliness" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
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
          value={isDirty ? 'Click the dirt pile in the scene' : (count > 0 ? `Next mess in ${formatMs(remaining)}` : 'No chickens')}
          fontSize={CARD_SMALL}
          color={CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4) } }}
        />
      </UiEntity>
    </CoopCard>
  )
}

const EggsTile = () => {
  const count      = playerState.eggsCount
  const hasFood    = playerState.chickenFoodInBowl > 0
  const borderColor = count > 0
    ? { r: 0.32, g: 0.78, b: 0.32, a: 0.95 } as CardColor
    : CARD_BORDER

  return (
    <CoopCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{ texture: { src: EGG_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value="Eggs" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
      <Label
        value={count > 0 ? `${count} ready — sell at market` : 'None collected yet'}
        fontSize={CARD_STATUS}
        color={count > 0 ? C.green : CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: { top: ss(8) } }}>
        <UiEntity
          uiTransform={{ width: '100%', height: BAR_H, borderRadius: BAR_RADIUS }}
          uiBackground={{ color: { r: 0.12, g: 0.08, b: 0.04, a: 1 } }}
        >
          <UiEntity
            uiTransform={{ width: `${Math.min(100, count * 10)}%`, height: '100%', borderRadius: BAR_RADIUS }}
            uiBackground={{ color: C.green }}
          />
        </UiEntity>
        <Label
          value={hasFood ? `Bowl: ${playerState.chickenFoodInBowl} units` : 'Bowl empty — click in scene'}
          fontSize={CARD_SMALL}
          color={hasFood ? C.gold : { r: 0.9, g: 0.35, b: 0.35, a: 1 }}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4) } }}
        />
      </UiEntity>
    </CoopCard>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const ChickenCoopPanel = () => {
  const now = Date.now()

  if (!playerState.chickenCoopOwned) {
    const canAfford = playerState.coins >= BUILDING_BUY_PRICE
    const levelMet  = playerState.level >= CHICKEN_COOP_UNLOCK_LEVEL
    return (
      <CoopPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <UiEntity
            uiTransform={{ width: ss(100), height: ss(100), margin: { bottom: ss(16) }, flexShrink: 0 }}
            uiBackground={{
              texture: { src: CHICKEN_ICON, wrapMode: 'clamp' },
              textureMode: 'stretch',
              color: levelMet ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1, a: 0.3 },
            }}
          />
          {!levelMet ? (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Locked" fontSize={ss(32)} color={C.textMute} textAlign="middle-center" />
              <Label
                value={`Unlocks at Level ${CHICKEN_COOP_UNLOCK_LEVEL}`}
                fontSize={ss(24)} color={C.textMute}
                textAlign="middle-center"
                uiTransform={{ margin: { top: ss(10) } }}
              />
            </UiEntity>
          ) : (
            <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center' }}>
              <Label value="Chicken Coop available!" fontSize={ss(30)} color={C.textMain} textAlign="middle-center" />
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
                uiBackground={{ color: canAfford ? { r: 0.2, g: 0.55, b: 0.2, a: 1 } : { r: 0.25, g: 0.25, b: 0.25, a: 1 } }}
                onMouseDown={canAfford ? () => { playSound('buttonclick'); purchaseBuilding('chicken') } : undefined}
              >
                <Label
                  value={canAfford ? `Buy for ${BUILDING_BUY_PRICE}` : 'Not enough coins'}
                  fontSize={ss(24)}
                  color={canAfford ? C.textMain : C.textMute}
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
      </CoopPanelFrame>
    )
  }

  return (
    <CoopPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'center', alignContent: 'flex-start' }}>

        <EggsTile />
        <DirtTile now={now} />

        {playerState.chickens.length === 0 ? (
          <CoopCard>
            <UiEntity
              uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: CHICKEN_ICON, wrapMode: 'clamp' }, textureMode: 'stretch', color: { r: 1, g: 1, b: 1, a: 0.3 } }}
            />
            <Label value="No chickens yet" fontSize={CARD_TITLE} color={CARD_TEXT} textAlign="middle-center" />
            <Label
              value="Buy some in the Shop"
              fontSize={CARD_STATUS} color={CARD_TEXT_MUTE}
              textAlign="middle-center"
              uiTransform={{ margin: { top: ss(8) } }}
            />
          </CoopCard>
        ) : (
          playerState.chickens.map((chicken, i) => (
            <ChickenTile key={chicken.id} index={i} lastEggAt={chicken.lastEggAt} now={now} />
          ))
        )}

      </UiEntity>
    </CoopPanelFrame>
  )
}
