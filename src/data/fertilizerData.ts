export enum FertilizerType {
  GrowthBoost = 0,
  YieldBoost  = 1,
  WaterSaver  = 2,
  RotShield   = 3,
}

export interface FertilizerDefinition {
  type:        FertilizerType
  name:        string   // i18n key — resolve with t() at render time
  description: string   // i18n key — resolve with t() at render time
  iconSrc:     string
}

export const FERTILIZER_DATA: Map<FertilizerType, FertilizerDefinition> = new Map([
  [FertilizerType.GrowthBoost, {
    type: FertilizerType.GrowthBoost,
    name: 'data.fertilizer.growthBoost.name',
    description: 'data.fertilizer.growthBoost.description',
    iconSrc: 'assets/scene/Images/GrowthBoostFertilizerIcon.png',
  }],
  [FertilizerType.YieldBoost, {
    type: FertilizerType.YieldBoost,
    name: 'data.fertilizer.yieldBoost.name',
    description: 'data.fertilizer.yieldBoost.description',
    iconSrc: 'assets/scene/Images/YieldBoostFertilizerIcon.png',
  }],
  [FertilizerType.WaterSaver, {
    type: FertilizerType.WaterSaver,
    name: 'data.fertilizer.waterSaver.name',
    description: 'data.fertilizer.waterSaver.description',
    iconSrc: 'assets/scene/Images/WaterSaverFertilizerIcon.png',
  }],
  [FertilizerType.RotShield, {
    type: FertilizerType.RotShield,
    name: 'data.fertilizer.rotShield.name',
    description: 'data.fertilizer.rotShield.description',
    iconSrc: 'assets/scene/Images/RotShieldFertilizerIcon.png',
  }],
])

export const ALL_FERTILIZER_TYPES: FertilizerType[] = [
  FertilizerType.GrowthBoost,
  FertilizerType.YieldBoost,
  FertilizerType.WaterSaver,
  FertilizerType.RotShield,
]

export function randomFertilizer(): FertilizerType {
  return ALL_FERTILIZER_TYPES[Math.floor(Math.random() * ALL_FERTILIZER_TYPES.length)]
}
