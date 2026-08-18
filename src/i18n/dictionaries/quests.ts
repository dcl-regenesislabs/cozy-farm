import type { TranslationDictionary } from '../types'

// Quest titles/descriptions (src/data/questData.ts). QUEST_DEFINITIONS stores
// these translation keys directly in its `title`/`description` fields —
// consumers call t(quest.title) / t(quest.description) at render time.
export const questsDict: TranslationDictionary = {
  'quest.rosa.title':       { en: 'Harvest 5 Onions', es: 'Cosecha 5 cebollas', pt: 'Colha 5 cebolas' },
  'quest.rosa.description': { en: "Could you harvest 5 onions for me, dear?\nI'm making a big pot of soup and I'll make it worth your while!", es: '¿Podrías cosechar 5 cebollas para mí, querido?\n¡Estoy preparando una gran olla de sopa y valdrá la pena!', pt: 'Você poderia colher 5 cebolas para mim, querido?\nEstou fazendo uma grande panela de sopa e vai valer a pena!' },

  'quest.gerald.title':       { en: 'Water crops 10 times', es: 'Riega cultivos 10 veces', pt: 'Regue plantações 10 vezes' },
  'quest.gerald.description': { en: "Hmph.\nIf you can water your crops 10 times without making a mess, I'll admit you know what you're doing.", es: 'Hmph.\nSi puedes regar tus cultivos 10 veces sin hacer un desastre, admitiré que sabes lo que haces.', pt: 'Hmph.\nSe você conseguir regar suas plantações 10 vezes sem fazer bagunça, admito que sabe o que está fazendo.' },

  'quest.marco.title':       { en: 'Harvest 10 crops total', es: 'Cosecha 10 cultivos en total', pt: 'Colha 10 plantações no total' },
  'quest.marco.description': { en: "Let's see if you can match my output. Harvest 10 crops — any kind.\nShouldn't take long... for me at least.", es: 'Veamos si puedes igualar mi producción. Cosecha 10 cultivos — de cualquier tipo.\nNo debería tardar mucho... para mí, al menos.', pt: 'Vamos ver se você consegue chegar perto da minha produção. Colha 10 plantações — de qualquer tipo.\nNão deve demorar muito... pra mim, pelo menos.' },

  'quest.lily.title':       { en: 'Harvest 3 Tomatoes', es: 'Cosecha 3 tomates', pt: 'Colha 3 tomates' },
  'quest.lily.description': { en: "I need fresh tomatoes for tonight's restaurant special. Can you bring me 3? I'll pay generously!", es: 'Necesito tomates frescos para el especial de esta noche en el restaurante. ¿Puedes traerme 3? ¡Pagaré generosamente!', pt: 'Preciso de tomates frescos para o prato especial de hoje no restaurante. Pode me trazer 3? Vou pagar bem!' },

  'quest.dave.title':       { en: 'Plant 8 seeds', es: 'Planta 8 semillas', pt: 'Plante 8 sementes' },
  'quest.dave.description': { en: "You know what would cheer me up after the whole cellar flood situation? Watching you plant 8 seeds.\nGo on, it'll be great.", es: '¿Sabes qué me alegraría después de todo el lío de la inundación del sótano? Verte plantar 8 semillas.\nAdelante, será genial.', pt: 'Sabe o que ia me animar depois de toda essa história da inundação do porão? Ver você plantar 8 sementes.\nVai lá, vai ser ótimo.' },

  'quest.mayorchen.title':       { en: 'Sell 5 crops', es: 'Vende 5 cultivos', pt: 'Venda 5 plantações' },
  'quest.mayorchen.description': { en: 'The town market needs your active participation.\nSell 5 crops to prove your commitment to our local economy.', es: 'El mercado del pueblo necesita tu participación activa.\nVende 5 cultivos para demostrar tu compromiso con nuestra economía local.', pt: 'O mercado da cidade precisa da sua participação ativa.\nVenda 5 plantações para provar seu compromisso com nossa economia local.' },

  'quest.mayorchen_farmer.title':       { en: 'Sell 50 crops', es: 'Vende 50 cultivos', pt: 'Venda 50 plantações' },
  'quest.mayorchen_farmer.description': { en: "I've been reviewing the town's expansion plans. If you can sell 50 crops to the market, I'll authorize the new farming zone adjacent to your land. The town council is counting on you!", es: 'He estado revisando los planes de expansión del pueblo. Si logras vender 50 cultivos en el mercado, autorizaré la nueva zona agrícola junto a tu terreno. ¡El concejo cuenta contigo!', pt: 'Tenho revisado os planos de expansão da cidade. Se você conseguir vender 50 plantações no mercado, vou autorizar a nova zona agrícola ao lado do seu terreno. O conselho está contando com você!' },

  'quest.mayorchen_fertilizer.title':       { en: 'Generate 5 Fertilizers', es: 'Genera 5 fertilizantes', pt: 'Gere 5 fertilizantes' },
  'quest.mayorchen_fertilizer.description': { en: 'Practice makes perfect! Add organic waste to your compost bin and collect 5 fertilizers. Your crops will thank you!', es: '¡La práctica hace al maestro! Agrega residuos orgánicos a tu compostera y recolecta 5 fertilizantes. ¡Tus cultivos te lo agradecerán!', pt: 'A prática leva à perfeição! Adicione resíduos orgânicos à sua composteira e colete 5 fertilizantes. Suas plantações vão agradecer!' },
}
