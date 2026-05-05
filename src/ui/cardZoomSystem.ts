import { engine } from '@dcl/sdk/ecs'

// Zoom keyframes: [elapsed_ms, scale_factor]
// Quick press-in → light bounce → settle
const KF: [number, number][] = [
  [  0, 1.00],
  [ 80, 0.93],  // press-in
  [200, 1.05],  // bounce up
  [290, 1.00],  // settle
]
const DURATION = 290

function evalKf(elapsed: number): number {
  for (let i = 1; i < KF.length; i++) {
    const [t0, s0] = KF[i - 1]
    const [t1, s1] = KF[i]
    if (elapsed <= t1) {
      const f = (elapsed - t0) / (t1 - t0)
      return s0 + (s1 - s0) * f
    }
  }
  return 1
}

export const cardZoom: Record<string, { startAt: number; scale: number }> = {}

export function triggerCardZoom(key: string): void {
  if (!cardZoom[key]) cardZoom[key] = { startAt: 0, scale: 1 }
  cardZoom[key].startAt = Date.now()
}

export function getZoomScale(key: string): number {
  return cardZoom[key]?.scale ?? 1
}

export function isZooming(key: string): boolean {
  return (cardZoom[key]?.startAt ?? 0) > 0
}

engine.addSystem(() => {
  const now = Date.now()
  for (const k of Object.keys(cardZoom)) {
    const a = cardZoom[k]
    if (a.startAt === 0) continue
    const elapsed = now - a.startAt
    if (elapsed >= DURATION) {
      a.scale = 1
      a.startAt = 0
    } else {
      a.scale = evalKf(elapsed)
    }
  }
})
