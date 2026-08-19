import type { TranslationDictionary } from '../types'

// Level-5 "rot & compost" onboarding arc (src/systems/progressionEventsSystem.ts,
// src/game/progressionEventState.ts).
export const progressionEventsDict: TranslationDictionary = {
  'progression.buyCompostBin.pages': {
    en: [
      "Wow, you've been busy! Looks like your farm has really grown since we last spoke!",
      'Now that you\'re levelling up, crops will start to rot if left unharvested too long.\n\nLet me help you deal with that.',
      'Head to the shop and buy a Compost Bin — it turns rotten crops into powerful fertilizers!',
    ],
    es: [
      '¡Vaya, has estado ocupado! Parece que tu granja ha crecido mucho desde la última vez que hablamos.',
      'Ahora que estás subiendo de nivel, los cultivos comenzarán a pudrirse si los dejas sin cosechar demasiado tiempo.\n\nDéjame ayudarte con eso.',
      'Ve a la tienda y compra una Compostera — ¡convierte los cultivos podridos en poderosos fertilizantes!',
    ],
    pt: [
      'Uau, você tem estado ocupado! Parece que sua fazenda cresceu bastante desde a última vez que conversamos.',
      'Agora que você está subindo de nível, as plantações vão começar a apodrecer se ficarem sem colher por muito tempo.\n\nDeixa eu te ajudar com isso.',
      'Vá até a loja e compre uma Composteira — ela transforma plantações podres em fertilizantes poderosos!',
    ],
  },
  'progression.buyCompostBin.button': { en: "Let's go!", es: '¡Vamos!', pt: 'Vamos lá!' },

  'progression.wasteStep.pages': {
    en: ["Great, you bought the Compost Bin! I've added 3 organic waste to your inventory...", "Open the compost bin and add all 3 units — I've set it to process quickly so you can see how it works!"],
    es: ['¡Genial, compraste la Compostera! Agregué 3 residuos orgánicos a tu inventario...', 'Abre la compostera y agrega las 3 unidades — la configuré para que procese rápido y así veas cómo funciona.'],
    pt: ['Ótimo, você comprou a Composteira! Adicionei 3 resíduos orgânicos ao seu inventário...', 'Abra a composteira e adicione as 3 unidades — configurei para processar rápido, assim você vê como funciona!'],
  },
  'progression.wasteStep.button': { en: 'Got it!', es: '¡Entendido!', pt: 'Entendi!' },

  'progression.collectStep.text': {
    en: 'The compost bin is processing! Give it a few seconds, then open it and collect your fertilizer.',
    es: '¡La compostera está procesando! Espera unos segundos y luego ábrela para recolectar tu fertilizante.',
    pt: 'A composteira está processando! Espere alguns segundos e depois abra para coletar seu fertilizante.',
  },
  'progression.collectStep.button': { en: "I'm watching!", es: '¡Estoy atento!', pt: 'Estou de olho!' },

  'progression.fertilizeStep.text': {
    en: "Excellent! Now let me show you how to use fertilizer.\n\nPlant a seed in any soil plot — I'll wait here.",
    es: 'Excelente! Ahora déjame mostrarte cómo usar el fertilizante.\n\nPlanta una semilla en cualquier parcela — te espero aquí.',
    pt: 'Excelente! Agora deixa eu te mostrar como usar o fertilizante.\n\nPlante uma semente em qualquer lote — vou esperar aqui.',
  },
  'progression.fertilizeStep.button': { en: 'Planting now!', es: '¡Plantando!', pt: 'Plantando agora!' },

  'progression.waterStep.text': {
    en: 'Nice planting! Now water it — the fertilizer menu opens automatically after you water.',
    es: '¡Buena siembra! Ahora riégala — el menú de fertilizantes se abre automáticamente después de regar.',
    pt: 'Boa plantada! Agora regue — o menu de fertilizantes abre automaticamente depois que você regar.',
  },
  'progression.waterStep.button': { en: 'Watering!', es: '¡Regando!', pt: 'Regando!' },

  'progression.applyFertilizerStep.text': {
    en: 'Perfect! Now apply a fertilizer to this crop — tap the plot to open the fertilizer menu.',
    es: '¡Perfecto! Ahora aplica un fertilizante a este cultivo — toca la parcela para abrir el menú de fertilizantes.',
    pt: 'Perfeito! Agora aplique um fertilizante nesta plantação — toque no lote para abrir o menu de fertilizantes.',
  },
  'progression.applyFertilizerStep.button': { en: 'Fertilizing!', es: '¡Fertilizando!', pt: 'Fertilizando!' },

  'progression.complete.pages': {
    en: [
      'Incredible work! Your farm is really coming together.',
      'Remember — crops will rot if left too long after harvest.\nUse RotShield fertilizer to prevent it, or just stay on top of your harvests.',
      "I've left you with a challenge: generate 5 more fertilizers. Come find me when you're done and I'll make it worth your while!",
    ],
    es: [
      '¡Trabajo increíble! Tu granja está tomando forma de verdad.',
      'Recuerda — los cultivos se pudren si los dejas demasiado tiempo después de estar listos.\nUsa el fertilizante Escudo Antipodredumbre para evitarlo, o simplemente mantente al día con tus cosechas.',
      'Te dejo un desafío: genera 5 fertilizantes más. Ven a buscarme cuando termines y valdrá la pena.',
    ],
    pt: [
      'Trabalho incrível! Sua fazenda está realmente tomando forma.',
      'Lembre-se — as plantações apodrecem se ficarem muito tempo depois de prontas.\nUse o fertilizante Escudo Anti-Podridão para evitar isso, ou apenas mantenha suas colheitas em dia.',
      'Deixei um desafio para você: gere mais 5 fertilizantes. Venha me procurar quando terminar e vai valer a pena!',
    ],
  },
  'progression.complete.button': { en: 'Thanks, Mayor!', es: '¡Gracias, Alcalde!', pt: 'Obrigado, Prefeito!' },

  // Re-shown when the player clicks Mayor mid-event
  'progression.mayorClick.rotIntro':      { en: 'Head to the shop (the computer) and buy the Compost Bin for 300 coins!', es: 'Ve a la tienda (el ordenador) y compra la Compostera por 300 monedas.', pt: 'Vá até a loja (o computador) e compre a Composteira por 300 moedas!' },
  'progression.mayorClick.compostQuest':  { en: "Open the compost bin and add all 3 organic waste units. I've put them in your inventory!", es: 'Abre la compostera y agrega las 3 unidades de residuo orgánico. ¡Las puse en tu inventario!', pt: 'Abra a composteira e adicione as 3 unidades de resíduo orgânico. Coloquei elas no seu inventário!' },
  'progression.mayorClick.wasteQuest':    { en: "The bin is working — open it and collect your fertilizer once it's ready!", es: 'La compostera está funcionando — ábrela y recolecta tu fertilizante cuando esté listo.', pt: 'A composteira está funcionando — abra e colete seu fertilizante quando estiver pronto!' },
  'progression.mayorClick.collectQuest':  { en: "Plant a seed, water it, then apply a fertilizer. I'm waiting right here!", es: 'Planta una semilla, riégala y luego aplícale un fertilizante. ¡Te espero aquí mismo!', pt: 'Plante uma semente, regue e depois aplique um fertilizante. Estou esperando bem aqui!' },
  'progression.mayorClick.gotItButton':   { en: 'Got it!', es: '¡Entendido!', pt: 'Entendi!' },
  'progression.mayorClick.onItButton':    { en: 'On it!', es: '¡Voy!', pt: 'Pode deixar!' },

  // Milestone checklist shown in the Quest panel
  'progression.milestone.buyCompostBin': { en: 'Buy the Compost Bin', es: 'Compra la compostera', pt: 'Compre a composteira' },
  'progression.milestone.addWaste':      { en: 'Add organic waste to bin', es: 'Agrega residuos orgánicos a la compostera', pt: 'Adicione resíduos orgânicos à composteira' },
  'progression.milestone.collect':       { en: 'Collect fertilizer', es: 'Recolecta fertilizante', pt: 'Colete fertilizante' },
  'progression.milestone.plantWaterFertilize': { en: 'Plant, water & fertilize', es: 'Planta, riega y fertiliza', pt: 'Plante, regue e fertilize' },
}
