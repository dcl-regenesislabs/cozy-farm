import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { t, setLanguage, refreshAllHoverTexts } from '../i18n'
import type { Lang } from '../i18n'
import { saveFarm } from '../services/saveService'
import { playSound } from '../systems/sfxSystem'
import { DialogActionButton } from './RevampButtons'

// Reuses the exact background art/scale of LoadingOverlay.tsx so this reads as
// "the same screen, different content" rather than a new visual style.
const LANG_SCALE = 1.15
const ls = (value: number) => Math.round(value * LANG_SCALE)

const BACKGROUND_W = ls(1024)
const BACKGROUND_H = ls(683)
const LANG_BACKGROUND = 'assets/images/ui_loading/background.png'

const TITLE_COLOR = { r: 0.29, g: 0.17, b: 0.07, a: 1 }
const FLAG_BORDER_SELECTED = { r: 0.85, g: 0.65, b: 0.15, a: 1 }
const FLAG_BORDER_IDLE = { r: 0.60, g: 0.40, b: 0.19, a: 0.5 }

// ─── Flag artwork placeholders ──────────────────────────────────────────────
// These files don't exist in the repo yet — drop the final PNGs at these exact
// paths (1:1 aspect ratio works best) and no code changes are needed.
const FLAG_SRC: Record<Lang, string> = {
  en: 'assets/images/ui_language/flag_en.png',
  es: 'assets/images/ui_language/flag_es.png',
  pt: 'assets/images/ui_language/flag_pt.png',
}

const FLAG_ORDER: Lang[] = ['en', 'es', 'pt']

// In-progress selection before SELECT is pressed — a plain module-level
// variable, same pattern as LoadingOverlay.tsx's loadingStartedAt/readyAt
// (this codebase doesn't use useState anywhere; UI re-reads mutable state
// every frame instead).
let previewLang: Lang = 'en'

const FLAG_SIZE = ls(150)
const FLAG_GAP = ls(40)
const FLAGS_TOP = ls(280)
const TITLE_TOP = ls(160)
const BUTTON_TOP = ls(500)

const FlagButton = ({ lang }: { key?: string; lang: Lang }) => {
  const selected = previewLang === lang

  return (
    <UiEntity
      uiTransform={{
        width: FLAG_SIZE,
        height: FLAG_SIZE,
        margin: { left: FLAG_GAP / 2, right: FLAG_GAP / 2 },
        borderWidth: ls(4),
        borderColor: selected ? FLAG_BORDER_SELECTED : FLAG_BORDER_IDLE,
        borderRadius: ls(16),
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: { r: 1, g: 1, b: 1, a: 0.1 } }}
      onMouseDown={() => {
        playSound('buttonclick')
        previewLang = lang
      }}
    >
      <UiEntity
        uiTransform={{ width: FLAG_SIZE - ls(16), height: FLAG_SIZE - ls(16) }}
        uiBackground={{ texture: { src: FLAG_SRC[lang], wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
    </UiEntity>
  )
}

function handleSelect() {
  playSound('buttonclick')
  setLanguage(previewLang)
  refreshAllHoverTexts()
  saveFarm()
}

export const LanguageSelectOverlay = () => {
  // Only appears once, after the farm has loaded and before any language is saved.
  if (!playerState.farmReady || playerState.preferredLanguage !== '') return null

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'block',
      }}
    >
      <UiEntity
        uiTransform={{ width: BACKGROUND_W, height: BACKGROUND_H, alignItems: 'center' }}
        uiBackground={{ texture: { src: LANG_BACKGROUND, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      >
        <Label
          value={t('language.title', undefined, previewLang)}
          fontSize={ls(38)}
          color={TITLE_COLOR}
          textAlign="middle-center"
          uiTransform={{
            positionType: 'absolute',
            position: { top: TITLE_TOP, left: 0 },
            width: BACKGROUND_W,
            height: ls(56),
          }}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: FLAGS_TOP, left: 0 },
            width: BACKGROUND_W,
            height: FLAG_SIZE,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {FLAG_ORDER.map((lang) => (
            <FlagButton key={lang} lang={lang} />
          ))}
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: BUTTON_TOP, left: 0 },
            width: BACKGROUND_W,
            height: ls(70),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DialogActionButton
            label={t('language.select', undefined, previewLang)}
            primary
            width={ls(280)}
            height={ls(70)}
            fontSize={ls(26)}
            onPress={handleSelect}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
