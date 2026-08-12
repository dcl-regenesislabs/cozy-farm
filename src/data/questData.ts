import { CropType } from './cropData'

export type QuestType = 'harvest_crop' | 'harvest_total' | 'water_total' | 'plant_total' | 'sell_total' | 'collect_fertilizer'

export interface QuestDefinition {
  id:          string       // unique quest id (may differ from npcId for multi-quest NPCs)
  npcId?:      string       // which NPC owns this quest; defaults to id if absent
  npcName:     string
  title:       string       // i18n key — resolve with t() at render time
  description: string       // i18n key — resolve with t() at render time
  type:        QuestType
  cropType:    CropType | null  // null for type-agnostic quests
  target:      number
  rewardCoins: number
  rewardXp:    number
  requiresRotSystem?: boolean             // if true, quest is hidden until rotSystemUnlocked
  prerequisite?: { minLevel?: number }   // quest is skipped until conditions are met
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'rosa', npcName: 'Rosa', title: 'quest.rosa.title',
    description: 'quest.rosa.description',
    type: 'harvest_crop', cropType: CropType.Onion, target: 5,
    rewardCoins: 50, rewardXp: 50,
  },
  {
    id: 'gerald', npcName: 'Gerald', title: 'quest.gerald.title',
    description: 'quest.gerald.description',
    type: 'water_total', cropType: null, target: 10,
    rewardCoins: 40, rewardXp: 50,
    prerequisite: { minLevel: 3 },
  },
  {
    id: 'marco', npcName: 'Marco', title: 'quest.marco.title',
    description: 'quest.marco.description',
    type: 'harvest_total', cropType: null, target: 10,
    rewardCoins: 75, rewardXp: 75,
  },
  {
    id: 'lily', npcName: 'Lily', title: 'quest.lily.title',
    description: 'quest.lily.description',
    type: 'harvest_crop', cropType: CropType.Tomato, target: 3,
    rewardCoins: 100, rewardXp: 75,
    prerequisite: { minLevel: 5 },
  },
  {
    id: 'dave', npcName: 'Dave', title: 'quest.dave.title',
    description: 'quest.dave.description',
    type: 'plant_total', cropType: null, target: 8,
    rewardCoins: 60, rewardXp: 50,
  },
  {
    id: 'mayorchen', npcName: 'Mayor Chen', title: 'quest.mayorchen.title',
    description: 'quest.mayorchen.description',
    type: 'sell_total', cropType: null, target: 5,
    rewardCoins: 200, rewardXp: 100,
  },
  {
    id: 'mayorchen_farmer', npcId: 'mayorchen', npcName: 'Mayor Chen',
    title: 'quest.mayorchen_farmer.title',
    description: 'quest.mayorchen_farmer.description',
    type: 'sell_total', cropType: null, target: 50,
    rewardCoins: 500, rewardXp: 200,
  },
  {
    id: 'mayorchen_fertilizer', npcId: 'mayorchen', npcName: 'Mayor Chen',
    title: 'quest.mayorchen_fertilizer.title',
    description: 'quest.mayorchen_fertilizer.description',
    type: 'collect_fertilizer', cropType: null, target: 5,
    rewardCoins: 150, rewardXp: 100,
    requiresRotSystem: true,
  },
]
