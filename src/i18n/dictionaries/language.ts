import type { TranslationDictionary } from '../types'

// Strings for the first-run Language Selection screen (src/ui/LanguageSelectOverlay.tsx),
// plus display names usable later by any in-game language switcher.
export const languageDict: TranslationDictionary = {
  'language.title':  { en: 'Choose your language', es: 'Elige tu idioma', pt: 'Escolha seu idioma' },
  'language.select': { en: 'SELECT', es: 'SELECCIONAR', pt: 'SELECIONAR' },
  'language.name.en': { en: 'English', es: 'English', pt: 'English' },
  'language.name.es': { en: 'Español', es: 'Español', pt: 'Español' },
  'language.name.pt': { en: 'Português', es: 'Português', pt: 'Português' },
}
