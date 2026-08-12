import type { TranslationDictionary } from '../types'

// Chicken/Pig onboarding arcs (src/systems/animalTutorialSystem.ts,
// src/game/animalTutorialState.ts).
export const animalTutorialDict: TranslationDictionary = {
  // ── Chicken ────────────────────────────────────────────────────────────────
  'animalTutorial.chickenBuyCoop.pages': {
    en: ["Congratulations on reaching Level 8! You've unlocked the Chicken Coop!...", 'Head over to the coop plot and buy it — chickens will provide eggs and keep your farm buzzing with life!'],
    es: ['¡Felicidades por llegar al Nivel 8! ¡Has desbloqueado el Gallinero!...', 'Ve hasta la parcela del gallinero y cómpralo — ¡las gallinas te darán huevos y le darán vida a tu granja!'],
    pt: ['Parabéns por chegar ao Nível 8! Você desbloqueou o Galinheiro!...', 'Vá até o lote do galinheiro e compre — as galinhas vão te dar ovos e trazer mais vida para sua fazenda!'],
  },
  'animalTutorial.chickenBuyCoop.button': { en: "Let's go!", es: '¡Vamos!', pt: 'Vamos lá!' },

  'animalTutorial.chickenBuyChicken.text': {
    en: 'Excellent! The coop is built!\n\nNow head to the shop and buy your first chicken. You can have up to 5 chickens in one coop!',
    es: '¡Excelente! ¡El gallinero está construido!\n\nAhora ve a la tienda y compra tu primera gallina. ¡Puedes tener hasta 5 gallinas en un gallinero!',
    pt: 'Excelente! O galinheiro está construído!\n\nAgora vá até a loja e compre sua primeira galinha. Você pode ter até 5 galinhas em um galinheiro!',
  },
  'animalTutorial.chickenBuyChicken.button': { en: 'To the shop!', es: '¡A la tienda!', pt: 'Para a loja!' },

  'animalTutorial.chickenFeed.pages': {
    en: ["Welcome to the flock! Your chickens need grain to produce eggs — they lay 1-2 eggs every 6 hours while there's food in the bowl...", 'Fill up the food bowl to get them started!'],
    es: ['¡Bienvenido a la parvada! Tus gallinas necesitan grano para producir huevos — ponen entre 1 y 2 huevos cada 6 horas mientras haya comida en el comedero...', '¡Llena el comedero para que empiecen!'],
    pt: ['Bem-vindo ao bando! Suas galinhas precisam de grãos para produzir ovos — elas põem de 1 a 2 ovos a cada 6 horas enquanto houver comida no comedouro...', 'Encha o comedouro para elas começarem!'],
  },
  'animalTutorial.chickenFeed.button': { en: 'Fill the bowl!', es: '¡Llena el comedero!', pt: 'Encher o comedouro!' },

  'animalTutorial.chickenCleanIntro.pages': {
    en: ['Great! The chickens are eating!', 'One more thing — the coop gets dirty every 12 hours.\n\nWhen you see dirt appear, click it to clean up.', "You'll earn organic waste for your compost bin as a bonus!\n\nEnjoy your new flock!"],
    es: ['¡Genial! ¡Las gallinas están comiendo!', 'Una cosa más — el gallinero se ensucia cada 12 horas.\n\nCuando veas que aparece suciedad, haz clic para limpiarlo.', '¡Como bono, ganarás residuos orgánicos para tu compostera!\n\n¡Disfruta tu nueva parvada!'],
    pt: ['Ótimo! As galinhas estão comendo!', 'Mais uma coisa — o galinheiro fica sujo a cada 12 horas.\n\nQuando aparecer sujeira, clique para limpar.', 'Como bônus, você vai ganhar resíduos orgânicos para sua composteira!\n\nAproveite seu novo bando!'],
  },
  'animalTutorial.chickenCleanIntro.button': { en: 'Thanks, Mayor!', es: '¡Gracias, Alcalde!', pt: 'Obrigado, Prefeito!' },

  'animalTutorial.chickenMayorClick.buyCoop':    { en: 'Head to the coop plot and tap to buy the Chicken Coop!', es: 'Ve a la parcela del gallinero y toca para comprar el Gallinero.', pt: 'Vá até o lote do galinheiro e toque para comprar o Galinheiro.' },
  'animalTutorial.chickenMayorClick.buyChicken': { en: 'Open the shop (the computer) and buy your first chicken!', es: 'Abre la tienda (la computadora) y compra tu primera gallina.', pt: 'Abra a loja (o computador) e compre sua primeira galinha!' },
  'animalTutorial.chickenMayorClick.feedChicken': { en: 'Tap the food bowl near the coop to deposit grain for your chickens!', es: 'Toca el comedero cerca del gallinero para depositar grano para tus gallinas.', pt: 'Toque no comedouro perto do galinheiro para depositar grãos para suas galinhas!' },
  'animalTutorial.chickenMayorClick.gotItButton': { en: 'Got it!', es: '¡Entendido!', pt: 'Entendi!' },
  'animalTutorial.chickenMayorClick.onItButton':  { en: 'On it!', es: '¡Voy!', pt: 'Pode deixar!' },

  'animalTutorial.chickenMilestone.buildCoop':  { en: 'Build the Chicken Coop', es: 'Construye el Gallinero', pt: 'Construa o Galinheiro' },
  'animalTutorial.chickenMilestone.buyChicken': { en: 'Buy your first chicken', es: 'Compra tu primera gallina', pt: 'Compre sua primeira galinha' },
  'animalTutorial.chickenMilestone.fillBowl':   { en: 'Fill the food bowl', es: 'Llena el comedero', pt: 'Encha o comedouro' },
  'animalTutorial.chickenMilestone.cleaning':   { en: 'Learn about cleaning', es: 'Aprende sobre la limpieza', pt: 'Aprenda sobre a limpeza' },

  // ── Pig ────────────────────────────────────────────────────────────────────
  'animalTutorial.pigBuyPen.pages': {
    en: ["Level 12 — you've truly become a seasoned farmer! You've unlocked the Pig Pen!...", 'Head over to the pig pen plot and buy it. Pigs are a rewarding long-term investment!'],
    es: ['¡Nivel 12 — te has convertido en un verdadero granjero experto! ¡Has desbloqueado el Chiquero!...', 'Ve hasta la parcela del chiquero y cómpralo. ¡Los cerdos son una inversión a largo plazo que vale la pena!'],
    pt: ['Nível 12 — você realmente se tornou um fazendeiro experiente! Você desbloqueou o Chiqueiro!...', 'Vá até o lote do chiqueiro e compre. Porcos são um investimento de longo prazo que vale muito a pena!'],
  },
  'animalTutorial.pigBuyPen.button': { en: "Let's go!", es: '¡Vamos!', pt: 'Vamos lá!' },

  'animalTutorial.pigBuyPig.pages': {
    en: ['The pen is ready!...', 'Now head to the shop and buy your first pig. You can have up to 5 pigs. They start as adults — the shop sells grown pigs!'],
    es: ['¡El chiquero está listo!...', 'Ahora ve a la tienda y compra tu primer cerdo. Puedes tener hasta 5 cerdos. ¡Comienzan siendo adultos — la tienda vende cerdos ya crecidos!'],
    pt: ['O chiqueiro está pronto!...', 'Agora vá até a loja e compre seu primeiro porco. Você pode ter até 5 porcos. Eles começam adultos — a loja vende porcos já crescidos!'],
  },
  'animalTutorial.pigBuyPig.button': { en: 'To the shop!', es: '¡A la tienda!', pt: 'Para a loja!' },

  'animalTutorial.pigFeed.pages': {
    en: ['There\'s your pig!\n\nPigs eat grain, veggie scraps, and harvested crops...', 'Feeding them harvested crops also raises their feed score — a higher score means bigger pigs and more meat at harvest time. Fill the bowl!'],
    es: ['¡Ahí está tu cerdo!\n\nLos cerdos comen grano, restos de vegetales y cultivos cosechados...', 'Alimentarlos con cultivos cosechados también sube su puntaje de alimentación — un puntaje más alto significa cerdos más grandes y más carne al cosechar. ¡Llena el comedero!'],
    pt: ['Aí está seu porco!\n\nOs porcos comem grãos, restos de vegetais e plantações colhidas...', 'Alimentá-los com plantações colhidas também aumenta a pontuação de alimentação — uma pontuação maior significa porcos maiores e mais carne na hora de colher. Encha o comedouro!'],
  },
  'animalTutorial.pigFeed.button': { en: 'Fill the bowl!', es: '¡Llena el comedero!', pt: 'Encher o comedouro!' },

  'animalTutorial.pigCleanIntro.pages': {
    en: ['Great job! The pigs are eating!', 'Keep the pen clean — dirt appears over time, and clicking it earns you organic waste for your compost bin.', 'Adult pigs also produce manure every 8 hours automatically.'],
    es: ['¡Buen trabajo! ¡Los cerdos están comiendo!', 'Mantén el chiquero limpio — la suciedad aparece con el tiempo, y al hacer clic ganas residuos orgánicos para tu compostera.', 'Los cerdos adultos también producen estiércol automáticamente cada 8 horas.'],
    pt: ['Bom trabalho! Os porcos estão comendo!', 'Mantenha o chiqueiro limpo — a sujeira aparece com o tempo, e clicar nela te dá resíduos orgânicos para sua composteira.', 'Porcos adultos também produzem esterco automaticamente a cada 8 horas.'],
  },
  'animalTutorial.pigCleanIntro.button': { en: 'Good to know!', es: '¡Bueno saberlo!', pt: 'Bom saber!' },

  'animalTutorial.pigGrowthExplained.pages': {
    en: ['Here\'s how pigs grow — shop-bought pigs start as adults.', 'But if you breed them, piglets grow in stages:\n\n• Piglet → Adolescent in 24 hours\n• Adolescent → Adult in 72 hours', 'Feed them well and watch them grow bigger as their feed score rises!'],
    es: ['Así es como crecen los cerdos — los cerdos comprados en la tienda empiezan siendo adultos.', 'Pero si los reproduces, los lechones crecen en etapas:\n\n• Lechón → Adolescente en 24 horas\n• Adolescente → Adulto en 72 horas', 'Aliméntalos bien y obsérvalos crecer más grandes a medida que sube su puntaje de alimentación.'],
    pt: ['É assim que os porcos crescem — os porcos comprados na loja começam adultos.', 'Mas se você os reproduzir, os leitões crescem em etapas:\n\n• Leitão → Adolescente em 24 horas\n• Adolescente → Adulto em 72 horas', 'Alimente-os bem e veja-os crescer conforme a pontuação de alimentação aumenta!'],
  },
  'animalTutorial.pigGrowthExplained.button': { en: 'Fascinating!', es: '¡Fascinante!', pt: 'Fascinante!' },

  'animalTutorial.pigBreedExplained.pages': {
    en: ['Once you have two adult pigs, you can breed them to get a free piglet — no coins needed.', "There's a cooldown between breeds, so plan ahead.", 'Open the animal panel and tap a pig to see breeding options.'],
    es: ['Cuando tengas dos cerdos adultos, puedes reproducirlos para obtener un lechón gratis — sin gastar monedas.', 'Hay un tiempo de espera entre reproducciones, así que planifica con anticipación.', 'Abre el panel de animales y toca un cerdo para ver las opciones de reproducción.'],
    pt: ['Quando você tiver dois porcos adultos, pode reproduzi-los para ganhar um leitão grátis — sem gastar moedas.', 'Há um tempo de espera entre reproduções, então planeje com antecedência.', 'Abra o painel de animais e toque em um porco para ver as opções de reprodução.'],
  },
  'animalTutorial.pigBreedExplained.button': { en: 'Got it!', es: '¡Entendido!', pt: 'Entendi!' },

  'animalTutorial.pigHarvestExplained.text': {
    en: "Last thing — after 7 days as an adult, a pig becomes ready to harvest for pig meat. Meat sells for a very good price!\n\nTap a harvestable pig and choose Harvest Meat. Your remaining pigs will keep living and producing manure. Good luck, farmer!",
    es: 'Última cosa — después de 7 días como adulto, un cerdo estará listo para cosechar su carne. ¡La carne se vende a muy buen precio!\n\nToca un cerdo listo para cosechar y elige Cosechar Carne. Tus demás cerdos seguirán viviendo y produciendo estiércol. ¡Buena suerte, granjero!',
    pt: 'Última coisa — depois de 7 dias como adulto, um porco fica pronto para ser abatido por carne. A carne vende por um ótimo preço!\n\nToque em um porco pronto e escolha Colher Carne. Os demais porcos continuarão vivendo e produzindo esterco. Boa sorte, fazendeiro!',
  },
  'animalTutorial.pigHarvestExplained.button': { en: 'Thanks, Mayor!', es: '¡Gracias, Alcalde!', pt: 'Obrigado, Prefeito!' },

  'animalTutorial.pigMayorClick.buyPen':  { en: 'Head to the pig pen plot and tap to buy the Pig Pen!', es: 'Ve a la parcela del chiquero y toca para comprar el Chiquero.', pt: 'Vá até o lote do chiqueiro e toque para comprar o Chiqueiro.' },
  'animalTutorial.pigMayorClick.buyPig':  { en: 'Open the shop (the computer) and buy your first pig!', es: 'Abre la tienda (la computadora) y compra tu primer cerdo.', pt: 'Abra a loja (o computador) e compre seu primeiro porco!' },
  'animalTutorial.pigMayorClick.feedPig': { en: 'Tap the food bowl near the pig pen to deposit food for your pigs!', es: 'Toca el comedero cerca del chiquero para depositar comida para tus cerdos.', pt: 'Toque no comedouro perto do chiqueiro para depositar comida para seus porcos!' },
  'animalTutorial.pigMayorClick.gotItButton': { en: 'Got it!', es: '¡Entendido!', pt: 'Entendi!' },
  'animalTutorial.pigMayorClick.onItButton':  { en: 'On it!', es: '¡Voy!', pt: 'Pode deixar!' },

  'animalTutorial.pigMilestone.buildPen':      { en: 'Build the Pig Pen', es: 'Construye el Chiquero', pt: 'Construa o Chiqueiro' },
  'animalTutorial.pigMilestone.buyPig':        { en: 'Buy your first pig', es: 'Compra tu primer cerdo', pt: 'Compre seu primeiro porco' },
  'animalTutorial.pigMilestone.fillBowl':      { en: 'Fill the food bowl', es: 'Llena el comedero', pt: 'Encha o comedouro' },
  'animalTutorial.pigMilestone.growthStages':  { en: 'Learn about growth stages', es: 'Aprende sobre las etapas de crecimiento', pt: 'Aprenda sobre os estágios de crescimento' },
  'animalTutorial.pigMilestone.breeding':      { en: 'Learn about breeding', es: 'Aprende sobre la reproducción', pt: 'Aprenda sobre a reprodução' },
  'animalTutorial.pigMilestone.harvestingMeat': { en: 'Learn about harvesting meat', es: 'Aprende sobre cómo cosechar carne', pt: 'Aprenda sobre como colher carne' },
}
