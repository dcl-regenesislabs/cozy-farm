import { engine } from '@dcl/sdk/ecs'
import type { MenuType } from '../game/gameState'
import { tutorialNavState } from '../game/tutorialState'

export const BTN_BASE = 228   // matches BottomNav BTN_SIZE

// Animation keyframes: [elapsed_ms, scale_factor]
// Gentle press-dip → light bounce → settle
const KF: [number, number][] = [
  [  0, 1.00],
  [ 60, 0.91],   // soft dip on press
  [180, 1.06],   // light bounce up
  [290, 1.00],   // settle back to normal
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

// Nav button keys used in BottomNav
type NavKey = Extract<MenuType, 'inventory' | 'farm' | 'quests' | 'stats'>

export const navAnim: Record<NavKey, { startAt: number; size: number }> = {
  inventory: { startAt: 0, size: BTN_BASE },
  farm:      { startAt: 0, size: BTN_BASE },
  quests:    { startAt: 0, size: BTN_BASE },
  stats:     { startAt: 0, size: BTN_BASE },
}

export function triggerBtnAnim(key: NavKey): void {
  navAnim[key].startAt = Date.now()
}

let bounceTime = 0

engine.addSystem((dt: number) => {
  const now = Date.now()

  // One-shot press animations
  for (const k of Object.keys(navAnim) as NavKey[]) {
    const a = navAnim[k]
    if (a.startAt === 0) continue
    const elapsed = now - a.startAt
    if (elapsed >= DURATION) {
      a.size    = BTN_BASE
      a.startAt = 0
    } else {
      a.size = Math.round(BTN_BASE * evalKf(elapsed))
    }
  }

  // Continuous bounce on the quests button during the open_quests tutorial step
  if (tutorialNavState.highlightQuests) {
    bounceTime += dt
    // Smooth sine bounce: peaks ~18% larger, ~1.5 cycles/sec
    if (navAnim.quests.startAt === 0) {
      navAnim.quests.size = Math.round(BTN_BASE * (1 + 0.18 * Math.abs(Math.sin(bounceTime * Math.PI * 1.5))))
    }
  } else {
    bounceTime = 0
  }
})
