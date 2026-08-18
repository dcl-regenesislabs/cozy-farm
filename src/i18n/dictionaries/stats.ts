import type { TranslationDictionary } from '../types'

export const statsDict: TranslationDictionary = {
  'stats.unlocksCrop': { en: 'Unlocks {crop}', es: 'Desbloquea {crop}', pt: 'Desbloqueia {crop}' },

  // Tab bar
  'stats.tab.stats':       { en: 'Stats', es: 'Estadísticas', pt: 'Estatísticas' },
  'stats.tab.rewards':     { en: 'Rewards', es: 'Recompensas', pt: 'Recompensas' },
  'stats.tab.leaderboard': { en: 'Leaderboard', es: 'Clasificación', pt: 'Classificação' },

  // Level / XP header (StatsTab) — level chip itself reuses common.level
  'stats.maxLevel':  { en: 'Max Level!', es: '¡Nivel máximo!', pt: 'Nível máximo!' },
  'stats.xpProgress': { en: 'XP: {current} / {needed}', es: 'XP: {current} / {needed}', pt: 'XP: {current} / {needed}' },

  // Stat card labels — rendered as two lines, so the embedded \n controls the line break
  'stats.label.cropsHarvested': { en: 'Crops\nHarvested', es: 'Cultivos\nCosechados', pt: 'Plantações\nColhidas' },
  'stats.label.seedsPlanted':   { en: 'Seeds\nPlanted', es: 'Semillas\nPlantadas', pt: 'Sementes\nPlantadas' },
  'stats.label.timesWatered':   { en: 'Times\nWatered', es: 'Riegos\nRealizados', pt: 'Regas\nRealizadas' },
  'stats.label.cropsSold':      { en: 'Crops\nSold', es: 'Cultivos\nVendidos', pt: 'Plantações\nVendidas' },
  'stats.label.coinsEarned':    { en: 'Coins\nEarned', es: 'Monedas\nGanadas', pt: 'Moedas\nGanhas' },
  'stats.label.beautyScore':    { en: 'Beauty\nScore ✦', es: 'Puntos de\nBelleza ✦', pt: 'Pontos de\nBeleza ✦' },

  // RewardsTab (RewardCard)
  'stats.lvShort':     { en: 'Lv {level}', es: 'Nv {level}', pt: 'Nv {level}' },
  'stats.tapToClaim':  { en: 'Tap!', es: '¡Toca!', pt: 'Toque!' },
  // ('Claimed' badge reuses common.claimed)

  // LeaderboardTab
  'stats.loadingRankings': { en: 'Loading rankings...', es: 'Cargando ranking...', pt: 'Carregando ranking...' },
  'stats.noRankingsYet':   { en: 'No rankings yet. Be the first!', es: 'Aún no hay clasificación. ¡Sé el primero!', pt: 'Ainda não há classificação. Seja o primeiro!' },
  'stats.refresh':         { en: '+ Refresh', es: '+ Actualizar', pt: '+ Atualizar' },
  // (loading refresh button state reuses common.loading)
  'stats.yourRank':        { en: 'Your rank: #{rank}  ·  Score: {score} ✦', es: 'Tu puesto: #{rank}  ·  Puntos: {score} ✦', pt: 'Sua posição: #{rank}  ·  Pontos: {score} ✦' },
  'stats.youSuffix':       { en: '{name} (you)', es: '{name} (tú)', pt: '{name} (você)' },
}
