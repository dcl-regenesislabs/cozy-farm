import type { Lang } from '../i18n'
import { setLanguage, refreshAllHoverTexts } from '../i18n'
import { queueSave } from './saveTriggers'
import { updateBuildingVisuals } from '../systems/animalSystem'
import { applyBeautySlots, getBeautySlots } from '../systems/beautySpotSystem'
import { wirePlotGroupSigns, refreshAllPlotHoverTexts } from '../systems/interactionSetup'

/**
 * Single entry point for confirming a language choice — first-run picker and
 * the in-game HUD switcher both call this. Updates the live language, re-applies
 * every native pointerEventsSystem hover text that isn't covered by the generic
 * registry (building buy-areas, beauty decoration spots, plot-group signs, soil
 * plots), and persists the choice immediately (same "set state, then saveFarm()"
 * pattern used elsewhere for one-off explicit saves).
 */
export function changeLanguage(lang: Lang): void {
  setLanguage(lang)
  refreshAllHoverTexts()
  updateBuildingVisuals()
  applyBeautySlots(getBeautySlots())
  wirePlotGroupSigns()
  refreshAllPlotHoverTexts()
  queueSave()
}
