import { playerState } from '../game/gameState'

export const PROFILE_HUD_DEBUG = false

export function applyProfileHudDebugState(): void {
  playerState.viewingFarm = null
  playerState.farmGameplayUiReady = true
  playerState.serverConnected = true
  playerState.activeMenu = 'none'

  playerState.level = 1
  playerState.xp = 18
  playerState.coins = 9

  // Keep avatar/user identity editable from local preview if available later.
  if (!playerState.displayName) playerState.displayName = 'Debug Farmer'
}
