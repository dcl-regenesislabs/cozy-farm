import type { TranslationDictionary } from '../types'

// NPC greetings (src/data/npcData.ts), Mayor chit-chat (src/systems/npcSystem.ts),
// and dialog panel chrome (src/ui/NpcDialogMenu.tsx). NPC given names themselves
// are NOT translated (proper nouns) — only their spoken lines.
export const npcDict: TranslationDictionary = {
  'npc.rosa.greeting':      { en: "Oh hello, dear! Lovely little farm you have here.\nI was just admiring your crops. Do you need any help?", es: '¡Hola, querido! Qué linda granja tienes.\nJusto estaba admirando tus cultivos. ¿Necesitas ayuda con algo?', pt: 'Oi, querido! Que fazendinha linda você tem.\nEstava só admirando suas plantações. Precisa de ajuda?' },
  'npc.gerald.greeting':    { en: "Oh, it's you. I suppose your dog was in my garden again.\nYou might want to keep a closer eye on things around here.", es: 'Ah, eres tú. Supongo que tu perro volvió a meterse en mi jardín.\nDeberías vigilar mejor las cosas por aquí.', pt: 'Ah, é você. Imagino que seu cachorro invadiu meu jardim de novo.\nDeveria ficar de olho nas coisas por aqui.' },
  'npc.marco.greeting':     { en: "Ha! My farm is twice the size of yours.\nBut I'll admit... your crops don't look half bad.", es: '¡Ja! Mi granja es el doble de grande que la tuya.\nPero admito que... tus cultivos no se ven nada mal.', pt: 'Ha! Minha fazenda é duas vezes maior que a sua.\nMas admito... suas plantações não estão nada mal.' },
  'npc.lily.greeting':      { en: 'Perfect timing! I need fresh produce for tonight’s special.\nCould you help me out? I pay well.', es: '¡Justo a tiempo! Necesito productos frescos para el especial de esta noche.\n¿Podrías ayudarme? Pago bien.', pt: 'Que ótimo momento! Preciso de produtos frescos para o prato especial de hoje.\nVocê pode me ajudar? Eu pago bem.' },
  'npc.dave.greeting':      { en: 'Oh thank goodness you’re here. I accidentally flooded my cellar again.\nAnyway, lovely day, right?', es: 'Ay, qué bueno que estás aquí. Volví a inundar mi sótano sin querer.\nEn fin, lindo día, ¿no?', pt: 'Ah, que bom que você veio. Inundei meu porão de novo sem querer.\nEnfim, belo dia, não é?' },
  'npc.mayorchen.greeting': { en: 'Ah, good day. The town council has been keeping an eye on your progress.\nWe have a proposal that may interest you.', es: 'Ah, buen día. El concejo del pueblo ha estado siguiendo tu progreso.\nTenemos una propuesta que podría interesarte.', pt: 'Ah, bom dia. O conselho da cidade tem acompanhado seu progresso.\nTemos uma proposta que pode te interessar.' },

  'npc.mayorChitchat': {
    en: [
      'Oh, what a nice day! The sun makes the soil feel just right for growing.',
      "I think you'll like this place — CozyFarm has a way of growing on you!",
      'You know, I used to play guitar in a rock band. We called ourselves The Fertilizers. We were ahead of our time.',
      "Between you and me, Marco's farm isn't as big as he claims. Don't tell him I said that.",
      'The smell of fresh soil in the morning… nothing quite like it, is there?',
    ],
    es: [
      '¡Ah, qué lindo día! El sol deja la tierra en el punto justo para cultivar.',
      'Creo que te va a encantar este lugar — CozyFarm tiene una forma de conquistarte.',
      '¿Sabes? Antes tocaba la guitarra en una banda de rock. Nos llamábamos Los Fertilizantes. Estábamos adelantados a nuestra época.',
      'Entre nosotros, la granja de Marco no es tan grande como él dice. No le cuentes que te dije esto.',
      'El olor de la tierra fresca por la mañana... no hay nada igual, ¿verdad?',
    ],
    pt: [
      'Ah, que dia lindo! O sol deixa a terra no ponto certo para plantar.',
      'Acho que você vai gostar daqui — CozyFarm tem um jeito de conquistar a gente.',
      'Sabe, eu tocava guitarra numa banda de rock. Nos chamávamos Os Fertilizantes. Estávamos à frente do nosso tempo.',
      'Entre nós, a fazenda do Marco não é tão grande quanto ele diz. Não conta pra ele que eu falei isso.',
      'O cheiro de terra fresca de manhã... não há nada como isso, não é mesmo?',
    ],
  },

  'npc.talkToHover': { en: 'Talk to {name}', es: 'Hablar con {name}', pt: 'Falar com {name}' },

  // Dialog panel chrome (NpcDialogMenu.tsx)
  'npc.task':         { en: 'Task', es: 'Tarea', pt: 'Tarefa' },
  'npc.rewardLabel':  { en: 'Reward: ', es: 'Recompensa: ', pt: 'Recompensa: ' },
  'npc.reward':       { en: 'Reward', es: 'Recompensa', pt: 'Recompensa' },
  'npc.coinsPlus':    { en: ' COINS + ', es: ' MONEDAS + ', pt: ' MOEDAS + ' },
  'npc.xpSuffix':     { en: ' XP', es: ' XP', pt: ' XP' },
  'npc.rewardXpPlus': { en: '+ {xp} XP', es: '+ {xp} XP', pt: '+ {xp} XP' },
  'npc.questProgress': { en: '{title}\n\nProgress: {current} / {target}', es: '{title}\n\nProgreso: {current} / {target}', pt: '{title}\n\nProgresso: {current} / {target}' },
  'npc.progressLine': { en: 'Progress: {current} / {target}', es: 'Progreso: {current} / {target}', pt: 'Progresso: {current} / {target}' },
  'npc.questComplete': { en: 'You did it! {title} — complete!\n\nReward: {coins} coins + {xp} XP', es: '¡Lo lograste! {title} — ¡completado!\n\nRecompensa: {coins} monedas + {xp} XP', pt: 'Você conseguiu! {title} — completo!\n\nRecompensa: {coins} moedas + {xp} XP' },

  'npc.accept':      { en: 'Accept', es: 'Aceptar', pt: 'Aceitar' },
  'npc.claimReward': { en: 'Claim Reward!', es: '¡Reclamar recompensa!', pt: 'Resgatar recompensa!' },
  'npc.later':       { en: 'Later', es: 'Más tarde', pt: 'Mais tarde' },
  'npc.keepItUp':    { en: 'Keep it up!', es: '¡Sigue así!', pt: 'Continue assim!' },
  'npc.goodbye':     { en: 'Goodbye', es: 'Adiós', pt: 'Tchau' },
}
