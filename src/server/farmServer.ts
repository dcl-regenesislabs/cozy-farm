import { engine, AvatarBase, PlayerIdentityData } from '@dcl/sdk/ecs'
import { room } from '../shared/farmMessages'
import {
  createFarmProgressStore, emptyFarm, farmSaveToPayload,
  updatePlayerRegistry, loadPlayerRegistryPage, loadBeautyLeaderboard,
} from './storage/playerFarm'
import { WORKER_DEBUG_ENABLED } from '../shared/worker'

// ---------------------------------------------------------------------------
// In-memory farm slot registry — session-based, not persisted.
// Slots are assigned when players connect and released when they disconnect.
// Max 8 slots.
// ---------------------------------------------------------------------------
const MAX_FARM_SLOTS = 2
const activeSlots  = new Map<number, string>()   // slot → wallet
const playerSlots  = new Map<string, number>()    // wallet → slot

function assignSlot(wallet: string): number | null {
  // Already has a slot in this session? Reuse it.
  const existing = playerSlots.get(wallet)
  if (existing !== undefined) return existing
  // Find first free slot
  for (let i = 0; i < MAX_FARM_SLOTS; i++) {
    if (!activeSlots.has(i)) {
      activeSlots.set(i, wallet)
      playerSlots.set(wallet, i)
      return i
    }
  }
  return null  // No free slots — player goes to plaza
}

function releaseSlot(wallet: string): number | null {
  const slot = playerSlots.get(wallet)
  if (slot === undefined) return null
  activeSlots.delete(slot)
  playerSlots.delete(wallet)
  return slot
}

function claimSpecificSlot(wallet: string, slotId: number): { success: boolean; reason: string; slotId: number } {
  const existing = playerSlots.get(wallet)
  if (existing !== undefined) {
    return { success: false, reason: 'already_claimed', slotId: existing }
  }
  if (slotId < 0 || slotId >= MAX_FARM_SLOTS) {
    return { success: false, reason: 'invalid_slot', slotId: -1 }
  }
  if (activeSlots.has(slotId)) {
    return { success: false, reason: 'slot_taken', slotId }
  }
  activeSlots.set(slotId, wallet)
  playerSlots.set(wallet, slotId)
  return { success: true, reason: 'ok', slotId }
}

function getActiveSlotsPayload() {
  return Array.from({ length: MAX_FARM_SLOTS }, (_, i) => ({
    slotId: i,
    wallet: activeSlots.get(i) ?? '',
    displayName: activeSlots.get(i) ? getDisplayName(activeSlots.get(i)!) : '',
    claimedAt: 0,
  }))
}

function buildFarmSlotVisualPayload(slotId: number, wallet: string) {
  const farm = store.get(wallet)
  if (!farm) return null

  return {
    slotId,
    wallet,
    plotStates: farm.plotStates,
    beautySlots: farm.beautySlots,
    chickenCoopOwned: farm.chickenCoopOwned,
    chickens: farm.chickens,
    chickenFoodInBowl: farm.chickenFoodInBowl,
    chickenCoopDirtyAt: farm.chickenCoopDirtyAt,
    pigPenOwned: farm.pigPenOwned,
    pigs: farm.pigs,
    pigFoodInBowl: farm.pigFoodInBowl,
    pigPenDirtyAt: farm.pigPenDirtyAt,
    compostBinUnlocked: farm.compostBinUnlocked,
  }
}

// ---------------------------------------------------------------------------
// Auto-save interval (seconds) — same cadence as reference project
// ---------------------------------------------------------------------------
const AUTOSAVE_INTERVAL_SECONDS = 20

const store = createFarmProgressStore()
const loadedAddresses = new Set<string>()
let autosaveAccumulator = 0

// ---------------------------------------------------------------------------
// Beauty leaderboard cache — avoids hammering Storage on every open
// ---------------------------------------------------------------------------
const LEADERBOARD_CACHE_TTL_MS = 60_000
let leaderboardCache: Awaited<ReturnType<typeof loadBeautyLeaderboard>> | null = null
let leaderboardCachedAt = 0

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

async function loadAndSend(address: string, requestId: string): Promise<void> {
  const normalized = address.toLowerCase()
  const farm = await store.load(normalized)

  // Update display name on every connect so it stays current
  farm.wallet = normalized

  const payload = farmSaveToPayload(farm)
  void room.send('farmStateLoaded', { requester: normalized, requestId, payload })

  loadedAddresses.add(normalized)
  console.log(`[FarmServer] Loaded farm for ${getDisplayName(normalized)} (${normalized}) — coins: ${farm.coins}`)

  // Register in directory on every connect so returning players appear immediately
  void updatePlayerRegistry(normalized, farm.level, getDisplayName(normalized))

  // Assign in-memory session slot
  const slotId = assignSlot(normalized)
  const slots  = getActiveSlotsPayload()
  void room.send('farmSlotsLoaded', { requester: normalized, slots })

  for (const [activeSlotId, activeWallet] of activeSlots.entries()) {
    const visualPayload = buildFarmSlotVisualPayload(activeSlotId, activeWallet)
    if (!visualPayload) continue
    void room.send('farmSlotVisualUpdated', visualPayload, { to: [normalized] })
  }

  if (slotId !== null) {
    console.log(`[FarmServer] Slot ${slotId} assigned to ${normalized}`)
    const visualPayload = buildFarmSlotVisualPayload(slotId, normalized)
    if (visualPayload) void room.send('farmSlotVisualUpdated', visualPayload)
  } else {
    console.log(`[FarmServer] No free slots for ${normalized} — spawning in plaza`)
  }
}

function sendWorkerStatus(address: string): void {
  const normalized = address.toLowerCase()
  const farm = store.get(normalized)
  if (!farm) return

  void room.send('workerStatusUpdated', {
    requester: normalized,
    coinsDelta: 0,
    workerOutstandingWages: farm.workerOutstandingWages,
    workerUnpaidDays: farm.workerUnpaidDays,
    workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
  }, { to: [normalized] })
}

async function cleanupDisconnectedPlayers(): Promise<void> {
  const connected = new Set<string>()
  for (const [_entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    connected.add(identity.address.toLowerCase())
  }

  for (const address of [...loadedAddresses]) {
    if (connected.has(address)) continue

    await store.saveAndEvict(address)
    loadedAddresses.delete(address)

    const slotId = releaseSlot(address)
    if (slotId !== null) {
      console.log(`[FarmServer] Slot ${slotId} released after presence cleanup`)
      void room.send('farmSlotReleased', { slotId })
      void room.send('farmSlotsLoaded', { requester: address, slots: getActiveSlotsPayload() })
    }
  }
}

async function ensurePlayerSessionLoaded(address: string): Promise<number | null> {
  const normalized = address.toLowerCase()
  if (!loadedAddresses.has(normalized)) {
    const farm = await store.load(normalized)
    farm.wallet = normalized
    loadedAddresses.add(normalized)
    void updatePlayerRegistry(normalized, farm.level, getDisplayName(normalized), farm.beautyScore)
  }

  const slotId = assignSlot(normalized)
  void room.send('farmSlotsLoaded', { requester: normalized, slots: getActiveSlotsPayload() })

  for (const [activeSlotId, activeWallet] of activeSlots.entries()) {
    const visualPayload = buildFarmSlotVisualPayload(activeSlotId, activeWallet)
    if (!visualPayload) continue
    void room.send('farmSlotVisualUpdated', visualPayload, { to: [normalized] })
  }

  return slotId
}

// ---------------------------------------------------------------------------
// Auto-save system — runs every frame, flushes dirty entries every N seconds
// ---------------------------------------------------------------------------
function farmAutosaveSystem(dt: number): void {
  autosaveAccumulator += dt
  if (autosaveAccumulator < AUTOSAVE_INTERVAL_SECONDS) return
  autosaveAccumulator = 0
  void (async () => {
    await Promise.all([...loadedAddresses].map(async (address) => {
      const before = store.get(address)
      const prevCoins = before?.coins ?? 0
      const prevOutstanding = before?.workerOutstandingWages ?? 0
      const prevUnpaidDays = before?.workerUnpaidDays ?? 0
      const prevLastProcessedAt = before?.workerLastWageProcessedAt ?? 0
      const farm = await store.load(address)

      const changed =
        prevCoins !== farm.coins ||
        prevOutstanding !== farm.workerOutstandingWages ||
        prevUnpaidDays !== farm.workerUnpaidDays ||
        prevLastProcessedAt !== farm.workerLastWageProcessedAt
      if (!changed) return

      void room.send('workerStatusUpdated', {
        requester: address,
        coinsDelta: farm.coins - prevCoins,
        workerOutstandingWages: farm.workerOutstandingWages,
        workerUnpaidDays: farm.workerUnpaidDays,
        workerLastWageProcessedAt: farm.workerLastWageProcessedAt,
      }, { to: [address] })
    }))

    await store.saveDirty()
    await cleanupDisconnectedPlayers()
  })()
}

// ---------------------------------------------------------------------------
// Server setup — call once from index.ts behind isServer()
// ---------------------------------------------------------------------------
export function setupFarmServer(): void {
  // Load farm state when player connects
  room.onMessage('playerLoadFarm', async (data, context) => {
    if (!context) return
    try {
      await loadAndSend(context.from, data.requestId)
    } catch (err) {
      console.error('[FarmServer] loadAndSend failed, sending fresh farm:', err)
      const fresh = emptyFarm(context.from.toLowerCase())
      void room.send('farmStateLoaded', {
        requester: context.from.toLowerCase(),
        requestId: data.requestId,
        payload: farmSaveToPayload(fresh),
      })
    }
  })

  // Receive and persist farm state from client
  room.onMessage('playerSaveFarm', async (_data, context) => {
    if (!context) return
    const normalized = context.from.toLowerCase()
    try {

    if (!loadedAddresses.has(normalized)) {
      console.log(`[FarmServer] Save received before load tracking for ${normalized}; recovering session`)
      await ensurePlayerSessionLoaded(normalized)
    }

    store.applyPayload(normalized, _data)
    console.log(`[FarmServer] Save received for ${normalized} — coins: ${_data.coins}`)

    const saved = store.get(normalized)
    if (saved) void updatePlayerRegistry(normalized, saved.level, getDisplayName(normalized), saved.beautyScore)
    const slotId = playerSlots.get(normalized)
    if (slotId !== undefined) {
      const visualPayload = buildFarmSlotVisualPayload(slotId, normalized)
      if (visualPayload) void room.send('farmSlotVisualUpdated', visualPayload)
    }
    // Bust leaderboard cache on every save so rankings stay fresh
    leaderboardCache = null
    } catch (err) {
      console.error(`[FarmServer] playerSaveFarm failed for ${normalized}:`, err)
    }
  })

  room.onMessage('payWorkerWages', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    try {
      const result = await store.payWorkerWages(requester)
      void room.send('workerWagePaymentResult', {
        requester,
        success: result.success,
        reason: result.reason,
        coinsDelta: result.coinsDelta,
        workerOutstandingWages: result.workerOutstandingWages,
        workerUnpaidDays: result.workerUnpaidDays,
        workerLastWageProcessedAt: result.workerLastWageProcessedAt,
      }, { to: [requester] })
    } catch (err) {
      console.error('[FarmServer] payWorkerWages error:', err)
      sendWorkerStatus(requester)
      void room.send('workerWagePaymentResult', {
        requester,
        success: false,
        reason: 'server_error',
        coinsDelta: 0,
        workerOutstandingWages: store.get(requester)?.workerOutstandingWages ?? 0,
        workerUnpaidDays: store.get(requester)?.workerUnpaidDays ?? 0,
        workerLastWageProcessedAt: store.get(requester)?.workerLastWageProcessedAt ?? 0,
      }, { to: [requester] })
    }
  })

  room.onMessage('debugWorkerAction', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    if (!WORKER_DEBUG_ENABLED) {
      const farm = store.get(requester)
      void room.send('debugWorkerStateUpdated', {
        requester,
        success: false,
        reason: 'debug_disabled',
        coins: farm?.coins ?? 0,
        cropsUnlocked: farm?.cropsUnlocked ?? false,
        farmerHired: farm?.farmerHired ?? false,
        farmerSeeds: farm?.farmerSeeds ?? [],
        workerOutstandingWages: farm?.workerOutstandingWages ?? 0,
        workerUnpaidDays: farm?.workerUnpaidDays ?? 0,
        workerLastWageProcessedAt: farm?.workerLastWageProcessedAt ?? 0,
      }, { to: [requester] })
      return
    }
    try {
      const result = await store.debugWorkerAction(
        requester,
        typeof _data.action === 'string' ? _data.action : '',
        typeof _data.amount === 'number' ? _data.amount : 0,
      )
      void room.send('debugWorkerStateUpdated', {
        requester,
        success: result.success,
        reason: result.reason,
        coins: result.coins,
        cropsUnlocked: result.cropsUnlocked,
        farmerHired: result.farmerHired,
        farmerSeeds: result.farmerSeeds,
        workerOutstandingWages: result.workerOutstandingWages,
        workerUnpaidDays: result.workerUnpaidDays,
        workerLastWageProcessedAt: result.workerLastWageProcessedAt,
      }, { to: [requester] })
    } catch (err) {
      console.error('[FarmServer] debugWorkerAction error:', err)
      const farm = store.get(requester)
      void room.send('debugWorkerStateUpdated', {
        requester,
        success: false,
        reason: 'server_error',
        coins: farm?.coins ?? 0,
        cropsUnlocked: farm?.cropsUnlocked ?? false,
        farmerHired: farm?.farmerHired ?? false,
        farmerSeeds: farm?.farmerSeeds ?? [],
        workerOutstandingWages: farm?.workerOutstandingWages ?? 0,
        workerUnpaidDays: farm?.workerUnpaidDays ?? 0,
        workerLastWageProcessedAt: farm?.workerLastWageProcessedAt ?? 0,
      }, { to: [requester] })
    }
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

  // Serve the beauty leaderboard (cached 60s)
  room.onMessage('loadBeautyLeaderboard', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    try {
      const now = Date.now()
      if (!leaderboardCache || now - leaderboardCachedAt > LEADERBOARD_CACHE_TTL_MS) {
        leaderboardCache   = await loadBeautyLeaderboard(requester)
        leaderboardCachedAt = now
      }
      // currentRank/currentScore must be personalized even when using cached list
      const { entries } = leaderboardCache
      const myEntry = entries.find((e) => e.address === requester)
      void room.send('beautyLeaderboardLoaded', {
        requester:    requester,
        entries,
        currentRank:  myEntry?.rank  ?? 0,
        currentScore: myEntry?.beautyScore ?? 0,
      })
    } catch (err) {
      console.error('[FarmServer] loadBeautyLeaderboard error:', err)
      void room.send('beautyLeaderboardLoaded', { requester, entries: [], currentRank: 0, currentScore: 0 })
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

  room.onMessage('socialLikeFarm', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    const target    = ((_data.targetWallet as string) ?? '').toLowerCase()
    try {
      const result = await store.likeFarm(target, requester, getDisplayName(requester))
      void room.send('socialLikeResult', {
        requester,
        targetWallet: target,
        success:      result.success,
        reason:       result.reason,
        likeCount:    result.likeCount,
        rewardCoins:  result.rewardCoins,
      }, { to: [requester] })
      if (result.success) {
        const targetFarm = store.get(target)
        const reward = targetFarm?.mailbox[0]
        if (targetFarm && reward) {
          void room.send('socialOwnerRewardReceived', {
            ownerWallet: target,
            reward,
            totalLikesReceived: targetFarm.totalLikesReceived,
            notificationText: `${reward.fromName} liked your farm!`,
          }, { to: [target] })
        }
      }
    } catch (err) {
      console.error('[FarmServer] socialLikeFarm error:', err)
      void room.send('socialLikeResult', {
        requester,
        targetWallet: target,
        success:      false,
        reason:       'server_error',
        likeCount:    0,
        rewardCoins:  0,
      }, { to: [requester] })
    }
  })

  room.onMessage('visitorWaterPlot', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    const target    = ((_data.targetWallet as string) ?? '').toLowerCase()
    const plotIndex = typeof _data.plotIndex === 'number' ? _data.plotIndex : -1
    if (!target || plotIndex < 0) return
    try {
      const result = await store.waterFarmByVisitor(target, requester, getDisplayName(requester), plotIndex)
      void room.send('visitorWaterResult', {
        requester,
        targetWallet: target,
        plotIndex,
        success:      result.success,
        reason:       result.reason,
      }, { to: [requester] })
      if (result.success && result.reward) {
        const targetFarm = store.get(target)
        if (targetFarm) {
          void room.send('socialOwnerWaterReceived', {
            ownerWallet:      target,
            reward:           result.reward,
            notificationText: `${result.reward.fromName} watered your crops!`,
          }, { to: [target] })
        }
      }
    } catch (err) {
      console.error('[FarmServer] visitorWaterPlot error:', err)
      void room.send('visitorWaterResult', {
        requester,
        targetWallet: target,
        plotIndex,
        success:      false,
        reason:       'server_error',
      }, { to: [requester] })
    }
  })

  room.onMessage('collectMailbox', async (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    try {
      const result = await store.collectMailbox(requester)
      void room.send('mailboxCollected', {
        requester,
        success: true,
        coins:   result.coins,
        seeds:   result.seeds,
        rewards: result.rewards,
      }, { to: [requester] })
    } catch (err) {
      console.error('[FarmServer] collectMailbox error:', err)
      void room.send('mailboxCollected', {
        requester,
        success: false,
        coins:   0,
        seeds:   [],
        rewards: [],
      }, { to: [requester] })
    }
  })

  // ── Farm slot registry ──────────────────────────────────────────────────────

  room.onMessage('loadFarmSlots', (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    // Return current in-memory slot state
    void room.send('farmSlotsLoaded', { requester, slots: getActiveSlotsPayload() })
  })

  room.onMessage('claimFarmSlot', (_data, context) => {
    if (!context) return
    const requester = context.from.toLowerCase()
    const requestedSlotId = typeof _data.slotId === 'number' ? _data.slotId : -1
    const result = claimSpecificSlot(requester, requestedSlotId)
    const slots = getActiveSlotsPayload()
    void room.send('farmSlotClaimed', {
      requester,
      success: result.success,
      reason:  result.reason,
      slotId:  result.slotId,
      slots,
    })
    if (!result.success) return
    void room.send('farmSlotsLoaded', { requester, slots })
    const visualPayload = buildFarmSlotVisualPayload(result.slotId, requester)
    if (visualPayload) void room.send('farmSlotVisualUpdated', visualPayload)
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

  // Release farm slot and notify all clients to hide this farm
  const slotId = releaseSlot(normalized)
  if (slotId !== null) {
    console.log(`[FarmServer] Slot ${slotId} released — broadcasting farmSlotReleased`)
    void room.send('farmSlotReleased', { slotId })
  }
}
