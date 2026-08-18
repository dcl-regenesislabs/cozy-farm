export type BeautyRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type BeautyObjectDef = {
  id: number
  name: string          // i18n key — resolve with t() at render time
  description: string   // i18n key — resolve with t() at render time
  rarity: BeautyRarity
  beautyValue: number
  price: number
  modelPath: string
}

export const BEAUTY_OBJECTS = new Map<number, BeautyObjectDef>([
  [1, {
    id: 1,
    name: 'data.beauty.campfire.name',
    description: 'data.beauty.campfire.description',
    rarity: 'common',
    beautyValue: 15,
    price: 300,
    modelPath: 'assets/asset-packs/campfire/Fireplace_01/Fireplace_01.glb',
  }],
  [2, {
    id: 2,
    name: 'data.beauty.rusticBench.name',
    description: 'data.beauty.rusticBench.description',
    rarity: 'common',
    beautyValue: 20,
    price: 450,
    modelPath: 'assets/asset-packs/rustic_bench/Bench_01.glb',
  }],
  [3, {
    id: 3,
    name: 'data.beauty.wheelbarrow.name',
    description: 'data.beauty.wheelbarrow.description',
    rarity: 'rare',
    beautyValue: 30,
    price: 600,
    modelPath: 'assets/asset-packs/rustic_wheelbarrow/WheelBarrow_01/WheelBarrow_01.glb',
  }],
  [4, {
    id: 4,
    name: 'data.beauty.roundRug.name',
    description: 'data.beauty.roundRug.description',
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

// i18n keys — resolve with t() at render time
export const RARITY_LABEL: Record<BeautyRarity, string> = {
  common:    'data.rarity.common',
  rare:      'data.rarity.rare',
  epic:      'data.rarity.epic',
  legendary: 'data.rarity.legendary',
}
