const POSTHOG_KEY       = 'phc_Cd589nn5SsAyZvDQjWDn3dRjjK6Zg3AMeSFNCoupERis'
const POSTHOG_HOST      = 'eu.i.posthog.com'
const GAME_ID           = 'cozyfarm'
const ENABLED           = true
const HEARTBEAT_MS      = 5 * 60 * 1000   // every 5 minutes
const MAX_SESSION_SECONDS = 14_400         // 4-hour sanity cap

let _wallet          = ''
let _sessionStartedAt = 0
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null

/** Call once when the player's wallet is known. */
export function setAnalyticsWallet(wallet: string): void {
  _wallet = wallet
}

/** Single choke point — the only function that talks to PostHog. Fire-and-forget. */
export function trackEvent(name: string, properties: Record<string, unknown> = {}): void {
  if (!ENABLED || !_wallet) return
  trackServerEvent(_wallet, name, properties)
}

/** Server-side variant — takes an explicit wallet, safe to call from farmServer.ts. */
export function trackServerEvent(wallet: string, name: string, properties: Record<string, unknown> = {}): void {
  if (!ENABLED || !wallet) return
  fetch(`https://${POSTHOG_HOST}/i/v0/e/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key:     POSTHOG_KEY,
      event:       name,
      distinct_id: wallet,
      timestamp:   new Date().toISOString(),
      properties:  { game: GAME_ID, ...properties },
    }),
  }).catch(() => {})
}

/**
 * Start (or restart) the session timer and kick off the heartbeat loop.
 * Call on boot and on every onEnterScene re-entry.
 * onLeaveScene does not reliably fire in this SDK version, so the heartbeat
 * is the primary signal for session duration in PostHog.
 */
export function startSessionTimer(): void {
  _sessionStartedAt = Date.now()

  if (_heartbeatTimer !== null) clearInterval(_heartbeatTimer)
  _heartbeatTimer = setInterval(() => {
    if (_sessionStartedAt === 0) return
    const elapsed = Math.round((Date.now() - _sessionStartedAt) / 1000)
    trackEvent('session heartbeat', { elapsed_seconds: Math.min(elapsed, MAX_SESSION_SECONDS) })
  }, HEARTBEAT_MS)
}

/**
 * Fire 'session ended' and stop the heartbeat. Best-effort — onLeaveScene
 * does not reliably fire in Bevy/mobile, so this may never be called.
 * Use the last 'session heartbeat' elapsed_seconds as the primary duration metric.
 */
export function trackSessionEnd(): void {
  if (_heartbeatTimer !== null) { clearInterval(_heartbeatTimer); _heartbeatTimer = null }
  if (_sessionStartedAt === 0) return
  const raw = Math.round((Date.now() - _sessionStartedAt) / 1000)
  trackEvent('session ended', { duration_seconds: Math.min(raw, MAX_SESSION_SECONDS) })
  _sessionStartedAt = 0
}
