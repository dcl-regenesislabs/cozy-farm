import { AssetLoad, engine } from '@dcl/sdk/ecs'
import { UI_PRELOAD_ASSETS } from '../data/uiPreloadAssets'

export function preloadUiAssets() {
  AssetLoad.create(engine.addEntity(), { assets: UI_PRELOAD_ASSETS })
}
