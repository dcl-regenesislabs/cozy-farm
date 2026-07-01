import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { C } from './PanelShell'
import { ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { formatTime } from '../systems/growthSystem'
import { fireCompostWasteAdded, fireCompostCollected } from '../systems/progressionEventsSystem'
import { onCollectFertilizer } from '../game/questState'

const COMPOST_CYCLE_MS          = 300_000  // 5 minutes per waste unit
const TUTORIAL_COMPOST_CYCLE_MS = 15_000   // 15 seconds during the Level 5 tutorial

// ─── Atlas frame — same scale/close-button convention as ShopMenu ───────────
const COMPOST_ATLAS   = 'assets/images/ui_loading/compostbin_atlas.png'
const CLOSE_BTN_IMG   = 'assets/images/ui_loading/closebutton.png'
const ATLAS_SIZE      = 1024
const BG_RECT         = { x: 75, y: 16, w: 874, h: 672 } as const
const UI_SCALE        = 0.8
const ss              = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1180)
const PANEL_H          = Math.round(PANEL_W * BG_RECT.h / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(190)
const CONTENT_LEFT     = ss(100)
const CONTENT_RIGHT    = ss(40)
const CONTENT_TOP      = ss(104)
const CONTENT_BOTTOM   = ss(24)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)

// Shop-style card chrome (matches ShopMenu's ShopCardFrame palette)
const CARD_BORDER = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL   = { r: 0.23, g: 0.13, b: 0.05, a: 0.34 }
const BTN_GREEN   = { r: 0.2,  g: 0.55, b: 0.2,  a: 1 }
const BTN_GRAY    = { r: 0.25, g: 0.25, b: 0.25, a: 1 }

function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

function getCompostState() {
  const now = Date.now()
  const wasteInBin = playerState.compostWasteCount
  const lastCollected = playerState.compostLastCollectedAt
  const cycleMs = playerState.tutorialCompostCycle ? TUTORIAL_COMPOST_CYCLE_MS : COMPOST_CYCLE_MS

  const timeElapsed = (lastCollected > 0 && wasteInBin > 0) ? now - lastCollected : 0
  const cyclesDone = Math.min(Math.floor(timeElapsed / cycleMs), wasteInBin)
  const nextCycleMs = (wasteInBin > cyclesDone && lastCollected > 0)
    ? cycleMs - (timeElapsed % cycleMs)
    : null

  return { wasteInBin, cyclesDone, nextCycleMs }
}

function collectReady() {
  const now = Date.now()
  const lastCollected = playerState.compostLastCollectedAt
  const wasteInBin = playerState.compostWasteCount
  if (wasteInBin === 0 || lastCollected === 0) return

  const cycleMs = playerState.tutorialCompostCycle ? TUTORIAL_COMPOST_CYCLE_MS : COMPOST_CYCLE_MS
  const elapsed = now - lastCollected
  const cycles = Math.min(Math.floor(elapsed / cycleMs), wasteInBin)
  if (cycles <= 0) return

  for (let i = 0; i < cycles; i++) {
    const fert = randomFertilizer()
    playerState.fertilizers.set(fert, (playerState.fertilizers.get(fert) ?? 0) + 1)
  }
  playerState.compostWasteCount -= cycles
  playerState.compostLastCollectedAt = now
  playSound('buttonclick')
  onCollectFertilizer(cycles)
  fireCompostCollected()
}

function addWaste() {
  if (playerState.organicWaste <= 0) return
  playerState.organicWaste -= 1
  playerState.compostWasteCount += 1
  if (playerState.compostLastCollectedAt === 0) {
    playerState.compostLastCollectedAt = Date.now()
  }
  playSound('buttonclick')
  fireCompostWasteAdded()
}

// ─── Panel frame — atlas background with the title & close X baked in ───────
const CompostPanelFrame = ({ onClose, children }: { onClose: () => void; children?: ReactEcs.JSX.ReactNode }) => {
  const mob = isMobile()
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', pointerFilter: 'none' }}
    >
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', pointerFilter: 'block' }} />
      <UiEntity
        uiTransform={{ width: PANEL_W, height: PANEL_H, margin: { top: PANEL_TOP_MARGIN }, pointerFilter: 'block' }}
        uiBackground={{ texture: { src: COMPOST_ATLAS, wrapMode: 'clamp' }, textureMode: 'stretch', uvs: bgUvs(BG_RECT) }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: CONTENT_LEFT, top: CONTENT_TOP },
            width: CONTENT_W,
            height: CONTENT_H,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: isMobile() ? { right: ss(20), top: ss(8) } : { right: CLOSE_RIGHT, top: CLOSE_TOP },
            width: isMobile() ? ss(90) : CLOSE_SIZE,
            height: isMobile() ? ss(90) : CLOSE_SIZE,
          }}
          uiBackground={mob ? { texture: { src: CLOSE_BTN_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' } : undefined}
          onMouseDown={() => { playSound('buttonclick'); onClose() }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ─── Section rule — plain thin line, no ornamentation ────────────────────────
const SectionRule = ({ width }: { width: number | '100%' }) => (
  <UiEntity uiTransform={{ width, height: 2 }} uiBackground={{ color: C.divider }} />
)

// ─── Fertilizer card — shop-style border, fill only on mobile ───────────────
type FertCardProps = { key?: number; fertType: FertilizerType }

const FertCard = ({ fertType }: FertCardProps) => {
  const mob   = isMobile()
  const def   = FERTILIZER_DATA.get(fertType)!
  const count = playerState.fertilizers.get(fertType) ?? 0
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: ss(275),
        margin: { right: ss(16), bottom: ss(16) },
        padding: { top: ss(12), bottom: ss(12), left: ss(10), right: ss(10) },
        borderWidth: 3,
        borderColor: CARD_BORDER,
        borderRadius: 12,
      }}
      uiBackground={mob ? { color: CARD_FILL } : undefined}
    >
      <UiEntity
        uiTransform={{ width: ss(88), height: ss(88), margin: { bottom: ss(8) } }}
        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={def.name} fontSize={ss(24)} color={C.textMain} textAlign="middle-center" />
      <Label value={def.description} fontSize={ss(19)} color={C.textMute} textAlign="middle-center" />
      <Label value={`x${count}`} fontSize={ss(26)} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: ss(6) } }} />
    </UiEntity>
  )
}

export const CompostBinMenu = () => {
  const { wasteInBin, cyclesDone, nextCycleMs } = getCompostState()
  const canAddWaste  = playerState.organicWaste > 0
  const canCollect   = cyclesDone > 0

  return (
    <CompostPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Left — bin status + controls */}
      <UiEntity uiTransform={{ flexDirection: 'column', width: ss(400), margin: { right: ss(70) } }}>

        {/* Organic waste in hand — header + subordinate value, same step-down as fertilizer cards */}
        <Label value="Organic Waste" fontSize={ss(28)} color={C.header} uiTransform={{ margin: { bottom: ss(14) } }} />
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(22) } }}>
          <UiEntity
            uiTransform={{ width: ss(64), height: ss(64), margin: { right: ss(12) } }}
            uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
          />
          <Label value={`In hand: ${playerState.organicWaste}`} fontSize={ss(24)} color={C.orange} />
        </UiEntity>

        <SectionRule width={ss(300)} />
        <UiEntity uiTransform={{ height: ss(18) }} />

        {/* Compost Bin — separate header, its own subordinate status lines */}
        <Label value="Compost Bin" fontSize={ss(28)} color={C.header} uiTransform={{ margin: { bottom: ss(14) } }} />
        <Label value={`In bin: ${wasteInBin} units`} fontSize={ss(24)} color={C.textMain} uiTransform={{ margin: { bottom: ss(8) } }} />

        {/* Timer */}
        {nextCycleMs !== null && (
          <Label
            value={`Next fertilizer: ${formatTime(nextCycleMs)}`}
            fontSize={ss(22)}
            color={C.green}
            uiTransform={{ margin: { bottom: ss(8) } }}
          />
        )}
        {wasteInBin === 0 && (
          <Label value="Add waste to start composting" fontSize={ss(20)} color={C.textMute} uiTransform={{ margin: { bottom: ss(8) } }} />
        )}
        {canCollect && (
          <Label value={`${cyclesDone} fertilizer${cyclesDone > 1 ? 's' : ''} ready!`} fontSize={ss(22)} color={C.gold} uiTransform={{ margin: { bottom: ss(16) } }} />
        )}

        {/* Add Waste button */}
        <UiEntity
          uiTransform={{
            width: Math.round(ss(300) * getZoomScale('cbin_add')), height: Math.round(ss(80) * getZoomScale('cbin_add')),
            alignItems: 'center', justifyContent: 'center',
            margin: { bottom: ss(16) },
            borderRadius: 10,
          }}
          uiBackground={{ color: canAddWaste ? BTN_GREEN : BTN_GRAY }}
          onMouseDown={canAddWaste ? () => { if (isZooming('cbin_add')) return; triggerCardZoom('cbin_add'); setTimeout(addWaste, 290) } : undefined}
        >
          <Label
            value="Add Waste"
            fontSize={ss(28)}
            color={canAddWaste ? C.textMain : C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>

        {/* Collect button */}
        <UiEntity
          uiTransform={{
            width: Math.round(ss(300) * getZoomScale('cbin_collect')), height: Math.round(ss(80) * getZoomScale('cbin_collect')),
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 10,
          }}
          uiBackground={{ color: canCollect ? BTN_GREEN : BTN_GRAY }}
          onMouseDown={canCollect ? () => { if (isZooming('cbin_collect')) return; triggerCardZoom('cbin_collect'); setTimeout(collectReady, 290) } : undefined}
        >
          <Label
            value={canCollect ? `Collect (${cyclesDone})` : 'Nothing ready'}
            fontSize={ss(28)}
            color={canCollect ? C.textMain : C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      {/* Right — fertilizer inventory */}
      <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(18) } }}>
          <Label value="Your Fertilizers" fontSize={ss(28)} color={C.header} uiTransform={{ margin: { right: ss(14) } }} />
          <SectionRule width={ss(160)} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {ALL_FERTILIZER_TYPES.map((ft) => (
            <FertCard key={ft} fertType={ft} />
          ))}
        </UiEntity>
      </UiEntity>

    </CompostPanelFrame>
  )
}
