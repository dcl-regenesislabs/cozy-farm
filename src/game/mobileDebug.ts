import { isMobile } from '@dcl/sdk/platform'
import { XP_TABLE } from '../shared/leveling'

export const MOBILE_UI_DEBUG = false
export const MOBILE_DEBUG_LEVEL = XP_TABLE.length
export const MOBILE_DEBUG_COINS = 1_000_000

export function isMobileUiDebug(): boolean {
  return MOBILE_UI_DEBUG && isMobile()
}

export function getMobileDebugLevel(level: number): number {
  return isMobileUiDebug() ? MOBILE_DEBUG_LEVEL : level
}

export function getMobileDebugCoins(coins: number): number {
  return isMobileUiDebug() ? MOBILE_DEBUG_COINS : coins
}

export function getGameMaxLevel(): number {
  return XP_TABLE.length
}
