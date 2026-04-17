import { engine, AvatarBase, PlayerIdentityData } from '@dcl/sdk/ecs'
import { room } from '../shared/farmMessages'
import {
  createFarmProgressStore, farmSaveToPayload,
  updatePlayerRegistry, loadPlayerRegistryPage,
} from './storage/playerFarm'

// ---------------------------------------------------------------------------
// Auto-save interval (seconds) — same cadence as reference project
// ---------------------------------------------------------------------------
const AUTOSAVE_INTERVAL_SECONDS = 20

const store = createFarmProgressStore()
const loadedAddresses = new Set<string>()
let autosaveAccumulator = 0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDisplayName(address: string): string {
  const normalized = address.toLowerCase()
  for (const [_entity, identity, avatar] of engine.getEntitiesWith(PlayerIdentityData, AvatarBase)) {
    if (identity.address.toLowerCase() === normalized) {
      return avatar.name || normalized.slice(0, 8)
    }
  }
  return normalized.slice(0, 8)
}

async function loadAndSend(address: string): Promise<void> {
  const normalized = address.toLowerCase()
  const farm = await store.load(normalized)

  // Update display name on every connect so it stays current
  farm.wallet = normalized

  const payload = farmSaveToPayload(farm)
  void room.send('farmStateLoaded', payload)

  loadedAddresses.add(normalized)
  console.log(`[FarmServer] Loaded farm for ${getDisplayName(normalized)} (${normalized}) — coins: ${farm.coins}`)

  // Register in directory on every connect so returning players appear immediately
  void updatePlayerRegistry(normalized, farm.level, getDisplayName(normalized))
}

// ---------------------------------------------------------------------------
// Auto-save system — runs every frame, flushes dirty entries every N seconds
// ---------------------------------------------------------------------------
function farmAutosaveSystem(dt: number): void {
  autosaveAccumulator += dt
  if (autosaveAccumulator < AUTOSAVE_INTERVAL_SECONDS) return
  autosaveAccumulator = 0
  void store.saveDirty()
}

// ---------------------------------------------------------------------------
// Server setup — call once from index.ts behind isServer()
// ---------------------------------------------------------------------------
export function setupFarmServer(): void {
  // Load farm state when player connects
  room.onMessage('playerLoadFarm', async (_data, context) => {
    if (!context) return
    await loadAndSend(context.from)
  })

  // Receive and persist farm state from client
  room.onMessage('playerSaveFarm', (_data, context) => {
    if (!context) return
    const normalized = context.from.toLowerCase()

    // Only accept saves from players whose profile has already been loaded
    // (guards against spoofed saves before a proper load)
    if (!loadedAddresses.has(normalized)) {
      console.error(`[FarmServer] Save rejected — no load on record for ${normalized}`)
      return
    }

    store.applyPayload(normalized, _data)
    console.log(`[FarmServer] Save received for ${normalized} — coins: ${_data.coins}`)

    const saved = store.get(normalized)
    if (saved) void updatePlayerRegistry(normalized, saved.level, getDisplayName(normalized))
  })

  // Serve the paginated player registry
  room.onMessage('loadPlayerRegistry', async (_data, context) => {
    if (!context) return
    const page = typeof _data.page === 'number' ? _data.page : 0
    console.log(`[FarmServer] loadPlayerRegistry page=${page} from ${context.from}`)
    try {
      const { players, totalPages } = await loadPlayerRegistryPage(page)
      console.log(`[FarmServer] registry: ${players.length} players, ${totalPages} pages`)
      void room.send('playerRegistryLoaded', { players, totalPages, page })
    } catch (err) {
      console.error('[FarmServer] loadPlayerRegistry error:', err)
      // Always respond so the client doesn't hang
      void room.send('playerRegistryLoaded', { players: [], totalPages: 1, page })
    }
  })

  // Load another player's farm for viewing
  room.onMessage('loadOtherFarm', async (_data, context) => {
    if (!context) return
    const target    = ((_data.address as string) ?? '').toLowerCase()
    const requester = context.from.toLowerCase()
    if (!target) return
    try {
      const farm    = await store.load(target)
      const payload = farmSaveToPayload(farm)
      void room.send('otherFarmLoaded', { requester, address: target, payload })
    } catch (err) {
      console.error('[FarmServer] loadOtherFarm error:', err)
      void room.send('otherFarmError', { requester, address: target, reason: 'server_error' })
    }
  })

  // Register the auto-save ECS system
  engine.addSystem(farmAutosaveSystem, undefined, 'farm-autosave-system')

  console.log('[FarmServer] Farm server ready')
}

// ---------------------------------------------------------------------------
// Called on player disconnect — save + evict from cache
// ---------------------------------------------------------------------------
export async function onPlayerDisconnect(address: string): Promise<void> {
  const normalized = address.toLowerCase()
  if (!loadedAddresses.has(normalized)) return
  await store.saveAndEvict(normalized)
  loadedAddresses.delete(normalized)
  console.log(`[FarmServer] Saved and evicted ${normalized} on disconnect`)
}
