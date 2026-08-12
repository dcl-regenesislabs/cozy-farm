import type { TranslationDictionary } from '../types'

// QuestPanel UI chrome (src/ui/QuestPanel.tsx) — status chips, guide item labels/notes,
// reward/progress fragments, and empty-state copy.
// NOTE: quest CONTENT data (titles/descriptions from src/data/questData.ts) lives in
// quests.ts, a separate file — do not confuse the two.
export const questDict: TranslationDictionary = {
  // getStatusText() chip labels
  'quest.status.guide':  { en: 'Guide',  es: 'Guía',   pt: 'Guia' },
  'quest.status.done':   { en: 'Done',   es: 'Hecho',  pt: 'Feito' },
  'quest.status.new':    { en: 'New',    es: 'Nueva',  pt: 'Nova' },
  'quest.status.active': { en: 'Active', es: 'Activa', pt: 'Ativa' },
  // ('Claim' chip reuses common.claim)

  // getStatusNote() — expanded row helper text
  'quest.note.claimable': { en: 'Return to this NPC to claim the reward.', es: 'Vuelve con este NPC para reclamar la recompensa.', pt: 'Volte a falar com esse NPC para resgatar a recompensa.' },
  'quest.note.completed': { en: 'Reward already collected.', es: 'Recompensa ya reclamada.', pt: 'Recompensa já resgatada.' },
  'quest.note.available': { en: 'Talk to this NPC to accept the quest.', es: 'Habla con este NPC para aceptar la misión.', pt: 'Fale com esse NPC para aceitar a missão.' },
  'quest.note.active':    { en: 'Keep progressing to complete this quest.', es: 'Sigue avanzando para completar esta misión.', pt: 'Continue avançando para completar essa missão.' },

  // Guide items — tutorial / fertilizer / chicken coop / pig pen onboarding checklists
  'quest.guide.ownerMayor':        { en: 'Mayor Chen', es: 'Alcalde Chen', pt: 'Prefeito Chen' },
  'quest.guide.ownerAnimalGuide':  { en: 'Animal Guide', es: 'Guía Animal', pt: 'Guia Animal' },
  'quest.guide.tutorial.title':    { en: 'Tutorial', es: 'Tutorial', pt: 'Tutorial' },
  'quest.guide.tutorial.note':     { en: 'Core onboarding checklist for the farm loop.', es: 'Lista básica para aprender el ciclo de la granja.', pt: 'Lista básica para aprender o ciclo da fazenda.' },
  'quest.guide.fertilizer.title':  { en: 'Fertilizer Guide', es: 'Guía de fertilizante', pt: 'Guia de fertilizante' },
  'quest.guide.fertilizer.note':   { en: 'Unlock compost, collect fertilizer and use it on crops.', es: 'Desbloquea la compostera, junta fertilizante y úsalo en tus cultivos.', pt: 'Desbloqueie a composteira, colete fertilizante e use nas suas plantações.' },
  'quest.guide.chickenCoop.title': { en: 'Chicken Coop', es: 'Gallinero', pt: 'Galinheiro' },
  'quest.guide.chickenCoop.note':  { en: 'Coop basics: build, buy, feed and keep it clean.', es: 'Lo básico del gallinero: constrúyelo, cómpralo, aliméntalo y mantenlo limpio.', pt: 'O básico do galinheiro: construa, compre, alimente e mantenha limpo.' },
  'quest.guide.pigPen.title':      { en: 'Pig Pen', es: 'Chiquero', pt: 'Chiqueiro' },
  'quest.guide.pigPen.note':       { en: 'Pen basics plus growth, breeding and meat harvesting.', es: 'Lo básico del chiquero, además de crecimiento, cría y cosecha de carne.', pt: 'O básico do chiqueiro, além de crescimento, reprodução e colheita de carne.' },

  // Empty state
  'quest.empty.title':    { en: 'No quests available right now', es: 'No hay misiones disponibles por ahora', pt: 'Nenhuma missão disponível no momento' },
  'quest.empty.subtitle': { en: 'Talk to visitors and progress through the farm to unlock more.', es: 'Habla con los visitantes y avanza en la granja para desbloquear más.', pt: 'Fale com os visitantes e avance na fazenda para desbloquear mais.' },

  // Reward / progress fragments (bold tags applied at the call site, not here)
  'quest.rewardCoins':      { en: '{amount} coins', es: '{amount} monedas', pt: '{amount} moedas' },
  'quest.rewardXp':         { en: '+{amount} XP', es: '+{amount} XP', pt: '+{amount} XP' },
  'quest.progressFraction': { en: '{current} / {total}', es: '{current} / {total}', pt: '{current} / {total}' },
}
