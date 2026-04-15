import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { CROP_HARVEST_IMAGES, SOIL_ICON } from '../data/imagePaths'
import { getSoilEntities } from '../systems/interactionSetup'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'

// 3 cols × 2 rows = 6 per page — tiles are square like seed cards
const PLOTS_PER_PAGE = 6

const farmTab  = { value: 'home' as 'home' | 'expansion' }
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

    if (plot.isReady || plot.growthStage === 3) {
      midLabel = 'Ready!'
      barPct   = 100
      barColor = C.green
      tileBg   = { r: 0.07, g: 0.18, b: 0.07, a: 1 }
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
    subLabel = `Water ${plot.waterCount}/${def.wateringsRequired}`
  }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 260,
        height: 240,
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
        color={(plot.isReady || plot.growthStage === 3) && plot.cropType !== -1 ? C.green : C.textMute}
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
    </UiEntity>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export const FarmPanel = () => {
  const soilEntities = getSoilEntities()
  const now          = Date.now()

  const homePlots      = soilEntities.slice(0, 6)
  const expansionPlots = soilEntities.slice(6)

  const tab       = farmTab.value
  const plots     = tab === 'home' ? homePlots : expansionPlots
  const page      = farmPage[tab]
  const lastPage  = Math.max(0, Math.ceil(plots.length / PLOTS_PER_PAGE) - 1)
  const pageSlice = plots.slice(page * PLOTS_PER_PAGE, (page + 1) * PLOTS_PER_PAGE)
  const offset    = tab === 'home' ? 0 : 6

  return (
    <PanelShell title="Farm" onClose={() => { playerState.activeMenu = 'none' }}>

      {/* Tab row */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 20 } }}>
        {([['home', 'My Farm'], ['expansion', 'Expansion']] as const).map(([t, label]) => (
          <Button
            key={t}
            value={label}
            variant={tab === t ? 'primary' : 'secondary'}
            fontSize={24}
            uiTransform={{ width: 240, height: 70, margin: { right: 14 } }}
            onMouseDown={() => { farmTab.value = t }}
          />
        ))}
      </UiEntity>

      {/* Tile grid: 3 cols × 2 rows */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: 504 }}>
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
            onMouseDown={() => { if (farmPage[tab] > 0) farmPage[tab]-- }}
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
            onMouseDown={() => { if (farmPage[tab] < lastPage) farmPage[tab]++ }}
          />
        </UiEntity>
      )}
    </PanelShell>
  )
}
