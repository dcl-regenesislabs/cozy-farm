import { engine, AvatarBase, PlayerIdentityData } from '@dcl/sdk/ecs'
import { room } from '../shared/farmMessages'
import { createFarmProgressStore, farmSaveToPayload } from './storage/playerFarm'

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
