import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { CROP_HARVEST_IMAGES, SOIL_ICON } from '../data/imagePaths'
import { getSoilEntities } from '../systems/interactionSetup'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'

const farmTab = { value: 'home' as 'home' | 'expansion' }

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
        width: 184,
        height: 80,
        margin: { right: 8, bottom: 8 },
        padding: { top: 8, bottom: 8, left: 8, right: 8 },
      }}
      uiBackground={{ color: tileBg }}
    >
      {/* Crop icon or numbered badge */}
      {imgSrc !== '' ? (
        <UiEntity
          uiTransform={{ width: 44, height: 44, margin: { right: 8 }, flexShrink: 0 }}
          uiBackground={{
            texture: { src: imgSrc, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        />
      ) : (
        <UiEntity
          uiTransform={{ width: 44, height: 44, margin: { right: 8 }, flexShrink: 0 }}
          uiBackground={{
            texture: { src: SOIL_ICON, wrapMode: 'clamp' },
            textureMode: 'stretch',
          }}
        />
      )}

      {/* Text + bar */}
      <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
        <Label value={topLabel} fontSize={13} color={C.textMain} />
        <Label
          value={midLabel}
          fontSize={11}
          color={(plot.isReady || plot.growthStage === 3) && plot.cropType !== -1 ? C.green : C.textMute}
          uiTransform={{ margin: { top: 2, bottom: plot.isUnlocked && plot.cropType !== -1 ? 4 : 0 } }}
        />
        {plot.isUnlocked && plot.cropType !== -1 ? (
          <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
            <UiEntity
              uiTransform={{ width: '100%', height: 6 }}
              uiBackground={{ color: { r: 0.18, g: 0.16, b: 0.11, a: 1 } }}
            >
              <UiEntity
                uiTransform={{ width: `${barPct}%`, height: '100%' }}
                uiBackground={{ color: barColor }}
              />
            </UiEntity>
            {subLabel !== '' ? (
              <Label value={subLabel} fontSize={10} color={C.textMute} uiTransform={{ margin: { top: 3 } }} />
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

  // Plots 0-5 = Home Farm (always unlocked to player)
  // Plots 6-29 = Expansion (unlocked after buying)
  const homePlots      = soilEntities.slice(0, 6)
  const expansionPlots = soilEntities.slice(6)

  return (
    <PanelShell title="Farm" onClose={() => { playerState.activeMenu = 'none' }}>
      {/* Tab row */}
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 16 } }}>
        {([['home', 'My Farm'], ['expansion', 'Expansion']] as const).map(([tab, label]) => (
          <Button
            key={tab}
            value={label}
            variant={farmTab.value === tab ? 'primary' : 'secondary'}
            fontSize={14}
            uiTransform={{ width: 140, height: 38, margin: { right: 10 } }}
            onMouseDown={() => { farmTab.value = tab }}
          />
        ))}
      </UiEntity>

      {/* Tile grid */}
      <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {farmTab.value === 'home'
          ? homePlots.map((e, i) => <PlotTile key={i} entity={e} idx={i} now={now} />)
          : expansionPlots.map((e, i) => <PlotTile key={i + 6} entity={e} idx={i + 6} now={now} />)
        }
      </UiEntity>
    </PanelShell>
  )
}
