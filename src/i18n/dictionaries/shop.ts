import type { TranslationDictionary } from '../types'

export const shopDict: TranslationDictionary = {
  'shop.hover.openShop': { en: 'Open Shop', es: 'Abrir Tienda', pt: 'Abrir Loja' },

  // Tab labels
  'shop.tab.seeds':       { en: 'Seeds',       es: 'Semillas',    pt: 'Sementes' },
  'shop.tab.pets':        { en: 'Pets',        es: 'Mascotas',    pt: 'Animais' },
  'shop.tab.ornaments':   { en: 'Ornaments',   es: 'Ornamentos',  pt: 'Ornamentos' },
  'shop.tab.workers':     { en: 'Workers',     es: 'Trabajad.', pt: 'Trabalh.' },
  'shop.tab.fertilizers': { en: 'Fertilizers', es: 'Fertilizantes', pt: 'Fertilizantes' },

  // Card titles (non-crop items)
  'shop.item.dog':         { en: 'Dog',              es: 'Perro',               pt: 'Cachorro' },
  'shop.item.chickenCoop': { en: 'Chicken Coop',     es: 'Gallinero',           pt: 'Galinheiro' },
  'shop.item.pigPen':      { en: 'Pig Pen',          es: 'Chiquero',            pt: 'Chiqueiro' },
  'shop.item.grain':       { en: 'Grain',            es: 'Grano',               pt: 'Grão' },
  'shop.item.grainBulk':   { en: 'Grain (Bulk)',     es: 'Grano (Paquete)',     pt: 'Grão (Pacote)' },
  'shop.item.compostBin':  { en: 'Compost Bin',      es: 'Compostador',         pt: 'Composteira' },

  'shop.units': {
    en: { one: '{count} unit',    other: '{count} units' },
    es: { one: '{count} unidad',  other: '{count} unidades' },
    pt: { one: '{count} unidade', other: '{count} unidades' },
  },

  'shop.full':          { en: 'Full ({current}/{max})', es: 'Lleno ({current}/{max})', pt: 'Cheio ({current}/{max})' },
  'shop.placed':        { en: 'Placed ✓',   es: 'Colocado ✓',     pt: 'Colocado ✓' },
  'shop.slotsFull':     { en: 'Slots Full', es: 'Espacios Llenos', pt: 'Vagas Cheias' },
  'shop.slotsFullNotice': {
    en: 'All 3 decoration slots are full — future update will let you swap ornaments',
    es: 'Los 3 espacios de decoración están llenos — una futura actualización permitirá cambiar ornamentos',
    pt: 'As 3 vagas de decoração estão cheias — uma futura atualização vai permitir trocar ornamentos',
  },
  'shop.notEnoughCoins': { en: 'Not enough coins', es: 'Monedas insuficientes', pt: 'Moedas insuficientes' },

  // Workers tab
  'shop.worker.lockedNote':  { en: 'Unlock the worker area first', es: 'Desbloquea primero la zona de trabajadores', pt: 'Desbloqueie primeiro a área dos trabalhadores' },
  'shop.worker.noHireValue': { en: 'No hire', es: 'Sin contratar', pt: 'Sem contrato' },
  'shop.worker.noHireNote':  { en: 'Hire the farm worker in the expansion', es: 'Contrata al trabajador en la expansión de la granja', pt: 'Contrate o trabalhador na expansão da fazenda' },

  'shop.worker.statusTitle':      { en: 'Status', es: 'Estado', pt: 'Status' },
  'shop.worker.status.idleUnpaid':  { en: 'Idle (unpaid)',   es: 'Inactivo (sin pago)',   pt: 'Inativo (sem pag.)' },
  'shop.worker.status.idleNoSeeds': { en: 'Idle (no seeds)', es: 'Inactivo (sin sem.)', pt: 'Inativo (sem sem.)' },
  'shop.worker.status.active':      { en: 'Active', es: 'Activo', pt: 'Ativo' },
  'shop.worker.status.idle':        { en: 'Idle',   es: 'Inactivo', pt: 'Inativo' },

  'shop.worker.note.backPayDue':    { en: 'Back-pay due',     es: 'Pago atrasado', pt: 'Pagamento atrasado' },
  'shop.worker.note.noSeedsLoaded': { en: 'No seeds loaded',  es: 'Sin semillas',   pt: 'Sem sementes' },
  'shop.worker.note.running':       { en: 'Worker running',   es: 'Trabajador activo',       pt: 'Trabalhador ativo' },

  'shop.worker.dailyWageTitle': { en: 'Daily Wage', es: 'Salario Diario', pt: 'Salário Diário' },
  'shop.worker.perDay':         { en: 'coins / day', es: 'monedas / día', pt: 'moedas / dia' },

  'shop.worker.outstandingTitle': { en: 'Outstanding', es: 'Pendiente', pt: 'Pendente' },
  'shop.worker.coinDue': {
    en: { one: 'coin due',  other: 'coins due' },
    es: { one: 'moneda pendiente', other: 'monedas' },
    pt: { one: 'moeda pendente',   other: 'moedas' },
  },

  'shop.worker.missedDaysTitle': { en: 'Missed Days', es: 'Días Perdidos', pt: 'Dias Perdidos' },
  'shop.worker.dayMissed': {
    en: { one: 'day missed',  other: 'days missed' },
    es: { one: 'día perdido', other: 'días perdidos' },
    pt: { one: 'dia perdido', other: 'dias perdidos' },
  },

  'shop.worker.payrollTitle': { en: 'Payroll', es: 'Nómina', pt: 'Salários' },
  'shop.worker.balanceLabel': { en: 'balance', es: 'saldo',  pt: 'saldo' },
  'shop.worker.noWagesDue':   { en: 'No wages due', es: 'Sin pagos pendientes', pt: 'Sem pagamentos' },

  'shop.worker.stoppedAfterDays': {
    en: { one: 'Worker stopped after {count} unpaid day. Clear all back-pay to reactivate them.', other: 'Worker stopped after {count} unpaid days. Clear all back-pay to reactivate them.' },
    es: { one: 'El trabajador se detuvo tras {count} día sin pagar. Salda toda la deuda para reactivarlo.', other: 'El trabajador se detuvo tras {count} días sin pagar. Salda toda la deuda para reactivarlo.' },
    pt: { one: 'O trabalhador parou após {count} dia sem pagamento. Quite todo o valor pendente para reativá-lo.', other: 'O trabalhador parou após {count} dias sem pagamento. Quite todo o valor pendente para reativá-lo.' },
  },
  'shop.worker.backPayAccrued': {
    en: { one: 'Back-pay accrued for {count} day.', other: 'Back-pay accrued for {count} days.' },
    es: { one: 'Pago atrasado acumulado por {count} día.', other: 'Pago atrasado acumulado por {count} días.' },
    pt: { one: 'Pagamento atrasado acumulado por {count} dia.', other: 'Pagamento atrasado acumulado por {count} dias.' },
  },
  'shop.worker.stateLabel': { en: 'Worker state: {state}', es: 'Estado del trabajador: {state}', pt: 'Estado do trabalhador: {state}' },

  // Fertilizers tab
  'shop.fertilizers.heading':    { en: 'Composting & Fertilizers', es: 'Compostaje y Fertilizantes', pt: 'Compostagem e Fertilizantes' },
  'shop.fertilizers.subheading': {
    en: 'Unlock the Compost Bin to turn rotten crops into powerful fertilizers.',
    es: 'Desbloquea el Compostador para convertir cultivos podridos en potentes fertilizantes.',
    pt: 'Desbloqueie a Composteira para transformar plantações podres em fertilizantes poderosos.',
  },
  'shop.fertilizers.compostBinDescription': { en: 'Turn rotten crops into fertilizers', es: 'Convierte cultivos podridos en fertilizantes', pt: 'Transforme plantações podres em fertilizantes' },
  'shop.fertilizers.ownedCheck':    { en: 'Owned ✓', es: 'Adquirido ✓', pt: 'Adquirido ✓' },
  'shop.fertilizers.unlocksAtLevel': { en: 'Unlocks at Level {level}', es: 'Se desbloquea en el Nivel {level}', pt: 'Desbloqueia no Nível {level}' },
  'shop.fertilizers.unlockedNotice': {
    en: 'Compost Bin unlocked — visit it on your farm to start composting rotten crops.',
    es: 'Compostador desbloqueado — visítalo en tu granja para empezar a compostar cultivos podridos.',
    pt: 'Composteira desbloqueada — visite-a na sua fazenda para começar a compostar plantações podres.',
  },
}
