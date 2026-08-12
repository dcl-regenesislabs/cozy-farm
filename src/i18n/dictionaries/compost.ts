import type { TranslationDictionary } from '../types'

export const compostDict: TranslationDictionary = {
  'compost.hover.compostBin': { en: 'Compost Bin', es: 'Compostera', pt: 'Composteira' },

  // ─── CompostBinMenu.tsx ─────────────────────────────────────────────────────
  'compost.organicWasteTitle': { en: 'Organic Waste', es: 'Residuo Orgánico', pt: 'Resíduo Orgânico' },
  'compost.inHand':            { en: 'In hand: {count}', es: 'En mano: {count}', pt: 'Na mão: {count}' },
  'compost.title':             { en: 'Compost Bin', es: 'Compostera', pt: 'Composteira' },
  'compost.inBin':             { en: 'In bin: {count} units', es: 'En la compostera: {count} unidades', pt: 'Na composteira: {count} unidades' },
  'compost.nextFertilizer':    { en: 'Next fertilizer: {time}', es: 'Próximo fertilizante: {time}', pt: 'Próximo fertilizante: {time}' },
  'compost.addWasteNote':      { en: 'Add waste to start composting', es: 'Agrega residuo para empezar a compostar', pt: 'Adicione resíduo para começar a compostar' },
  'compost.fertilizersReady':  {
    en: { one: '{count} fertilizer ready!', other: '{count} fertilizers ready!' },
    es: { one: '¡{count} fertilizante listo!', other: '¡{count} fertilizantes listos!' },
    pt: { one: '{count} fertilizante pronto!', other: '{count} fertilizantes prontos!' },
  },
  'compost.addWasteButton':    { en: 'Add Waste', es: 'Agregar Residuo', pt: 'Adicionar Resíduo' },
  'compost.nothingReady':      { en: 'Nothing ready', es: 'Nada listo', pt: 'Nada pronto' },
  'compost.collectCount':      { en: 'Collect ({count})', es: 'Recolectar ({count})', pt: 'Coletar ({count})' },
  'compost.yourFertilizers':   { en: 'Your Fertilizers', es: 'Tus Fertilizantes', pt: 'Seus Fertilizantes' },
}
