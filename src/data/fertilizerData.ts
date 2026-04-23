export enum FertilizerType {
  GrowthBoost = 0,
  YieldBoost  = 1,
  WaterSaver  = 2,
  RotShield   = 3,
}

export interface FertilizerDefinition {
  type:        FertilizerType
  name:        string
  description: string
  iconSrc:     string
}

export const FERTILIZER_DATA: Map<FertilizerType, FertilizerDefinition> = new Map([
  [FertilizerType.GrowthBoost, {
    type: FertilizerType.GrowthBoost,
    name: 'Growth Boost',
    description: '-25% grow time',
    iconSrc: 'assets/scene/Images/GrowthBoostFertilizerIcon.png',
  }],
  [FertilizerType.YieldBoost, {
    type: FertilizerType.YieldBoost,
    name: 'Yield Boost',
    description: 'x1.5 harvest yield',
    iconSrc: 'assets/scene/Images/YieldBoostFertilizerIcon.png',
  }],
  [FertilizerType.WaterSaver, {
    type: FertilizerType.WaterSaver,
    name: 'Water Saver',
    description: '-1 watering required',
    iconSrc: 'assets/scene/Images/WaterSaverFertilizerIcon.png',
  }],
  [FertilizerType.RotShield, {
    type: FertilizerType.RotShield,
    name: 'Rot Shield',
    description: 'Crop never rots',
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
