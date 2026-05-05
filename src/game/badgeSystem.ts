import { engine } from '@dcl/sdk/ecs'
import { PlotState } from '../components/farmComponents'
import { questProgressMap } from './questState'

// 'stats' is intentionally excluded — that badge is live-computed from playerState
// in the UI layer rather than tracked here, so it never gets stale.
export type BadgeKey = 'farm' | 'quests'

export const badges = new Set<BadgeKey>()

export function showBadge(key: BadgeKey): void {
  badges.add(key)
}

export function clearBadge(key: BadgeKey): void {
  badges.delete(key)
}

export function hasBadge(key: BadgeKey): boolean {
  return badges.has(key)
}

/** Called once after farm state is loaded — seeds initial badge state from saved data. */
export function recomputeStartupBadges(): void {
  for (const [entity] of engine.getEntitiesWith(PlotState)) {
    if (PlotState.get(entity).isReady) {
      showBadge('farm')
      break
    }
  }

  for (const qp of questProgressMap.values()) {
    if (qp.status === 'claimable') {
      showBadge('quests')
      break
    }
  }
}
