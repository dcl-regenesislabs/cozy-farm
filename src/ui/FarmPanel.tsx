import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { CROP_HARVEST_IMAGES, SOIL_ICON, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { getSoilEntities } from '../systems/interactionSetup'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { C } from './PanelShell'
import { getRotTimeMs } from '../game/rotUtils'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { BadgeDot } from './BadgeDot'

// ─── Atlas frame — swap src to farm_atlas.png when available ──────────────────
const FARM_ATLAS    = 'assets/images/ui_loading/farm_atlas.png'
const ATLAS_SIZE    = 1024
const BG_RECT       = { x: 16, y: 14, w: 999, h: 773 } as const
const UI_SCALE      = 0.8
const ss            = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1145)  // tuned so PANEL_H matches inventory (705px)
const PANEL_H          = Math.round((PANEL_W * BG_RECT.h) / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(120)
const CONTENT_LEFT     = ss(72)
const CONTENT_RIGHT    = ss(72)
const CONTENT_TOP      = ss(106)
const CONTENT_BOTTOM   = ss(68)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(74)
const CLOSE_RIGHT      = ss(28)
const CLOSE_TOP        = ss(16)

// ─── Card colours ─────────────────────────────────────────────────────────────
const CARD_BORDER     = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL       = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT       = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE  = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const FRAME_THICKNESS = 4

// ─── Card & bar dimensions ────────────────────────────────────────────────────
const CARD_W      = ss(215)
const CARD_H      = ss(258)
const CARD_MARGIN = ss(12)
const CARD_ICON   = ss(76)
const CARD_PAD_V  = ss(12)
const CARD_PAD_H  = ss(10)
const BAR_H       = 12
const BAR_RADIUS  = 6

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TAB_H   = ss(44)
const TAB_W   = ss(175)
const TAB_GAP = ss(10)

const PLOTS_PER_PAGE  = 8
const COMPOST_CYCLE_MS = 300_000

const farmTab  = { value: 'home' as 'home' | 'expansion' | 'compost' }
const farmPage = { home: 0, expansion: 0 }

type CardColor = { r: number; g: number; b: number; a: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

function formatTime(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

// ─── FarmCard ─────────────────────────────────────────────────────────────────
const FarmCard = ({
  borderColor = CARD_BORDER,
  height = CARD_H,
  children,
}: {
  key?: string | number
  borderColor?: CardColor
  height?: number
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: CARD_W,
        height,
        margin: { right: CARD_MARGIN, bottom: CARD_MARGIN },
        padding: { top: CARD_PAD_V, bottom: CARD_PAD_V, left: CARD_PAD_H, right: CARD_PAD_H },
        borderWidth: 3,
        borderColor,
        borderRadius: 12,
      }}
      uiBackground={{ color: CARD_FILL }}
    >
      {mobile && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width: CARD_W, height }}>
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: CARD_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, bottom: 0 }, width: CARD_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: FRAME_THICKNESS, height }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { right: 0, top: 0 },   width: FRAME_THICKNESS, height }} uiBackground={{ color: borderColor }} />
        </UiEntity>
      )}
      {children}
    </UiEntity>
  )
}

// ─── FarmPanelFrame ───────────────────────────────────────────────────────────
const FarmPanelFrame = ({
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
        texture: { src: FARM_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: bgUvs(BG_RECT),
      }}
    >
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
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: CLOSE_RIGHT, top: CLOSE_TOP },
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
        }}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  </UiEntity>
)

// ─── TabBar ───────────────────────────────────────────────────────────────────
const TabBar = ({
  tab,
  homeHasReady,
  expansionHasReady,
}: {
  tab: 'home' | 'expansion' | 'compost'
  homeHasReady: boolean
  expansionHasReady: boolean
}) => (
  <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: ss(12) }, flexShrink: 0 }}>
    {(['home', 'expansion', 'compost'] as const).map((t) => {
      const active = tab === t
      const label  = t === 'home' ? 'My Farm' : t === 'expansion' ? 'Expansion' : 'Compost Bin'
      const hasReady = (t === 'home' && homeHasReady) || (t === 'expansion' && expansionHasReady)
      return (
        <UiEntity key={t} uiTransform={{ margin: { right: TAB_GAP } }}>
          <UiEntity
            uiTransform={{ width: TAB_W, height: TAB_H, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            uiBackground={{ color: active ? { r: 0.45, g: 0.26, b: 0.06, a: 0.9 } : { r: 0.58, g: 0.38, b: 0.12, a: 0.72 } }}
            onMouseDown={() => { playSound('buttonclick'); farmTab.value = t }}
          >
            <Label value={label} fontSize={ss(20)} color={active ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : { r: 0.97, g: 0.90, b: 0.68, a: 0.65 }} textAlign="middle-center" />
          </UiEntity>
          {hasReady && <BadgeDot />}
        </UiEntity>
      )
    })}
  </UiEntity>
)

// ─── PlotTile ─────────────────────────────────────────────────────────────────
type TileProps = { key?: string | number; entity: ReturnType<typeof getSoilEntities>[number]; idx: number; now: number }

const PlotTile = ({ entity, idx, now }: TileProps) => {
  const plot = PlotState.getOrNull(entity)
  if (!plot) return null

  let topLabel    = `Plot ${idx + 1}`
  let midLabel    = ''
  let subLabel    = ''
  let barPct      = 0
  let barColor: CardColor = CARD_BORDER
  let borderColor: CardColor = CARD_BORDER
  let midColor: CardColor    = CARD_TEXT_MUTE
  let imgSrc      = ''

  if (!plot.isUnlocked) {
    midLabel    = 'Locked'
    borderColor = { r: 0.40, g: 0.30, b: 0.18, a: 0.4 }
    midColor    = CARD_TEXT_MUTE
  } else if (plot.cropType === -1) {
    midLabel    = plot.justHarvested ? 'Clear plot' : 'Empty'
    borderColor = plot.justHarvested ? { r: 0.75, g: 0.60, b: 0.20, a: 0.95 } : CARD_BORDER
    midColor    = CARD_TEXT_MUTE
  } else {
    const ct  = plot.cropType as CropType
    const def = CROP_DATA.get(ct)!
    imgSrc    = CROP_HARVEST_IMAGES[ct]
    topLabel  = CROP_NAMES[ct]

    if (plot.isRotten) {
      imgSrc      = ORGANIC_WASTE_ICON
      midLabel    = 'Rotting!'
      barPct      = 100
      barColor    = { r: 0.7, g: 0.2, b: 0.1, a: 1 }
      borderColor = { r: 0.80, g: 0.25, b: 0.15, a: 0.95 }
      midColor    = { r: 0.9, g: 0.35, b: 0.2, a: 1 }
    } else if (plot.isReady || plot.growthStage === 3) {
      midLabel    = 'Ready!'
      barPct      = 100
      barColor    = C.green
      borderColor = { r: 0.32, g: 0.78, b: 0.32, a: 0.95 }
      midColor    = C.green
      const rotTotalMs = getRotTimeMs(def, plot.fertilizerType)
      if (rotTotalMs !== Infinity) {
        const timeUntilRot = plot.plantedAt + rotTotalMs - now
        if (timeUntilRot > 0) subLabel = `Rots in ${formatTime(timeUntilRot)}`
      }
    } else if (!plot.growthStarted) {
      midLabel    = 'Needs water'
      barColor    = C.blue
      borderColor = { r: 0.30, g: 0.50, b: 0.90, a: 0.95 }
      midColor    = C.blue
    } else {
      const elapsed = now - plot.plantedAt
      barPct        = Math.min(100, Math.floor((elapsed / def.growTimeMs) * 100))
      const ws      = getWateringStatus(plot, now)
      if (ws.canWater) {
        midLabel    = 'Water now!'
        barColor    = C.blue
        borderColor = { r: 0.30, g: 0.50, b: 0.90, a: 0.95 }
        midColor    = C.blue
      } else if (ws.nextWindowInMs !== null) {
        midLabel    = `Water in ${formatTime(ws.nextWindowInMs)}`
        barColor    = C.gold
        borderColor = CARD_BORDER
        midColor    = CARD_TEXT_MUTE
      } else {
        midLabel    = formatTime(def.growTimeMs - elapsed)
        barColor    = C.gold
        borderColor = CARD_BORDER
        midColor    = CARD_TEXT_MUTE
      }
    }
    if (!plot.isRotten && !(plot.isReady || plot.growthStage === 3)) {
      subLabel = `Water ${plot.waterCount}/${def.wateringsRequired}`
    }
  }

  return (
    <FarmCard borderColor={borderColor}>
      <UiEntity
        uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(8) }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc !== '' ? imgSrc : SOIL_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={topLabel} fontSize={ss(21)} color={CARD_TEXT} textAlign="middle-center" />
      <Label value={midLabel} fontSize={ss(18)} color={midColor} textAlign="middle-center"
        uiTransform={{ margin: { top: ss(4) } }} />

      {plot.isUnlocked && plot.cropType !== -1 && (
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
          {subLabel !== '' && (
            <Label value={subLabel} fontSize={ss(15)} color={CARD_TEXT_MUTE} textAlign="middle-center"
              uiTransform={{ margin: { top: ss(4) } }} />
          )}
        </UiEntity>
      )}

      {/* Fertilizer badge */}
      {plot.isUnlocked && plot.cropType !== -1 && plot.fertilizerType !== -1 && !plot.isReady && !plot.isRotten && (() => {
        const fertDef = FERTILIZER_DATA.get(plot.fertilizerType as FertilizerType)
        if (!fertDef) return null
        return (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: ss(6) } }}>
            <UiEntity
              uiTransform={{ width: ss(20), height: ss(20), margin: { right: ss(5) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: fertDef.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={fertDef.name} fontSize={ss(13)} color={{ r: 0.3, g: 0.75, b: 0.2, a: 1 }} textAlign="middle-center" />
          </UiEntity>
        )
      })()}
    </FarmCard>
  )
}

// ─── CompostTab ───────────────────────────────────────────────────────────────

function getCompostPanelState() {
  const now            = Date.now()
  const wasteInBin     = playerState.compostWasteCount
  const lastCollected  = playerState.compostLastCollectedAt
  const timeElapsed    = (lastCollected > 0 && wasteInBin > 0) ? now - lastCollected : 0
  const cyclesDone     = Math.min(Math.floor(timeElapsed / COMPOST_CYCLE_MS), wasteInBin)
  const nextCycleMs    = (wasteInBin > cyclesDone && lastCollected > 0)
    ? COMPOST_CYCLE_MS - (timeElapsed % COMPOST_CYCLE_MS)
    : null
  return { wasteInBin, cyclesDone, nextCycleMs }
}

function collectCompostReady() {
  const now             = Date.now()
  const { cyclesDone }  = getCompostPanelState()
  if (cyclesDone <= 0) return
  for (let i = 0; i < cyclesDone; i++) {
    const fert = randomFertilizer()
    playerState.fertilizers.set(fert, (playerState.fertilizers.get(fert) ?? 0) + 1)
  }
  playerState.compostWasteCount -= cyclesDone
  playerState.compostLastCollectedAt = now
  playSound('buttonclick')
}

function addCompostWaste() {
  if (playerState.organicWaste <= 0) return
  playerState.organicWaste -= 1
  playerState.compostWasteCount += 1
  if (playerState.compostLastCollectedAt === 0) playerState.compostLastCollectedAt = Date.now()
  playSound('buttonclick')
}

const BTN_BG_ON  = { r: 0.45, g: 0.26, b: 0.06, a: 1 }
const BTN_BG_OFF = { r: 0.30, g: 0.22, b: 0.10, a: 1 }
const BTN_TEXT   = { r: 0.97, g: 0.90, b: 0.68, a: 1 }

const CompostTab = () => {
  if (!playerState.compostBinUnlocked) {
    return (
      <FarmCard height={ss(140)} borderColor={CARD_BORDER}>
        <Label
          value="Compost Bin not unlocked — buy it in the Store under the Fertilizers tab."
          fontSize={ss(20)}
          color={CARD_TEXT_MUTE}
          textAlign="middle-center"
        />
      </FarmCard>
    )
  }

  const { wasteInBin, cyclesDone, nextCycleMs } = getCompostPanelState()
  const canAdd     = playerState.organicWaste > 0
  const canCollect = cyclesDone > 0

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>

      {/* Status + action row */}
      <UiEntity uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: ss(16) }, alignItems: 'center' }}>

        {/* Status card */}
        <FarmCard height={ss(160)} borderColor={canCollect ? { r: 0.82, g: 0.69, b: 0.20, a: 0.95 } : CARD_BORDER}>
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(8) } }}>
            <UiEntity
              uiTransform={{ width: ss(36), height: ss(36), margin: { right: ss(8) }, flexShrink: 0 }}
              uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={`Hand: ${playerState.organicWaste}  Bin: ${wasteInBin}`} fontSize={ss(18)} color={CARD_TEXT} />
          </UiEntity>
          {nextCycleMs !== null && (
            <Label value={`Next fert: ${formatTime(nextCycleMs)}`} fontSize={ss(16)} color={C.green} uiTransform={{ margin: { bottom: ss(4) } }} />
          )}
          {wasteInBin === 0 && (
            <Label value="Add waste to start composting" fontSize={ss(15)} color={CARD_TEXT_MUTE} />
          )}
          {canCollect && (
            <Label value={`${cyclesDone} fertilizer${cyclesDone > 1 ? 's' : ''} ready!`} fontSize={ss(17)} color={C.gold} />
          )}
        </FarmCard>

        {/* Action buttons */}
        <UiEntity uiTransform={{ flexDirection: 'column', margin: { left: ss(12) } }}>
          <UiEntity
            uiTransform={{ width: ss(200), height: ss(52), alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: { bottom: ss(10) } }}
            uiBackground={{ color: canAdd ? BTN_BG_ON : BTN_BG_OFF }}
            onMouseDown={canAdd ? () => { if (isZooming('fp_compost_add')) return; triggerCardZoom('fp_compost_add'); setTimeout(addCompostWaste, 290) } : undefined}
          >
            <Label value="Add Waste" fontSize={ss(19)} color={canAdd ? BTN_TEXT : CARD_TEXT_MUTE} textAlign="middle-center" />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: Math.round(ss(200) * getZoomScale('fp_compost_collect')), height: Math.round(ss(52) * getZoomScale('fp_compost_collect')), alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            uiBackground={{ color: canCollect ? { r: 0.55, g: 0.38, b: 0.05, a: 1 } : BTN_BG_OFF }}
            onMouseDown={canCollect ? () => { if (isZooming('fp_compost_collect')) return; triggerCardZoom('fp_compost_collect'); setTimeout(collectCompostReady, 290) } : undefined}
          >
            <Label
              value={canCollect ? `Collect (${cyclesDone})` : 'Nothing ready'}
              fontSize={ss(19)}
              color={canCollect ? BTN_TEXT : CARD_TEXT_MUTE}
              textAlign="middle-center"
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>

      {/* Fertilizer inventory */}
      <Label value="Your Fertilizers" fontSize={ss(22)} color={CARD_TEXT} uiTransform={{ margin: { bottom: ss(10) } }} />
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {ALL_FERTILIZER_TYPES.map((ft) => {
          const def   = FERTILIZER_DATA.get(ft)!
          const count = playerState.fertilizers.get(ft) ?? 0
          return (
            <FarmCard key={ft} height={ss(170)} borderColor={count > 0 ? { r: 0.82, g: 0.69, b: 0.39, a: 0.7 } : { r: 0.40, g: 0.30, b: 0.18, a: 0.4 }}>
              <UiEntity
                uiTransform={{ width: ss(52), height: ss(52), margin: { bottom: ss(6) } }}
                uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
              />
              <Label value={def.name} fontSize={ss(16)} color={CARD_TEXT} textAlign="middle-center" />
              <Label value={`x${count}`} fontSize={ss(20)} color={count > 0 ? C.green : CARD_TEXT_MUTE} textAlign="middle-center" />
            </FarmCard>
          )
        })}
      </UiEntity>
    </UiEntity>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export const FarmPanel = () => {
  const soilEntities = getSoilEntities()
  const now          = Date.now()

  const homePlots      = soilEntities.slice(0, 12)
  const expansionPlots = soilEntities.slice(12)

  const homeHasReady      = homePlots.some(e => PlotState.getOrNull(e)?.isReady)
  const expansionHasReady = expansionPlots.some(e => PlotState.getOrNull(e)?.isReady)

  const tab       = farmTab.value
  const isPlotTab = tab === 'home' || tab === 'expansion'
  const plots     = tab === 'expansion' ? expansionPlots : homePlots
  const page      = isPlotTab ? farmPage[tab as 'home' | 'expansion'] : 0
  const lastPage  = Math.max(0, Math.ceil(plots.length / PLOTS_PER_PAGE) - 1)
  const pageSlice = plots.slice(page * PLOTS_PER_PAGE, (page + 1) * PLOTS_PER_PAGE)
  const offset    = tab === 'expansion' ? 12 : 0

  return (
    <FarmPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      <TabBar tab={tab} homeHasReady={homeHasReady} expansionHasReady={expansionHasReady} />

      {/* Compost tab */}
      {tab === 'compost' && <CompostTab />}

      {/* Plot grid */}
      {isPlotTab && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1 }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignContent: 'flex-start', flex: 1 }}>
            {pageSlice.map((e, i) => (
              <PlotTile key={page * PLOTS_PER_PAGE + i} entity={e} idx={offset + page * PLOTS_PER_PAGE + i} now={now} />
            ))}
          </UiEntity>

          {/* Pagination */}
          {lastPage > 0 && (
            <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', margin: { top: ss(12) }, flexShrink: 0 }}>
              <UiEntity
                uiTransform={{ width: ss(130), height: ss(44), alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: { right: ss(20) } }}
                uiBackground={{ color: page > 0 ? BTN_BG_ON : BTN_BG_OFF }}
                onMouseDown={() => { if (farmPage[tab as 'home' | 'expansion'] > 0) farmPage[tab as 'home' | 'expansion']-- }}
              >
                <Label value="< Prev" fontSize={ss(18)} color={page > 0 ? BTN_TEXT : CARD_TEXT_MUTE} textAlign="middle-center" />
              </UiEntity>
              <Label
                value={`${page + 1} / ${lastPage + 1}`}
                fontSize={ss(18)}
                color={CARD_TEXT_MUTE}
                textAlign="middle-center"
                uiTransform={{ width: ss(80) }}
              />
              <UiEntity
                uiTransform={{ width: ss(130), height: ss(44), alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: { left: ss(20) } }}
                uiBackground={{ color: page < lastPage ? BTN_BG_ON : BTN_BG_OFF }}
                onMouseDown={() => { if (farmPage[tab as 'home' | 'expansion'] < lastPage) farmPage[tab as 'home' | 'expansion']++ }}
              >
                <Label value="Next >" fontSize={ss(18)} color={page < lastPage ? BTN_TEXT : CARD_TEXT_MUTE} textAlign="middle-center" />
              </UiEntity>
            </UiEntity>
          )}
        </UiEntity>
      )}

    </FarmPanelFrame>
  )
}
