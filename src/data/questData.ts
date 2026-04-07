import { CropType } from './cropData'

export type QuestType = 'harvest_crop' | 'harvest_total' | 'water_total' | 'plant_total' | 'sell_total'

export interface QuestDefinition {
  id:          string       // matches NpcDefinition.id exactly
  npcName:     string
  title:       string
  description: string
  type:        QuestType
  cropType:    CropType | null  // null for type-agnostic quests
  target:      number
  rewardCoins: number
  rewardXp:    number
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'rosa', npcName: 'Rosa', title: 'Harvest 5 Onions',
    description: "Could you harvest 5 onions for me, dear? I'm making a big pot of soup and I'll make it worth your while!",
    type: 'harvest_crop', cropType: CropType.Onion, target: 5,
    rewardCoins: 50, rewardXp: 50,
  },
  {
    id: 'gerald', npcName: 'Gerald', title: 'Water crops 10 times',
    description: "Hmph. If you can water your crops 10 times without making a mess, I'll admit you know what you're doing.",
    type: 'water_total', cropType: null, target: 10,
    rewardCoins: 40, rewardXp: 50,
  },
  {
    id: 'marco', npcName: 'Marco', title: 'Harvest 10 crops total',
    description: "Let's see if you can match my output. Harvest 10 crops — any kind. Shouldn't take long... for me at least.",
    type: 'harvest_total', cropType: null, target: 10,
    rewardCoins: 75, rewardXp: 75,
  },
  {
    id: 'lily', npcName: 'Lily', title: 'Harvest 3 Tomatoes',
    description: "I need fresh tomatoes for tonight's restaurant special. Can you bring me 3? I'll pay generously!",
    type: 'harvest_crop', cropType: CropType.Tomato, target: 3,
    rewardCoins: 100, rewardXp: 75,
  },
  {
    id: 'dave', npcName: 'Dave', title: 'Plant 8 seeds',
    description: "You know what would cheer me up after the whole cellar flood situation? Watching you plant 8 seeds. Go on, it'll be great.",
    type: 'plant_total', cropType: null, target: 8,
    rewardCoins: 60, rewardXp: 50,
  },
  {
    id: 'mayorchen', npcName: 'Mayor Chen', title: 'Sell 5 crops',
    description: "The town market needs your active participation. Sell 5 crops to prove your commitment to our local economy.",
    type: 'sell_total', cropType: null, target: 5,
    rewardCoins: 200, rewardXp: 100,
  },
]
