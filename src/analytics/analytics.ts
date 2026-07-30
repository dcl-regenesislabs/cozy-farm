// ─── PostHog config ───────────────────────────────────────────────────────────
// Set POSTHOG_KEY to your project API key (PostHog › Settings › Project API keys).
// Key starts with "phc_". It's a public write-only capture token — safe in the bundle.
// ENABLED auto-disables until the key is filled in, so local dev is always clean.
const POSTHOG_KEY  = ''                   // phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const POSTHOG_HOST = 'us.i.posthog.com'  // or eu.i.posthog.com if EU project
const GAME_ID      = 'cozyfarm'
const ENABLED      = POSTHOG_KEY !== ''

let _wallet = ''

/** Call once when the player's wallet is known (inside saveService onLoaded). */
export function setAnalyticsWallet(wallet: string): void {
  _wallet = wallet
}

/**
 * Single choke point — the only function that talks to PostHog.
 * Fire-and-forget: never blocks, never crashes gameplay.
 * All game code calls only this function.
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
