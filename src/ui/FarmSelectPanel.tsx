import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { engine, Transform } from '@dcl/sdk/ecs'
import { playerState } from '../game/gameState'
import { room } from '../shared/farmMessages'
import type { FarmSlot } from '../shared/farmMessages'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { FARM_SPAWN_POSITIONS, PLAZA_SPAWN_POSITION } from '../systems/interactionSetup'
import { teleportToSlot } from '../services/saveService'

const MAP_TILE_W = 176
const MAP_TILE_H = 126
const MAP_ROAD = 16
// 3×3 grid encoding 8 farm slots + central plaza (-1). Matches server MAX_FARM_SLOTS = 8.
const MAP_LAYOUT = [
  [0, 7, 6],
  [1, -1, 5],
  [2, 3, 4],
] as const
const MINI_TILE_W = 52
const MINI_TILE_H = 38
const MINI_ROAD = 5
const MAP_WORLD_PADDING = 40
const BIG_MARKER_SIZE = 20
const MINI_MARKER_SIZE = 14
const MAP_PANEL_TOP = 190

type MapSlotMode = 'available' | 'occupied' | 'own'
type MapViewMode = 'waiting' | 'overview'
type MarkerPosition = { left: number; top: number }

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
      color:
        mode === 'own' ? { r: 0.56, g: 0.47, b: 0.08, a: 1 } :
        mode === 'available' ? { r: 0.16, g: 0.28, b: 0.52, a: 1 } :
        { r: 0.17, g: 0.42, b: 0.16, a: 1 },
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
    uiBackground={{ color: { r: 0.17, g: 0.14, b: 0.10, a: 1 } }}
  />
)

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

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: {
          left: inset + marker.left - size / 2,
          top: inset + marker.top - size / 2,
        },
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Label
      value="•"
        fontSize={size * 2.2}
        color={{ r: 0.88, g: 0.18, b: 0.12, a: 1 }}
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
    const mapCardWidth = MAP_TILE_W * 3 + MAP_ROAD * 2 + 24
    const mapCardHeight = MAP_TILE_H * 3 + MAP_ROAD * 2 + 24
    const mapGridWidth = MAP_TILE_W * 3 + MAP_ROAD * 2
    const mapGridHeight = MAP_TILE_H * 3 + MAP_ROAD * 2
    const miniMapWidth = MINI_TILE_W * 3 + MINI_ROAD * 2 + 12
    const miniMapHeight = MINI_TILE_H * 3 + MINI_ROAD * 2 + 12
    const miniGridWidth = MINI_TILE_W * 3 + MINI_ROAD * 2
    const miniGridHeight = MINI_TILE_H * 3 + MINI_ROAD * 2
    const bigMarker = getPlayerMarkerPosition(mapGridWidth, mapGridHeight)
    const miniMarker = getPlayerMarkerPosition(miniGridWidth, miniGridHeight)
    const showMiniMap =
      viewMode === 'waiting'
        ? playerState.plazaMapMinimized
        : playerState.activeMenu !== 'farmSelect'
    const headerTitle = viewMode === 'waiting' ? 'Plaza Map' : 'Neighborhood Map'
    const headerLine1 = viewMode === 'waiting'
      ? (allFull
        ? 'All 8 farms are currently occupied. Please wait for a slot to open.'
        : 'A farm slot is available. Claim it from the map below.')
      : `Farm ${mySlot!.slotId + 1} is yours. Yellow marks your parcel.`
    const headerLine2 = viewMode === 'waiting'
      ? (allFull
        ? "But don't worry, you can still visit your friends' farms."
        : 'Blue parcels are free to claim. Green parcels are occupied.')
      : 'Tap a green farm to visit. Tap Home to return to your parcel.'

    if (showMiniMap) {
      return (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 220, right: 220 },
            width: miniMapWidth + 20,
            height: miniMapHeight + 58,
            padding: { top: 10, bottom: 10, left: 10, right: 10 },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerFilter: 'block',
          }}
          uiBackground={{ color: { r: 0.09, g: 0.07, b: 0.04, a: 0.94 } }}
          onMouseDown={openMap}
        >
          <Label
            value={viewMode === 'waiting' ? 'Plaza Map' : 'Map'}
            fontSize={18}
            color={C.header}
            textAlign="middle-center"
            uiTransform={{ width: miniMapWidth, height: 16 }}
          />
          <UiEntity
            uiTransform={{
              width: miniMapWidth,
              height: miniMapHeight,
              padding: { top: 6, bottom: 6, left: 6, right: 6 },
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            uiBackground={{ color: { r: 0.03, g: 0.03, b: 0.03, a: 1 } }}
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
            <MapPlayerMarker marker={miniMarker} size={MINI_MARKER_SIZE} inset={6} />
          </UiEntity>
          <Label
            value="Open"
            fontSize={14}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ width: miniMapWidth, height: 14 }}
          />
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
            width: 760,
            height: 730,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: { top: 22, bottom: 22, left: 22, right: 22 },
            pointerFilter: 'block',
          }}
          uiBackground={{ color: { r: 0.09, g: 0.07, b: 0.04, a: 0.96 } }}
        >
          <Label
            value={headerTitle}
            fontSize={34}
            color={C.header}
            textAlign="middle-center"
            uiTransform={{ width: 620, height: 34, margin: { bottom: 10 } }}
          />
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: 18, right: 18 },
              width: 68,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            uiBackground={{ color: { r: 0.20, g: 0.08, b: 0.04, a: 1 } }}
            onMouseDown={() => closeMap(viewMode)}
          >
            <Label value="Close" fontSize={16} color={C.orange} textAlign="middle-center" uiTransform={{ width: 52, height: 20 }} />
          </UiEntity>
          <Label
            value={headerLine1}
            fontSize={21}
            color={viewMode === 'waiting' ? C.orange : C.header}
            textAlign="middle-center"
            uiTransform={{ width: 620, height: 72, margin: { bottom: 6 } }}
          />
          <Label
            value={headerLine2}
            fontSize={18}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ width: 620, height: 60, margin: { bottom: 12 } }}
          />
          <UiEntity
            uiTransform={{
              width: mapCardWidth,
              height: mapCardHeight,
              padding: { top: 12, bottom: 12, left: 12, right: 12 },
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            uiBackground={{ color: { r: 0.03, g: 0.03, b: 0.03, a: 1 } }}
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
                    return <MapPlazaTile key={`plaza-${rowIndex}-${colIndex}`} />
                  }

                  const slot = slotById.get(slotId)
                  return slot ? <MapFarmTile key={`map-slot-${slotId}`} slot={slot} mode={getSlotMode(slot, highlightedSlotId)} viewMode={viewMode} /> : <UiEntity key={`empty-${slotId}`} />
                })}
              </UiEntity>
            ))}
            <MapPlayerMarker marker={bigMarker} size={BIG_MARKER_SIZE} inset={12} />
          </UiEntity>
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
