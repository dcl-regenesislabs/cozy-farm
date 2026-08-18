import type { TranslationDictionary } from '../types'

// src/ui/LoadingOverlay.tsx
export const loadingDict: TranslationDictionary = {
  'loading.title':               { en: 'Preparing your farm', es: 'Preparando tu granja', pt: 'Preparando sua fazenda' },
  'loading.step.connecting':     { en: 'Connecting',   es: 'Conectando',      pt: 'Conectando' },
  'loading.step.preparing':      { en: 'Preparing',    es: 'Preparando',      pt: 'Preparando' },
  'loading.step.loadingFarm':    { en: 'Loading farm', es: 'Cargando granja', pt: 'Carregando fazenda' },
  'loading.step.ready':          { en: 'Ready!',        es: '¡Listo!',         pt: 'Pronto!' },
  'loading.subtitle.connecting': { en: 'Connecting to the server{ellipsis}', es: 'Conectando al servidor{ellipsis}', pt: 'Conectando ao servidor{ellipsis}' },
  'loading.subtitle.loadingFarm': { en: 'Loading your farm...', es: 'Cargando tu granja...', pt: 'Carregando sua fazenda...' },
  'loading.footer':              { en: 'Setting up your plots and buildings', es: 'Preparando tus parcelas y construcciones', pt: 'Preparando seus lotes e construções' },
}
