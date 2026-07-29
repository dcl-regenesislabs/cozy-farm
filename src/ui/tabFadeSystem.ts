import { engine } from '@dcl/sdk/ecs'

// Animates a per-key 0..1 "activeness" value toward a target (1 = selected, 0 = idle)
// so selected/idle UI states (background image, text color) can crossfade instead of
// snapping instantly. Call setTabActive() every render with the current selected state —
// it both nudges the target and returns the interpolated value to render with.

const FADE_DURATION = 160 // ms

type FadeState = { value: number; target: number; fromValue: number; changedAt: number }

const fades: Record<string, FadeState> = {}

export function setTabActive(key: string, active: boolean): number {
  const target = active ? 1 : 0
  let st = fades[key]
  if (!st) {
    st = { value: target, target, fromValue: target, changedAt: 0 }
    fades[key] = st
    return st.value
  }
  if (st.target !== target) {
    st.fromValue = st.value
    st.target = target
    st.changedAt = Date.now()
  }
  return st.value
}

engine.addSystem(() => {
  const now = Date.now()
  for (const key of Object.keys(fades)) {
    const st = fades[key]
    if (st.value === st.target) continue
    const elapsed = now - st.changedAt
    if (elapsed >= FADE_DURATION) {
      st.value = st.target
    } else {
      const t = elapsed / FADE_DURATION
      st.value = st.fromValue + (st.target - st.fromValue) * t
    }
  }
})

export function lerpColor(
  a: { r: number; g: number; b: number; a: number },
  b: { r: number; g: number; b: number; a: number },
  t: number,
): { r: number; g: number; b: number; a: number } {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  }
}
