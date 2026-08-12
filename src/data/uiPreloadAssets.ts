import {
  CROP_SEED_IMAGES,
  CROP_HARVEST_IMAGES,
  FERTILIZER_ICON_SRCS,
  COINS_IMAGE,
  DOG01_ICON,
  CHICKEN_ICON,
  EGG_ICON,
  GRAIN_ICON,
  PIG_ICON,
  MANURE_ICON,
  VEGGIE_SCRAP_ICON,
  BTN_INVENTORY,
  BTN_FARM,
  BTN_QUESTS,
  BTN_PROFILE,
  SOIL_ICON,
  ORGANIC_WASTE_ICON,
  WATERINGCAN_ICON,
  WATER_ICON,
  WATER_DRY_ICON,
  HAND_ICON,
  SHOPINGCART_ICON,
  COINS_ICON,
  DIALOG_ICON,
  BOX_CROPS_ICON,
  EXCLAMATION_ICON,
  QUESTION_ICON,
  QUESTION_DONE_ICON,
} from './imagePaths'
import { NPC_ROSTER } from './npcData'

// Revamp UI chrome — declared locally because the panels that use them
// (Shop/Farm/Inventory/Sell/Plant/Fertilize/Mailbox/Feed/AnimalPanel/...)
// each redeclare the same literal instead of sharing one constant.
const CARD_IMG                = 'assets/images/revamp/card.png'
const CARD_LOCKED_IMG         = 'assets/images/revamp/lockedlevel.png'
const TAB_SELECTED_IMG        = 'assets/images/revamp/selected.png'
const TAB_IDLE_IMG            = 'assets/images/revamp/notselected.png'
const MINI_BUTTON_IMG         = 'assets/images/revamp/mini-button.png'
const MINI_BUTTON_NO_COIN_IMG = 'assets/images/revamp/mini-button-no-coin.png'
const MINI_BUTTON_NOCOINS_IMG = 'assets/images/revamp/mini-button-not-coins.png'
const BUTTON_NOTLEVEL_IMG     = 'assets/images/revamp/button-not-level.png'
const BTN_PRIMARY_IMG         = 'assets/images/revamp/Type=Primary, State=Focused.png'
const BTN_SECONDARY_IMG       = 'assets/images/revamp/Type=Secondary, State=Default.png'
const REVAMP_BG_IMG           = 'assets/images/revamp/background.png'
// Per-language title atlas — see REVAMP_NAMES_IMG_BY_LANG in RevampPanel.tsx.
// es/pt point at files that don't exist yet (placeholders for the user's export).
const REVAMP_NAMES_IMG        = 'assets/images/revamp/names.png'
const REVAMP_NAMES_IMG_ES     = 'assets/images/revamp/names_es.png'
const REVAMP_NAMES_IMG_PT     = 'assets/images/revamp/names_pt.png'
const REVAMP_CLOSE_IMG        = 'assets/images/ui_loading/closebutton.png'
const NPC_DIALOG_BG           = 'assets/images/ui_loading/npc_dialog_background.png'
const HUD_ATLAS               = 'assets/images/ui_loading/profile_atlas.png'
const ENVELOPE_ICON           = 'assets/images/envelope.png'

// Language Selection screen (src/ui/LanguageSelectOverlay.tsx) — placeholders
// for the user's flag exports, same "wire the path, drop the file in later" pattern.
const FLAG_EN_IMG = 'assets/images/ui_language/flag_en.png'
const FLAG_ES_IMG = 'assets/images/ui_language/flag_es.png'
const FLAG_PT_IMG = 'assets/images/ui_language/flag_pt.png'

/** Every static texture used by a UI panel (shop, jukebox chrome, dialogs, HUD, etc.), preloaded via AssetLoad so panels don't pop-in on first open. */
export const UI_PRELOAD_ASSETS: string[] = Array.from(new Set([
  ...Object.values(CROP_SEED_IMAGES),
  ...Object.values(CROP_HARVEST_IMAGES),
  ...Object.values(FERTILIZER_ICON_SRCS),
  ...NPC_ROSTER.map((npc) => npc.headImage),
  COINS_IMAGE, DOG01_ICON, CHICKEN_ICON, EGG_ICON, GRAIN_ICON, PIG_ICON, MANURE_ICON, VEGGIE_SCRAP_ICON,
  BTN_INVENTORY, BTN_FARM, BTN_QUESTS, BTN_PROFILE,
  SOIL_ICON, ORGANIC_WASTE_ICON, WATERINGCAN_ICON, WATER_ICON, WATER_DRY_ICON, HAND_ICON,
  SHOPINGCART_ICON, COINS_ICON, DIALOG_ICON, BOX_CROPS_ICON,
  EXCLAMATION_ICON, QUESTION_ICON, QUESTION_DONE_ICON,
  CARD_IMG, CARD_LOCKED_IMG, TAB_SELECTED_IMG, TAB_IDLE_IMG,
  MINI_BUTTON_IMG, MINI_BUTTON_NO_COIN_IMG, MINI_BUTTON_NOCOINS_IMG, BUTTON_NOTLEVEL_IMG,
  BTN_PRIMARY_IMG, BTN_SECONDARY_IMG,
  REVAMP_BG_IMG, REVAMP_NAMES_IMG, REVAMP_NAMES_IMG_ES, REVAMP_NAMES_IMG_PT, REVAMP_CLOSE_IMG,
  NPC_DIALOG_BG, HUD_ATLAS, ENVELOPE_ICON,
  FLAG_EN_IMG, FLAG_ES_IMG, FLAG_PT_IMG,
]))
