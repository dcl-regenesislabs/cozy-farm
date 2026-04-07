import { CropType } from './cropData'

export const SOIL_MODEL = 'assets/scene/Models/Soil01/Soil01.glb'

/** Maps each CropType to its 3 growth stage GLB paths [stage1, stage2, stage3] */
export const CROP_MODELS: Record<CropType, [string, string, string]> = {
  [CropType.Onion]: [
    'assets/scene/Models/OnionSprout01/OnionSprout01.glb',
    'assets/scene/Models/OnionSprout02/OnionSprout02.glb',
    'assets/scene/Models/OnionSprout03/OnionSprout03.glb',
  ],
  [CropType.Potato]: [
    'assets/scene/Models/PotatoSprout01/PotatoSprout01.glb',
    'assets/scene/Models/PotatoSprout02/PotatoSprout02.glb',
    'assets/scene/Models/PotatoSprout03/PotatoSprout03.glb',
  ],
  [CropType.Garlic]: [
    'assets/scene/Models/GarlicSprout01/GarlicSprout01.glb',
    'assets/scene/Models/GarlicSprout02/GarlicSprout02.glb',
    'assets/scene/Models/GarlicSprout03/GarlicSprout03.glb',
  ],
  [CropType.Tomato]: [
    'assets/scene/Models/TomatoSprout01/TomatoSprout01.glb',
    'assets/scene/Models/TomatoSprout02/TomatoSprout02.glb',
    'assets/scene/Models/TomatoSprout03/TomatoSprout03.glb',
  ],
  [CropType.Carrot]: [
    'assets/scene/Models/CarrotSprout01/CarrotSprout01.glb',
    'assets/scene/Models/CarrotSprout02/CarrotSprout02.glb',
    'assets/scene/Models/CarrotSprout03/CarrotSprout03.glb',
  ],
  [CropType.Corn]: [
    'assets/scene/Models/CornSprout01/CornSprout01.glb',
    'assets/scene/Models/CornSprout02/CornSprout02.glb',
    'assets/scene/Models/CornSprout03/CornSprout03.glb',
  ],
  [CropType.Lavender]: [
    'assets/scene/Models/LavenderSprout01/LavenderSprout01.glb',
    'assets/scene/Models/LavenderSprout02/LavenderSprout02.glb',
    'assets/scene/Models/LavenderSprout03/LavenderSprout03.glb',
  ],
  [CropType.Pumpkin]: [
    'assets/scene/Models/PumpkinSprout01/PumpkinSprout01.glb',
    'assets/scene/Models/PumpkinSprout02/PumpkinSprout02.glb',
    'assets/scene/Models/PumpkinSprout03/PumpkinSprout03.glb',
  ],
  [CropType.Sunflower]: [
    'assets/scene/Models/SunflowerSprout01/SunflowerSprout01.glb',
    'assets/scene/Models/SunflowerSprout02/SunflowerSprout02.glb',
    'assets/scene/Models/SunflowerSprout03/SunflowerSprout03.glb',
  ],
}
