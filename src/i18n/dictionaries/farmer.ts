import type { TranslationDictionary } from '../types'

export const farmerDict: TranslationDictionary = {
  'farmer.hover.talkToFarmer': { en: 'Talk to Farmer', es: 'Hablar con el Granjero', pt: 'Falar com o Fazendeiro' },

  // ─── FarmerMenu.tsx ─────────────────────────────────────────────────────────
  'farmer.panelTitle':        { en: 'Farmer', es: 'Granjero', pt: 'Fazendeiro' },
  'farmer.plusOne':           { en: '+1', es: '+1', pt: '+1' },
  'farmer.allButton':         { en: 'All', es: 'Todo', pt: 'Tudo' },
  'farmer.youCount':          { en: 'You: x{count}', es: 'Tú: x{count}', pt: 'Você: x{count}' },
  'farmer.farmerCount':       { en: 'Farmer: x{count}', es: 'Granjero: x{count}', pt: 'Fazendeiro: x{count}' },
  'farmer.hireIntro':         { en: 'I can work these fields for you.', es: 'Puedo trabajar estos campos por ti.', pt: 'Posso trabalhar estes campos para você.' },
  'farmer.hirePrompt':        { en: 'Pay me {cost} coins and give me seeds to get started.', es: 'Págame {cost} monedas y dame semillas para empezar.', pt: 'Me pague {cost} moedas e me dê sementes para começar.' },
  'farmer.coinsProgress':     { en: '{coins} / {cost} coins', es: '{coins} / {cost} monedas', pt: '{coins} / {cost} moedas' },
  'farmer.hireButton':        { en: 'Hire for {cost} coins', es: 'Contratar por {cost} monedas', pt: 'Contratar por {cost} moedas' },
  'farmer.workerUnpaidStatus': {
    en: { one: 'Worker unpaid: {wages} coins due ({count} day). Use the computer to clear wages.', other: 'Worker unpaid: {wages} coins due ({count} days). Use the computer to clear wages.' },
    es: { one: 'Trabajador sin pagar: debes {wages} monedas ({count} día). Usa la computadora para saldar la deuda.', other: 'Trabajador sin pagar: debes {wages} monedas ({count} días). Usa la computadora para saldar la deuda.' },
    pt: { one: 'Trabalhador sem pagamento: você deve {wages} moedas ({count} dia). Use o computador para quitar a dívida.', other: 'Trabalhador sem pagamento: você deve {wages} moedas ({count} dias). Use o computador para quitar a dívida.' },
  },
  'farmer.workerIdleNoSeeds': { en: 'Worker idle: no seeds loaded. Daily wage is {wage} coins.', es: 'Trabajador inactivo: no hay semillas cargadas. El salario diario es de {wage} monedas.', pt: 'Trabalhador ocioso: sem sementes carregadas. O salário diário é de {wage} moedas.' },
  'farmer.workerActive':      { en: 'Worker active. Daily wage: {wage} coins.', es: 'Trabajador activo. Salario diario: {wage} monedas.', pt: 'Trabalhador ativo. Salário diário: {wage} moedas.' },
  'farmer.collectedHarvestTitle': { en: 'Collected Harvest', es: 'Cosecha Recolectada', pt: 'Colheita Coletada' },
  'farmer.collectAllButton':  { en: 'Collect All', es: 'Recolectar Todo', pt: 'Coletar Tudo' },
  'farmer.nothingCollectedYet': { en: 'Nothing collected yet.', es: 'Aún no has recolectado nada.', pt: 'Ainda não coletou nada.' },
  'farmer.giveSeedsTitle':    { en: 'Give Seeds to Farmer', es: 'Dar Semillas al Granjero', pt: 'Dar Sementes ao Fazendeiro' },
  'farmer.noSeedsToGive':     { en: 'You have no seeds to give.', es: 'No tienes semillas para dar.', pt: 'Você não tem sementes para dar.' },
}
