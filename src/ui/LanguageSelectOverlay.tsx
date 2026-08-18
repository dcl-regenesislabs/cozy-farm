import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { t, isSupportedLanguage } from '../i18n'
import type { Lang } from '../i18n'
import { playSound } from '../systems/sfxSystem'
import { DialogActionButton } from './RevampButtons'
import { changeLanguage } from '../services/languageService'

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

// ─── Flag artwork ────────────────────────────────────────────────────────────
// One combined atlas (USA / Spain / Brazil) on a 1024x1024 canvas, cropped via
// UV rects — same "single atlas, per-item crop" pattern as RevampPanel.tsx's
// names.png. Rects were measured directly off assets/images/revamp/languages.png.
// Exported so TopHud.tsx's language switcher button can reuse the same crops.
export const LANG_FLAGS_IMG = 'assets/images/revamp/languages.png'
export const LANG_ATLAS_SIZE = 1024

export type Rect = { x: number; y: number; w: number; h: number }

export const FLAG_RECTS: Record<Lang, Rect> = {
  en: { x: 12,  y: 450, w: 512, h: 342 }, // USA
  es: { x: 244, y: 60,  w: 510, h: 338 }, // Spain
  pt: { x: 555, y: 450, w: 457, h: 344 }, // Brazil
}

export function atlasUvs(rect: Rect): number[] {
  const l = rect.x / LANG_ATLAS_SIZE
  const r = (rect.x + rect.w) / LANG_ATLAS_SIZE
  const t = 1 - rect.y / LANG_ATLAS_SIZE
  const b = 1 - (rect.y + rect.h) / LANG_ATLAS_SIZE
  return [l, b, l, t, r, t, r, b]
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
  const rect = FLAG_RECTS[lang]

  // Contain-fit the flag's real aspect ratio inside the inner box instead of
  // stretching it to a square (these are landscape flags, ~1.3:1 to 1.5:1).
  const innerMax = FLAG_SIZE - ls(16)
  const ratio = rect.w / rect.h
  let flagW = innerMax
  let flagH = Math.round(flagW / ratio)
  if (flagH > innerMax) {
    flagH = innerMax
    flagW = Math.round(flagH * ratio)
  }

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
        pointerFilter: 'block',
      }}
      uiBackground={{ color: { r: 1, g: 1, b: 1, a: 0.1 } }}
      onMouseDown={() => {
        playSound('buttonclick')
        previewLang = lang
      }}
    >
      <UiEntity
        uiTransform={{ width: flagW, height: flagH }}
        uiBackground={{
          texture: { src: LANG_FLAGS_IMG, wrapMode: 'clamp' },
          textureMode: 'stretch',
          uvs: atlasUvs(rect),
        }}
      />
    </UiEntity>
  )
}

function handleSelect() {
  playSound('buttonclick')
  changeLanguage(previewLang)
  playerState.languagePickerOpen = false
}

function handleCancel() {
  playSound('buttonclick')
  playerState.languagePickerOpen = false
}

/** Opens the picker on demand for a returning player (in-game HUD switcher) —
 *  preselects their current saved language rather than defaulting to English. */
export function openLanguagePicker(): void {
  const current = playerState.preferredLanguage
  previewLang = isSupportedLanguage(current) ? current : 'en'
  playerState.languagePickerOpen = true
}

export const LanguageSelectOverlay = () => {
  // Only appears once the loading screen has fully finished its own progress
  // animation (loadingOverlayActive only flips false after the bar visually
  // reaches 100%, which happens a beat after farmReady itself) — otherwise
  // this overlay renders on top of LoadingOverlay mid-animation and cuts it off.
  if (playerState.loadingOverlayActive) return null
  if (!playerState.farmReady) return null
  const isFirstRun = playerState.preferredLanguage === ''
  // First run: mandatory, always shows. Returning player: only when manually
  // opened via openLanguagePicker() (the in-game HUD switcher).
  if (!isFirstRun && !playerState.languagePickerOpen) return null

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
        uiTransform={{ width: BACKGROUND_W, height: BACKGROUND_H, alignItems: 'center', pointerFilter: 'block' }}
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
          }}
        >
          {(() => {
            const selectW = ls(280)
            const cancelW = ls(160)
            const gap = ls(6)
            const totalW = isFirstRun ? selectW : selectW + gap + cancelW
            const selectLeft = Math.round((BACKGROUND_W - totalW) / 2)
            const cancelLeft = selectLeft + selectW + gap
            return (
              <UiEntity uiTransform={{ width: BACKGROUND_W, height: ls(70) }}>
                <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: selectLeft }, width: selectW, height: ls(70) }}>
                  <DialogActionButton
                    label={t('language.select', undefined, previewLang)}
                    primary
                    width={selectW}
                    height={ls(70)}
                    fontSize={ls(26)}
                    onPress={handleSelect}
                  />
                </UiEntity>
                {!isFirstRun && (
                  <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: cancelLeft }, width: cancelW, height: ls(70) }}>
                    <DialogActionButton
                      label={t('common.cancel', undefined, previewLang)}
                      width={cancelW}
                      height={ls(70)}
                      fontSize={ls(24)}
                      onPress={handleCancel}
                    />
                  </UiEntity>
                )}
              </UiEntity>
            )
          })()}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
