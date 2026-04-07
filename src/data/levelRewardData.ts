import { CropType } from './cropData'

export type LevelRewardType = 'seeds' | 'coins'

export interface LevelReward {
  level:    number
  type:     LevelRewardType
  cropType: CropType | null  // only for 'seeds' rewards
  amount:   number
  label:    string
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2,  type: 'seeds', cropType: CropType.Onion,    amount: 5,    label: '+5 Onion Seeds'    },
  { level: 3,  type: 'seeds', cropType: CropType.Potato,   amount: 5,    label: '+5 Potato Seeds'   },
  { level: 5,  type: 'seeds', cropType: CropType.Tomato,   amount: 3,    label: '+3 Tomato Seeds'   },
  { level: 7,  type: 'seeds', cropType: CropType.Carrot,   amount: 3,    label: '+3 Carrot Seeds'   },
  { level: 10, type: 'coins', cropType: null,               amount: 500,  label: '+500 Coins'        },
  { level: 12, type: 'seeds', cropType: CropType.Corn,     amount: 5,    label: '+5 Corn Seeds'     },
  { level: 15, type: 'seeds', cropType: CropType.Lavender, amount: 3,    label: '+3 Lavender Seeds' },
  { level: 18, type: 'coins', cropType: null,               amount: 1000, label: '+1000 Coins'       },
]
