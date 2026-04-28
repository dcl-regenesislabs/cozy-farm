export function walletSuffix(address: string): string {
  const normalized = (address || '').trim()
  if (normalized.length >= 4) return normalized.slice(-4).toUpperCase()
  return normalized.toUpperCase()
}

export function formatPlayerLabel(displayName: string | null | undefined, address: string): string {
  const suffix = walletSuffix(address)
  const cleanName = (displayName || '').trim()
  return cleanName.length > 0 ? `${cleanName} #${suffix}` : `Player #${suffix}`
}
