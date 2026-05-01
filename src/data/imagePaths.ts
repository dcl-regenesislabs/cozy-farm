import { CropType } from './cropData'

export const CROP_SEED_IMAGES: Record<CropType, string> = {
  [CropType.Onion]:    'assets/scene/Images/OnionSeeds.png',
  [CropType.Potato]:   'assets/scene/Images/PotatoSeeds.png',
  [CropType.Garlic]:   'assets/scene/Images/GarlicSeeds.png',
  [CropType.Tomato]:   'assets/scene/Images/TomatoSeeds.png',
  [CropType.Carrot]:   'assets/scene/Images/CarrotSeeds.png',
  [CropType.Corn]:     'assets/scene/Images/CornSeeds.png',
  [CropType.Lavender]: 'assets/scene/Images/LavenderSeeds.png',
  [CropType.Pumpkin]:  'assets/scene/Images/PumpkinSeeds.png',
  [CropType.Sunflower]:'assets/scene/Images/SunflowerSeeds.png',
}

export const CROP_HARVEST_IMAGES: Record<CropType, string> = {
  [CropType.Onion]:    'assets/scene/Images/OnionTexture.png',
  [CropType.Potato]:   'assets/scene/Images/PotatoTexture.png',
  [CropType.Garlic]:   'assets/scene/Images/GarlicTexture.png',
  [CropType.Tomato]:   'assets/scene/Images/TomatoTexture.png',
  [CropType.Carrot]:   'assets/scene/Images/CarrotTexture.png',
  [CropType.Corn]:     'assets/scene/Images/CornTexture.png',
  [CropType.Lavender]: 'assets/scene/Images/LavanderTexture.png',  // note: intentional typo in filename
  [CropType.Pumpkin]:  'assets/scene/Images/PumpkinTexture.png',
  [CropType.Sunflower]:'assets/scene/Images/SunflowerTexture.png',
}

export const COINS_IMAGE    = 'assets/scene/Images/Coins.png'
export const DOG01_ICON     = 'assets/scene/Images/Dog01Icon.png'
export const BTN_INVENTORY  = 'assets/scene/Images/InventoryButton.png'
export const BTN_FARM       = 'assets/scene/Images/FarmButton.png'
export const BTN_QUESTS     = 'assets/scene/Images/QuestButton.png'
export const BTN_PROFILE    = 'assets/scene/Images/ProfileButton.png'

// World-space billboard icons
export const SOIL_ICON        = 'assets/scene/Images/SoilIcon.png'
export const ORGANIC_WASTE_ICON = 'assets/scene/Images/OrganicWasteIcon.png'
export const WATERINGCAN_ICON = 'assets/scene/Images/WateringcanIcon.png'
export const WATER_ICON       = 'assets/scene/Images/WaterIcon.png'
export const WATER_DRY_ICON   = 'assets/scene/Images/WaterDryIcon.png'
export const HAND_ICON        = 'assets/scene/Images/HandIcon.png'
export const SHOPINGCART_ICON = 'assets/scene/Images/ShopingcartIcon.png'
export const COINS_ICON       = 'assets/scene/Images/CoinsIcon.png'
export const DIALOG_ICON      = 'assets/scene/Images/DialogIcon.png'
export const BOX_CROPS_ICON   = 'assets/scene/Images/BoxcropsIcon.png'
export const EXCLAMATION_ICON    = 'assets/scene/Images/ExclamationIcon.png'
export const QUESTION_ICON       = 'assets/scene/Images/QuestionIcon.png'
export const QUESTION_DONE_ICON  = 'assets/scene/Images/QuestionDoneIcon.png'

export const FERTILIZER_ICON_SRCS: Record<number, string> = {
  0: 'assets/scene/Images/GrowthBoostFertilizerIcon.png',
  1: 'assets/scene/Images/YieldBoostFertilizerIcon.png',
  2: 'assets/scene/Images/WaterSaverFertilizerIcon.png',
  3: 'assets/scene/Images/RotShieldFertilizerIcon.png',
}
