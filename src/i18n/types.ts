export type Lang = 'en' | 'es' | 'pt'

export const SUPPORTED_LANGUAGES: Lang[] = ['en', 'es', 'pt']

export type TranslationParams = Record<string, string | number>

// Used for the one count-dependent phrasing case in the game (compost fertilizer count).
// Spanish/Portuguese, like English, only need a singular/plural split for simple counts.
export type PluralEntry = { one: string; other: string }

// A translation value is either:
// - a plain string (the overwhelming majority of keys)
// - a string[] (multi-page tutorial/NPC dialog sequences, consumed via tList())
// - a PluralEntry (keys used with a `count` param, consumed via t())
export type TranslationValue = string | string[] | PluralEntry

export type TranslationEntry = Record<Lang, TranslationValue>

export type TranslationDictionary = Record<string, TranslationEntry>
