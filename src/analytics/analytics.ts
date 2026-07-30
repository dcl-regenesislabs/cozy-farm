const POSTHOG_KEY  = 'phc_Cd589nn5SsAyZvDQjWDn3dRjjK6Zg3AMeSFNCoupERis'
const POSTHOG_HOST = 'eu.i.posthog.com'
const GAME_ID      = 'cozyfarm'
const ENABLED      = true

let _wallet = ''

/** Call once when the player's wallet is known (inside saveService onLoaded). */
export function setAnalyticsWallet(wallet: string): void {
  _wallet = wallet
}

/**
 * Single choke point — the only function that talks to PostHog.
 * Fire-and-forget: never blocks, never crashes gameplay.
 */
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
