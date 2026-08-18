import type { TranslationDictionary } from '../types'

// TopHud/BottomNav toasts (src/index.ts, src/services/socialService.ts, src/ui/TopHud.tsx)
export const hudDict: TranslationDictionary = {
  'hud.levelUpToast': { en: 'Level Up! Now Level {level}', es: '¡Subiste de nivel! Ahora Nivel {level}', pt: 'Subiu de nível! Agora Nível {level}' },
  'hud.connecting': { en: 'Connecting...', es: 'Conectando...', pt: 'Conectando...' },
  'hud.workerUnpaidDays': { en: 'Worker unpaid: {wages} coins due ({days} days).', es: 'Trabajador sin pagar: {wages} monedas adeudadas ({days} días).', pt: 'Trabalhador sem pagamento: {wages} moedas devidas ({days} dias).' },
  'hud.workerWagesDue': { en: 'Worker wages due: {wages} coins.', es: 'Salario del trabajador pendiente: {wages} monedas.', pt: 'Salário do trabalhador pendente: {wages} moedas.' },
  'hud.maxXp': { en: 'MAX XP', es: 'XP MÁXIMA', pt: 'XP MÁXIMO' },
  'hud.xpProgress': { en: '{current} / {needed} XP', es: '{current} / {needed} XP', pt: '{current} / {needed} XP' },
  'hud.xpProgressMobile': { en: '{current}/{needed} XP', es: '{current}/{needed} XP', pt: '{current}/{needed} XP' },
  'hud.visit.returnHome': { en: 'Return Home', es: 'Volver a casa', pt: 'Voltar para casa' },
  'hud.visit.liking': { en: 'Liking...', es: 'Dando me gusta...', pt: 'Curtindo...' },
  'hud.visit.likedToday': { en: 'Liked Today', es: 'Ya diste me gusta hoy', pt: 'Curtido hoje' },
  'hud.visit.likeFarm': { en: 'Like Farm', es: 'Dar me gusta', pt: 'Curtir fazenda' },
  'hud.visit.visiting': { en: 'Visiting {farm}', es: 'Visitando {farm}', pt: 'Visitando {farm}' },
  'hud.visit.likes': { en: 'Likes {count}', es: 'Me gusta {count}', pt: 'Curtidas {count}' },
  'hud.visit.waterCount': { en: 'Water {count}/{limit}', es: 'Agua {count}/{limit}', pt: 'Água {count}/{limit}' },
  'hud.visit.likedFarmReward': { en: 'Liked farm. +{amount} coins queued in mailbox', es: 'Le diste me gusta a la granja. +{amount} monedas en camino a tu buzón', pt: 'Você curtiu a fazenda. +{amount} moedas a caminho da sua caixa de correio' },
  'hud.visit.alreadyLikedToday': { en: 'You already liked this farm today', es: 'Ya le diste me gusta a esta granja hoy', pt: 'Você já curtiu esta fazenda hoje' },
  'hud.visit.cannotLikeOwnFarm': { en: 'You cannot like your own farm', es: 'No puedes darle me gusta a tu propia granja', pt: 'Você não pode curtir sua própria fazenda' },
  'hud.visit.likeFailed': { en: 'Could not register like', es: 'No se pudo registrar el me gusta', pt: 'Não foi possível registrar a curtida' },
}
