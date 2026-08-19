import type { TranslationDictionary } from '../types'

// Main welcome tutorial (src/systems/tutorialSystem.ts, src/game/tutorialState.ts).
export const tutorialDict: TranslationDictionary = {
  'tutorial.welcome.text': {
    en: "Welcome to CozyFarm! I'm Mayor Chen, and I'll guide you through the basics.\n\nHere are 15 coins to get you started — go inside your house and log into your computer to buy 5 Onion seeds on El Amazonas!",
    es: '¡Bienvenido a CozyFarm! Soy el Alcalde Chen, y te voy a guiar por lo básico.\n\nAquí tienes 15 monedas para empezar — entra a tu casa e inicia sesión en tu ordenador para comprar 5 semillas de cebolla en El Amazonas!',
    pt: 'Bem-vindo à CozyFarm! Sou o Prefeito Chen, e vou te guiar pelo básico.\n\nAqui estão 15 moedas para você começar — entre na sua casa e acesse seu computador para comprar 5 sementes de cebola no El Amazonas!',
  },
  'tutorial.welcome.button': { en: 'Thanks, Mayor!', es: '¡Gracias, Alcalde!', pt: 'Obrigado, Prefeito!' },

  'tutorial.plantFirst.pages': {
    en: ['Excellent! Now come here to this soil plot and try to plant your first seed...', 'Click the soil to open the planting menu, then select Onion.'],
    es: ['¡Excelente! Ahora ven a esta parcela de tierra e intenta plantar tu primera semilla...', 'Haz clic en la tierra para abrir el menú de siembra y selecciona Cebolla.'],
    pt: ['Excelente! Agora venha até este lote de terra e tente plantar sua primeira semente...', 'Clique na terra para abrir o menu de plantio e selecione Cebola.'],
  },
  'tutorial.plantFirst.button': { en: 'On my way!', es: '¡Voy para allá!', pt: 'Estou indo!' },

  'tutorial.waterFirst.text': {
    en: "Once you plant a seed, you'll need to water it.\nAny plant needs water to grow — go ahead and use your watering can on it!",
    es: 'Una vez que plantes una semilla, tendrás que regarla.\nToda planta necesita agua para crecer — ¡usa tu regadera sobre ella!',
    pt: 'Depois de plantar uma semente, você vai precisar regá-la.\nToda planta precisa de água para crescer — use seu regador nela!',
  },
  'tutorial.waterFirst.button': { en: 'On it!', es: '¡Voy!', pt: 'Pode deixar!' },

  'tutorial.waitGrow.pages': {
    en: ["Good — now it's time to wait for the plant to grow!...", "I'll apply a quick Fertilizer to this soil so it goes faster. I've also unlocked two more plots for you — practice planting while you wait!"],
    es: ['Bien — ahora toca esperar a que la planta crezca...', 'Voy a aplicar un fertilizante rápido en esta tierra para que crezca más rápido. También desbloqueé dos parcelas más para ti — ¡practica sembrar mientras esperas!'],
    pt: ['Ótimo — agora é hora de esperar a planta crescer...', 'Vou aplicar um fertilizante rápido nesta terra para acelerar o crescimento. Também liberei mais dois lotes para você — pratique plantar enquanto espera!'],
  },
  'tutorial.waitGrow.button': { en: "Nice, let's go!", es: '¡Genial, vamos!', pt: 'Legal, vamos lá!' },

  'tutorial.harvestFirst.text': {
    en: 'Your first Onion is ready! Come and harvest it!\n\nClick the soil plot with the glowing hand icon.',
    es: '¡Tu primera cebolla está lista! ¡Ven a cosecharla!\n\nHaz clic en la parcela que tiene el ícono de mano brillante.',
    pt: 'Sua primeira cebola está pronta! Venha colher!\n\nClique no lote de terra com o ícone de mão brilhante.',
  },
  'tutorial.harvestFirst.button': { en: "Let's harvest!", es: '¡A cosechar!', pt: 'Vamos colher!' },

  'tutorial.harvestMore.text': {
    en: "Amazing! You're a real farmer now, these are the basics of farming!\n\nLet's keep practicing — harvest 3 more onions!",
    es: 'Increíble! Ya eres un verdadero granjero, esto es lo básico de la agricultura.\n\nSigamos practicando — ¡cosecha 3 cebollas más!',
    pt: 'Incrível! Agora você já é um verdadeiro fazendeiro, isso é o básico da agricultura.\n\nVamos continuar praticando — colha mais 3 cebolas!',
  },
  'tutorial.harvestMore.button': { en: "I'm on fire!", es: '¡Imparable!', pt: 'Estou imparável!' },

  'tutorial.openQuests.pages': {
    en: ['On your farm you\'ll get a lot of nearby visitors and neighbours with requests!...', 'Open the Quests panel using the button at the bottom of the screen to see what awaits you.'],
    es: ['En tu granja recibirás muchas visitas de vecinos cercanos con pedidos...', 'Abre el panel de Misiones usando el botón en la parte inferior de la pantalla para ver qué te espera.'],
    pt: ['Na sua fazenda você vai receber muitas visitas de vizinhos com pedidos...', 'Abra o painel de Missões usando o botão na parte inferior da tela para ver o que te espera.'],
  },
  'tutorial.openQuests.button': { en: 'Show me!', es: '¡Muéstrame!', pt: 'Me mostre!' },

  'tutorial.talkMayor.text': {
    en: 'The town market needs your participation!\n\nNow come and talk to me — I have an official quest for you.',
    es: '¡El mercado del pueblo necesita tu participación!\n\nAhora ven y habla conmigo — tengo una misión oficial para ti.',
    pt: 'O mercado da cidade precisa da sua participação!\n\nAgora venha falar comigo — tenho uma missão oficial para você.',
  },
  'tutorial.talkMayor.button': { en: 'Coming!', es: '¡Ya voy!', pt: 'Já vou!' },

  'tutorial.questComplete.pages': {
    en: [
      "You've done it — you're a true farmer now! 🌱\n\nI've unlocked three more soil plots for you.",
      'Also, head to your shop computer — Onion, Potato and Garlic seeds are all available now! Tier 2 & 3 crops unlock later as you grow.',
      'The town of CozyFarm is proud of you. Good luck!',
    ],
    es: [
      '¡Lo lograste — ya eres un verdadero granjero! 🌱\n\nTe desbloqueé tres parcelas más.',
      'Además, ve a tu ordenador de la tienda — ¡las semillas de cebolla, patata y ajo ya están disponibles! Los cultivos de nivel 2 y 3 se desbloquean más adelante a medida que avances.',
      'El pueblo de CozyFarm está orgulloso de ti. ¡Buena suerte!',
    ],
    pt: [
      'Você conseguiu — agora é um verdadeiro fazendeiro! 🌱\n\nLiberei mais três lotes de terra para você.',
      'Além disso, vá até o computador da loja — as sementes de cebola, batata e alho já estão disponíveis! As plantações de nível 2 e 3 são liberadas mais tarde, conforme você progride.',
      'A cidade de CozyFarm está orgulhosa de você. Boa sorte!',
    ],
  },
  'tutorial.questComplete.button': { en: 'Thanks, Mayor!', es: '¡Gracias, Alcalde!', pt: 'Obrigado, Prefeito!' },

  'tutorial.nextButton': { en: 'Next', es: 'Siguiente', pt: 'Próximo' },

  // Milestone checklist shown in the Quest panel
  'tutorial.milestone.buySeeds':    { en: 'Buy 5 Onion seeds', es: 'Compra 5 semillas de cebolla', pt: 'Compre 5 sementes de cebola' },
  'tutorial.milestone.plantFirst':  { en: 'Plant your first seed', es: 'Planta tu primera semilla', pt: 'Plante sua primeira semente' },
  'tutorial.milestone.waterCrop':   { en: 'Water your crop', es: 'Riega tu cultivo', pt: 'Regue sua plantação' },
  'tutorial.milestone.harvestFirst': { en: 'Harvest your first crop', es: 'Cosecha tu primer cultivo', pt: 'Colha sua primeira plantação' },
  'tutorial.milestone.harvestMore': { en: 'Harvest 3 more crops', es: 'Cosecha 3 cultivos más', pt: 'Colha mais 3 plantações' },
  'tutorial.milestone.openQuests':  { en: 'Open the Quests panel', es: 'Abre el panel de Misiones', pt: 'Abra o painel de Missões' },
  'tutorial.milestone.talkMayor':   { en: 'Talk to Mayor Chen', es: 'Habla con el Alcalde Chen', pt: 'Fale com o Prefeito Chen' },
  'tutorial.milestone.sellCrops':   { en: 'Sell 5 crops at the farm stand', es: 'Vende 5 cultivos en el puesto de la granja', pt: 'Venda 5 plantações na barraca da fazenda' },
}
