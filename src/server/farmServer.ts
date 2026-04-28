import { engine, AvatarBase, PlayerIdentityData } from '@dcl/sdk/ecs'
import { room } from '../shared/farmMessages'
import {
  createFarmProgressStore, emptyFarm, farmSaveToPayload,
  updatePlayerRegistry, loadPlayerRegistryPage, loadBeautyLeaderboard,
} from './storage/playerFarm'
import { WORKER_DEBUG_ENABLED } from '../shared/worker'

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
  })()
}

// ---------------------------------------------------------------------------
// Server setup — call once from index.ts behind isServer()
// ---------------------------------------------------------------------------
export function setupFarmServer(): void {
  // Load farm state when player connects
  room.onMessage('playerLoadFarm', async (_data, context) => {
    if (!context) return
    try {
      await loadAndSend(context.from)
    } catch (err) {
      console.error('[FarmServer] loadAndSend failed, sending fresh farm:', err)
      const fresh = emptyFarm(context.from.toLowerCase())
      void room.send('farmStateLoaded', farmSaveToPayload(fresh))
    }
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
    if (saved) void updatePlayerRegistry(normalized, saved.level, getDisplayName(normalized), saved.beautyScore)
    // Bust leaderboard cache on every save so rankings stay fresh
    leaderboardCache = null
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
