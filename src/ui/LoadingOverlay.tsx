import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { engine } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import { room } from '../shared/farmMessages'

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

const ICON_STRIP_TOP = 266
const ICON_STRIP_LEFT = 176
const ICON_STRIP_W = 670
const ICON_STRIP_H = 96
const STEP_TEXT_TOP = ICON_STRIP_TOP + ICON_STRIP_H + 10

const PROGRESS_TOP = 436
const PROGRESS_LEFT = 176
const PROGRESS_W = 665
const PROGRESS_H = 20
const PROGRESS_FILL_INSET = 4
const PROGRESS_FILL_H = 12
const PROGRESS_RADIUS = 10

const FOOTER_TOP = 480
const FOOTER_LEFT = 176
const FOOTER_W = 660

type AtlasRect = { x: number; y: number; w: number; h: number }
type LoadingStep = { id: string; label: string; threshold: number; labelLeft: number; labelWidth: number }

const SPRITES = {
  iconStrip: { x: 30, y: 20, w: 973, h: 163 },
} as const

// One label per icon in the strip (chicken/fence/barn/truck) — the fence step
// no longer means "claiming a slot" like it used to, so it's relabeled as a
// generic setup step in between connecting and loading the actual farm data.
const STEPS: LoadingStep[] = [
  { id: 'connecting', label: 'Connecting',   threshold: 0,    labelLeft: -8,  labelWidth: 140 },
  { id: 'preparing',  label: 'Preparing',    threshold: 0.15, labelLeft: 181, labelWidth: 140 },
  { id: 'loading',    label: 'Loading farm', threshold: 0.45, labelLeft: 364, labelWidth: 140 },
  { id: 'ready',      label: 'Ready!',       threshold: 0.99, labelLeft: 552, labelWidth: 140 },
]

function getAnimatedEllipsis(): string {
  const phase = Math.floor(Date.now() / 350) % 3
  return '.'.repeat(phase + 1)
}

function atlasUvsRotatedRight(rect: AtlasRect): number[] {
  const left = rect.x / ATLAS_SIZE
  const right = (rect.x + rect.w) / ATLAS_SIZE
  const top = 1 - rect.y / ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / ATLAS_SIZE
  return [left, bottom, left, top, right, top, right, bottom]
}

// ─── Progress — fixed multi-second fill, gated by real milestones ───────────
// Stays at 0 with no server connection. Once connected, the bar always takes
// PROGRESS_DURATION_MS to fill (same pacing as before) even if the real farm
// data arrives sooner — it never rushes ahead. If the real data takes longer
// than that, it holds at PROGRESS_CAP instead of finishing early, then does a
// quick final flourish to 100% once the farm is actually ready.
const PROGRESS_DURATION_MS = 4200
const PROGRESS_CAP = 0.96
const READY_HOLD_MS = 500

let loadingStartedAt = 0
let readyAt = 0

function getLoadProgress(): { progress: number; subtitle: string } {
  const now = Date.now()

  if (!room.isReady()) {
    return { progress: 0, subtitle: `Connecting to the server${getAnimatedEllipsis()}` }
  }

  if (loadingStartedAt === 0) loadingStartedAt = now
  const timedProgress = Math.min(PROGRESS_CAP, ((now - loadingStartedAt) / PROGRESS_DURATION_MS) * PROGRESS_CAP)

  if (!playerState.farmReady || timedProgress < PROGRESS_CAP) {
    return { progress: timedProgress, subtitle: 'Loading your farm...' }
  }

  if (readyAt === 0) readyAt = now
  const finishFrac = Math.min(1, (now - readyAt) / READY_HOLD_MS)
  return { progress: PROGRESS_CAP + (1 - PROGRESS_CAP) * finishFrac, subtitle: 'Loading your farm...' }
}

// Dismiss the overlay once the bar has genuinely reached 100%.
engine.addSystem(() => {
  if (!playerState.loadingOverlayActive) { readyAt = 0; return }
  if (getLoadProgress().progress >= 1) {
    playerState.loadingOverlayActive = false
    readyAt = 0
    loadingStartedAt = 0
  }
})

const LoadingTitle = () => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: TITLE_TOP, left: TITLE_LEFT },
      width: TITLE_W,
      height: TITLE_H,
    }}
  >
    <Label
      value="Preparing your farm"
      fontSize={42}
      color={TITLE_COLOR}
      textAlign="middle-left"
      uiTransform={{ width: TITLE_W, height: TITLE_H }}
    />
  </UiEntity>
)

const LoadingIconStrip = () => (
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
)

const LoadingStepLabels = ({ progress }: { progress: number }) => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: STEP_TEXT_TOP, left: ICON_STRIP_LEFT },
      width: ICON_STRIP_W,
      height: 24,
    }}
  >
    {STEPS.map((step) => (
      <Label
        key={step.id}
        value={step.label}
        fontSize={16}
        color={progress >= step.threshold ? STEP_GREEN : STEP_BROWN}
        textAlign="middle-center"
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: step.labelLeft },
          width: step.labelWidth,
          height: 24,
        }}
      />
    ))}
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
        uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: PROGRESS_W, height: PROGRESS_H, borderRadius: PROGRESS_RADIUS }}
        uiBackground={{ color: TRACK_COLOR }}
      />
      {fillWidth > 0 && (
        <UiEntity
          uiTransform={{ positionType: 'absolute', position: { top: PROGRESS_FILL_INSET, left: PROGRESS_FILL_INSET }, width: fillWidth, height: PROGRESS_FILL_H, borderRadius: 6 }}
          uiBackground={{ color: PROGRESS_GREEN }}
        />
      )}
    </UiEntity>
  )
}

export const LoadingOverlay = () => {
  if (!playerState.loadingOverlayActive) return null

  const { progress, subtitle } = getLoadProgress()
  const progressPct = Math.round(progress * 100)

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
        uiTransform={{ width: BACKGROUND_W, height: BACKGROUND_H }}
        uiBackground={{ texture: { src: LOADING_BACKGROUND, wrapMode: 'clamp' }, textureMode: 'stretch' }}
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

        <LoadingIconStrip />
        <LoadingStepLabels progress={progress} />
        <LoadingProgressBar progress={progress} />

        <Label
          value="Setting up your plots and buildings"
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
