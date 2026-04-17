import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { PanelShell, C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'
import { requestPlayerRegistry, requestOtherFarm, visitUiCallbacks } from '../services/visitService'
import { registryCallbacks } from '../services/saveService'
import { PlayerEntry, PlayerRegistryResponse } from '../shared/farmMessages'

// ---------------------------------------------------------------------------
// Module-level mutable state
// ---------------------------------------------------------------------------
const state = {
  page:         0,
  players:      [] as PlayerEntry[],
  totalPages:   1,
  loading:      false,
  visitingAddr: '',
  errorAddr:    '',
  initialized:  false,
}

export function resetMailboxState(): void {
  state.initialized  = false
  state.loading      = false
  state.players      = []
  state.errorAddr    = ''
  state.visitingAddr = ''
}

function shortenAddr(addr: string): string {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function displayLabel(entry: PlayerEntry): string {
  if (entry.displayName && entry.displayName.length > 0) return entry.displayName
  return shortenAddr(entry.address)
}

function onRegistryLoaded(data: PlayerRegistryResponse): void {
  state.players    = data.players
  state.totalPages = data.totalPages
  state.page       = data.page
  state.loading    = false
}

function onVisitError(address: string): void {
  if (state.visitingAddr === address) {
    state.visitingAddr = ''
    state.errorAddr    = address
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const MailboxMenu = () => {
  registryCallbacks.onRegistryLoaded = onRegistryLoaded
  visitUiCallbacks.onOtherFarmError  = onVisitError

  if (!state.initialized) {
    state.initialized = true
    state.loading     = true
    requestPlayerRegistry(0)
    setTimeout(() => {
      if (state.loading) {
        state.loading   = false
        state.errorAddr = '__timeout__'
      }
    }, 6000)
  }

  const close = () => {
    playSound('buttonclick')
    playerState.activeMenu = 'none'
    resetMailboxState()
  }

  return (
    <PanelShell title="Farmers Directory" onClose={close}>

      {/* Loading */}
      {state.loading && (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Label value="Loading…" fontSize={30} color={C.textMute} textAlign="middle-center" />
        </UiEntity>
      )}

      {/* Empty / timeout */}
      {!state.loading && state.players.length === 0 && (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Label
            value={state.errorAddr === '__timeout__'
              ? 'Could not reach the server.\nThis feature requires a deployed scene.'
              : 'No farmers found yet.\nSave your farm to appear here!'}
            fontSize={26}
            color={state.errorAddr === '__timeout__' ? C.orange : C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>
      )}

      {/* Card grid — 3 per row */}
      {!state.loading && state.players.length > 0 && (
        <UiEntity
          uiTransform={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            width: '100%',
          }}
        >
          {state.players.map((entry) => (
            <FarmerCard
              entry={entry}
              isVisiting={state.visitingAddr === entry.address}
              isError={state.errorAddr === entry.address}
            />
          ))}
        </UiEntity>
      )}

      {/* Visit error hint */}
      {state.errorAddr !== '' && state.errorAddr !== '__timeout__' && !state.loading && (
        <Label
          value={`Could not load ${displayLabel({ address: state.errorAddr, level: 0, displayName: '' })}'s farm.`}
          fontSize={22}
          color={C.orange}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { top: 6 } }}
        />
      )}

      {/* Pagination */}
      {!state.loading && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: { top: 8 },
          }}
        >
          <UiEntity
            uiTransform={{ width: 72, height: 48, alignItems: 'center', justifyContent: 'center', margin: { right: 20 } }}
            uiBackground={{ color: state.page > 0 ? { r: 0.25, g: 0.18, b: 0.08, a: 1 } : { r: 0.12, g: 0.10, b: 0.06, a: 1 } }}
            onMouseDown={state.page > 0 ? () => {
              playSound('buttonclick')
              state.loading = true
              state.errorAddr = ''
              requestPlayerRegistry(state.page - 1)
            } : undefined}
          >
            <Label value="<" fontSize={26} color={state.page > 0 ? C.textMain : C.textMute} textAlign="middle-center" />
          </UiEntity>

          <Label
            value={`${state.page + 1} / ${state.totalPages}`}
            fontSize={24}
            color={C.textMute}
            textAlign="middle-center"
            uiTransform={{ width: 110 }}
          />

          <UiEntity
            uiTransform={{ width: 72, height: 48, alignItems: 'center', justifyContent: 'center', margin: { left: 20 } }}
            uiBackground={{ color: state.page < state.totalPages - 1 ? { r: 0.25, g: 0.18, b: 0.08, a: 1 } : { r: 0.12, g: 0.10, b: 0.06, a: 1 } }}
            onMouseDown={state.page < state.totalPages - 1 ? () => {
              playSound('buttonclick')
              state.loading = true
              state.errorAddr = ''
              requestPlayerRegistry(state.page + 1)
            } : undefined}
          >
            <Label value=">" fontSize={26} color={state.page < state.totalPages - 1 ? C.textMain : C.textMute} textAlign="middle-center" />
          </UiEntity>
        </UiEntity>
      )}
    </PanelShell>
  )
}

// ---------------------------------------------------------------------------
// Farmer card — box layout, 3 per row
// ---------------------------------------------------------------------------
type CardProps = { entry: PlayerEntry; isVisiting: boolean; isError: boolean }

const AVATAR_COLORS = [
  { r: 0.55, g: 0.25, b: 0.10, a: 1 },
  { r: 0.15, g: 0.40, b: 0.55, a: 1 },
  { r: 0.30, g: 0.50, b: 0.20, a: 1 },
  { r: 0.45, g: 0.20, b: 0.50, a: 1 },
  { r: 0.55, g: 0.40, b: 0.10, a: 1 },
]

function avatarColor(address: string) {
  const idx = parseInt(address.slice(-2), 16) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function initials(entry: PlayerEntry): string {
  if (entry.displayName && entry.displayName.length > 0) {
    return entry.displayName.slice(0, 2).toUpperCase()
  }
  return entry.address.slice(2, 4).toUpperCase()
}

const FarmerCard = ({ entry, isVisiting, isError }: CardProps) => (
  <UiEntity
    uiTransform={{
      width: 370,
      height: 220,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: { top: 18, bottom: 16, left: 12, right: 12 },
      margin: { right: 15, bottom: 15 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    {/* Avatar circle — colored placeholder with initials */}
    <UiEntity
      uiTransform={{
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: avatarColor(entry.address) }}
    >
      <Label
        value={initials(entry)}
        fontSize={28}
        color={C.textMain}
        textAlign="middle-center"
      />
    </UiEntity>

    {/* Name + address */}
    <UiEntity uiTransform={{ width: '100%', alignItems: 'center', flexDirection: 'column' }}>
      <Label
        value={entry.displayName || shortenAddr(entry.address)}
        fontSize={24}
        color={isError ? C.orange : C.header}
        textAlign="middle-center"
        uiTransform={{ width: '100%' }}
      />
      {entry.displayName && entry.displayName.length > 0 && (
        <Label
          value={shortenAddr(entry.address)}
          fontSize={18}
          color={C.textMute}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { top: 2 } }}
        />
      )}
    </UiEntity>

    {/* Level + Visit button row */}
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Label
        value={`Lv ${entry.level}`}
        fontSize={22}
        color={C.gold}
        textAlign="middle-left"
        uiTransform={{ width: 80 }}
      />

      <UiEntity
        uiTransform={{ width: 150, height: 46, alignItems: 'center', justifyContent: 'center' }}
        uiBackground={{ color: isVisiting
          ? { r: 0.18, g: 0.40, b: 0.18, a: 1 }
          : { r: 0.20, g: 0.55, b: 0.20, a: 1 } }}
        onMouseDown={!isVisiting ? () => {
          playSound('buttonclick')
          state.visitingAddr = entry.address
          state.errorAddr    = ''
          playerState.activeMenu = 'none'
          requestOtherFarm(entry.address)
        } : undefined}
      >
        <Label
          value={isVisiting ? '…' : 'Visit'}
          fontSize={22}
          color={C.textMain}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  </UiEntity>
)
