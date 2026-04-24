export type BeautyRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type BeautyObjectDef = {
  id: number
  name: string
  description: string
  rarity: BeautyRarity
  beautyValue: number
  price: number
  modelPath: string
}

export const BEAUTY_OBJECTS = new Map<number, BeautyObjectDef>([
  [1, {
    id: 1,
    name: 'Campfire',
    description: 'A warm crackling fire for cozy evenings.',
    rarity: 'common',
    beautyValue: 15,
    price: 300,
    modelPath: 'assets/asset-packs/campfire/Fireplace_01/Fireplace_01.glb',
  }],
  [2, {
    id: 2,
    name: 'Rustic Bench',
    description: 'A weathered wooden bench to sit and enjoy the farm.',
    rarity: 'common',
    beautyValue: 20,
    price: 450,
    modelPath: 'assets/asset-packs/rustic_bench/Bench_01.glb',
  }],
  [3, {
    id: 3,
    name: 'Wheelbarrow',
    description: 'An old trusty wheelbarrow. Rustic charm.',
    rarity: 'rare',
    beautyValue: 30,
    price: 600,
    modelPath: 'assets/asset-packs/rustic_wheelbarrow/WheelBarrow_01/WheelBarrow_01.glb',
  }],
  [4, {
    id: 4,
    name: 'Round Rug',
    description: 'A cozy handwoven rug. Perfect for indoors.',
    rarity: 'rare',
    beautyValue: 35,
    price: 750,
    modelPath: 'assets/asset-packs/round_rug/Carpet_01/Carpet_01.glb',
  }],
])

export const RARITY_COLOR: Record<BeautyRarity, { r: number; g: number; b: number; a: number }> = {
  common:    { r: 0.55, g: 0.55, b: 0.55, a: 1 },
  rare:      { r: 0.15, g: 0.45, b: 0.85, a: 1 },
  epic:      { r: 0.55, g: 0.15, b: 0.85, a: 1 },
  legendary: { r: 0.85, g: 0.55, b: 0.05, a: 1 },
}

export const RARITY_LABEL: Record<BeautyRarity, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
}
