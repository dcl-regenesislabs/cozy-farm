export enum CropType {
  Onion = 0,
  Potato = 1,
  Garlic = 2,
  Tomato = 3,
  Carrot = 4,
  Corn = 5,
  Lavender = 6,
  Pumpkin = 7,
  Sunflower = 8,
}

export interface CropDefinition {
  type: CropType
  name: string
  tier: 1 | 2 | 3
  growTimeMs: number
  wateringsRequired: number
  seedCost: number
  sellPrice: number
  yieldMin: number
  yieldMax: number
}

export const CROP_DATA: Map<CropType, CropDefinition> = new Map([
  [CropType.Onion, {
    type: CropType.Onion, name: 'Onion', tier: 1,
    growTimeMs: 120_000, wateringsRequired: 1,
    seedCost: 3, sellPrice: 8, yieldMin: 3, yieldMax: 5,
  }],
  [CropType.Potato, {
    type: CropType.Potato, name: 'Potato', tier: 1,
    growTimeMs: 180_000, wateringsRequired: 1,
    seedCost: 5, sellPrice: 12, yieldMin: 3, yieldMax: 5,
  }],
  [CropType.Garlic, {
    type: CropType.Garlic, name: 'Garlic', tier: 1,
    growTimeMs: 300_000, wateringsRequired: 1,
    seedCost: 8, sellPrice: 18, yieldMin: 2, yieldMax: 4,
  }],
  [CropType.Tomato, {
    type: CropType.Tomato, name: 'Tomato', tier: 2,
    growTimeMs: 3_600_000, wateringsRequired: 2,
    seedCost: 15, sellPrice: 45, yieldMin: 4, yieldMax: 6,
  }],
  [CropType.Carrot, {
    type: CropType.Carrot, name: 'Carrot', tier: 2,
    growTimeMs: 10_800_000, wateringsRequired: 2,
    seedCost: 25, sellPrice: 80, yieldMin: 4, yieldMax: 6,
  }],
  [CropType.Corn, {
    type: CropType.Corn, name: 'Corn', tier: 2,
    growTimeMs: 28_800_000, wateringsRequired: 3,
    seedCost: 50, sellPrice: 150, yieldMin: 3, yieldMax: 5,
  }],
  [CropType.Lavender, {
    type: CropType.Lavender, name: 'Lavender', tier: 3,
    growTimeMs: 86_400_000, wateringsRequired: 3,
    seedCost: 100, sellPrice: 300, yieldMin: 5, yieldMax: 8,
  }],
  [CropType.Pumpkin, {
    type: CropType.Pumpkin, name: 'Pumpkin', tier: 3,
    growTimeMs: 108_000_000, wateringsRequired: 3,
    seedCost: 150, sellPrice: 450, yieldMin: 2, yieldMax: 4,
  }],
  [CropType.Sunflower, {
    type: CropType.Sunflower, name: 'Sunflower', tier: 3,
    growTimeMs: 129_600_000, wateringsRequired: 3,
    seedCost: 180, sellPrice: 600, yieldMin: 3, yieldMax: 5,
  }],
])

export const CROP_NAMES: Record<CropType, string> = {
  [CropType.Onion]: 'Onion',
  [CropType.Potato]: 'Potato',
  [CropType.Garlic]: 'Garlic',
  [CropType.Tomato]: 'Tomato',
  [CropType.Carrot]: 'Carrot',
  [CropType.Corn]: 'Corn',
  [CropType.Lavender]: 'Lavender',
  [CropType.Pumpkin]: 'Pumpkin',
  [CropType.Sunflower]: 'Sunflower',
}

export const ALL_CROP_TYPES: CropType[] = [
  CropType.Onion, CropType.Potato, CropType.Garlic,
  CropType.Tomato, CropType.Carrot, CropType.Corn,
  CropType.Lavender, CropType.Pumpkin, CropType.Sunflower,
]
