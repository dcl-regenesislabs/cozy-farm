import type { TranslationDictionary } from '../types'

export const unlockDict: TranslationDictionary = {
  'unlock.hover.expandFarm': { en: 'Expand Farm ({cost} coins)', es: 'Expandir Granja ({cost} monedas)', pt: 'Expandir Fazenda ({cost} moedas)' },

  // Plot-group "for sale" sign hover (src/systems/interactionSetup.ts wirePlotGroupSigns)
  'unlock.hover.expandFarmLabel': { en: 'Expand Farm', es: 'Expandir Granja', pt: 'Expandir Fazenda' },
  'unlock.hover.plusPlots':       { en: '+{count} plots', es: '+{count} parcelas', pt: '+{count} lotes' },
  'unlock.hover.costCoinsShort':  { en: '{cost} coins', es: '{cost} monedas', pt: '{cost} moedas' },
  'unlock.hover.levelPlus':       { en: 'Lv {level}+', es: 'Nv {level}+', pt: 'Nv {level}+' },

  'unlock.landExpansion.title': { en: 'Land Expansion', es: 'Expansión Tierra', pt: 'Expansão Terreno' },
  'unlock.landExpansion.description': {
    en: 'Unlock Tier 2 and Tier 3 crops, plus the farmer zone with 24 extra plots for automated work.',
    es: 'Desbloquea los cultivos de Nivel 2 y Nivel 3, además de la zona del trabajador con 24 parcelas extra para trabajo automatizado.',
    pt: 'Desbloqueie as plantações de Nível 2 e Nível 3, além da área do trabalhador com 24 lotes extras para trabalho automatizado.',
  },

  'unlock.costLabel': { en: 'Cost:', es: 'Costo:', pt: 'Custo:' },
  'unlock.youHave':   { en: '(you have: {coins})', es: '(tienes: {coins})', pt: '(você tem: {coins})' },
  'unlock.buy':       { en: 'Buy', es: 'Comprar', pt: 'Comprar' },

  'unlock.plotExpansionPack.title': { en: 'Plot Expansion - Pack {pack}', es: 'Expansión de Parcela - Paquete {pack}', pt: 'Expansão de Lote - Pacote {pack}' },
  'unlock.expansion.description': {
    en: 'Unlock 3 new soil plots for your farm and keep the same revamp progression flow.',
    es: 'Desbloquea 3 parcelas de tierra nuevas para tu granja y mantén el mismo flujo de progresión.',
    pt: 'Desbloqueie 3 novos lotes de terra para sua fazenda e mantenha o mesmo fluxo de progressão.',
  },

  'unlock.plotExpansion.title': { en: 'Plot Expansion', es: 'Expansión Parcela', pt: 'Expansão de Lote' },
  'unlock.plotGroup.description': {
    en: 'Unlock 3 new soil plots and expand your farm.',
    es: 'Desbloquea 3 parcelas de tierra nuevas y expande tu granja.',
    pt: 'Desbloqueie 3 novos lotes de terra e expanda sua fazenda.',
  },

  'unlock.levelMet':      { en: 'Lv {level} ✓', es: 'Nv {level} ✓', pt: 'Nv {level} ✓' },
  'unlock.levelRequired': { en: 'Lv {level} required', es: 'Nv {level} requerido', pt: 'Nv {level} necessário' },
}
