import { CropType, CROP_DATA, CropDefinition } from '../data/cropData'
import { FertilizerType } from '../data/fertilizerData'

const MAX_ROT_WINDOW_MS = 12 * 3_600_000  // 12h hard cap

/**
 * Returns the total milliseconds from planting until the crop rots.
 * RotShield prevents rot entirely (returns Infinity).
 * Window = min(growTimeMs, 12h) after the crop is ready.
 */
export function getRotTimeMs(def: CropDefinition, fertilizerType: number): number {
  if (fertilizerType === FertilizerType.RotShield) return Infinity
  const rotWindow = Math.min(def.growTimeMs, MAX_ROT_WINDOW_MS)
  return def.growTimeMs + rotWindow
}

/**
 * Returns true if the plot has passed its rot deadline.
 * effectiveGrowTimeMs accounts for GrowthBoost and tutorial overrides.
 */
export function isPlotRotten(
  plantedAt: number,
  cropType: number,
  fertilizerType: number,
  effectiveGrowTimeMs: number,
  now: number
): boolean {
  if (fertilizerType === FertilizerType.RotShield) return false
  const def = CROP_DATA.get(cropType as CropType)
  if (!def) return false
  // Scale rot window proportionally if effectiveGrowTimeMs differs (e.g. tutorial / GrowthBoost)
  const scale = effectiveGrowTimeMs / def.growTimeMs
  const rotTimeMs = getRotTimeMs(def, fertilizerType) * scale
  return now - plantedAt >= rotTimeMs
}
