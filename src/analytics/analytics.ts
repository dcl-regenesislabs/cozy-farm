const POSTHOG_KEY  = 'phc_Cd589nn5SsAyZvDQjWDn3dRjjK6Zg3AMeSFNCoupERis'
const POSTHOG_HOST = 'eu.i.posthog.com'
const GAME_ID      = 'cozyfarm'
const ENABLED      = true

let _wallet = ''
let _sessionStartedAt = 0

/** Call once when the player's wallet is known (inside saveService onLoaded). */
export function setAnalyticsWallet(wallet: string): void {
  _wallet = wallet
}

/**
 * Single choke point — the only function that talks to PostHog.
 * Fire-and-forget: never blocks, never crashes gameplay.
 * Auto-records session start time when event is 'session started'.
 */
export function trackEvent(name: string, properties: Record<string, unknown> = {}): void {
  if (!ENABLED || !_wallet) return
  if (name === 'session started') _sessionStartedAt = Date.now()
  const body = JSON.stringify({
    api_key:     POSTHOG_KEY,
    event:       name,
    distinct_id: _wallet,
    timestamp:   new Date().toISOString(),
    properties:  { game: GAME_ID, ...properties },
  })
  fetch(`https://${POSTHOG_HOST}/i/v0/e/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {})
}

/**
 * Fire 'session ended' with duration in seconds.
 * Best-effort: only fires on clean leave (teleport, normal close) via onLeaveScene.
 * Durations from crashed sessions are not captured — average will skew slightly high.
 */
export function trackSessionEnd(): void {
  if (_sessionStartedAt === 0) return
  const durationSeconds = Math.round((Date.now() - _sessionStartedAt) / 1000)
  trackEvent('session ended', { duration_seconds: durationSeconds })
  _sessionStartedAt = 0
}
