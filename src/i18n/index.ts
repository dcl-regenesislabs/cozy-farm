import { Entity, PointerEvents } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import type { Lang, TranslationDictionary, TranslationParams, TranslationValue } from './types'
import { SUPPORTED_LANGUAGES } from './types'

import { commonDict } from './dictionaries/common'
import { languageDict } from './dictionaries/language'
import { loadingDict } from './dictionaries/loading'
import { hudDict } from './dictionaries/hud'
import { shopDict } from './dictionaries/shop'
import { inventoryDict } from './dictionaries/inventory'
import { sellDict } from './dictionaries/sell'
import { farmDict } from './dictionaries/farm'
import { questDict } from './dictionaries/quest'
import { statsDict } from './dictionaries/stats'
import { plantDict } from './dictionaries/plant'
import { fertilizeDict } from './dictionaries/fertilize'
import { farmerDict } from './dictionaries/farmer'
import { jukeboxDict } from './dictionaries/jukebox'
import { mailboxDict } from './dictionaries/mailbox'
import { compostDict } from './dictionaries/compost'
import { leaderboardDict } from './dictionaries/leaderboard'
import { unlockDict } from './dictionaries/unlock'
import { animalsDict } from './dictionaries/animals'
import { npcDict } from './dictionaries/npc'
import { questsDict } from './dictionaries/quests'
import { tutorialDict } from './dictionaries/tutorial'
import { animalTutorialDict } from './dictionaries/animalTutorial'
import { progressionEventsDict } from './dictionaries/progressionEvents'
import { dataDict } from './dictionaries/data'

export type { Lang, TranslationParams } from './types'
export { SUPPORTED_LANGUAGES } from './types'

// ─── Merge every domain dictionary into one flat lookup table ──────────────
// New domains: add the file under ./dictionaries, import it, and list it here.
const ALL_DICTIONARIES: TranslationDictionary[] = [
  commonDict, languageDict, loadingDict, hudDict,
  shopDict, inventoryDict, sellDict, farmDict, questDict, statsDict,
  plantDict, fertilizeDict, farmerDict, jukeboxDict, mailboxDict,
  compostDict, leaderboardDict, unlockDict, animalsDict,
  npcDict, questsDict, tutorialDict, animalTutorialDict, progressionEventsDict,
  dataDict,
]

const TRANSLATIONS: TranslationDictionary = {}
for (const dict of ALL_DICTIONARIES) {
  for (const key in dict) {
    if (TRANSLATIONS[key]) {
      console.log(`[i18n] Duplicate translation key defined in multiple dictionaries: "${key}"`)
    }
    TRANSLATIONS[key] = dict[key]
  }
}

// ─── Current language — single source of truth is playerState.preferredLanguage ─
// ('' means "no language chosen yet", used to gate the first-run picker)

export function getLanguage(): Lang {
  const stored = playerState.preferredLanguage
  return stored === '' ? 'en' : stored
}

export function setLanguage(lang: Lang): void {
  playerState.preferredLanguage = lang
}

export function isSupportedLanguage(value: string): value is Lang {
  return (SUPPORTED_LANGUAGES as string[]).includes(value)
}

// ─── Lookup + interpolation ──────────────────────────────────────────────────

function interpolate(raw: string, params?: TranslationParams): string {
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (match, token: string) => (token in params ? String(params[token]) : match))
}

function resolveValue(key: string, lang: Lang): TranslationValue | null {
  const entry = TRANSLATIONS[key]
  if (!entry) return null
  return entry[lang] ?? entry.en ?? null
}

/**
 * Resolve a translation key to a string in the current (or overridden) language.
 * Falls back to English, then to the raw key — never returns undefined or throws.
 * Supports {token} interpolation via `params`, and singular/plural selection when
 * the dictionary entry is a { one, other } pair and `params.count` is provided.
 */
export function t(key: string, params?: TranslationParams, langOverride?: Lang): string {
  const lang = langOverride ?? getLanguage()
  const value = resolveValue(key, lang)

  if (value === null) {
    console.log(`[i18n] Missing translation key: "${key}"`)
    return key
  }

  if (Array.isArray(value)) {
    console.log(`[i18n] t() called on a list key "${key}" — use tList() instead`)
    return interpolate(value[0] ?? key, params)
  }

  if (typeof value === 'string') {
    return interpolate(value, params)
  }

  // PluralEntry: { one, other }
  const count = params?.count
  const raw = count === 1 ? value.one : value.other
  return interpolate(raw, params)
}

/**
 * Resolve a translation key that holds a multi-page string sequence
 * (e.g. tutorial/NPC dialogs shown one page at a time). Falls back to a
 * single-element array so callers can always safely index into the result.
 */
export function tList(key: string, langOverride?: Lang): string[] {
  const lang = langOverride ?? getLanguage()
  const value = resolveValue(key, lang)

  if (value === null) {
    console.log(`[i18n] Missing translation key: "${key}"`)
    return [key]
  }

  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]

  // PluralEntry used where a list was expected — degrade gracefully.
  return [value.other]
}

// ─── Localized hover text for native pointerEventsSystem interactions ───────
// Unlike react-ecs Labels (which re-read playerState every frame for free),
// PointerEvents.hoverText is baked into the ECS component once at registration
// time — usually before the player's language is even known (world objects are
// wired up during synchronous scene setup, well before the async save/load
// finishes). This registry lets those hover prompts be re-applied once the
// language becomes known, via refreshAllHoverTexts() — called once after a
// returning player's saved language loads, and once after a first-run player
// confirms a language in the picker. See index.ts and LanguageSelectOverlay.tsx.
type HoverTextEntry = { entity: Entity; key: string; params?: TranslationParams }
const hoverTextRegistry: HoverTextEntry[] = []

function applyHoverText(entity: Entity, key: string, params?: TranslationParams): void {
  const pe = PointerEvents.getMutableOrNull(entity)
  if (!pe) return
  for (const entry of pe.pointerEvents) {
    if (entry.eventInfo) entry.eventInfo.hoverText = t(key, params)
  }
}

/** Register a world entity's PointerEvents hoverText for translation. Call once, right after
 *  pointerEventsSystem.onPointerDown(...) registers the entity (pass the same key used for the
 *  initial `hoverText: t(key)` value so refreshes stay in sync). */
export function registerHoverText(entity: Entity, key: string, params?: TranslationParams): void {
  hoverTextRegistry.push({ entity, key, params })
  applyHoverText(entity, key, params)
}

/** Re-resolve every registered hover text in the current language. */
export function refreshAllHoverTexts(): void {
  for (const entry of hoverTextRegistry) applyHoverText(entry.entity, entry.key, entry.params)
}
