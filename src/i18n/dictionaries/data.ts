import type { TranslationDictionary } from '../types'

// Crop names (cropData.ts), fertilizer name/description (fertilizerData.ts),
// beauty object name/description + rarity labels (beautyObjectData.ts),
// level-up reward labels (levelRewardData.ts), plot group labels (plotGroupData.ts).
export const dataDict: TranslationDictionary = {
  // ── Crops ──────────────────────────────────────────────────────────────────
  'data.crop.onion':     { en: 'Onion',     es: 'Cebolla',    pt: 'Cebola' },
  'data.crop.potato':    { en: 'Potato',    es: 'Patata',     pt: 'Batata' },
  'data.crop.garlic':    { en: 'Garlic',    es: 'Ajo',        pt: 'Alho' },
  'data.crop.tomato':    { en: 'Tomato',    es: 'Tomate',     pt: 'Tomate' },
  'data.crop.carrot':    { en: 'Carrot',    es: 'Zanahoria',  pt: 'Cenoura' },
  'data.crop.corn':      { en: 'Corn',      es: 'Maíz',       pt: 'Milho' },
  'data.crop.lavender':  { en: 'Lavender',  es: 'Lavanda',    pt: 'Lavanda' },
  'data.crop.pumpkin':   { en: 'Pumpkin',   es: 'Calabaza',   pt: 'Abóbora' },
  'data.crop.sunflower': { en: 'Sunflower', es: 'Girasol',    pt: 'Girassol' },

  // ── Fertilizers ────────────────────────────────────────────────────────────
  'data.fertilizer.growthBoost.name':        { en: 'Growth Boost', es: 'Impulso de Crecimiento', pt: 'Impulso de Crescimento' },
  'data.fertilizer.growthBoost.description': { en: '-25% grow time', es: '-25% tiempo crecim.', pt: '-25% tempo crescim.' },
  'data.fertilizer.yieldBoost.name':         { en: 'Yield Boost', es: 'Impulso de Rendimiento', pt: 'Impulso de Rendimento' },
  'data.fertilizer.yieldBoost.description':  { en: 'x1.5 harvest yield', es: 'x1.5 rendim. cosecha', pt: 'x1.5 rendim. colheita' },
  'data.fertilizer.waterSaver.name':         { en: 'Water Saver', es: 'Ahorro de Agua', pt: 'Economia de Água' },
  'data.fertilizer.waterSaver.description':  { en: '-1 watering required', es: '-1 riego necesario', pt: '-1 rega necessária' },
  'data.fertilizer.rotShield.name':          { en: 'Rot Shield', es: 'Escudo Antipodredumbre', pt: 'Escudo Anti-Podridão' },
  'data.fertilizer.rotShield.description':   { en: 'Crop never rots', es: 'Nunca se pudre', pt: 'Nunca apodrece' },

  // ── Beauty objects ─────────────────────────────────────────────────────────
  'data.beauty.campfire.name':        { en: 'Campfire', es: 'Fogata', pt: 'Fogueira' },
  'data.beauty.campfire.description': { en: 'A warm crackling fire for cozy evenings.', es: 'Una cálida fogata crepitante para noches acogedoras.', pt: 'Uma fogueira quentinha e crepitante para noites aconchegantes.' },
  'data.beauty.rusticBench.name':        { en: 'Rustic Bench', es: 'Banco Rústico', pt: 'Banco Rústico' },
  'data.beauty.rusticBench.description': { en: 'A weathered wooden bench to sit and enjoy the farm.', es: 'Un banco de madera desgastado para sentarse y disfrutar la granja.', pt: 'Um banco de madeira desgastado para sentar e aproveitar a fazenda.' },
  'data.beauty.wheelbarrow.name':        { en: 'Wheelbarrow', es: 'Carretilla', pt: 'Carrinho de Mão' },
  'data.beauty.wheelbarrow.description': { en: 'An old trusty wheelbarrow. Rustic charm.', es: 'Una vieja carretilla de confianza. Encanto rústico.', pt: 'Um velho carrinho de mão de confiança. Charme rústico.' },
  'data.beauty.roundRug.name':        { en: 'Round Rug', es: 'Alfombra Redonda', pt: 'Tapete Redondo' },
  'data.beauty.roundRug.description': { en: 'A cozy handwoven rug. Perfect for indoors.', es: 'Una alfombra tejida a mano y acogedora. Perfecta para interiores.', pt: 'Um tapete aconchegante feito à mão. Perfeito para ambientes internos.' },

  'data.rarity.common':    { en: 'Common', es: 'Común', pt: 'Comum' },
  'data.rarity.rare':      { en: 'Rare', es: 'Raro', pt: 'Raro' },
  'data.rarity.epic':      { en: 'Epic', es: 'Épico', pt: 'Épico' },
  'data.rarity.legendary': { en: 'Legendary', es: 'Legendario', pt: 'Lendário' },

  // ── Level-up rewards ───────────────────────────────────────────────────────
  'data.levelReward.level2':  { en: '+5 Onion Seeds', es: '+5 Semillas de Cebolla', pt: '+5 Sementes de Cebola' },
  'data.levelReward.level3':  { en: '+5 Potato Seeds', es: '+5 Semillas de Patata', pt: '+5 Sementes de Batata' },
  'data.levelReward.level5':  { en: '+3 Tomato Seeds', es: '+3 Semillas de Tomate', pt: '+3 Sementes de Tomate' },
  'data.levelReward.level7':  { en: '+3 Carrot Seeds', es: '+3 Semillas de Zanahoria', pt: '+3 Sementes de Cenoura' },
  'data.levelReward.level10': { en: '+500 Coins', es: '+500 Monedas', pt: '+500 Moedas' },
  'data.levelReward.level12': { en: '+5 Corn Seeds', es: '+5 Semillas de Maíz', pt: '+5 Sementes de Milho' },
  'data.levelReward.level15': { en: '+3 Lavender Seeds', es: '+3 Semillas de Lavanda', pt: '+3 Sementes de Lavanda' },
  'data.levelReward.level18': { en: '+1000 Coins', es: '+1000 Monedas', pt: '+1000 Moedas' },
  'data.levelReward.level20': { en: '+3 Pumpkin Seeds', es: '+3 Semillas de Calabaza', pt: '+3 Sementes de Abóbora' },
  'data.levelReward.level25': { en: '+3 Sunflower Seeds', es: '+3 Semillas de Girasol', pt: '+3 Sementes de Girassol' },

  // ── Beauty spot hover text (src/systems/beautySpotSystem.ts) ─────────────────
  'data.beauty.slotEmpty':    { en: 'Beauty Slot {index} — Empty', es: 'Espacio {index} — Vacío', pt: 'Vaga {index} — Vazia' },
  'data.beauty.slotOccupied': { en: '{name} [{rarity}] · {value} beauty pts', es: '{name} [{rarity}] · {value} pts de belleza', pt: '{name} [{rarity}] · {value} pts de beleza' },

  // ── Plot groups ────────────────────────────────────────────────────────────
  'data.plotGroup.starter':    { en: 'Starter Plots', es: 'Parcelas Iniciales', pt: 'Lotes Iniciais' },
  'data.plotGroup.tutorial':   { en: 'Tutorial Plots', es: 'Parcelas del Tutorial', pt: 'Lotes do Tutorial' },
  'data.plotGroup.threeNew':   { en: '3 New Plots', es: '3 Parcelas Nuevas', pt: '3 Lotes Novos' },
  'data.plotGroup.farmerZone': { en: 'Farmer Zone', es: 'Zona del Granjero', pt: 'Zona do Fazendeiro' },
}
