import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { ALL_CROP_TYPES, CROP_NAMES } from '../data/cropData'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA } from '../data/fertilizerData'
import { CROP_SEED_IMAGES, CROP_HARVEST_IMAGES, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { playSound } from '../systems/sfxSystem'
import { C } from './PanelShell'

// ─── Atlas frame — swap src to inventory_atlas.png when available ─────────────
const INV_ATLAS     = 'assets/images/ui_loading/inventory.png'
const ATLAS_SIZE    = 1024
const BG_RECT       = { x: 18, y: 14, w: 989, h: 676 } as const
const UI_SCALE      = 0.8
const ss            = (v: number) => Math.round(v * UI_SCALE)

const PANEL_W          = ss(1290)
const PANEL_H          = Math.round((PANEL_W * BG_RECT.h) / BG_RECT.w)
const PANEL_TOP_MARGIN = ss(120)
const CONTENT_LEFT     = ss(72)
const CONTENT_RIGHT    = ss(72)
const CONTENT_TOP      = ss(96)
const CONTENT_BOTTOM   = ss(68)
const CONTENT_W        = PANEL_W - CONTENT_LEFT - CONTENT_RIGHT
const CONTENT_H        = PANEL_H - CONTENT_TOP - CONTENT_BOTTOM
const CLOSE_SIZE       = ss(100)
const CLOSE_RIGHT      = ss(10)
const CLOSE_TOP        = ss(10)

// ─── Card colours ─────────────────────────────────────────────────────────────
const CARD_BORDER     = { r: 0.82, g: 0.69, b: 0.39, a: 0.95 }
const CARD_FILL       = { r: 0.95, g: 0.88, b: 0.70, a: 0.55 }
const CARD_TEXT       = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE  = { r: 0.45, g: 0.28, b: 0.10, a: 1 }
const FRAME_THICKNESS = 4

// ─── Card dimensions ─────────────────────────────────────────────────────────
const CARD_W      = ss(180)
const CARD_H      = ss(215)
const CARD_MARGIN = ss(12)
const CARD_ICON   = ss(96)
const CARD_PAD_V  = ss(12)
const CARD_PAD_H  = ss(10)

// ─── Tab ─────────────────────────────────────────────────────────────────────
const TAB_H   = ss(44)
const TAB_W   = ss(210)
const TAB_GAP = ss(10)

const invTab = { value: 'seeds' as 'seeds' | 'harvested' | 'other' }

type CardColor = { r: number; g: number; b: number; a: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bgUvs(rect: { x: number; y: number; w: number; h: number }): number[] {
  const S = ATLAS_SIZE
  const l = rect.x / S, r = (rect.x + rect.w) / S
  const t = 1 - rect.y / S, b = 1 - (rect.y + rect.h) / S
  return [l, b, l, t, r, t, r, b]
}

// ─── InvCard ─────────────────────────────────────────────────────────────────
const InvCard = ({
  borderColor = CARD_BORDER,
  children,
}: {
  key?: string | number
  borderColor?: CardColor
  children?: ReactEcs.JSX.ReactNode
}) => {
  const mobile = isMobile()
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: CARD_W,
        height: CARD_H,
        margin: { right: CARD_MARGIN, bottom: CARD_MARGIN },
        padding: { top: CARD_PAD_V, bottom: CARD_PAD_V, left: CARD_PAD_H, right: CARD_PAD_H },
        borderWidth: 3,
        borderColor,
        borderRadius: 12,
      }}
      uiBackground={{ color: CARD_FILL }}
    >
      {mobile && (
        <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 }, width: CARD_W, height: CARD_H }}>
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: CARD_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, bottom: 0 }, width: CARD_W, height: FRAME_THICKNESS }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { left: 0, top: 0 },    width: FRAME_THICKNESS, height: CARD_H }} uiBackground={{ color: borderColor }} />
          <UiEntity uiTransform={{ positionType: 'absolute', position: { right: 0, top: 0 },   width: FRAME_THICKNESS, height: CARD_H }} uiBackground={{ color: borderColor }} />
        </UiEntity>
      )}
      {children}
    </UiEntity>
  )
}

// ─── InventoryPanelFrame ──────────────────────────────────────────────────────
const InventoryPanelFrame = ({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactEcs.JSX.ReactNode
}) => (
  <UiEntity
    uiTransform={{
      positionType: 'absolute',
      position: { top: 0, left: 0 },
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      pointerFilter: 'none',
    }}
  >
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        pointerFilter: 'block',
      }}
    />
    <UiEntity
      uiTransform={{
        width: PANEL_W,
        height: PANEL_H,
        margin: { top: PANEL_TOP_MARGIN },
        pointerFilter: 'block',
      }}
      uiBackground={{
        texture: { src: INV_ATLAS, wrapMode: 'clamp' },
        textureMode: 'stretch',
        uvs: bgUvs(BG_RECT),
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: CONTENT_LEFT, top: CONTENT_TOP },
          width: CONTENT_W,
          height: CONTENT_H,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { right: CLOSE_RIGHT, top: CLOSE_TOP },
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
        }}
        onMouseDown={() => { playSound('buttonclick'); onClose() }}
      />
    </UiEntity>
  </UiEntity>
)

// ─── TabBar ───────────────────────────────────────────────────────────────────
const TabBar = ({ tab, hasOther }: { tab: 'seeds' | 'harvested' | 'other'; hasOther: boolean }) => (
  <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: ss(12) }, flexShrink: 0 }}>
    {(['seeds', 'harvested', 'other'] as const).map((t) => {
      if (t === 'other' && !hasOther) return null
      const active = tab === t
      const label  = t === 'seeds' ? 'Seeds' : t === 'harvested' ? 'Harvested' : 'Other Items'
      return (
        <UiEntity
          key={t}
          uiTransform={{ width: TAB_W, height: TAB_H, alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: { right: TAB_GAP } }}
          uiBackground={{ color: active ? { r: 0.45, g: 0.26, b: 0.06, a: 0.9 } : { r: 0.58, g: 0.38, b: 0.12, a: 0.72 } }}
          onMouseDown={() => { playSound('buttonclick'); invTab.value = t }}
        >
          <Label value={label} fontSize={ss(20)} color={active ? { r: 0.97, g: 0.90, b: 0.68, a: 1 } : { r: 0.97, g: 0.90, b: 0.68, a: 0.65 }} textAlign="middle-center" />
        </UiEntity>
      )
    })}
  </UiEntity>
)

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ message }: { message: string }) => (
  <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Label value={message} fontSize={ss(22)} color={CARD_TEXT_MUTE} textAlign="middle-center" />
  </UiEntity>
)

// ─── Main panel ───────────────────────────────────────────────────────────────
export const InventoryPanel = () => {
  const seedRows    = ALL_CROP_TYPES.filter((c) => (playerState.seeds.get(c)     ?? 0) > 0)
  const harvestRows = ALL_CROP_TYPES.filter((c) => (playerState.harvested.get(c) ?? 0) > 0)
  const fertRows    = ALL_FERTILIZER_TYPES.filter((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
  const hasOther    = playerState.organicWaste > 0 || fertRows.length > 0
  const tab         = invTab.value

  // Auto-switch if "other" tab selected but nothing there
  if (tab === 'other' && !hasOther) invTab.value = 'seeds'

  return (
    <InventoryPanelFrame onClose={() => { playerState.activeMenu = 'none' }}>

      <TabBar tab={invTab.value} hasOther={hasOther} />

      {/* Seeds tab */}
      {tab === 'seeds' && (
        seedRows.length === 0
          ? <EmptyState message="No seeds in stock" />
          : (
            <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignContent: 'flex-start' }}>
              {seedRows.map((c) => (
                <InvCard key={`s${c}`} borderColor={{ r: 0.32, g: 0.78, b: 0.32, a: 0.95 }}>
                  <UiEntity
                    uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(10) } }}
                    uiBackground={{ texture: { src: CROP_SEED_IMAGES[c], wrapMode: 'clamp' }, textureMode: 'stretch' }}
                  />
                  <Label value={CROP_NAMES[c]} fontSize={ss(20)} color={CARD_TEXT} textAlign="middle-center" />
                  <Label value={`x${playerState.seeds.get(c)}`} fontSize={ss(21)} color={C.green} textAlign="middle-center"
                    uiTransform={{ margin: { top: ss(4) } }} />
                </InvCard>
              ))}
            </UiEntity>
          )
      )}

      {/* Harvested tab */}
      {tab === 'harvested' && (
        harvestRows.length === 0
          ? <EmptyState message="Nothing harvested yet" />
          : (
            <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignContent: 'flex-start' }}>
              {harvestRows.map((c) => (
                <InvCard key={`h${c}`} borderColor={{ r: 0.85, g: 0.55, b: 0.15, a: 0.95 }}>
                  <UiEntity
                    uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(10) } }}
                    uiBackground={{ texture: { src: CROP_HARVEST_IMAGES[c], wrapMode: 'clamp' }, textureMode: 'stretch' }}
                  />
                  <Label value={CROP_NAMES[c]} fontSize={ss(20)} color={CARD_TEXT} textAlign="middle-center" />
                  <Label value={`x${playerState.harvested.get(c)}`} fontSize={ss(21)} color={C.orange} textAlign="middle-center"
                    uiTransform={{ margin: { top: ss(4) } }} />
                </InvCard>
              ))}
            </UiEntity>
          )
      )}

      {/* Other items tab */}
      {tab === 'other' && (
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignContent: 'flex-start' }}>

          {playerState.organicWaste > 0 && (
            <InvCard borderColor={{ r: 0.70, g: 0.50, b: 0.15, a: 0.95 }}>
              <UiEntity
                uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(10) } }}
                uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
              />
              <Label value="Organic Waste" fontSize={ss(18)} color={CARD_TEXT} textAlign="middle-center" />
              <Label value={`x${playerState.organicWaste}`} fontSize={ss(21)} color={{ r: 0.75, g: 0.52, b: 0.18, a: 1 }} textAlign="middle-center"
                uiTransform={{ margin: { top: ss(4) } }} />
            </InvCard>
          )}

          {fertRows.map((f) => {
            const def = FERTILIZER_DATA.get(f)!
            return (
              <InvCard key={f} borderColor={{ r: 0.40, g: 0.75, b: 0.30, a: 0.95 }}>
                <UiEntity
                  uiTransform={{ width: CARD_ICON, height: CARD_ICON, margin: { bottom: ss(10) } }}
                  uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                />
                <Label value={def.name} fontSize={ss(18)} color={CARD_TEXT} textAlign="middle-center" />
                <Label value={`x${playerState.fertilizers.get(f)}`} fontSize={ss(21)} color={C.green} textAlign="middle-center"
                  uiTransform={{ margin: { top: ss(4) } }} />
              </InvCard>
            )
          })}

        </UiEntity>
      )}

    </InventoryPanelFrame>
  )
}
