const POSTHOG_KEY  = 'phc_Cd589nn5SsAyZvDQjWDn3dRjjK6Zg3AMeSFNCoupERis'
const POSTHOG_HOST = 'eu.i.posthog.com'
const GAME_ID      = 'cozyfarm'
const ENABLED      = true

// Cap implausibly long sessions (e.g. a stuck timer) at 4 hours
const MAX_SESSION_SECONDS = 14_400

let _wallet = ''
let _sessionStartedAt = 0

/** Call once when the player's wallet is known (inside saveService onLoaded). */
export function setAnalyticsWallet(wallet: string): void {
  _wallet = wallet
}

/** Start (or restart) the session timer. Call on boot AND on every onEnterScene. */
export function startSessionTimer(): void {
  _sessionStartedAt = Date.now()
}

/** Single choke point — the only function that talks to PostHog. Fire-and-forget. */
export function trackEvent(name: string, properties: Record<string, unknown> = {}): void {
  if (!ENABLED || !_wallet) return
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
 * Fire 'session ended' with duration in seconds, then disarm the timer.
 * Called from onLeaveScene — fires on parcel-boundary exit and clean quit.
 * Crashes are not captured; average will skew slightly high.
 */
export function trackSessionEnd(): void {
  if (_sessionStartedAt === 0) return
  const raw = Math.round((Date.now() - _sessionStartedAt) / 1000)
  trackEvent('session ended', { duration_seconds: Math.min(raw, MAX_SESSION_SECONDS) })
  _sessionStartedAt = 0
}
