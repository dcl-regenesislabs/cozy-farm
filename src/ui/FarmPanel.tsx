import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { PlotState } from '../components/farmComponents'
import { CropType, CROP_DATA, CROP_NAMES } from '../data/cropData'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { CROP_HARVEST_IMAGES, ORGANIC_WASTE_ICON, SOIL_ICON } from '../data/imagePaths'
import { getWateringStatus } from '../game/actions'
import { playerState } from '../game/gameState'
import { getRotTimeMs } from '../game/rotUtils'
import { tutorialState } from '../game/tutorialState'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { getSoilEntities } from '../systems/interactionSetup'
import { BadgeDot } from './BadgeDot'
import { getZoomScale, isZooming, triggerCardZoom } from './cardZoomSystem'
import {
  REVAMP_BG_IMG,
  REVAMP_CLOSE_RIGHT,
  REVAMP_CLOSE_RIGHT_MOBILE,
  REVAMP_CLOSE_TOP,
  REVAMP_CLOSE_TOP_MOBILE,
  REVAMP_PANEL_H,
  REVAMP_PANEL_TOP_MARGIN,
  REVAMP_PANEL_W,
  RevampCloseButton,
  RevampTitlePlaque,
} from './RevampPanel'
import {
  SHARED_PAGINATION_HEIGHT_DESKTOP,
  SHARED_PAGINATION_HEIGHT_MOBILE,
  SharedPaginationBar,
} from './SharedPaginationBar'
import { lerpColor, setTabActive } from './tabFadeSystem'

type FarmTabValue = 'home' | 'expansion' | 'compost'
type CardColor = { r: number; g: number; b: number; a: number }
type FarmGridItem = { key: string | number; node: ReactEcs.JSX.ReactNode }
type PlotVisualState = {
  iconSrc: string
  title: string
  meta?: string
  status: string
  statusColor: CardColor
  note?: string
  progressPct?: number
  progressColor?: CardColor
  fertilizer?: { name: string; iconSrc: string }
}

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const FARM_TAB_SELECTED_IMG = 'assets/images/revamp/selected.png'
const FARM_TAB_IDLE_IMG = 'assets/images/revamp/notselected.png'
const FARM_CARD_IMG = 'assets/images/revamp/card.png'
const FARM_BUTTON_IMG = 'assets/images/revamp/mini-button-no-coin.png'
const FARM_PAGINATION_BUTTON_IMG = 'assets/images/revamp/Type=Secondary, State=Default.png'
const FARM_BUTTON_ASPECT = 196 / 52
const FARM_PAGINATION_BUTTON_ASPECT = 366 / 84

const FARM_PANEL_W = Math.round(REVAMP_PANEL_W * 1.08)
const FARM_PANEL_H = Math.round(REVAMP_PANEL_H * 1.18)
const FARM_PANEL_TOP_MARGIN_MOBILE = REVAMP_PANEL_TOP_MARGIN + ss(22)
const FARM_PANEL_TOP_MARGIN_DESKTOP = REVAMP_PANEL_TOP_MARGIN + ss(86)
const FARM_CONTENT_LEFT = ss(82)
const FARM_CONTENT_RIGHT = ss(82)
const FARM_TAB_W = 168
const FARM_TAB_H = Math.round(FARM_TAB_W / (151 / 68))
const FARM_TAB_GAP = ss(12)
const FARM_TABS_TOP = ss(104)
const FARM_CONTENT_TOP = FARM_TABS_TOP + FARM_TAB_H + ss(12)
const FARM_CONTENT_BOTTOM = ss(52)
const FARM_CONTENT_W = FARM_PANEL_W - FARM_CONTENT_LEFT - FARM_CONTENT_RIGHT
const FARM_CONTENT_H = FARM_PANEL_H - FARM_CONTENT_TOP - FARM_CONTENT_BOTTOM

const FARM_TAB_TEXT_IDLE = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const FARM_TAB_TEXT_SELECTED = { r: 1, g: 1, b: 1, a: 1 }
const FARM_CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const FARM_CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const FARM_STATUS_READY = { r: 0.24, g: 0.66, b: 0.18, a: 1 }
const FARM_STATUS_WATER = { r: 0.20, g: 0.46, b: 0.88, a: 1 }
const FARM_STATUS_WARNING = { r: 0.88, g: 0.46, b: 0.14, a: 1 }
const FARM_STATUS_DANGER = { r: 0.86, g: 0.28, b: 0.18, a: 1 }
const FARM_PROGRESS_BG = { r: 0.18, g: 0.11, b: 0.04, a: 1 }
const FARM_COMPOST_SUCCESS = { r: 0.28, g: 0.70, b: 0.24, a: 1 }
const FARM_PAGINATION_TEXT = { r: 0.34, g: 0.20, b: 0.10, a: 1 }
const FARM_PAGINATION_TEXT_DISABLED = { r: 0.53, g: 0.39, b: 0.25, a: 0.72 }
const FARM_PAGINATION_CHIP_BG = { r: 0.34, g: 0.18, b: 0.07, a: 0.96 }
const FARM_PAGINATION_CHIP_BORDER = { r: 0.95, g: 0.90, b: 0.80, a: 0.98 }
const FARM_PAGINATION_CHIP_TEXT = { r: 1, g: 1, b: 1, a: 1 }

const FARM_CARD_W = 208
const FARM_CARD_BASE_H = 340
const FARM_CARD_MARGIN = 2
const FARM_CARD_PAD_TOP = 22
const FARM_CARD_PAD_BOTTOM = 36
const FARM_CARD_PAD_SIDE = 16
const FARM_CARD_BG_SCALE = 1.15
const FARM_CARD_BG_SCALE_MOBILE = 1.18
const FARM_CARD_CONTENT_SCALE_MOBILE = 1.28
const FARM_CARD_ART_ASPECT = 236 / 326
const FARM_GRID_CARD_SLOT_TRIM = 10
const FARM_GRID_SLOT_HEIGHT_TRIM_DESKTOP = 12
const FARM_GRID_SLOT_HEIGHT_TRIM_MOBILE = 0
const FARM_CARD_ICON = 104
const FARM_CARD_ICON_TOP_SPACE = ss(8)
const FARM_CARD_ICON_MARGIN = ss(12)
const FARM_CARD_TITLE_LG = ss(31)
const FARM_CARD_TITLE_SM = ss(27)
const FARM_CARD_STATUS_FONT = ss(26)
const FARM_CARD_META_FONT = ss(19)
const FARM_CARD_NOTE_FONT = ss(17)
const FARM_PROGRESS_H = ss(14)
const FARM_PROGRESS_RADIUS = ss(7)
const FARM_ACTION_BUTTON_SCALE = 1.1
const FARM_ACTION_BUTTON_W = 136
const FARM_ACTION_BUTTON_H = Math.round(FARM_ACTION_BUTTON_W / FARM_BUTTON_ASPECT)
const FARM_ACTION_BUTTON_FONT = ss(20)
const FARM_ACTION_BUTTON_TOP_MARGIN = ss(12)
const FARM_ACTION_BUTTON_LABEL_TOP_OFFSET = -ss(4)
const FARM_ITEMS_PER_PAGE = 3
const FARM_GRID_TOP_OFFSET_DESKTOP = ss(6)
const FARM_GRID_TOP_OFFSET_MOBILE = ss(12)
const FARM_PAGINATION_MARGIN_TOP_DESKTOP = ss(26)
const FARM_PAGINATION_MARGIN_TOP_MOBILE = ss(34)

const COMPOST_CYCLE_MS = 300_000

const farmTab = { value: 'home' as FarmTabValue }
const farmPage: Record<FarmTabValue, number> = { home: 0, expansion: 0, compost: 0 }

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

function getFarmCardBgScale(): number {
  return isMobile() ? FARM_CARD_BG_SCALE_MOBILE : FARM_CARD_BG_SCALE
}

function scaleFarmCardContent(value: number): number {
  return isMobile() ? Math.round(value * FARM_CARD_CONTENT_SCALE_MOBILE) : value
}

function getFarmCardTransform(scale: number, baseHeight = FARM_CARD_BASE_H) {
  const bgScale = getFarmCardBgScale()
  const width = Math.round(FARM_CARD_W * scale * bgScale)
  const artHeight = Math.round(width / FARM_CARD_ART_ASPECT)
  const baseHeightScaled = Math.round(baseHeight * scale * bgScale)
  const padTop = isMobile() ? FARM_CARD_PAD_TOP + 8 : FARM_CARD_PAD_TOP + 12
  const padBottom = isMobile() ? FARM_CARD_PAD_BOTTOM + 6 : FARM_CARD_PAD_BOTTOM + 8
  const padSide = isMobile() ? 12 : FARM_CARD_PAD_SIDE

  return {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    width,
    height: Math.max(artHeight, baseHeightScaled),
    margin: { right: FARM_CARD_MARGIN, bottom: FARM_CARD_MARGIN },
    padding: {
      top: padTop,
      bottom: padBottom,
      left: padSide,
      right: padSide,
    },
  }
}

function getFarmCardVisualWidth(scale = 1): number {
  return Math.round(FARM_CARD_W * scale * getFarmCardBgScale())
}

function getFarmGridSlotWidth(scale = 1): number {
  return Math.max(0, getFarmCardVisualWidth(scale) - FARM_GRID_CARD_SLOT_TRIM)
}

function getFarmGridMetrics(itemCount: number, baseHeight = FARM_CARD_BASE_H) {
  const slotWidth = getFarmGridSlotWidth()
  const offsetX = Math.round((slotWidth - getFarmCardVisualWidth()) / 2)
  const gridWidth = Math.max(1, itemCount) * slotWidth
  const cardHeight = getFarmCardTransform(1, baseHeight).height
  const slotHeight = Math.max(
    1,
    cardHeight - (isMobile() ? FARM_GRID_SLOT_HEIGHT_TRIM_MOBILE : FARM_GRID_SLOT_HEIGHT_TRIM_DESKTOP)
  )

  return {
    slotWidth,
    offsetX,
    gridWidth,
    slotHeight,
  }
}

function getFarmCardTitleFont(title: string): number {
  return title.length <= 12 ? scaleFarmCardContent(FARM_CARD_TITLE_LG) : scaleFarmCardContent(FARM_CARD_TITLE_SM)
}

function getFarmStatusFont(status: string): number {
  if (status.length > 12) return scaleFarmCardContent(FARM_CARD_META_FONT + ss(2))
  if (status.length > 10) return scaleFarmCardContent(FARM_CARD_STATUS_FONT - ss(2))
  return scaleFarmCardContent(FARM_CARD_STATUS_FONT)
}

function getFarmTabLabelFont(label: string): number {
  if (label.length > 10) return ss(isMobile() ? 22 : 18)
  return ss(isMobile() ? 27 : 23)
}

function getFarmPaginationMarginTop(): number {
  return isMobile() ? FARM_PAGINATION_MARGIN_TOP_MOBILE : FARM_PAGINATION_MARGIN_TOP_DESKTOP
}

function getFarmGridTopOffset(): number {
  return isMobile() ? FARM_GRID_TOP_OFFSET_MOBILE : FARM_GRID_TOP_OFFSET_DESKTOP
}

function getCompostPanelState() {
  const now = Date.now()
  const wasteInBin = playerState.compostWasteCount
  const lastCollected = playerState.compostLastCollectedAt
  const timeElapsed = lastCollected > 0 && wasteInBin > 0 ? now - lastCollected : 0
  const cyclesDone = Math.min(Math.floor(timeElapsed / COMPOST_CYCLE_MS), wasteInBin)
  const nextCycleMs = wasteInBin > cyclesDone && lastCollected > 0
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
  if (playerState.compostLastCollectedAt === 0) playerState.compostLastCollectedAt = Date.now()
  playSound('buttonclick')
}

function getPlotVisualState(entity: ReturnType<typeof getSoilEntities>[number], idx: number, now: number): PlotVisualState | null {
  const plot = PlotState.getOrNull(entity)
  if (!plot) return null

  if (!plot.isUnlocked) {
    return {
      iconSrc: SOIL_ICON,
      title: `Plot ${idx + 1}`,
      status: 'Locked',
      statusColor: FARM_CARD_TEXT_MUTE,
      note: 'Unlock this area to use the plot',
    }
  }

  if (plot.cropType === -1) {
    return {
      iconSrc: SOIL_ICON,
      title: `Plot ${idx + 1}`,
      status: plot.justHarvested ? 'Clear plot' : 'Empty',
      statusColor: plot.justHarvested ? FARM_STATUS_WARNING : FARM_CARD_TEXT_MUTE,
      note: plot.justHarvested ? 'Remove leftovers and replant' : 'Ready for a new seed',
    }
  }

  const ct = plot.cropType as CropType
  const def = CROP_DATA.get(ct)!
  const title = CROP_NAMES[ct]
  const meta = `Plot ${idx + 1}`

  if (plot.isRotten) {
    return {
      iconSrc: ORGANIC_WASTE_ICON,
      title,
      meta,
      status: 'Rotting!',
      statusColor: FARM_STATUS_DANGER,
      note: 'Take it to the compost bin',
      progressPct: 100,
      progressColor: FARM_STATUS_DANGER,
    }
  }

  if (plot.isReady || plot.growthStage === 3) {
    const rotTotalMs = getRotTimeMs(def, plot.fertilizerType)
    const timeUntilRot = rotTotalMs === Infinity ? null : plot.plantedAt + rotTotalMs - now
    return {
      iconSrc: CROP_HARVEST_IMAGES[ct],
      title,
      meta,
      status: 'Ready!',
      statusColor: FARM_STATUS_READY,
      note: timeUntilRot && timeUntilRot > 0 ? `Rots in ${formatTime(timeUntilRot)}` : 'Harvest whenever you want',
      progressPct: 100,
      progressColor: FARM_STATUS_READY,
    }
  }

  if (!plot.growthStarted) {
    return {
      iconSrc: CROP_HARVEST_IMAGES[ct],
      title,
      meta,
      status: 'Needs water',
      statusColor: FARM_STATUS_WATER,
      note: `${plot.waterCount}/${def.wateringsRequired} watered`,
    }
  }

  const elapsed = now - plot.plantedAt
  let effectiveGrowTimeMs = tutorialState.active && ct === CropType.Onion ? 30_000 : def.growTimeMs
  if (plot.fertilizerType === FertilizerType.GrowthBoost) effectiveGrowTimeMs = Math.floor(effectiveGrowTimeMs * 0.75)
  const remainingMs = effectiveGrowTimeMs - elapsed
  const waterStatus = getWateringStatus(plot, now)
  const windowRelevant = waterStatus.nextWindowInMs !== null && waterStatus.nextWindowInMs < remainingMs

  let status = formatTime(remainingMs)
  let statusColor = FARM_STATUS_WARNING

  if (waterStatus.canWater) {
    status = 'Water now!'
    statusColor = FARM_STATUS_WATER
  } else if (windowRelevant && waterStatus.nextWindowInMs !== null) {
    status = `Water in ${formatTime(waterStatus.nextWindowInMs)}`
    statusColor = FARM_STATUS_WARNING
  }

  const fertilizer = plot.fertilizerType !== -1
    ? FERTILIZER_DATA.get(plot.fertilizerType as FertilizerType)
    : undefined

  return {
    iconSrc: CROP_HARVEST_IMAGES[ct],
    title,
    meta,
    status,
    statusColor,
    note: `${plot.waterCount}/${def.wateringsRequired} watered`,
    progressPct: Math.min(100, Math.floor((elapsed / effectiveGrowTimeMs) * 100)),
    progressColor: statusColor,
    fertilizer: fertilizer ? { name: fertilizer.name, iconSrc: fertilizer.iconSrc } : undefined,
  }
}

const FarmCardFrame = ({
  scale = 1,
  baseHeight = FARM_CARD_BASE_H,
  onCardPress,
  children,
}: {
  scale?: number
  baseHeight?: number
  onCardPress?: () => void
  children?: ReactEcs.JSX.ReactNode
}) => {
  const transform = getFarmCardTransform(scale, baseHeight)

  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={{
        texture: { src: FARM_CARD_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      {children}
      {isMobile() && onCardPress && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: transform.width,
            height: transform.height,
          }}
          onMouseDown={onCardPress}
        />
      )}
    </UiEntity>
  )
}

const FarmActionButton = ({
  label,
  active,
  zoomKey,
  onPress,
}: {
  label: string
  active: boolean
  zoomKey: string
  onPress: () => void
}) => {
  const buttonScale = isMobile() ? FARM_ACTION_BUTTON_SCALE * FARM_CARD_CONTENT_SCALE_MOBILE : FARM_ACTION_BUTTON_SCALE
  const scale = getZoomScale(zoomKey)
  const buttonWidth = Math.round(FARM_ACTION_BUTTON_W * buttonScale * scale)
  const buttonHeight = Math.round(FARM_ACTION_BUTTON_H * buttonScale * scale)

  return (
    <UiEntity
      uiTransform={{
        width: buttonWidth,
        height: buttonHeight,
        alignItems: 'center',
        justifyContent: 'center',
        margin: { top: scaleFarmCardContent(FARM_ACTION_BUTTON_TOP_MARGIN) },
      }}
      uiBackground={{
        texture: { src: FARM_BUTTON_IMG, wrapMode: 'clamp' },
        textureMode: 'stretch',
        color: active ? { r: 1, g: 1, b: 1, a: 1 } : { r: 0.72, g: 0.72, b: 0.72, a: 0.88 },
      }}
      onMouseDown={active ? () => {
        if (isZooming(zoomKey)) return
        triggerCardZoom(zoomKey)
        setTimeout(onPress, 290)
      } : undefined}
    >
      <Label
        value={`<b>${label}</b>`}
        fontSize={scaleFarmCardContent(FARM_ACTION_BUTTON_FONT)}
        color={active ? { r: 1, g: 1, b: 1, a: 1 } : FARM_CARD_TEXT_MUTE}
        textAlign="middle-center"
        textWrap="nowrap"
        uiTransform={{
          positionType: 'absolute',
          position: { top: FARM_ACTION_BUTTON_LABEL_TOP_OFFSET, left: 0 },
          width: buttonWidth,
          height: buttonHeight,
        }}
      />
    </UiEntity>
  )
}

const PlotCard = ({
  entity,
  idx,
  now,
}: {
  entity: ReturnType<typeof getSoilEntities>[number]
  idx: number
  now: number
}) => {
  const visual = getPlotVisualState(entity, idx, now)
  if (!visual) return null
  const showBottomReady = visual.status === 'Ready!' && visual.statusColor === FARM_STATUS_READY

  return (
    <FarmCardFrame>
      <UiEntity uiTransform={{ height: scaleFarmCardContent(FARM_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />

      <UiEntity
        uiTransform={{
          width: scaleFarmCardContent(FARM_CARD_ICON),
          height: scaleFarmCardContent(FARM_CARD_ICON),
          margin: { bottom: scaleFarmCardContent(FARM_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: visual.iconSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />

      <Label
        value={`<b>${visual.title}</b>`}
        fontSize={getFarmCardTitleFont(visual.title)}
        color={FARM_CARD_TEXT}
        textAlign="middle-center"
      />

      {visual.meta && (
        <Label
          value={visual.meta}
          fontSize={scaleFarmCardContent(FARM_CARD_META_FONT)}
          color={FARM_CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(2) } }}
        />
      )}

      {!showBottomReady && (
        <Label
          value={`<b>${visual.status}</b>`}
          fontSize={getFarmStatusFont(visual.status)}
          color={visual.statusColor}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{ margin: { top: ss(8) } }}
        />
      )}

      {visual.note && (
        <Label
          value={visual.note}
          fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)}
          color={FARM_CARD_TEXT_MUTE}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(6) } }}
        />
      )}

      <UiEntity uiTransform={{ flex: 1 }} />

      {visual.fertilizer && (
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: ss(8) } }}>
          <UiEntity
            uiTransform={{
              width: scaleFarmCardContent(20),
              height: scaleFarmCardContent(20),
              margin: { right: ss(6) },
              flexShrink: 0,
            }}
            uiBackground={{
              texture: { src: visual.fertilizer.iconSrc, wrapMode: 'clamp' },
              textureMode: 'stretch',
            }}
          />
          <Label
            value={visual.fertilizer.name}
            fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)}
            color={FARM_STATUS_READY}
            textAlign="middle-center"
          />
        </UiEntity>
      )}

      {showBottomReady && (
        <Label
          value="<b>Ready!</b>"
          fontSize={scaleFarmCardContent(FARM_CARD_STATUS_FONT)}
          color={FARM_STATUS_READY}
          textAlign="middle-center"
          uiTransform={{ margin: { top: ss(4) } }}
        />
      )}

      {!showBottomReady && visual.progressPct !== undefined && (
        <UiEntity uiTransform={{ width: '100%', margin: { top: ss(4) } }}>
          <UiEntity
            uiTransform={{
              width: '100%',
              height: isMobile() ? scaleFarmCardContent(FARM_PROGRESS_H + 2) : FARM_PROGRESS_H,
              borderRadius: isMobile() ? scaleFarmCardContent(FARM_PROGRESS_RADIUS + 1) : FARM_PROGRESS_RADIUS,
            }}
            uiBackground={{ color: FARM_PROGRESS_BG }}
          >
            <UiEntity
              uiTransform={{
                width: `${visual.progressPct}%`,
                height: '100%',
                borderRadius: isMobile() ? scaleFarmCardContent(FARM_PROGRESS_RADIUS + 1) : FARM_PROGRESS_RADIUS,
              }}
              uiBackground={{ color: visual.progressColor ?? FARM_STATUS_WARNING }}
            />
          </UiEntity>
        </UiEntity>
      )}
    </FarmCardFrame>
  )
}

const CompostStatusCard = () => {
  const { wasteInBin, cyclesDone, nextCycleMs } = getCompostPanelState()
  const status = cyclesDone > 0 ? `${cyclesDone} ready` : wasteInBin > 0 ? 'Working' : 'Idle'
  const statusColor = cyclesDone > 0 ? FARM_STATUS_READY : wasteInBin > 0 ? FARM_STATUS_WARNING : FARM_CARD_TEXT_MUTE
  const note = nextCycleMs !== null
    ? `Next fertilizer in ${formatTime(nextCycleMs)}`
    : wasteInBin > 0
      ? 'Collect ready fertilizer to free space'
      : 'Add organic waste to start composting'

  return (
    <FarmCardFrame>
      <UiEntity uiTransform={{ height: scaleFarmCardContent(FARM_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />
      <UiEntity
        uiTransform={{
          width: scaleFarmCardContent(FARM_CARD_ICON),
          height: scaleFarmCardContent(FARM_CARD_ICON),
          margin: { bottom: scaleFarmCardContent(FARM_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value="<b>Compost Status</b>" fontSize={getFarmCardTitleFont('Compost Status')} color={FARM_CARD_TEXT} textAlign="middle-center" />
      <Label value={`Hand ${playerState.organicWaste} | Bin ${wasteInBin}`} fontSize={scaleFarmCardContent(FARM_CARD_META_FONT)} color={FARM_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(4) } }} />
      <Label value={`<b>${status}</b>`} fontSize={scaleFarmCardContent(FARM_CARD_STATUS_FONT)} color={statusColor} textAlign="middle-center" uiTransform={{ margin: { top: ss(10) } }} />
      <Label value={note} fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)} color={FARM_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
    </FarmCardFrame>
  )
}

const CompostActionCard = ({
  title,
  note,
  status,
  statusColor,
  iconSrc,
  buttonLabel,
  zoomKey,
  active,
  onAction,
}: {
  title: string
  note: string
  status: string
  statusColor: CardColor
  iconSrc: string
  buttonLabel: string
  zoomKey: string
  active: boolean
  onAction: () => void
}) => {
  const scale = getZoomScale(zoomKey)
  const handlePress = active ? () => {
    if (isZooming(zoomKey)) return
    playSound('buttonclick')
    triggerCardZoom(zoomKey)
    setTimeout(onAction, 290)
  } : undefined

  return (
    <FarmCardFrame scale={scale} onCardPress={handlePress}>
      <UiEntity uiTransform={{ height: scaleFarmCardContent(FARM_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />
      <UiEntity
        uiTransform={{
          width: scaleFarmCardContent(FARM_CARD_ICON),
          height: scaleFarmCardContent(FARM_CARD_ICON),
          margin: { bottom: scaleFarmCardContent(FARM_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: iconSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={`<b>${title}</b>`} fontSize={getFarmCardTitleFont(title)} color={FARM_CARD_TEXT} textAlign="middle-center" />
      <Label value={`<b>${status}</b>`} fontSize={scaleFarmCardContent(FARM_CARD_STATUS_FONT)} color={statusColor} textAlign="middle-center" uiTransform={{ margin: { top: ss(10) } }} />
      <Label value={note} fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)} color={FARM_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
      <UiEntity uiTransform={{ flex: 1 }} />
      <FarmActionButton label={buttonLabel} active={active} zoomKey={zoomKey} onPress={onAction} />
    </FarmCardFrame>
  )
}

const FertilizerStockCard = ({ type }: { type: FertilizerType }) => {
  const def = FERTILIZER_DATA.get(type)!
  const count = playerState.fertilizers.get(type) ?? 0

  return (
    <FarmCardFrame>
      <UiEntity uiTransform={{ height: scaleFarmCardContent(FARM_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />
      <UiEntity
        uiTransform={{
          width: scaleFarmCardContent(FARM_CARD_ICON),
          height: scaleFarmCardContent(FARM_CARD_ICON),
          margin: { bottom: scaleFarmCardContent(FARM_CARD_ICON_MARGIN) },
          flexShrink: 0,
        }}
        uiBackground={{
          texture: { src: def.iconSrc, wrapMode: 'clamp' },
          textureMode: 'stretch',
        }}
      />
      <Label value={`<b>${def.name}</b>`} fontSize={getFarmCardTitleFont(def.name)} color={FARM_CARD_TEXT} textAlign="middle-center" />
      <Label value={`<b>x${count}</b>`} fontSize={scaleFarmCardContent(FARM_CARD_STATUS_FONT)} color={count > 0 ? FARM_COMPOST_SUCCESS : FARM_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(10) } }} />
      <Label value={def.description} fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)} color={FARM_CARD_TEXT_MUTE} textAlign="middle-center" uiTransform={{ margin: { top: ss(8) } }} />
    </FarmCardFrame>
  )
}

const LockedCompostCard = () => (
  <FarmCardFrame>
    <UiEntity uiTransform={{ height: scaleFarmCardContent(FARM_CARD_ICON_TOP_SPACE), flexShrink: 0 }} />
    <UiEntity
      uiTransform={{
        width: scaleFarmCardContent(FARM_CARD_ICON),
        height: scaleFarmCardContent(FARM_CARD_ICON),
        margin: { bottom: scaleFarmCardContent(FARM_CARD_ICON_MARGIN) },
        flexShrink: 0,
      }}
      uiBackground={{
        texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />
    <Label value="<b>Compost Bin</b>" fontSize={getFarmCardTitleFont('Compost Bin')} color={FARM_CARD_TEXT} textAlign="middle-center" />
    <Label value="<b>Locked</b>" fontSize={scaleFarmCardContent(FARM_CARD_STATUS_FONT)} color={FARM_STATUS_WARNING} textAlign="middle-center" uiTransform={{ margin: { top: ss(10) } }} />
    <Label
      value="Buy it in the shop under Fertilizers"
      fontSize={scaleFarmCardContent(FARM_CARD_NOTE_FONT)}
      color={FARM_CARD_TEXT_MUTE}
      textAlign="middle-center"
      uiTransform={{ margin: { top: ss(8) } }}
    />
  </FarmCardFrame>
)

const FarmTabChip = ({
  tabKey,
  label,
  selected,
  onClick,
  showBadge = false,
}: {
  tabKey: FarmTabValue
  label: string
  selected: boolean
  onClick: () => void
  showBadge?: boolean
}) => {
  const mobile = isMobile()
  const tabHitHeight = mobile ? FARM_TAB_H + ss(18) : FARM_TAB_H
  const tabHitWidth = mobile ? FARM_TAB_W + ss(20) : FARM_TAB_W
  const tabHitLeft = Math.round((FARM_TAB_W - tabHitWidth) / 2)
  const t = setTabActive(`farm-tab-${tabKey}`, selected)

  return (
    <UiEntity
      uiTransform={{
        width: FARM_TAB_W,
        height: tabHitHeight,
        margin: { right: FARM_TAB_GAP, bottom: FARM_TAB_GAP },
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: FARM_TAB_W,
          height: FARM_TAB_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: FARM_TAB_W, height: FARM_TAB_H }}
          uiBackground={{
            texture: { src: FARM_TAB_IDLE_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: 1 - t },
          }}
        />
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: FARM_TAB_W, height: FARM_TAB_H }}
          uiBackground={{
            texture: { src: FARM_TAB_SELECTED_IMG, wrapMode: 'clamp' },
            textureMode: 'stretch',
            color: { r: 1, g: 1, b: 1, a: t },
          }}
        />
        <Label
          value={`<b>${label}</b>`}
          fontSize={getFarmTabLabelFont(label)}
          color={lerpColor(FARM_TAB_TEXT_IDLE, FARM_TAB_TEXT_SELECTED, t)}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{
            width: FARM_TAB_W - 18,
            height: FARM_TAB_H,
            alignItems: 'center',
            justifyContent: 'center',
            padding: { bottom: 12 },
          }}
        />
      </UiEntity>

      {showBadge && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { right: -4, top: -4 } }}>
          <BadgeDot />
        </UiEntity>
      )}

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: tabHitLeft },
          width: tabHitWidth,
          height: tabHitHeight,
        }}
        onMouseDown={() => {
          playSound('buttonclick')
          onClick()
        }}
      />
    </UiEntity>
  )
}

const FarmTabs = ({
  tab,
  homeHasReady,
  expansionHasReady,
  compostHasReady,
}: {
  tab: FarmTabValue
  homeHasReady: boolean
  expansionHasReady: boolean
  compostHasReady: boolean
}) => (
  <UiEntity
    uiTransform={{
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      flexShrink: 0,
    }}
  >
    <FarmTabChip tabKey="home" label="My Farm" selected={tab === 'home'} showBadge={homeHasReady} onClick={() => { farmTab.value = 'home' }} />
    <FarmTabChip tabKey="expansion" label="Expansion" selected={tab === 'expansion'} showBadge={expansionHasReady} onClick={() => { farmTab.value = 'expansion' }} />
    <FarmTabChip tabKey="compost" label="Compost Bin" selected={tab === 'compost'} showBadge={compostHasReady} onClick={() => { farmTab.value = 'compost' }} />
  </UiEntity>
)

const FarmPanelFrame = ({
  onClose,
  tabs,
  children,
}: {
  onClose: () => void
  tabs?: ReactEcs.JSX.ReactNode
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  const panelTopMargin = mobile ? FARM_PANEL_TOP_MARGIN_MOBILE : FARM_PANEL_TOP_MARGIN_DESKTOP
  const contentLeft = Math.round((FARM_PANEL_W - FARM_CONTENT_W) / 2)

  return (
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
          width: FARM_PANEL_W,
          height: FARM_PANEL_H,
          margin: { top: panelTopMargin },
          pointerFilter: 'block',
        }}
        uiBackground={{ texture: { src: REVAMP_BG_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <RevampTitlePlaque name="farm" panelWidth={FARM_PANEL_W} />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: contentLeft, top: FARM_CONTENT_TOP },
            width: FARM_CONTENT_W,
            height: FARM_CONTENT_H,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: contentLeft, top: FARM_TABS_TOP },
            width: FARM_CONTENT_W,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {tabs}
        </UiEntity>

        <RevampCloseButton
          onClose={onClose}
          right={isMobile() ? REVAMP_CLOSE_RIGHT_MOBILE : REVAMP_CLOSE_RIGHT}
          top={isMobile() ? REVAMP_CLOSE_TOP_MOBILE : REVAMP_CLOSE_TOP}
        />
      </UiEntity>
    </UiEntity>
  )
}

const FarmCardGrid = ({
  items,
  baseHeight = FARM_CARD_BASE_H,
}: {
  items: FarmGridItem[]
  baseHeight?: number
}) => {
  const { slotWidth, offsetX, gridWidth, slotHeight } = getFarmGridMetrics(items.length, baseHeight)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        margin: { top: getFarmGridTopOffset() },
      }}
    >
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          width: gridWidth,
          height: slotHeight,
          justifyContent: 'center',
        }}
      >
        {items.map((item) => (
          <UiEntity key={item.key} uiTransform={{ width: slotWidth, height: slotHeight }}>
            <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
              {item.node}
            </UiEntity>
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

export const FarmPanel = () => {
  const mobile = isMobile()
  const soilEntities = getSoilEntities()
  const now = Date.now()
  const { cyclesDone } = getCompostPanelState()

  const homePlots = soilEntities.slice(0, 12)
  const expansionPlots = soilEntities.slice(12)
  const homeHasReady = homePlots.some((e) => PlotState.getOrNull(e)?.isReady)
  const expansionHasReady = expansionPlots.some((e) => PlotState.getOrNull(e)?.isReady)
  const compostHasReady = cyclesDone > 0
  const tab = farmTab.value

  const homeItems: FarmGridItem[] = homePlots.map((entity, idx) => ({
    key: `home-${idx}`,
    node: <PlotCard entity={entity} idx={idx} now={now} />,
  }))
  const expansionItems: FarmGridItem[] = expansionPlots.map((entity, idx) => ({
    key: `expansion-${idx}`,
    node: <PlotCard entity={entity} idx={idx + 12} now={now} />,
  }))
  const compostItems: FarmGridItem[] = playerState.compostBinUnlocked
    ? [
        { key: 'compost-status', node: <CompostStatusCard /> },
        {
          key: 'compost-add',
          node: (
            <CompostActionCard
              title="Add Waste"
              status={`Hand x${playerState.organicWaste}`}
              statusColor={playerState.organicWaste > 0 ? FARM_STATUS_WARNING : FARM_CARD_TEXT_MUTE}
              note="Move organic waste into the bin"
              iconSrc={ORGANIC_WASTE_ICON}
              buttonLabel="ADD!"
              zoomKey="farm_add_waste"
              active={playerState.organicWaste > 0}
              onAction={addCompostWaste}
            />
          ),
        },
        {
          key: 'compost-collect',
          node: (
            <CompostActionCard
              title="Collect"
              status={cyclesDone > 0 ? `${cyclesDone} ready` : 'Nothing ready'}
              statusColor={cyclesDone > 0 ? FARM_COMPOST_SUCCESS : FARM_CARD_TEXT_MUTE}
              note={cyclesDone > 0 ? 'Claim finished fertilizer now' : 'Come back when a cycle finishes'}
              iconSrc={ORGANIC_WASTE_ICON}
              buttonLabel="COLLECT"
              zoomKey="farm_collect_compost"
              active={cyclesDone > 0}
              onAction={collectCompostReady}
            />
          ),
        },
        ...ALL_FERTILIZER_TYPES.map((type) => ({
          key: `fert-${type}`,
          node: <FertilizerStockCard type={type} />,
        })),
      ]
    : [{ key: 'compost-locked', node: <LockedCompostCard /> }]

  const itemsByTab: Record<FarmTabValue, FarmGridItem[]> = {
    home: homeItems,
    expansion: expansionItems,
    compost: compostItems,
  }

  const items = itemsByTab[tab]
  const lastPage = Math.max(0, Math.ceil(items.length / FARM_ITEMS_PER_PAGE) - 1)
  if (farmPage[tab] > lastPage) farmPage[tab] = lastPage
  const page = farmPage[tab]
  const pageSlice = items.slice(page * FARM_ITEMS_PER_PAGE, (page + 1) * FARM_ITEMS_PER_PAGE)
  const paginationHeight = mobile ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const paginationMarginTop = getFarmPaginationMarginTop()

  return (
    <FarmPanelFrame
      onClose={() => { playerState.activeMenu = 'none' }}
      tabs={
        <FarmTabs
          tab={tab}
          homeHasReady={homeHasReady}
          expansionHasReady={expansionHasReady}
          compostHasReady={compostHasReady}
        />
      }
    >
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', flex: 1, alignItems: 'center' }}>
        <FarmCardGrid items={pageSlice} />

        {lastPage > 0 && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: paginationHeight,
              margin: { top: paginationMarginTop },
              flexShrink: 0,
            }}
          >
            <SharedPaginationBar
              id={`farm-${tab}`}
              page={page}
              lastPage={lastPage}
              onPrev={() => { if (farmPage[tab] > 0) farmPage[tab]-- }}
              onNext={() => { if (farmPage[tab] < lastPage) farmPage[tab]++ }}
              mode={mobile ? 'mobile' : 'desktop'}
              marginTop={0}
              buttonTextureSrc={FARM_PAGINATION_BUTTON_IMG}
              buttonDisabledTextureSrc={FARM_PAGINATION_BUTTON_IMG}
              buttonAspect={FARM_PAGINATION_BUTTON_ASPECT}
              buttonLabelTopOffset={-ss(1)}
              pageTextTopOffset={-ss(1)}
              buttonLabelColor={FARM_PAGINATION_TEXT}
              buttonLabelDisabledColor={FARM_PAGINATION_TEXT_DISABLED}
              pageChipBgColor={FARM_PAGINATION_CHIP_BG}
              pageChipBorderColor={FARM_PAGINATION_CHIP_BORDER}
              pageChipTextColor={FARM_PAGINATION_CHIP_TEXT}
            />
          </UiEntity>
        )}
      </UiEntity>
    </FarmPanelFrame>
  )
}
