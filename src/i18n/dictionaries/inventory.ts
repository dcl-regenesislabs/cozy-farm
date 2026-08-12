import type { TranslationDictionary } from '../types'

export const inventoryDict: TranslationDictionary = {
  'inventory.tab.seeds':     { en: 'Seeds',     es: 'Semillas',  pt: 'Sementes' },
  'inventory.tab.harvested': { en: 'Harvested', es: 'Cosechado', pt: 'Colhido' },
  'inventory.tab.other':     { en: 'Other',     es: 'Otros',     pt: 'Outros' },

  'inventory.item.organicWaste': { en: 'Organic Waste', es: 'Residuo Orgánico', pt: 'Resíduo Orgânico' },

  'inventory.empty.seeds':     { en: 'No seeds in stock',       es: 'No hay semillas en stock',           pt: 'Sem sementes em estoque' },
  'inventory.empty.harvested': { en: 'Nothing harvested yet',   es: 'Aún no has cosechado nada',          pt: 'Ainda não há nada colhido' },
  'inventory.empty.other':     { en: 'No extra items stored',   es: 'No hay artículos extra guardados',   pt: 'Nenhum item extra guardado' },
}
