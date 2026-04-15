import { engine } from '@dcl/sdk/ecs'

// Shake keyframes: [elapsed_ms, x_offset_px]
// Quick left snap → right swing → smaller oscillations → settle
const KF: [number, number][] = [
  [  0,   0],
  [ 55,  -9],
  [125,  +9],
  [195,  -5],
  [255,  +3],
  [310,   0],
]
const DURATION = 310

function evalKf(elapsed: number): number {
  for (let i = 1; i < KF.length; i++) {
    const [t0, s0] = KF[i - 1]
    const [t1, s1] = KF[i]
    if (elapsed <= t1) {
      const f = (elapsed - t0) / (t1 - t0)
      return s0 + (s1 - s0) * f
    }
  }
  return 0
}

export const cardShake: Record<string, { startAt: number; offsetX: number }> = {}

export function triggerCardShake(key: string): void {
  if (!cardShake[key]) cardShake[key] = { startAt: 0, offsetX: 0 }
  cardShake[key].startAt = Date.now()
}

export function getShakeOffset(key: string): number {
  return cardShake[key]?.offsetX ?? 0
}

export function isShaking(key: string): boolean {
  return (cardShake[key]?.startAt ?? 0) > 0
}

engine.addSystem(() => {
  const now = Date.now()
  for (const k of Object.keys(cardShake)) {
    const a = cardShake[k]
    if (a.startAt === 0) continue
    const elapsed = now - a.startAt
    if (elapsed >= DURATION) {
      a.offsetX = 0
      a.startAt = 0
    } else {
      a.offsetX = Math.round(evalKf(elapsed))
    }
  }
})
