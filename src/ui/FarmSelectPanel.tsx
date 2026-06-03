import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { engine, Transform } from '@dcl/sdk/ecs'
import { isMobile } from '@dcl/sdk/platform'
import { playerState } from '../game/gameState'
import { room } from '../shared/farmMessages'
import type { FarmSlot } from '../shared/farmMessages'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { FARM_SPAWN_POSITIONS, PLAZA_SPAWN_POSITION } from '../systems/interactionSetup'
import { teleportToSlot } from '../services/saveService'

const MINIMAP_ATLAS = 'assets/images/ui_loading/minimap.png'
const SHOVEL_ICON_UP = 'assets/images/ui_loading/shovel_icon_up.png'
const SHOVEL_ICON_RIGHT = 'assets/images/ui_loading/shovel_icon_right.png'
const SHOVEL_ICON_DOWN = 'assets/images/ui_loading/shovel_icon_down.png'
const SHOVEL_ICON_LEFT = 'assets/images/ui_loading/shovel_icon_left.png'
const MAP_EXTENDED_ATLAS = 'assets/images/ui_loading/map_extended.png'
const GLOW_ATLAS = 'assets/images/ui_loading/glow.png'
const MINIMAP_ATLAS_SIZE = 512
const MAP_EXTENDED_ATLAS_SIZE = 1024
const GLOW_ATLAS_SIZE = 1024
const MAP_TILE_W = 176
const MAP_TILE_H = 126
const MAP_ROAD = 16
// 3×3 grid encoding 8 farm slots + central plaza (-1). Matches server MAX_FARM_SLOTS = 8.
const MAP_LAYOUT = [
  [0, 7, 6],
  [1, -1, 5],
  [2, 3, 4],
] as const
const MINIMAP_BG_RECT = { x: 7, y: 6, w: 360, h: 493 } as const
const MINIMAP_WINDOW_RECT = { x: 26, y: 80, w: 322, h: 346 } as const
const MINIMAP_EMPTY_RECT = { x: 394, y: 20, w: 97, h: 108 } as const
const MINIMAP_PLAZA_RECT = { x: 395, y: 137, w: 101, h: 105 } as const
const MINIMAP_OCCUPIED_RECT = { x: 398, y: 254, w: 96, h: 107 } as const
const MINIMAP_OWN_RECT = { x: 395, y: 368, w: 100, h: 108 } as const
const MINIMAP_WIDGET_W = 246
const MINIMAP_WIDGET_H = Math.round((MINIMAP_WIDGET_W * MINIMAP_BG_RECT.h) / MINIMAP_BG_RECT.w)
const MINIMAP_SCALE = MINIMAP_WIDGET_W / MINIMAP_BG_RECT.w
const MINIMAP_WINDOW_LEFT = Math.round((MINIMAP_WINDOW_RECT.x - MINIMAP_BG_RECT.x) * MINIMAP_SCALE)
const MINIMAP_WINDOW_TOP = Math.round((MINIMAP_WINDOW_RECT.y - MINIMAP_BG_RECT.y) * MINIMAP_SCALE)
const MINIMAP_WINDOW_W = Math.round(MINIMAP_WINDOW_RECT.w * MINIMAP_SCALE)
const MINIMAP_WINDOW_H = Math.round(MINIMAP_WINDOW_RECT.h * MINIMAP_SCALE)
const MINIMAP_GRID_PAD_X = 10
const MINIMAP_GRID_PAD_Y = 12
const MINIMAP_GRID_W = MINIMAP_WINDOW_W - MINIMAP_GRID_PAD_X * 2
const MINIMAP_GRID_H = MINIMAP_WINDOW_H - MINIMAP_GRID_PAD_Y * 2
const MINI_ROAD = 12
const MINI_TILE_W = Math.floor((MINIMAP_GRID_W - MINI_ROAD * 2) / 3)
const MINI_TILE_H = Math.floor((MINIMAP_GRID_H - MINI_ROAD * 2) / 3)
const MAP_WORLD_PADDING = 40
const BIG_MARKER_SIZE = 20
const MINI_MARKER_SIZE = 14
const MARKER_SCALE = 4
const MAP_PANEL_TOP = 248
const MAP_EXT_BG_RECT = { x: 8, y: 5, w: 908, h: 771 } as const
const MAP_EXT_WINDOW_RECT = { x: 33, y: 76, w: 853, h: 627 } as const
const MAP_EXT_EMPTY_RECT = { x: 19, y: 801, w: 252, h: 201 } as const
const MAP_EXT_OCCUPIED_RECT = { x: 303, y: 801, w: 253, h: 201 } as const
const MAP_EXT_OWN_RECT = { x: 588, y: 800, w: 252, h: 202 } as const
const MAP_EXT_BUTTON_RECT = { x: 330, y: 719, w: 243, h: 49 } as const
const MAP_EXT_WIDGET_H = 730
const MAP_EXT_WIDGET_W = Math.round((MAP_EXT_WIDGET_H * MAP_EXT_BG_RECT.w) / MAP_EXT_BG_RECT.h)
const MAP_EXT_SCALE = MAP_EXT_WIDGET_W / MAP_EXT_BG_RECT.w
const MAP_EXT_WINDOW_LEFT = Math.round((MAP_EXT_WINDOW_RECT.x - MAP_EXT_BG_RECT.x) * MAP_EXT_SCALE)
const MAP_EXT_WINDOW_TOP = Math.round((MAP_EXT_WINDOW_RECT.y - MAP_EXT_BG_RECT.y) * MAP_EXT_SCALE)
const MAP_EXT_WINDOW_W = Math.round(MAP_EXT_WINDOW_RECT.w * MAP_EXT_SCALE)
const MAP_EXT_WINDOW_H = Math.round(MAP_EXT_WINDOW_RECT.h * MAP_EXT_SCALE)
const MAP_EXT_TILE_W = Math.round(MAP_EXT_EMPTY_RECT.w * MAP_EXT_SCALE)
const MAP_EXT_TILE_H = Math.round(MAP_EXT_EMPTY_RECT.h * MAP_EXT_SCALE)
const MAP_EXT_ROAD_X = Math.max(0, Math.round((MAP_EXT_WINDOW_W - MAP_EXT_TILE_W * 3) / 2) - 24)
const MAP_EXT_ROAD_Y = Math.max(0, Math.round((MAP_EXT_WINDOW_H - MAP_EXT_TILE_H * 3) / 2) - 14)
const MAP_EXT_BUTTON_LEFT = Math.round((MAP_EXT_BUTTON_RECT.x - MAP_EXT_BG_RECT.x) * MAP_EXT_SCALE)
const MAP_EXT_BUTTON_TOP = Math.round((MAP_EXT_BUTTON_RECT.y - MAP_EXT_BG_RECT.y) * MAP_EXT_SCALE)
const MAP_EXT_BUTTON_W = Math.round(MAP_EXT_BUTTON_RECT.w * MAP_EXT_SCALE)
const MAP_EXT_BUTTON_H = Math.round(MAP_EXT_BUTTON_RECT.h * MAP_EXT_SCALE)
const MAP_EXT_TILE_DISPLAY_SCALE = 0.82
const GLOW_YELLOW_RECT = { x: 92, y: 94, w: 316, h: 262 } as const
const GLOW_WHITE_RECT = { x: 474, y: 95, w: 316, h: 262 } as const
const CARD_FARM_TITLE_MAX_CHARS = 15
const BUTTON_FARM_TITLE_MAX_CHARS = 18
const MOBILE_SELECTED_FRAME_PAD = 8
const MOBILE_SELECTED_FRAME_THICKNESS = 4
let selectedExtendedSlotId = -1

type MapSlotMode = 'available' | 'occupied' | 'own'
type MapViewMode = 'waiting' | 'overview'
type MarkerPosition = { left: number; top: number }
type AtlasRect = { x: number; y: number; w: number; h: number }

function atlasUvs(rect: AtlasRect): number[] {
  const left = rect.x / MINIMAP_ATLAS_SIZE
  const right = (rect.x + rect.w) / MINIMAP_ATLAS_SIZE
  const top = 1 - rect.y / MINIMAP_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / MINIMAP_ATLAS_SIZE

  return [left, top, right, top, right, bottom, left, bottom]
}

function extendedAtlasUvs(rect: AtlasRect): number[] {
  const left = rect.x / MAP_EXTENDED_ATLAS_SIZE
  const right = (rect.x + rect.w) / MAP_EXTENDED_ATLAS_SIZE
  const top = 1 - rect.y / MAP_EXTENDED_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / MAP_EXTENDED_ATLAS_SIZE

  return [left, top, right, top, right, bottom, left, bottom]
}

function glowAtlasUvs(rect: AtlasRect): number[] {
  const left = rect.x / GLOW_ATLAS_SIZE
  const right = (rect.x + rect.w) / GLOW_ATLAS_SIZE
  const top = 1 - rect.y / GLOW_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / GLOW_ATLAS_SIZE

  return [left, top, right, top, right, bottom, left, bottom]
}

function extendedAtlasUvsRotatedRight(rect: AtlasRect): number[] {
  const left = rect.x / MAP_EXTENDED_ATLAS_SIZE
  const right = (rect.x + rect.w) / MAP_EXTENDED_ATLAS_SIZE
  const top = 1 - rect.y / MAP_EXTENDED_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / MAP_EXTENDED_ATLAS_SIZE

  return [left, bottom, left, top, right, top, right, bottom]
}

function atlasUvsRotatedRight(rect: AtlasRect): number[] {
  const left = rect.x / MINIMAP_ATLAS_SIZE
  const right = (rect.x + rect.w) / MINIMAP_ATLAS_SIZE
  const top = 1 - rect.y / MINIMAP_ATLAS_SIZE
  const bottom = 1 - (rect.y + rect.h) / MINIMAP_ATLAS_SIZE

  return [left, bottom, left, top, right, top, right, bottom]
}

function getHighlightedSlotId(): number {
  return playerState.mySlotId
}

function getSlotMode(slot: FarmSlot, highlightedSlotId: number): MapSlotMode {
  if (slot.slotId === highlightedSlotId) return 'own'
  return slot.wallet === '' ? 'available' : 'occupied'
}

function formatOwnerLabel(slot: FarmSlot): string {
  const wallet = slot.wallet.trim()
  const suffix = wallet ? wallet.slice(-4) : ''
  const name = slot.displayName.trim()
  if (name && suffix) {
    const fullLabel = `${name} ${suffix}`
    if (fullLabel.length <= 13) return fullLabel

    const maxNameLength = Math.max(1, 13 - suffix.length - 1 - 3)
    return `${name.slice(0, maxNameLength)}... ${suffix}`
  }

  if (name) {
    return name.length <= 13 ? name : `${name.slice(0, 10)}...`
  }

  if (!wallet) return 'Unknown'
  return wallet.length <= 13 ? wallet : `${wallet.slice(0, 10)}...`
}

function formatMapOwnerLabel(slot: FarmSlot): string {
  return formatOwnerLabel(slot)
}

function formatPossessive(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`
}

function truncateWithEllipsis(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  if (maxChars <= 3) return text.slice(0, maxChars)
  return `${text.slice(0, maxChars - 3)}...`
}

function formatExtendedFarmTitle(slot: FarmSlot, mode: MapSlotMode, maxChars = Number.MAX_SAFE_INTEGER): string {
  if (mode === 'available') return truncateWithEllipsis('Empty Farm', maxChars)

  const displayName = slot.displayName.trim()
  if (displayName) return truncateWithEllipsis(`${formatPossessive(displayName)} Farm`, maxChars)

  if (mode === 'own') return truncateWithEllipsis('Your Farm', maxChars)
  return truncateWithEllipsis('Occupied Farm', maxChars)
}

function getDefaultSelectedSlotId(slots: FarmSlot[], highlightedSlotId: number): number {
  const own = slots.find((slot) => slot.slotId === highlightedSlotId)
  if (own) return own.slotId

  const available = slots.find((slot) => slot.wallet === '')
  if (available) return available.slotId

  return slots[0]?.slotId ?? -1
}

function OutlinedLabel(props: {
  value: string
  fontSize: number
  width: number
  height: number
  color: { r: number; g: number; b: number; a: number }
  outlineColor: { r: number; g: number; b: number; a: number }
  textAlign: 'middle-left' | 'middle-center' | 'middle-right'
  outlineSize?: number
}) {
  const outlineSize = props.outlineSize ?? 1
  const offsets = [
    { left: -outlineSize, top: 0 },
    { left: outlineSize, top: 0 },
    { left: 0, top: -outlineSize },
    { left: 0, top: outlineSize },
  ]

  return (
    <UiEntity uiTransform={{ width: props.width, height: props.height }}>
      {offsets.map((offset, index) => (
        <Label
          key={`outline-${index}`}
          value={props.value}
          fontSize={props.fontSize}
          color={props.outlineColor}
          textAlign={props.textAlign}
          uiTransform={{
            width: props.width,
            height: props.height,
            positionType: 'absolute',
            position: offset,
          }}
        />
      ))}
      <Label
        value={props.value}
        fontSize={props.fontSize}
        color={props.color}
        textAlign={props.textAlign}
        uiTransform={{ width: props.width, height: props.height }}
      />
    </UiEntity>
  )
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function getWorldMapBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const xs = [...FARM_SPAWN_POSITIONS.map((pos) => pos.x), PLAZA_SPAWN_POSITION.x]
  const zs = [...FARM_SPAWN_POSITIONS.map((pos) => pos.z), PLAZA_SPAWN_POSITION.z]
  return {
    minX: Math.min(...xs) - MAP_WORLD_PADDING,
    maxX: Math.max(...xs) + MAP_WORLD_PADDING,
    minZ: Math.min(...zs) - MAP_WORLD_PADDING,
    maxZ: Math.max(...zs) + MAP_WORLD_PADDING,
  }
}

function getPlayerMarkerPosition(width: number, height: number): MarkerPosition | null {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return null

  const bounds = getWorldMapBounds()
  const spanX = Math.max(1, bounds.maxX - bounds.minX)
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ)
  const normalizedX = clamp01((playerTransform.position.x - bounds.minX) / spanX)
  const normalizedZ = clamp01((playerTransform.position.z - bounds.minZ) / spanZ)

  return {
    left: normalizedX * width,
    top: normalizedZ * height,
  }
}

function normalizeDegrees(angle: number): number {
  let value = angle % 360
  if (value < 0) value += 360
  return value
}

function getPlayerMarkerSrc(): string {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return SHOVEL_ICON_UP

  const q = playerTransform.rotation
  const yaw = Math.atan2(
    2 * (q.y * q.w + q.x * q.z),
    1 - 2 * (q.y * q.y + q.x * q.x),
  ) * (180 / Math.PI)

  const mapAngle = normalizeDegrees(180 - yaw)

  if (mapAngle >= 45 && mapAngle < 135) return SHOVEL_ICON_DOWN
  if (mapAngle >= 135 && mapAngle < 225) return SHOVEL_ICON_LEFT
  if (mapAngle >= 225 && mapAngle < 315) return SHOVEL_ICON_UP
  return SHOVEL_ICON_RIGHT
}

export function requestClaimSlot(slotId: number): void {
  playSound('buttonclick')
  void room.send('claimFarmSlot', { slotId })
}

function teleportToFarm(slotId: number, closeMenu = true): void {
  if (closeMenu) playerState.activeMenu = 'none'
  playerState.plazaMapMinimized = true
  teleportToSlot(slotId)
}

function visitSlot(slot: FarmSlot): void {
  playSound('buttonclick')
  teleportToFarm(slot.slotId)
}

function openMap(): void {
  playSound('buttonclick')
  playerState.activeMenu = 'farmSelect'
  playerState.plazaMapMinimized = false
}

function closeMap(viewMode: MapViewMode): void {
  playSound('buttonclick')
  if (viewMode === 'waiting') {
    playerState.plazaMapMinimized = true
    return
  }
  playerState.activeMenu = 'none'
}

const SlotCard = ({ slot, compact = false }: { key?: number; slot: FarmSlot; compact?: boolean }) => {
  const isMine = slot.wallet !== '' && slot.wallet === playerState.wallet
  const isTaken = slot.wallet !== '' && !isMine
  const isEmpty = slot.wallet === ''
  const cardWidth = compact ? 274 : 280
  const cardHeight = compact ? 248 : 320
  const actionTop = compact ? 12 : 16
  const titleSize = compact ? 26 : 30
  const nameSize = compact ? 18 : 20

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: cardWidth,
        height: cardHeight,
        margin: { right: compact ? 14 : 24, bottom: compact ? 14 : 0 },
        padding: { top: compact ? 18 : 24, bottom: compact ? 18 : 24, left: 20, right: 20 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <Label
        value={`Farm ${slot.slotId + 1}`}
        fontSize={titleSize}
        color={C.header}
        textAlign="middle-center"
        uiTransform={{ margin: { bottom: 12 } }}
      />

      {isMine && (
        <Label value="Your Farm" fontSize={nameSize} color={{ r: 0.2, g: 0.9, b: 0.3, a: 1 }} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}
      {isTaken && (
        <Label value={formatOwnerLabel(slot)} fontSize={nameSize} color={C.orange} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}
      {isEmpty && (
        <Label value="Available" fontSize={nameSize} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}

      {isEmpty && (
        <UiEntity
          uiTransform={{
            width: 220,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            margin: { top: actionTop },
          }}
          uiBackground={{ color: { r: 0.15, g: 0.4, b: 0.8, a: 1 } }}
          onMouseDown={() => requestClaimSlot(slot.slotId)}
        >
          <Label value="Claim Farm" fontSize={24} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      )}

      {isMine && (
        <UiEntity
          uiTransform={{
            width: 220,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            margin: { top: actionTop },
          }}
          uiBackground={{ color: { r: 0.15, g: 0.5, b: 0.2, a: 1 } }}
          onMouseDown={() => {
            playSound('buttonclick')
            teleportToFarm(slot.slotId)
          }}
        >
          <Label value="Enter Farm" fontSize={24} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      )}

      {isTaken && (
        <UiEntity
          uiTransform={{
            width: 220,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            margin: { top: actionTop },
          }}
          uiBackground={{ color: { r: 0.3, g: 0.2, b: 0.05, a: 1 } }}
          onMouseDown={() => visitSlot(slot)}
        >
          <Label value="Visit" fontSize={24} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      )}

      {!isEmpty && slot.claimedAt > 0 && (
        <Label
          value={`Since ${new Date(slot.claimedAt).toLocaleDateString()}`}
          fontSize={16}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { top: 8 } }}
        />
      )}
    </UiEntity>
  )
}

const MapFarmTile = ({
  slot,
  mode,
  viewMode,
}: {
  key?: string
  slot: FarmSlot
  mode: MapSlotMode
  viewMode: MapViewMode
}) => (
  <UiEntity
    uiTransform={{
      width: MAP_TILE_W,
      height: MAP_TILE_H,
      padding: { top: 14, bottom: 14, left: 14, right: 14 },
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
    uiBackground={{
      color:
        mode === 'own' ? { r: 0.56, g: 0.47, b: 0.08, a: 1 } :
        mode === 'available' ? { r: 0.16, g: 0.28, b: 0.52, a: 1 } :
        { r: 0.17, g: 0.42, b: 0.16, a: 1 },
    }}
  >
    <UiEntity uiTransform={{ width: '100%', alignItems: 'flex-start' }}>
      <Label
        value={`Farm ${slot.slotId + 1}`}
        fontSize={20}
        color={C.header}
        textAlign="middle-left"
        uiTransform={{ width: '100%', height: 22 }}
      />
    </UiEntity>

    <UiEntity uiTransform={{ width: '100%', height: 38, justifyContent: 'center' }}>
      <Label
        value={mode === 'available' ? 'Available Slot' : formatMapOwnerLabel(slot)}
        fontSize={19}
        color={C.textMain}
        textAlign="middle-left"
        uiTransform={{ width: '100%', height: 22 }}
      />
    </UiEntity>

    <UiEntity uiTransform={{ width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      {mode === 'available' && viewMode === 'waiting' && (
        <UiEntity
          uiTransform={{
            width: 92,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.07, g: 0.09, b: 0.07, a: 0.95 } }}
          onMouseDown={() => requestClaimSlot(slot.slotId)}
        >
          <Label value="Claim" fontSize={16} color={C.textMain} textAlign="middle-center" uiTransform={{ width: 56, height: 18 }} />
        </UiEntity>
      )}
      {mode === 'occupied' && (
        <UiEntity
          uiTransform={{
            width: 92,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.07, g: 0.09, b: 0.07, a: 0.95 } }}
          onMouseDown={() => visitSlot(slot)}
        >
          <Label value="Visit" fontSize={16} color={C.textMain} textAlign="middle-center" uiTransform={{ width: 56, height: 18 }} />
        </UiEntity>
      )}
      {mode === 'own' && (
        <UiEntity
          uiTransform={{
            width: 92,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.22, g: 0.18, b: 0.05, a: 0.95 } }}
          onMouseDown={() => {
            playSound('buttonclick')
            teleportToFarm(slot.slotId)
          }}
        >
          <Label value="Home" fontSize={16} color={C.textMain} textAlign="middle-center" uiTransform={{ width: 56, height: 18 }} />
        </UiEntity>
      )}
    </UiEntity>
  </UiEntity>
)

const MapPlazaTile = () => (
  <UiEntity
    uiTransform={{
      width: MAP_TILE_W,
      height: MAP_TILE_H,
      padding: { top: 12, bottom: 12, left: 12, right: 12 },
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
    uiBackground={{ color: { r: 0.17, g: 0.14, b: 0.10, a: 1 } }}
  >
    <UiEntity
      uiTransform={{
        width: 64,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: { r: 0.26, g: 0.20, b: 0.12, a: 1 } }}
    >
      <Label value="PLAZA" fontSize={11} color={C.header} textAlign="middle-center" uiTransform={{ width: 46, height: 12 }} />
    </UiEntity>

    <UiEntity uiTransform={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Label
        value="Central Plaza"
        fontSize={20}
        color={C.textMain}
        textAlign="middle-center"
        uiTransform={{ width: '100%', height: 20 }}
      />
    </UiEntity>

    <UiEntity
      uiTransform={{
        width: 96,
        height: 10,
      }}
      uiBackground={{ color: { r: 0.03, g: 0.03, b: 0.03, a: 1 } }}
    />
  </UiEntity>
)

const MiniMapFarmTile = ({ mode }: { key?: string; mode: MapSlotMode }) => (
  <UiEntity
    uiTransform={{ width: MINI_TILE_W, height: MINI_TILE_H }}
    uiBackground={{
      texture: { src: MINIMAP_ATLAS, wrapMode: 'clamp' },
      textureMode: 'stretch',
      uvs: atlasUvsRotatedRight(
        mode === 'own' ? MINIMAP_OWN_RECT :
        mode === 'available' ? MINIMAP_EMPTY_RECT :
        MINIMAP_OCCUPIED_RECT
      ),
    }}
  />
)

const MiniMapPlazaTile = () => (
  <UiEntity
    uiTransform={{
      width: MINI_TILE_W,
      height: MINI_TILE_H,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    uiBackground={{
      texture: { src: MINIMAP_ATLAS, wrapMode: 'clamp' },
      textureMode: 'stretch',
      uvs: atlasUvsRotatedRight(MINIMAP_PLAZA_RECT),
    }}
  />
)

const ExtendedMapFarmTile = ({
  slot,
  mode,
  selected,
  onSelect,
}: {
  key?: string
  slot: FarmSlot
  mode: MapSlotMode
  selected: boolean
  onSelect: () => void
}) => {
  const title = formatExtendedFarmTitle(slot, mode, CARD_FARM_TITLE_MAX_CHARS)
  const cardWidth = Math.round(MAP_EXT_TILE_W * MAP_EXT_TILE_DISPLAY_SCALE)
  const cardHeight = Math.round(MAP_EXT_TILE_H * MAP_EXT_TILE_DISPLAY_SCALE)
  const glowRect = mode === 'own' ? GLOW_YELLOW_RECT : GLOW_WHITE_RECT
  const mobileSelected = selected && isMobile()
  const desktopSelected = selected && !isMobile()
  const glowWidth = Math.min(MAP_EXT_TILE_W, cardWidth + (isMobile() ? 34 : 20))
  const glowHeight = Math.min(MAP_EXT_TILE_H, cardHeight + (isMobile() ? 30 : 16))
  const mobileFrameColor = mode === 'own'
    ? { r: 0.98, g: 0.79, b: 0.16, a: 1 }
    : { r: 1, g: 0.98, b: 0.92, a: 1 }

  return (
    <UiEntity
      uiTransform={{
        width: MAP_EXT_TILE_W,
        height: MAP_EXT_TILE_H,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
      onMouseDown={onSelect}
    >
      {desktopSelected && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              left: Math.round((MAP_EXT_TILE_W - glowWidth) / 2),
              top: Math.round((MAP_EXT_TILE_H - glowHeight) / 2),
            },
            width: glowWidth,
            height: glowHeight,
            zIndex: 4,
          }}
          uiBackground={{
            texture: { src: GLOW_ATLAS, wrapMode: 'clamp' },
            textureMode: 'stretch',
            uvs: glowAtlasUvs(glowRect),
          }}
        />
      )}
      {mobileSelected && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              left: Math.round((MAP_EXT_TILE_W - cardWidth) / 2) - MOBILE_SELECTED_FRAME_PAD,
              top: Math.round((MAP_EXT_TILE_H - cardHeight) / 2) - MOBILE_SELECTED_FRAME_PAD,
            },
            width: cardWidth + MOBILE_SELECTED_FRAME_PAD * 2,
            height: cardHeight + MOBILE_SELECTED_FRAME_PAD * 2,
            zIndex: 4,
          }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, top: 0 },
              width: cardWidth + MOBILE_SELECTED_FRAME_PAD * 2,
              height: MOBILE_SELECTED_FRAME_THICKNESS,
            }}
            uiBackground={{ color: mobileFrameColor }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, bottom: 0 },
              width: cardWidth + MOBILE_SELECTED_FRAME_PAD * 2,
              height: MOBILE_SELECTED_FRAME_THICKNESS,
            }}
            uiBackground={{ color: mobileFrameColor }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, top: 0 },
              width: MOBILE_SELECTED_FRAME_THICKNESS,
              height: cardHeight + MOBILE_SELECTED_FRAME_PAD * 2,
            }}
            uiBackground={{ color: mobileFrameColor }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { right: 0, top: 0 },
              width: MOBILE_SELECTED_FRAME_THICKNESS,
              height: cardHeight + MOBILE_SELECTED_FRAME_PAD * 2,
            }}
            uiBackground={{ color: mobileFrameColor }}
          />
        </UiEntity>
      )}
      <UiEntity
        uiTransform={{
          width: cardWidth,
          height: cardHeight,
          zIndex: 3,
        }}
        uiBackground={{
          texture: { src: MAP_EXTENDED_ATLAS, wrapMode: 'clamp' },
          textureMode: 'stretch',
          uvs: extendedAtlasUvsRotatedRight(
            mode === 'own' ? MAP_EXT_OWN_RECT :
            mode === 'available' ? MAP_EXT_EMPTY_RECT :
            MAP_EXT_OCCUPIED_RECT
          ),
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: 12, bottom: 10 },
            width: cardWidth - 24,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: { r: 0.31, g: 0.18, b: 0.08, a: 0.92 } }}
        >
          <Label
            value={title}
            fontSize={16}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            textAlign="middle-center"
            uiTransform={{
              width: cardWidth - 36,
              height: 20,
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

const MapPlayerMarker = ({
  marker,
  size,
  inset,
}: {
  marker: MarkerPosition | null
  size: number
  inset: number
}) => {
  if (!marker) return null
  const markerSrc = getPlayerMarkerSrc()
  const renderSize = size * MARKER_SCALE

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: {
          left: inset + marker.left - renderSize / 2,
          top: inset + marker.top - renderSize / 2,
        },
        width: renderSize,
        height: renderSize,
      }}
      uiBackground={{
        texture: { src: markerSrc, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    >
      <Label
      value="•"
        fontSize={1}
        color={{ r: 0, g: 0, b: 0, a: 0 }}
        textAlign="middle-center"
        uiTransform={{ width: size, height: size }}
      />
    </UiEntity>
  )
}

export const FarmSelectPanel = () => {
  const slots = playerState.farmSlots
  const allFull = slots.length > 0 && slots.every((s) => s.wallet !== '')
  const mySlot = slots.find((s) => s.wallet === playerState.wallet)
  const isLoading = slots.length === 0
  const viewMode: MapViewMode | null =
    !mySlot && slots.length > 0 ? 'waiting'
    : mySlot ? 'overview'
    : null

  if (viewMode) {
    const slotById = new Map(slots.map((slot) => [slot.slotId, slot]))
    const highlightedSlotId = getHighlightedSlotId()
    const defaultSelectedSlotId = getDefaultSelectedSlotId(slots, highlightedSlotId)
    if (!slotById.has(selectedExtendedSlotId)) selectedExtendedSlotId = defaultSelectedSlotId
    const selectedSlot = slotById.get(selectedExtendedSlotId) ?? null
    const selectedMode = selectedSlot ? getSlotMode(selectedSlot, highlightedSlotId) : null
    const mapGridWidth = MAP_EXT_TILE_W * 3 + MAP_EXT_ROAD_X * 2
    const mapGridHeight = MAP_EXT_TILE_H * 3 + MAP_EXT_ROAD_Y * 2
    const mapGridLeft = MAP_EXT_WINDOW_LEFT + Math.round((MAP_EXT_WINDOW_W - mapGridWidth) / 2)
    const mapGridTop = MAP_EXT_WINDOW_TOP + Math.round((MAP_EXT_WINDOW_H - mapGridHeight) / 2)
    const miniMapWidth = MINIMAP_GRID_W
    const miniMapHeight = MINIMAP_GRID_H
    const miniGridWidth = MINI_TILE_W * 3 + MINI_ROAD * 2
    const miniGridHeight = MINI_TILE_H * 3 + MINI_ROAD * 2
    const bigMarker = getPlayerMarkerPosition(mapGridWidth, mapGridHeight)
    const miniMarker = getPlayerMarkerPosition(miniGridWidth, miniGridHeight)
    const canClaimSelectedEmptyFarm = !!selectedSlot && selectedMode === 'available' && !mySlot
    const bottomButtonLabel =
      selectedSlot && selectedMode === 'own' ? 'Back to My Plot' :
      selectedSlot && selectedMode === 'occupied' ? `Visit ${formatExtendedFarmTitle(selectedSlot, selectedMode, BUTTON_FARM_TITLE_MAX_CHARS)}` :
      selectedSlot && selectedMode === 'available' ? (canClaimSelectedEmptyFarm ? 'Claim Empty Farm' : 'Visit Empty Farm') :
      mySlot ? 'Back to My Plot' :
      'Close Map'
    const handleBottomButton =
      selectedSlot && selectedMode === 'own'
        ? () => {
            playSound('buttonclick')
            teleportToFarm(selectedSlot.slotId)
          }
        : selectedSlot && selectedMode === 'occupied'
          ? () => visitSlot(selectedSlot)
        : selectedSlot && selectedMode === 'available'
            ? (canClaimSelectedEmptyFarm
              ? () => requestClaimSlot(selectedSlot.slotId)
              : () => {
                  playSound('buttonclick')
                  teleportToFarm(selectedSlot.slotId)
                })
            : mySlot
              ? () => {
                  playSound('buttonclick')
                  teleportToFarm(mySlot.slotId)
                }
              : () => closeMap(viewMode)
    const showMiniMap =
      viewMode === 'waiting'
        ? playerState.plazaMapMinimized
        : playerState.activeMenu !== 'farmSelect'
    if (showMiniMap) {
      return (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 180, right: 190 },
            width: MINIMAP_WIDGET_W,
            height: MINIMAP_WIDGET_H,
            pointerFilter: 'block',
          }}
          uiBackground={{
            texture: { src: MINIMAP_ATLAS, wrapMode: 'clamp' },
            textureMode: 'stretch',
            uvs: atlasUvsRotatedRight(MINIMAP_BG_RECT),
          }}
          onMouseDown={openMap}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: MINIMAP_WINDOW_LEFT + MINIMAP_GRID_PAD_X, top: MINIMAP_WINDOW_TOP + MINIMAP_GRID_PAD_Y },
              width: miniMapWidth,
              height: miniMapHeight,
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {MAP_LAYOUT.map((row, rowIndex) => (
              <UiEntity
                key={`mini-row-${rowIndex}`}
                uiTransform={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                {row.map((slotId, colIndex) => {
                  if (slotId === -1) return <MiniMapPlazaTile key={`mini-plaza-${rowIndex}-${colIndex}`} />
                  const slot = slotById.get(slotId)
                  if (!slot) return <UiEntity key={`mini-empty-${slotId}`} />
                  return <MiniMapFarmTile key={`mini-slot-${slotId}`} mode={getSlotMode(slot, highlightedSlotId)} />
                })}
              </UiEntity>
            ))}
            <MapPlayerMarker marker={miniMarker} size={MINI_MARKER_SIZE} inset={0} />
          </UiEntity>
        </UiEntity>
      )
    }

    return (
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
            position: { top: MAP_PANEL_TOP },
            width: MAP_EXT_WIDGET_W,
            height: MAP_EXT_WIDGET_H,
            pointerFilter: 'block',
          }}
          uiBackground={{
            texture: { src: MAP_EXTENDED_ATLAS, wrapMode: 'clamp' },
            textureMode: 'stretch',
            uvs: extendedAtlasUvsRotatedRight(MAP_EXT_BG_RECT),
          }}
        >
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { left: mapGridLeft, top: mapGridTop },
                width: mapGridWidth,
                height: mapGridHeight,
                flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {MAP_LAYOUT.map((row, rowIndex) => (
              <UiEntity
                key={`map-row-${rowIndex}`}
                uiTransform={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                {row.map((slotId, colIndex) => {
                  if (slotId === -1) {
                    return <UiEntity key={`plaza-${rowIndex}-${colIndex}`} uiTransform={{ width: MAP_EXT_TILE_W, height: MAP_EXT_TILE_H }} />
                  }

                  const slot = slotById.get(slotId)
                  return slot ? (
                    <ExtendedMapFarmTile
                      key={`map-slot-${slotId}`}
                      slot={slot}
                      mode={getSlotMode(slot, highlightedSlotId)}
                      selected={slot.slotId === selectedExtendedSlotId}
                      onSelect={() => {
                        playSound('buttonclick')
                        selectedExtendedSlotId = slot.slotId
                      }}
                    />
                  ) : <UiEntity key={`empty-${slotId}`} />
                })}
              </UiEntity>
            ))}
            <MapPlayerMarker marker={bigMarker} size={BIG_MARKER_SIZE} inset={0} />
          </UiEntity>
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: MAP_EXT_BUTTON_LEFT, top: MAP_EXT_BUTTON_TOP },
              width: MAP_EXT_BUTTON_W,
              height: MAP_EXT_BUTTON_H,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={handleBottomButton}
          >
            <OutlinedLabel
              value={bottomButtonLabel}
              fontSize={21}
              color={{ r: 0.98, g: 0.83, b: 0.32, a: 1 }}
              outlineColor={{ r: 0, g: 0, b: 0, a: 1 }}
              textAlign="middle-center"
              outlineSize={2}
              width={MAP_EXT_BUTTON_W - 20}
              height={28}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 10, right: 10 },
              width: 56,
              height: 56,
            }}
            onMouseDown={() => closeMap(viewMode)}
          />
        </UiEntity>
      </UiEntity>
    )
  }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        pointerFilter: 'block',
      }}
      uiBackground={{ color: { r: 0.05, g: 0.04, b: 0.02, a: 0.97 } }}
    >
      <Label
        value="Welcome to CozyFarm"
        fontSize={48}
        color={C.header}
        textAlign="middle-center"
        uiTransform={{ margin: { bottom: 12 } }}
      />

      {mySlot ? (
        <Label
          value={`You own Farm ${mySlot.slotId + 1}`}
          fontSize={26}
          color={{ r: 0.2, g: 0.9, b: 0.3, a: 1 }}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 32 } }}
        />
      ) : allFull ? (
        <UiEntity uiTransform={{ alignItems: 'center', margin: { bottom: 32 } }}>
          <Label
            value="All 8 farms are currently occupied. Please wait for a slot to open."
            fontSize={24}
            color={C.orange}
            textAlign="middle-center"
            uiTransform={{ margin: { bottom: 10 } }}
          />
          <Label
            value="But don't worry, you can still visit your friends' farms."
            fontSize={22}
            color={C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>
      ) : (
        <Label
          value="Choose a farm to start your journey!"
          fontSize={26}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 32 } }}
        />
      )}

      {isLoading ? (
        <Label value="Loading farms..." fontSize={28} color={C.textMute} textAlign="middle-center" />
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {slots.map((slot) => (
            <SlotCard key={slot.slotId} slot={slot} />
          ))}
        </UiEntity>
      )}
    </UiEntity>
  )
}
