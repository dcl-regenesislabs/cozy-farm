export type PlotGroupUnlockType = 'starter' | 'tutorial' | 'level' | 'buy' | 'buy_with_level' | 'quest'

export interface PlotGroupDefinition {
  groupName:     string
  unlockType:    PlotGroupUnlockType
  requiredLevel: number   // 0 = no level requirement
  coinCost:      number   // 0 = free
  signName:      string | null  // ForSaleSign entity name, null if no sign
  label:         string   // i18n key — resolve with t() at render time
}

// Full table of plot groups — matches scene entity names exactly.
// Order determines the order groups are evaluated on level-up checks.
export const PLOT_GROUP_DEFINITIONS: PlotGroupDefinition[] = [
  // Always-on (managed by tutorial / save restore)
  { groupName: 'PlotGroup_Starter',   unlockType: 'starter',        requiredLevel: 0,  coinCost: 0,    signName: null,            label: 'data.plotGroup.starter' },
  { groupName: 'PlotGroup_TutorialA', unlockType: 'tutorial',       requiredLevel: 0,  coinCost: 0,    signName: null,            label: 'data.plotGroup.tutorial' },

  // Auto-unlocked on level milestone (no cost)
  { groupName: 'PlotGroup_Level_5',   unlockType: 'level',          requiredLevel: 5,  coinCost: 0,    signName: null,            label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Level_10',  unlockType: 'level',          requiredLevel: 10, coinCost: 0,    signName: null,            label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Level_15',  unlockType: 'level',          requiredLevel: 15, coinCost: 0,    signName: null,            label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Level_20',  unlockType: 'level',          requiredLevel: 20, coinCost: 0,    signName: null,            label: 'data.plotGroup.threeNew' },

  // Purchasable after tutorial — no level requirement
  { groupName: 'PlotGroup_Buy_A',     unlockType: 'buy',            requiredLevel: 0,  coinCost: 500,  signName: 'ForSaleSign_A', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_B',     unlockType: 'buy',            requiredLevel: 0,  coinCost: 500,  signName: 'ForSaleSign_B', label: 'data.plotGroup.threeNew' },

  // Purchasable with level gate
  { groupName: 'PlotGroup_Buy_C',     unlockType: 'buy_with_level', requiredLevel: 5,  coinCost: 500,  signName: 'ForSaleSign_C', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_D',     unlockType: 'buy_with_level', requiredLevel: 5,  coinCost: 500,  signName: 'ForSaleSign_D', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_E',     unlockType: 'buy_with_level', requiredLevel: 10, coinCost: 1000, signName: 'ForSaleSign_E', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_F',     unlockType: 'buy_with_level', requiredLevel: 10, coinCost: 1000, signName: 'ForSaleSign_F', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_G',     unlockType: 'buy_with_level', requiredLevel: 15, coinCost: 1500, signName: 'ForSaleSign_G', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_H',     unlockType: 'buy_with_level', requiredLevel: 15, coinCost: 1500, signName: 'ForSaleSign_H', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_I',     unlockType: 'buy_with_level', requiredLevel: 20, coinCost: 2000, signName: 'ForSaleSign_I', label: 'data.plotGroup.threeNew' },
  { groupName: 'PlotGroup_Buy_J',     unlockType: 'buy_with_level', requiredLevel: 20, coinCost: 2000, signName: 'ForSaleSign_J', label: 'data.plotGroup.threeNew' },

  // Quest-gated (farmer zone — unlocked via specific in-game quest)
  { groupName: 'PlotGroup_Farmer',    unlockType: 'quest',          requiredLevel: 0,  coinCost: 0,    signName: null,            label: 'data.plotGroup.farmerZone' },
]

export const BUY_PLOT_GROUPS = PLOT_GROUP_DEFINITIONS.filter(
  (g) => g.unlockType === 'buy' || g.unlockType === 'buy_with_level'
)

export const LEVEL_PLOT_GROUPS = PLOT_GROUP_DEFINITIONS.filter((g) => g.unlockType === 'level')

export function getPlotGroupDef(groupName: string): PlotGroupDefinition | undefined {
  return PLOT_GROUP_DEFINITIONS.find((g) => g.groupName === groupName)
}
