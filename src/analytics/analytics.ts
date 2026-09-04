const POSTHOG_KEY         = 'phc_Cd589nn5SsAyZvDQjWDn3dRjjK6Zg3AMeSFNCoupERis'
const POSTHOG_HOST        = 'eu.i.posthog.com'
const GAME_ID             = 'cozyfarm'
const ENABLED             = true
const MAX_SESSION_SECONDS = 14_400   // 4-hour sanity cap

let _wallet = ''

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
 * Best-effort client-side session end. onLeaveScene does not reliably fire
 * in Bevy/mobile — server-side tracking in farmServer.ts is the primary path.
 */
export function trackSessionEnd(): void {
  if (!_wallet) return
  trackEvent('session ended', { source: 'client' })
}
