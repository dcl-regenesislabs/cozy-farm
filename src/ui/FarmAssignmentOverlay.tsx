import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'

const BACKGROUND_W = 1024
const BACKGROUND_H = 683
const ATLAS_SIZE = 1024
const LOADING_BACKGROUND = 'assets/images/ui_loading/background.png'
const LOADING_ATLAS = 'assets/images/ui_loading/atlas.png'

const TITLE_COLOR = { r: 0.29, g: 0.17, b: 0.07, a: 1 }
const SUBTITLE_COLOR = { r: 0.31, g: 0.19, b: 0.08, a: 1 }
const STEP_BROWN = { r: 0.38, g: 0.24, b: 0.1, a: 1 }
const STEP_GREEN = { r: 0.36, g: 0.56, b: 0.14, a: 1 }
const TRACK_COLOR = { r: 0.60, g: 0.40, b: 0.19, a: 1 }
const PROGRESS_GREEN = { r: 0.40, g: 0.67, b: 0.14, a: 1 }

const TITLE_W = 620
const TITLE_H = 58
const TITLE_TOP = 164
const TITLE_LEFT = 176
const SUBTITLE_TOP = 224
const SUBTITLE_LEFT = 176

const STEPS_TOP = 258
const STEPS_LEFT = 166
const STEPS_W = 692
const STEP_TEXT_TOP = 136
const ICON_STRIP_TOP = 8
const ICON_STRIP_LEFT = 10
const ICON_STRIP_W = 670
const ICON_STRIP_H = 112

const PROGRESS_TOP = 436
const PROGRESS_LEFT = 176
const PROGRESS_W = 665
const PROGRESS_H = 20
const PROGRESS_FILL_INSET = 4
const PROGRESS_FILL_H = 12
const PROGRESS_RADIUS = 10
const LOAD_INTRO_HOLD_MS = 2_000
const LOAD_PROGRESS_DURATION_MS = 4_200

const FOOTER_TOP = 480
const FOOTER_LEFT = 176
const FOOTER_W = 660

type AtlasRect = { x: number; y: number; w: number; h: number }
type LoadingStep = {
  id: string
  label: string
  start: number
  end: number
  labelLeft: number
  labelWidth: number
}

const SPRITES = {
  iconStrip:{ x: 30, y: 20, w: 973, h: 163 },
} as const

const STEPS: LoadingStep[] = [
  { id: 'connecting',  label: 'Connecting',    start: 0.00, end: 0.25, labelLeft: -8,  labelWidth: 140 },
  { id: 'claiming',    label: 'Claiming slot', start: 0.25, end: 0.50, labelLeft: 178, labelWidth: 140 },
  { id: 'loading',     label: 'Loading farm',  start: 0.50, end: 0.84, labelLeft: 364, labelWidth: 140 },
  { id: 'teleporting', label: 'Teleporting',   start: 0.84, end: 1.00, labelLeft: 552, labelWidth: 140 },
]

function getAnimatedEllipsis(): string {
  const phase = Math.floor(Date.now() / 350) % 3
  return '.'.repeat(phase + 1)
}

function atlasUvs(rect: AtlasRect): number[] {
  const left = rect.x / ATLAS_SIZE
  const right = (rect.x + rect.w) / ATLAS_SIZE
  const top = 1 - rect.y / ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / ATLAS_SIZE

  return [left, top, right, top, right, bottom, left, bottom]
}

function atlasUvsRotatedRight(rect: AtlasRect): number[] {
  const left = rect.x / ATLAS_SIZE
  const right = (rect.x + rect.w) / ATLAS_SIZE
  const top = 1 - rect.y / ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / ATLAS_SIZE

  return [left, bottom, left, top, right, top, right, bottom]
}

function getLoadProgress(): { progress: number; progressPct: number; isConnectingPhase: boolean; subtitle: string } {
  const startedAt = playerState.farmAssignmentOverlayStartedAt
  const hasAssignedFarm = playerState.farmAssignmentOverlaySlotId >= 0
  const elapsedMs = hasAssignedFarm ? Math.max(0, Date.now() - startedAt) : 0
  const overlayDurationMs = playerState.farmAssignmentOverlayDurationMs > 0
    ? playerState.farmAssignmentOverlayDurationMs
    : LOAD_INTRO_HOLD_MS + LOAD_PROGRESS_DURATION_MS
  const effectiveProgressDurationMs = Math.max(1, overlayDurationMs - LOAD_INTRO_HOLD_MS)
  const loadElapsedMs = Math.max(0, elapsedMs - LOAD_INTRO_HOLD_MS)
  const progress = Math.min(1, loadElapsedMs / effectiveProgressDurationMs)
  const progressPct = Math.round(progress * 100)
  const isConnectingPhase = !hasAssignedFarm || elapsedMs < LOAD_INTRO_HOLD_MS

  if (isConnectingPhase) {
    return {
      progress,
      progressPct,
      isConnectingPhase,
      subtitle: `Connecting to the server${getAnimatedEllipsis()}`
    }
  }

  if (progress < 0.5) {
    return { progress, progressPct, isConnectingPhase, subtitle: 'Claiming your farm slot' }
  }

  if (progress < 0.84) {
    return { progress, progressPct, isConnectingPhase, subtitle: 'Loading crops, plots, and farm data' }
  }

  return { progress, progressPct, isConnectingPhase, subtitle: 'Teleporting you to your farm' }
}

function isStepGreen(step: LoadingStep, progress: number, isConnectingPhase: boolean): boolean {
  if (step.id === 'connecting') return isConnectingPhase || progress >= step.end
  return progress >= step.start
}

const LoadingTitle = () => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: TITLE_TOP, left: TITLE_LEFT },
      width: TITLE_W,
      height: TITLE_H,
    }}
  >
    {[0, 1, 2].map((offset) => (
      <Label
        key={`loading-title-${offset}`}
        value="Preparing your new farm"
        fontSize={42}
        color={TITLE_COLOR}
        textAlign="middle-left"
        uiTransform={{
          positionType: 'absolute',
          position: { left: offset, top: 0 },
          width: TITLE_W,
          height: TITLE_H,
        }}
      />
    ))}
  </UiEntity>
)

const LoadingStepsRow = ({ progress, isConnectingPhase }: { progress: number; isConnectingPhase: boolean }) => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: STEPS_TOP, left: STEPS_LEFT },
      width: STEPS_W,
      height: 196,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}
  >
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: ICON_STRIP_TOP, left: ICON_STRIP_LEFT },
        width: ICON_STRIP_W,
        height: ICON_STRIP_H,
      }}
      uiBackground={{
        texture: { src: LOADING_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: atlasUvsRotatedRight(SPRITES.iconStrip),
      }}
    />

    {STEPS.map((step) => {
      const green = isStepGreen(step, progress, isConnectingPhase)

      return (
        <Label
          key={step.id}
          value={step.label}
          fontSize={16}
          color={green ? STEP_GREEN : STEP_BROWN}
          textAlign="middle-center"
          uiTransform={{
            positionType: 'absolute',
            position: { top: STEP_TEXT_TOP, left: step.labelLeft },
            width: step.labelWidth,
            height: 24,
          }}
        />
      )
    })}
  </UiEntity>
)

const LoadingProgressBar = ({ progress }: { progress: number }) => {
  const fillWidth = Math.max(0, Math.round((PROGRESS_W - PROGRESS_FILL_INSET * 2) * progress))

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: PROGRESS_TOP, left: PROGRESS_LEFT },
        width: PROGRESS_W,
        height: PROGRESS_H,
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: PROGRESS_W,
          height: PROGRESS_H,
          borderRadius: PROGRESS_RADIUS,
        }}
        uiBackground={{ color: TRACK_COLOR }}
      />

      {fillWidth > 0 && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: PROGRESS_FILL_INSET, left: PROGRESS_FILL_INSET },
            width: fillWidth,
            height: PROGRESS_FILL_H,
            borderRadius: 6,
          }}
          uiBackground={{ color: PROGRESS_GREEN }}
        />
      )}
    </UiEntity>
  )
}

export const FarmAssignmentOverlay = () => {
  if (!playerState.farmAssignmentOverlayActive) return null

  const { progress, progressPct, isConnectingPhase, subtitle } = getLoadProgress()

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'block',
      }}
    >
      <UiEntity
        uiTransform={{
          width: BACKGROUND_W,
          height: BACKGROUND_H,
        }}
        uiBackground={{
          texture: { src: LOADING_BACKGROUND, wrapMode: 'clamp' },
          textureMode: 'stretch',
          color: { r: 1, g: 1, b: 1, a: 1 },
        }}
      >
        <LoadingTitle />

        <Label
          value={subtitle}
          fontSize={24}
          color={SUBTITLE_COLOR}
          textAlign="middle-left"
          uiTransform={{
            positionType: 'absolute',
            position: { top: SUBTITLE_TOP, left: SUBTITLE_LEFT },
            width: 520,
            height: 32,
          }}
        />

        <LoadingStepsRow progress={progress} isConnectingPhase={isConnectingPhase} />
        <LoadingProgressBar progress={progress} />

        <Label
          value="Setting up your plots, buildings, and spawn point"
          fontSize={18}
          color={STEP_BROWN}
          textAlign="middle-left"
          uiTransform={{
            positionType: 'absolute',
            position: { top: FOOTER_TOP, left: FOOTER_LEFT },
            width: FOOTER_W,
            height: 26,
          }}
        />

        <Label
          value={`${progressPct}%`}
          fontSize={34}
          color={TITLE_COLOR}
          textAlign="middle-right"
          textWrap="nowrap"
          uiTransform={{
            positionType: 'absolute',
            position: { top: FOOTER_TOP - 6, right: 285 },
            width: 120,
            height: 40,
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
