import { CropType } from './cropData'

export type LevelRewardType = 'seeds' | 'coins' | 'unlock_crop'

export interface LevelReward {
  level:    number
  type:     LevelRewardType
  cropType: CropType | null  // only for 'seeds' rewards
  amount:   number
  label:    string   // i18n key — resolve with t() at render time
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2,  type: 'seeds', cropType: CropType.Onion,     amount: 5,    label: 'data.levelReward.level2'  },
  { level: 3,  type: 'seeds', cropType: CropType.Potato,    amount: 5,    label: 'data.levelReward.level3'  },
  { level: 5,  type: 'seeds', cropType: CropType.Tomato,    amount: 3,    label: 'data.levelReward.level5'  },
  { level: 7,  type: 'seeds', cropType: CropType.Carrot,    amount: 3,    label: 'data.levelReward.level7'  },
  { level: 10, type: 'coins', cropType: null,                amount: 500,  label: 'data.levelReward.level10' },
  { level: 12, type: 'seeds', cropType: CropType.Corn,      amount: 5,    label: 'data.levelReward.level12' },
  { level: 15, type: 'seeds', cropType: CropType.Lavender,  amount: 3,    label: 'data.levelReward.level15' },
  { level: 18, type: 'coins', cropType: null,                amount: 1000, label: 'data.levelReward.level18' },
  { level: 20, type: 'seeds', cropType: CropType.Pumpkin,   amount: 3,    label: 'data.levelReward.level20' },
  { level: 25, type: 'seeds', cropType: CropType.Sunflower, amount: 3,    label: 'data.levelReward.level25' },
]
