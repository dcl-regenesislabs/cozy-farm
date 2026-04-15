import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { CROP_HARVEST_IMAGES, SOIL_ICON } from '../data/imagePaths'
import { getSoilEntities } from '../systems/interactionSetup'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'

const PLOTS_PER_PAGE = 12

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

// ── Single plot tile ───────────────────────────────────────────────────────

type TileProps = { key?: string | number; entity: ReturnType<typeof getSoilEntities>[number]; idx: number; now: number }

const PlotTile = ({ entity, idx, now }: TileProps) => {
  const plot = PlotState.getOrNull(entity)
  if (!plot) return null

  let topLabel  = `Plot ${idx + 1}`
  let midLabel  = ''
  let subLabel  = ''
  let barPct    = 0
  let barColor  = C.textMute
  let tileBg    = C.rowBg
  let imgSrc    = ''

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
        flexDirection: 'row',
        alignItems: 'center',
        width: 276,
        height: 120,
        margin: { right: 12, bottom: 12 },
        padding: { top: 12, bottom: 12, left: 12, right: 12 },
      }}
      uiBackground={{ color: tileBg }}
    >
      {imgSrc !== '' ? (
        <UiEntity
          uiTransform={{ width: 66, height: 66, margin: { right: 12 }, flexShrink: 0 }}
          uiBackground={{ texture: { src: imgSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      ) : (
        <UiEntity
          uiTransform={{ width: 66, height: 66, margin: { right: 12 }, flexShrink: 0 }}
          uiBackground={{ texture: { src: SOIL_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
        />
      )}

      <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
        <Label value={topLabel} fontSize={20} color={C.textMain} />
        <Label
          value={midLabel}
          fontSize={17}
          color={(plot.isReady || plot.growthStage === 3) && plot.cropType !== -1 ? C.green : C.textMute}
          uiTransform={{ margin: { top: 3, bottom: plot.isUnlocked && plot.cropType !== -1 ? 6 : 0 } }}
        />
        {plot.isUnlocked && plot.cropType !== -1 ? (
          <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
            <UiEntity
              uiTransform={{ width: '100%', height: 9 }}
              uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}
            >
              <UiEntity
                uiTransform={{ width: `${barPct}%`, height: '100%' }}
                uiBackground={{ color: barColor }}
              />
            </UiEntity>
            {subLabel !== '' ? (
              <Label value={subLabel} fontSize={15} color={C.textMute} uiTransform={{ margin: { top: 5 } }} />
            ) : null}
          </UiEntity>
        ) : null}
      </UiEntity>
    </UiEntity>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export const FarmPanel = () => {
  const soilEntities = getSoilEntities()
  const now          = Date.now()

  const homePlots      = soilEntities.slice(0, 6)
  const expansionPlots = soilEntities.slice(6)

  const tab      = farmTab.value
  const plots    = tab === 'home' ? homePlots : expansionPlots
  const page     = farmPage[tab]
  const total    = plots.length
  const lastPage = Math.max(0, Math.ceil(total / PLOTS_PER_PAGE) - 1)
  const pageSlice = plots.slice(page * PLOTS_PER_PAGE, (page + 1) * PLOTS_PER_PAGE)
  const offset    = tab === 'home' ? 0 : 6

  return (
    <PanelShell title="Farm" onClose={() => { playerState.activeMenu = 'none' }}>
      {/* Tab row */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 24 } }}>
        {([['home', 'My Farm'], ['expansion', 'Expansion']] as const).map(([t, label]) => (
          <Button
            key={t}
            value={label}
            variant={tab === t ? 'primary' : 'secondary'}
            fontSize={21}
            uiTransform={{ width: 210, height: 57, margin: { right: 15 } }}
            onMouseDown={() => { farmTab.value = t }}
          />
        ))}
      </UiEntity>

      {/* Fixed-height tile grid (3 rows × 4 cols) */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: 396 }}>
        {pageSlice.map((e, i) => (
          <PlotTile key={page * PLOTS_PER_PAGE + i} entity={e} idx={offset + page * PLOTS_PER_PAGE + i} now={now} />
        ))}
      </UiEntity>

      {/* Pagination nav */}
      {lastPage > 0 && (
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            margin: { top: 16 },
          }}
        >
          <Button
            value="< Prev"
            variant="secondary"
            fontSize={20}
            uiTransform={{ width: 150, height: 52, margin: { right: 24 } }}
            onMouseDown={() => {
              if (farmPage[tab] > 0) farmPage[tab]--
            }}
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
            fontSize={20}
            uiTransform={{ width: 150, height: 52, margin: { left: 24 } }}
            onMouseDown={() => {
              if (farmPage[tab] < lastPage) farmPage[tab]++
            }}
          />
        </UiEntity>
      )}
    </PanelShell>
  )
}
