import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { C } from './PanelShell'

const OVERLAY_W = 760
const OVERLAY_H = 430
const PROGRESS_W = 540
const INTRO_HOLD_MS = 2_000
const PROGRESS_DURATION_MS = 4_200

function getPhaseText(progress: number, farmNumber: number): string {
  if (progress <= 0) return `Assigning Farm ${farmNumber} to your account`
  if (progress < 0.34) return `Assigning Farm ${farmNumber} to your account`
  if (progress < 0.7) return 'Loading crops, tools, and cozy essentials'
  return `Final checks complete. Sending you to Farm ${farmNumber}`
}

function pulseValue(offset: number): number {
  const wave = Math.sin(Date.now() / 220 + offset)
  return 0.55 + ((wave + 1) * 0.225)
}

function dotSize(offset: number): number {
  const wave = Math.sin(Date.now() / 220 + offset)
  return Math.round(18 + (wave + 1) * 6)
}

export const FarmAssignmentOverlay = () => {
  if (!playerState.farmAssignmentOverlayActive) return null

  const startedAt = playerState.farmAssignmentOverlayStartedAt
  const elapsedMs = Math.max(0, Date.now() - startedAt)
  const loadElapsedMs = Math.max(0, elapsedMs - INTRO_HOLD_MS)
  const progress = Math.min(1, loadElapsedMs / PROGRESS_DURATION_MS)
  const progressPct = Math.round(progress * 100)
  const farmNumber = Math.max(1, playerState.farmAssignmentOverlaySlotId + 1)
  const shimmerLeft = Math.max(0, Math.min(PROGRESS_W - 42, Math.round(progress * PROGRESS_W) - 21))

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
      uiBackground={{ color: { r: 0.03, g: 0.025, b: 0.015, a: 0.9 } }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 120, left: 250 },
          width: 180,
          height: 180,
          borderRadius: 90,
        }}
        uiBackground={{ color: { r: 0.42, g: 0.22, b: 0.06, a: 0.18 } }}
      />
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { bottom: 110, right: 250 },
          width: 220,
          height: 220,
          borderRadius: 110,
        }}
        uiBackground={{ color: { r: 0.16, g: 0.28, b: 0.12, a: 0.16 } }}
      />

      <UiEntity
        uiTransform={{
          width: OVERLAY_W,
          height: OVERLAY_H,
          padding: { top: 28, bottom: 34, left: 36, right: 36 },
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        uiBackground={{ color: { r: 0.08, g: 0.065, b: 0.04, a: 0.98 } }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <UiEntity
            uiTransform={{
              width: 164,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.26, g: 0.19, b: 0.08, a: 1 } }}
          >
            <Label value={`FARM ${farmNumber}`} fontSize={20} color={C.header} textAlign="middle-center" />
          </UiEntity>

          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
            {[0, 1.9, 3.8].map((offset, i) => {
              const size = dotSize(offset)
              const alpha = pulseValue(offset)
              return (
                <UiEntity
                  key={`assign-dot-${i}`}
                  uiTransform={{
                    width: size,
                    height: size,
                    borderRadius: Math.round(size / 2),
                    margin: { left: i === 0 ? 0 : 10 },
                  }}
                  uiBackground={{ color: { r: 1, g: 0.82, b: 0.34, a: alpha } }}
                />
              )
            })}
          </UiEntity>
        </UiEntity>

        <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
          <Label
            value="Preparing your new home"
            fontSize={46}
            color={C.textMain}
            textAlign="middle-left"
            uiTransform={{ width: '100%', height: 56, margin: { bottom: 10 } }}
          />

          <Label
            value={getPhaseText(progress, farmNumber)}
            fontSize={24}
            color={{ r: 0.88, g: 0.82, b: 0.72, a: 1 }}
            textAlign="middle-left"
            uiTransform={{ width: '100%', height: 30, margin: { bottom: 28 } }}
          />

          <UiEntity
            uiTransform={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: { bottom: 16 },
            }}
          >
            <Label value="Claiming slot" fontSize={18} color={progress >= 0.16 ? C.gold : C.textMute} />
            <Label value="Loading farm" fontSize={18} color={progress >= 0.5 ? C.gold : C.textMute} />
            <Label value="Teleporting" fontSize={18} color={progress >= 0.84 ? C.gold : C.textMute} />
          </UiEntity>

          <UiEntity
            uiTransform={{ width: PROGRESS_W, height: 20, margin: { bottom: 18 } }}
            uiBackground={{ color: { r: 0.14, g: 0.11, b: 0.07, a: 1 } }}
          >
            <UiEntity
              uiTransform={{ width: `${progressPct}%`, height: '100%' }}
              uiBackground={{ color: { r: 0.82, g: 0.60, b: 0.18, a: 1 } }}
            />
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { left: shimmerLeft, top: 0 },
                width: 42,
                height: 20,
              }}
              uiBackground={{ color: { r: 1, g: 0.92, b: 0.66, a: 0.32 } }}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Label
              value="Setting up your plots, buildings, and spawn point"
              fontSize={18}
              color={C.textMute}
              textAlign="middle-left"
              uiTransform={{ width: 520, height: 22 }}
            />
            <Label
              value={`${progressPct}%`}
              fontSize={24}
              color={C.header}
              textAlign="middle-right"
              uiTransform={{ width: 90, height: 28 }}
            />
          </UiEntity>
        </UiEntity>

        <UiEntity
          uiTransform={{
            width: '100%',
            height: 4,
          }}
          uiBackground={{ color: { r: 0.38, g: 0.28, b: 0.12, a: 0.75 } }}
        />
      </UiEntity>
    </UiEntity>
  )
}
