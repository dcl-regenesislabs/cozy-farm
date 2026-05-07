import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { CROP_HARVEST_IMAGES, SOIL_ICON, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { getSoilEntities } from '../systems/interactionSetup'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'
import { getRotTimeMs } from '../game/rotUtils'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { playSound } from '../systems/sfxSystem'
import { triggerCardZoom, getZoomScale, isZooming } from './cardZoomSystem'
import { BadgeDot } from './BadgeDot'

// 4 cols × 2 rows = 8 per page
const PLOTS_PER_PAGE = 8

const COMPOST_CYCLE_MS = 300_000

const farmTab  = { value: 'home' as 'home' | 'expansion' | 'compost' }
const farmPage = { home: 0, expansion: 0 }

function formatTime(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0)   return `${h}h ${m}m`
  if (m > 0)   return `${m}m ${sec}s`
  return `${sec}s`
}

// ── Single plot tile — square, like seed cards ─────────────────────────────

type TileProps = { key?: string | number; entity: ReturnType<typeof getSoilEntities>[number]; idx: number; now: number }

const PlotTile = ({ entity, idx, now }: TileProps) => {
  const plot = PlotState.getOrNull(entity)
  if (!plot) return null

  let topLabel = `Plot ${idx + 1}`
  let midLabel = ''
  let subLabel = ''
  let barPct   = 0
  let barColor = C.textMute
  let tileBg   = C.rowBg
  let imgSrc   = ''

  if (!plot.isUnlocked) {
    midLabel = 'Locked'
    tileBg   = { r: 0.1, g: 0.09, b: 0.07, a: 1 }
  } else if (plot.cropType === -1) {
    midLabel = plot.justHarvested ? 'Clear plot' : 'Empty'
    tileBg   = plot.justHarvested
      ? { r: 0.18, g: 0.15, b: 0.04, a: 1 }
      : { r: 0.11, g: 0.14, b: 0.09, a: 1 }
  } else {
    const ct  = plot.cropType as CropType
    const def = CROP_DATA.get(ct)!
    imgSrc   = CROP_HARVEST_IMAGES[ct]
    topLabel = CROP_NAMES[ct]

    if (plot.isRotten) {
      imgSrc   = ORGANIC_WASTE_ICON
      midLabel = 'Rotting!'
      barPct   = 100
      barColor = { r: 0.7, g: 0.2, b: 0.1, a: 1 }
      tileBg   = { r: 0.18, g: 0.06, b: 0.04, a: 1 }
    } else if (plot.isReady || plot.growthStage === 3) {
      midLabel = 'Ready!'
      barPct   = 100
      barColor = C.green
      tileBg   = { r: 0.07, g: 0.18, b: 0.07, a: 1 }
      // Show rot countdown for non-RotShield crops
      const rotTotalMs = getRotTimeMs(def, plot.fertilizerType)
      if (rotTotalMs !== Infinity) {
        const rotAt = plot.plantedAt + rotTotalMs
        const timeUntilRot = rotAt - now
        if (timeUntilRot > 0) subLabel = `Rots in ${formatTime(timeUntilRot)}`
      }
    } else if (!plot.growthStarted) {
      midLabel = 'Needs water'
      barColor = C.blue
      tileBg   = { r: 0.07, g: 0.09, b: 0.2, a: 1 }
    } else {
      const elapsed = now - plot.plantedAt
      barPct        = Math.min(100, Math.floor((elapsed / def.growTimeMs) * 100))
      const ws      = getWateringStatus(plot, now)
      if (ws.canWater) {
        midLabel = 'Water now!'
        barColor = C.blue
        tileBg   = { r: 0.07, g: 0.09, b: 0.2, a: 1 }
      } else if (ws.nextWindowInMs !== null) {
        midLabel = `Water in ${formatTime(ws.nextWindowInMs)}`
        barColor = C.gold
        tileBg   = { r: 0.14, g: 0.12, b: 0.04, a: 1 }
      } else {
        midLabel = formatTime(def.growTimeMs - elapsed)
        barColor = C.gold
        tileBg   = { r: 0.14, g: 0.12, b: 0.04, a: 1 }
      }
    }
    if (!plot.isRotten && !(plot.isReady || plot.growthStage === 3)) {
      subLabel = `Water ${plot.waterCount}/${def.wateringsRequired}`
    }
  }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 260,
        height: 270,
        margin: { right: 12, bottom: 12 },
        padding: { top: 14, bottom: 14, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      {/* Crop/soil image */}
      <UiEntity
        uiTransform={{ width: 84, height: 84, margin: { bottom: 10 }, flexShrink: 0 }}
        uiBackground={{
          texture: { src: imgSrc !== '' ? imgSrc : SOIL_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      {/* Labels */}
      <Label value={topLabel} fontSize={22} color={C.textMain} textAlign="middle-center" />
      <Label
        value={midLabel}
        fontSize={19}
        color={
          plot.isRotten ? { r: 0.9, g: 0.35, b: 0.2, a: 1 } :
          (plot.isReady || plot.growthStage === 3) && plot.cropType !== -1 ? C.green :
          C.textMute
        }
        textAlign="middle-center"
        uiTransform={{ margin: { top: 4 } }}
      />

      {/* Progress bar + water count */}
      {plot.isUnlocked && plot.cropType !== -1 && (
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
          {subLabel !== '' && (
            <Label value={subLabel} fontSize={16} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { top: 5 } }} />
          )}
        </UiEntity>
      )}

      {/* Fertilizer badge — shown while crop is growing with a fertilizer applied */}
      {plot.isUnlocked && plot.cropType !== -1 && plot.fertilizerType !== -1 && !plot.isReady && !plot.isRotten && (() => {
        const fertDef = FERTILIZER_DATA.get(plot.fertilizerType as FertilizerType)
        if (!fertDef) return null
        return (
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { top: 8 } }}>
            <UiEntity
              uiTransform={{ width: 22, height: 22, margin: { right: 6 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: fertDef.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={fertDef.name} fontSize={14} color={{ r: 0.5, g: 0.9, b: 0.3, a: 1 }} textAlign="middle-center" />
          </UiEntity>
        )
      })()}
    </UiEntity>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

function getCompostPanelState() {
  const now = Date.now()
  const wasteInBin = playerState.compostWasteCount
  const lastCollected = playerState.compostLastCollectedAt
  const timeElapsed = (lastCollected > 0 && wasteInBin > 0) ? now - lastCollected : 0
  const cyclesDone = Math.min(Math.floor(timeElapsed / COMPOST_CYCLE_MS), wasteInBin)
  const nextCycleMs = (wasteInBin > cyclesDone && lastCollected > 0)
    ? COMPOST_CYCLE_MS - (timeElapsed % COMPOST_CYCLE_MS)
    : null
  return { wasteInBin, cyclesDone, nextCycleMs }
}

function collectCompostReady() {
  const now = Date.now()
  const { cyclesDone } = getCompostPanelState()
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
  if (playerState.compostLastCollectedAt === 0) {
    playerState.compostLastCollectedAt = Date.now()
  }
  playSound('buttonclick')
}

const CompostTab = () => {
  if (!playerState.compostBinUnlocked) {
    return (
      <UiEntity
        uiTransform={{ width: '100%', padding: { top: 22, bottom: 22, left: 22, right: 22 } }}
        uiBackground={{ color: C.rowBg }}
      >
        <Label
          value="Compost Bin not unlocked — buy it in the Store under the Fertilizers tab."
          fontSize={24}
          color={C.textMain}
          textAlign="middle-left"
        />
      </UiEntity>
    )
  }

  const { wasteInBin, cyclesDone, nextCycleMs } = getCompostPanelState()
  const canAdd     = playerState.organicWaste > 0
  const canCollect = cyclesDone > 0

  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>

      {/* Status row */}
      <UiEntity
        uiTransform={{ flexDirection: 'row', width: '100%', margin: { bottom: 16 } }}
        uiBackground={{ color: C.rowBg }}
      >
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1, padding: { top: 16, bottom: 16, left: 16, right: 16 } }}>
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 10 } }}>
            <UiEntity
              uiTransform={{ width: 44, height: 44, margin: { right: 10 }, flexShrink: 0 }}
              uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <Label value={`In hand: ${playerState.organicWaste}   In bin: ${wasteInBin}`} fontSize={22} color={C.textMain} />
          </UiEntity>
          {nextCycleMs !== null && (
            <Label value={`Next fertilizer: ${formatTime(nextCycleMs)}`} fontSize={20} color={C.green} uiTransform={{ margin: { bottom: 6 } }} />
          )}
          {wasteInBin === 0 && (
            <Label value="Add waste to start composting" fontSize={19} color={C.textMute} />
          )}
          {canCollect && (
            <Label value={`${cyclesDone} fertilizer${cyclesDone > 1 ? 's' : ''} ready!`} fontSize={20} color={C.gold} />
          )}
        </UiEntity>

        {/* Buttons */}
        <UiEntity uiTransform={{ flexDirection: 'column', justifyContent: 'center', padding: { top: 12, bottom: 12, right: 16 } }}>
          <UiEntity
            uiTransform={{ width: Math.round(240 * getZoomScale('fp_compost_add')), height: Math.round(60 * getZoomScale('fp_compost_add')), alignItems: 'center', justifyContent: 'center', margin: { bottom: 10 } }}
            uiBackground={{ color: canAdd ? { r: 0.25, g: 0.55, b: 0.15, a: 1 } : { r: 0.2, g: 0.2, b: 0.2, a: 1 } }}
            onMouseDown={canAdd ? () => { if (isZooming('fp_compost_add')) return; triggerCardZoom('fp_compost_add'); setTimeout(addCompostWaste, 290) } : undefined}
          >
            <Label value="Add Waste" fontSize={22} color={canAdd ? C.textMain : C.textMute} textAlign="middle-center" />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: Math.round(240 * getZoomScale('fp_compost_collect')), height: Math.round(60 * getZoomScale('fp_compost_collect')), alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: canCollect ? { r: 0.6, g: 0.45, b: 0.05, a: 1 } : { r: 0.2, g: 0.2, b: 0.2, a: 1 } }}
            onMouseDown={canCollect ? () => { if (isZooming('fp_compost_collect')) return; triggerCardZoom('fp_compost_collect'); setTimeout(collectCompostReady, 290) } : undefined}
          >
            <Label
              value={canCollect ? `Collect (${cyclesDone})` : 'Nothing ready'}
              fontSize={22}
              color={canCollect ? C.textMain : C.textMute}
              textAlign="middle-center"
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>

      {/* Fertilizer inventory */}
      <Label value="Your Fertilizers" fontSize={24} color={C.header} uiTransform={{ margin: { bottom: 12 } }} />
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {ALL_FERTILIZER_TYPES.map((ft) => {
          const def   = FERTILIZER_DATA.get(ft)!
          const count = playerState.fertilizers.get(ft) ?? 0
          return (
            <UiEntity
              key={ft}
              uiTransform={{
                flexDirection: 'column',
                alignItems: 'center',
                width: 220,
                margin: { right: 12, bottom: 8 },
                padding: { top: 10, bottom: 10, left: 8, right: 8 },
              }}
              uiBackground={{ color: C.rowBg }}
            >
              <UiEntity
                uiTransform={{ width: 60, height: 60, margin: { bottom: 6 } }}
                uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
              />
              <Label value={def.name} fontSize={18} color={C.textMain} textAlign="middle-center" />
              <Label value={`x${count}`} fontSize={22} color={C.green} textAlign="middle-center" />
            </UiEntity>
          )
        })}
      </UiEntity>
    </UiEntity>
  )
}

export const FarmPanel = () => {
  const soilEntities = getSoilEntities()
  const now          = Date.now()

  // Plots 0-11: player-managed (tutorial 0-5 + expansion packs 6-8, 9-11) → My Farm
  // Plots 12-35: farmer zone → Expansion tab
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
    <PanelShell title="Farm" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Tab row */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 20 } }}>
        <UiEntity uiTransform={{ margin: { right: 14 } }}>
          <Button
            value="My Farm"
            variant={tab === 'home' ? 'primary' : 'secondary'}
            fontSize={24}
            uiTransform={{ width: 220, height: 70 }}
            onMouseDown={() => { farmTab.value = 'home' }}
          />
          {homeHasReady && <BadgeDot />}
        </UiEntity>
        <UiEntity uiTransform={{ margin: { right: 14 } }}>
          <Button
            value="Expansion"
            variant={tab === 'expansion' ? 'primary' : 'secondary'}
            fontSize={24}
            uiTransform={{ width: 220, height: 70 }}
            onMouseDown={() => { farmTab.value = 'expansion' }}
          />
          {expansionHasReady && <BadgeDot />}
        </UiEntity>
        <UiEntity>
          <Button
            value="Compost Bin"
            variant={tab === 'compost' ? 'primary' : 'secondary'}
            fontSize={24}
            uiTransform={{ width: 220, height: 70 }}
            onMouseDown={() => { farmTab.value = 'compost' }}
          />
        </UiEntity>
      </UiEntity>

      {/* Compost tab */}
      {tab === 'compost' && <CompostTab />}

      {/* Tile grid: 3 cols × 2 rows — only for plot tabs */}
      {isPlotTab && (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: 564 }}>
            {pageSlice.map((e, i) => (
              <PlotTile key={page * PLOTS_PER_PAGE + i} entity={e} idx={offset + page * PLOTS_PER_PAGE + i} now={now} />
            ))}
          </UiEntity>

          {/* Pagination */}
          {lastPage > 0 && (
            <UiEntity
              uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', margin: { top: 16 } }}
            >
              <Button
                value="< Prev"
                variant="secondary"
                fontSize={22}
                uiTransform={{ width: 160, height: 60, margin: { right: 24 } }}
                onMouseDown={() => { if (farmPage[tab as 'home' | 'expansion'] > 0) farmPage[tab as 'home' | 'expansion']-- }}
              />
              <Label
                value={`${page + 1} / ${lastPage + 1}`}
                fontSize={22}
                color={C.textMute}
                textAlign="middle-center"
                uiTransform={{ width: 100 }}
              />
              <Button
                value="Next >"
                variant="secondary"
                fontSize={22}
                uiTransform={{ width: 160, height: 60, margin: { left: 24 } }}
                onMouseDown={() => { if (farmPage[tab as 'home' | 'expansion'] < lastPage) farmPage[tab as 'home' | 'expansion']++ }}
              />
            </UiEntity>
          )}
        </UiEntity>
      )}
    </PanelShell>
  )
}
