import type { TranslationDictionary } from '../types'

// Shared strings reused across multiple panels — buttons, generic labels, generic templates.
// Panel-specific dictionaries should reuse these instead of redefining the same phrase.
export const commonDict: TranslationDictionary = {
  'common.cancel':      { en: 'Cancel',       es: 'Cancelar',        pt: 'Cancelar' },
  'common.close':       { en: 'Close',        es: 'Cerrar',          pt: 'Fechar' },
  'common.notNow':      { en: 'Not now',      es: 'Ahora no',        pt: 'Agora não' },
  'common.claim':       { en: 'Claim',        es: 'Reclamar',        pt: 'Resgatar' },
  'common.claimed':     { en: 'Claimed',      es: 'Reclamado',       pt: 'Resgatado' },
  'common.prev':        { en: 'Prev',         es: 'Ant',             pt: 'Ant' },
  'common.next':        { en: 'Next',         es: 'Sig',             pt: 'Próx' },
  'common.owned':       { en: 'Owned',        es: 'Adquirido',       pt: 'Adquirido' },
  'common.locked':      { en: 'Locked',       es: 'Bloqueado',       pt: 'Bloqueado' },
  'common.lockedLevel': { en: 'Locked — Level {level}', es: 'Bloqueado — Nivel {level}', pt: 'Bloqueado — Nível {level}' },
  'common.count':       { en: 'x{count}',     es: 'x{count}',        pt: 'x{count}' },
  'common.costCoins':   { en: 'Cost: {cost} coins', es: 'Costo: {cost} monedas', pt: 'Custo: {cost} moedas' },
  'common.buyFor':      { en: 'Buy {cost}',   es: 'Comprar {cost}',  pt: 'Comprar {cost}' },
  'common.loading':     { en: 'Loading...',   es: 'Cargando...',     pt: 'Carregando...' },
  'common.gotIt':       { en: 'Got it!',      es: '¡Entendido!',     pt: 'Entendi!' },
  'common.coins':       { en: 'coins',        es: 'monedas',         pt: 'moedas' },
  'common.level':       { en: 'Level {level}', es: 'Nivel {level}',  pt: 'Nível {level}' },
  'common.hover.petDog': { en: 'Pet the dog', es: 'Acariciar perro', pt: 'Fazer carinho' },
  'common.pageOf': { en: '{page} / {last}', es: '{page} / {last}', pt: '{page} / {last}' },
}
