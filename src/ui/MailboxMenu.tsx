import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { CropType, CROP_NAMES } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { playerState } from '../game/gameState'
import { requestPlayerRegistry, requestOtherFarm, visitUiCallbacks } from '../services/visitService'
import { registryCallbacks } from '../services/saveService'
import { requestCollectMailbox, socialUiCallbacks } from '../services/socialService'
import { PlayerEntry, PlayerRegistryResponse, type MailboxReward } from '../shared/farmMessages'
import { playSound } from '../systems/sfxSystem'
import { formatPlayerLabel } from '../utils/playerLabel'
import { REVAMP_CONTENT_H, REVAMP_CONTENT_W, RevampPanelFrame } from './RevampPanel'
import { SHARED_PAGINATION_HEIGHT_DESKTOP, SHARED_PAGINATION_HEIGHT_MOBILE, SharedPaginationBar } from './SharedPaginationBar'
import { MiniTextButton, PillTabButton } from './RevampButtons'

const UI_SCALE = 0.8
const ss = (v: number) => Math.round(v * UI_SCALE)

const state = {
  tab: 'directory' as 'directory' | 'mailbox',
  page: 0,
  players: [] as PlayerEntry[],
  totalPages: 1,
  loading: false,
  visitingAddr: '',
  errorAddr: '',
  collecting: false,
  mailboxHint: '',
  initialized: false,
}

export type MailboxDebugState = {
  tab?: 'directory' | 'mailbox'
  page?: number
  players?: PlayerEntry[]
  totalPages?: number
  loading?: boolean
  visitingAddr?: string
  errorAddr?: string
  collecting?: boolean
  mailboxHint?: string
}

export function resetMailboxState(): void {
  state.initialized = false
  state.loading = false
  state.players = []
  state.errorAddr = ''
  state.visitingAddr = ''
  state.collecting = false
  state.mailboxHint = ''
}

export function ensureMailboxDebugState(debugState: MailboxDebugState): void {
  if (state.initialized) return
  state.initialized = true
  state.tab = debugState.tab ?? 'mailbox'
  state.page = debugState.page ?? 0
  state.players = debugState.players ?? []
  state.totalPages = debugState.totalPages ?? 1
  state.loading = debugState.loading ?? false
  state.visitingAddr = debugState.visitingAddr ?? ''
  state.errorAddr = debugState.errorAddr ?? ''
  state.collecting = debugState.collecting ?? false
  state.mailboxHint = debugState.mailboxHint ?? ''
}

const CARD_IMG = 'assets/images/revamp/card.png'
const CARD_TEXT = { r: 0.22, g: 0.12, b: 0.04, a: 1 }
const CARD_TEXT_MUTE = { r: 0.55, g: 0.40, b: 0.24, a: 1 }
const CARD_STATUS = { r: 0.24, g: 0.66, b: 0.18, a: 1 }
const ROW_BG = { r: 0.96, g: 0.92, b: 0.82, a: 0.96 }
const ROW_BORDER = { r: 0.74, g: 0.58, b: 0.28, a: 1 }
const TAB_W = 174
const TAB_GAP = ss(12)

const CARD_W = 228
const CARD_H = 320
const CARD_BG_SCALE = 1.14
const CARD_BG_SCALE_MOBILE = 1.18
const CARD_CONTENT_SCALE_MOBILE = 1.18
const DIRECTORY_CARD_SCALE_MOBILE = 0.78
const CARD_ART_ASPECT = 236 / 326
const CARD_ICON = 78
const CARD_TITLE = ss(24)
const CARD_META = ss(18)
const CARD_BODY = ss(17)
const BUTTON_W = 126
const BUTTON_FONT = ss(20)
const GRID_CARD_SLOT_TRIM = 10
const DIRECTORY_PAGINATION_GAP = ss(20)
const DIRECTORY_PAGE_SIZE = 3
const DIRECTORY_PAGINATION_GAP_MOBILE = ss(16)
const DIRECTORY_PAGINATION_BOTTOM_INSET_MOBILE = ss(6)
const MOBILE_TABS_BLOCK_H = ss(112)
const MAILBOX_HEADER_BLOCK_H_MOBILE = ss(122)
const MAILBOX_HINT_BLOCK_H_MOBILE = ss(42)
const NEIGHBOUR_TITLE_BLOCK_H = ss(52)
const NEIGHBOUR_META_BLOCK_H = ss(24)
const NEIGHBOUR_DESC_BLOCK_H = ss(52)

function displayLabel(entry: PlayerEntry): string {
  return formatPlayerLabel(entry.displayName, entry.address)
}

function onRegistryLoaded(data: PlayerRegistryResponse): void {
  state.players = data.players
  state.totalPages = data.totalPages
  state.page = data.page
  state.loading = false
}

function onVisitError(address: string): void {
  if (state.visitingAddr === address) {
    state.visitingAddr = ''
    state.errorAddr = address
  }
}

function seedRewardLabel(reward: MailboxReward): string {
  if (reward.cropType < 0) return `${reward.amount} Seeds`
  const cropName = CROP_NAMES[reward.cropType as CropType]
  return `${reward.amount} ${cropName} Seeds`
}

function rewardDescription(reward: MailboxReward): string {
  const actor = formatPlayerLabel(reward.fromName, reward.fromAddress)
  if (reward.reason === 'like') return `${actor} liked your farm`
  if (reward.reason === 'visit_water') return `${actor} watered your crops`
  return `${actor} sent you a reward`
}

function rewardAmountLabel(reward: MailboxReward): string {
  return reward.type === 'coins' ? `+${reward.amount} Coins` : `+${seedRewardLabel(reward)}`
}

function rewardIcon(reward: MailboxReward): string {
  if (reward.type === 'coins') return COINS_IMAGE
  if (reward.cropType >= 0) return CROP_SEED_IMAGES[reward.cropType as CropType]
  return COINS_IMAGE
}

function avatarColor(address: string) {
  const palette = [
    { r: 0.55, g: 0.25, b: 0.10, a: 1 },
    { r: 0.15, g: 0.40, b: 0.55, a: 1 },
    { r: 0.30, g: 0.50, b: 0.20, a: 1 },
    { r: 0.45, g: 0.20, b: 0.50, a: 1 },
    { r: 0.55, g: 0.40, b: 0.10, a: 1 },
  ]
  const idx = parseInt(address.slice(-2), 16) % palette.length
  return palette[idx]
}

function initials(entry: PlayerEntry): string {
  if (entry.displayName && entry.displayName.length > 0) return entry.displayName.slice(0, 2).toUpperCase()
  return entry.address.slice(2, 4).toUpperCase()
}

function scaleCardContent(value: number): number {
  return isMobile() ? Math.round(value * CARD_CONTENT_SCALE_MOBILE) : value
}

function getCardBgScale(): number {
  return isMobile() ? CARD_BG_SCALE_MOBILE : CARD_BG_SCALE
}

function getDirectoryCardScale(): number {
  return isMobile() ? DIRECTORY_CARD_SCALE_MOBILE : 1
}

function getCardTransform(scale = 1) {
  const width = Math.round(CARD_W * getCardBgScale() * scale)
  const artHeight = Math.round(width / CARD_ART_ASPECT)
  const height = Math.max(artHeight, Math.round(CARD_H * getCardBgScale() * scale))

  return {
    width,
    height,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    padding: {
      top: isMobile() ? 34 : 28,
      bottom: isMobile() ? 40 : 34,
      left: isMobile() ? 12 : 16,
      right: isMobile() ? 12 : 16,
    },
  }
}

function getCardVisualWidth(scale = 1): number {
  return Math.round(CARD_W * getCardBgScale() * scale)
}

function getDirectorySlotHeight(scale = 1): number {
  return getCardTransform(scale).height
}

function getDirectoryGridWidth(): number {
  return DIRECTORY_PAGE_SIZE * Math.max(0, getCardVisualWidth(getDirectoryCardScale()) - GRID_CARD_SLOT_TRIM)
}

function getDirectoryPaginationGap(): number {
  return isMobile() ? DIRECTORY_PAGINATION_GAP_MOBILE : DIRECTORY_PAGINATION_GAP
}

function getRewardRowWidth(): number {
  return isMobile() ? REVAMP_CONTENT_W - 24 : REVAMP_CONTENT_W - 10
}

function getRewardTextWidth(): number {
  const iconWidth = isMobile() ? 58 : 52
  return getRewardRowWidth() - iconWidth - 18 - 18 - 16
}

const NeighbourCard = ({ entry }: { entry: PlayerEntry }) => {
  const transform = getCardTransform(getDirectoryCardScale())
  const visiting = state.visitingAddr === entry.address
  const errored = state.errorAddr === entry.address
  const canVisit = !visiting
  const textWidth = transform.width - (isMobile() ? 20 : 32)
  const avatarSize = isMobile() ? ss(62) : scaleCardContent(CARD_ICON)
  const titleFont = isMobile() ? ss(18) : scaleCardContent(CARD_TITLE)
  const metaFont = isMobile() ? ss(15) : scaleCardContent(CARD_META)
  const bodyFont = isMobile() ? ss(14) : scaleCardContent(CARD_BODY)

  return (
    <UiEntity
      uiTransform={{ ...transform, margin: { right: ss(4), bottom: ss(4) } }}
      uiBackground={{ texture: { src: CARD_IMG, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    >
      <UiEntity
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: Math.round(avatarSize / 2),
          alignItems: 'center',
          justifyContent: 'center',
          margin: { bottom: ss(10) },
          flexShrink: 0,
        }}
        uiBackground={{ color: avatarColor(entry.address) }}
      >
        <Label value={initials(entry)} fontSize={isMobile() ? ss(22) : scaleCardContent(ss(26))} color={{ r: 1, g: 1, b: 1, a: 1 }} textAlign="middle-center" />
      </UiEntity>

      <Label
        value={`<b>${displayLabel(entry)}</b>`}
        fontSize={titleFont}
        color={errored ? { r: 0.75, g: 0.20, b: 0.12, a: 1 } : CARD_TEXT}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: isMobile() ? NEIGHBOUR_TITLE_BLOCK_H : scaleCardContent(ss(54)) }}
      />
      <Label
        value={`Level ${entry.level}`}
        fontSize={metaFont}
        color={CARD_TEXT_MUTE}
        textAlign="middle-center"
        textWrap="nowrap"
        uiTransform={{ width: textWidth, height: isMobile() ? NEIGHBOUR_META_BLOCK_H : scaleCardContent(ss(24)), margin: { top: ss(4) } }}
      />
      <Label
        value={errored ? 'Could not load this farm.' : visiting ? 'Opening farm...' : 'Open this neighbour farm.'}
        fontSize={bodyFont}
        color={errored ? { r: 0.75, g: 0.20, b: 0.12, a: 1 } : CARD_TEXT_MUTE}
        textAlign="middle-center"
        uiTransform={{ width: textWidth, height: isMobile() ? NEIGHBOUR_DESC_BLOCK_H : scaleCardContent(ss(48)), margin: { top: ss(8) } }}
      />

      <UiEntity uiTransform={{ flex: 1 }} />

      <MiniTextButton
        label={visiting ? 'OPENING' : 'VISIT'}
        width={Math.round(BUTTON_W * (isMobile() ? CARD_CONTENT_SCALE_MOBILE : 1))}
        fontSize={scaleCardContent(BUTTON_FONT)}
        topOffset={-scaleCardContent(4)}
        disabled={!canVisit}
        onPress={() => {
          playSound('buttonclick')
          state.visitingAddr = entry.address
          state.errorAddr = ''
          playerState.activeMenu = 'none'
          requestOtherFarm(entry.address, entry.displayName)
        }}
      />
    </UiEntity>
  )
}

const RewardRow = ({ reward }: { reward: MailboxReward }) => (
  <UiEntity
    uiTransform={{
      width: getRewardRowWidth(),
      minHeight: isMobile() ? 122 : 98,
      flexDirection: 'row',
      alignItems: 'center',
      padding: { left: 18, right: 18, top: 12, bottom: 12 },
      margin: { bottom: 12 },
      borderWidth: 2,
      borderColor: ROW_BORDER,
      borderRadius: 12,
    }}
    uiBackground={{ color: ROW_BG }}
  >
    <UiEntity
      uiTransform={{ width: isMobile() ? 58 : 52, height: isMobile() ? 58 : 52, margin: { right: 16 }, flexShrink: 0 }}
      uiBackground={{ texture: { src: rewardIcon(reward), wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />

    <UiEntity
      uiTransform={{
        width: getRewardTextWidth(),
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <Label
        value={`<b>${rewardDescription(reward)}</b>`}
        fontSize={isMobile() ? ss(18) : ss(17)}
        color={CARD_TEXT}
        textAlign="middle-left"
        uiTransform={{ width: getRewardTextWidth(), height: isMobile() ? 46 : 26 }}
      />
      <Label
        value={rewardAmountLabel(reward)}
        fontSize={isMobile() ? ss(18) : ss(16)}
        color={reward.type === 'coins' ? { r: 0.72, g: 0.48, b: 0.10, a: 1 } : CARD_STATUS}
        textAlign="middle-left"
        uiTransform={{ width: getRewardTextWidth(), height: isMobile() ? 26 : 22, margin: { top: 4 } }}
      />
    </UiEntity>
  </UiEntity>
)

const DirectoryTab = () => {
  const mobile = isMobile()
  const columns = 3
  const paginationHeight = mobile ? SHARED_PAGINATION_HEIGHT_MOBILE : SHARED_PAGINATION_HEIGHT_DESKTOP
  const directoryScale = getDirectoryCardScale()
  const visualWidth = getCardVisualWidth(directoryScale)
  const slotWidth = Math.max(0, visualWidth - GRID_CARD_SLOT_TRIM)
  const slotHeight = getDirectorySlotHeight(directoryScale)
  const offsetX = Math.round((slotWidth - visualWidth) / 2)
  const pagePlayers = state.players.slice(0, DIRECTORY_PAGE_SIZE)
  const rows: PlayerEntry[][] = []
  const paginationInset = mobile ? DIRECTORY_PAGINATION_BOTTOM_INSET_MOBILE : 0
  const pagerReserve = paginationHeight + getDirectoryPaginationGap() + paginationInset

  for (let i = 0; i < pagePlayers.length; i += columns) {
    rows.push(pagePlayers.slice(i, i + columns))
  }

  if (state.loading) {
    return (
      <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <Label value="Loading neighbours..." fontSize={isMobile() ? ss(24) : ss(22)} color={CARD_TEXT_MUTE} textAlign="middle-center" />
      </UiEntity>
    )
  }

  if (state.players.length === 0) {
    return (
      <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <Label
          value={state.errorAddr === '__timeout__'
            ? 'Could not reach the server.\nThis feature needs the deployed scene backend.'
            : 'No neighbours found yet.\nSave a few farms and they will show up here.'}
          fontSize={isMobile() ? ss(22) : ss(20)}
          color={state.errorAddr === '__timeout__' ? { r: 0.75, g: 0.20, b: 0.12, a: 1 } : CARD_TEXT_MUTE}
          textAlign="middle-center"
        />
      </UiEntity>
    )
  }

  return (
    <UiEntity uiTransform={{ flex: 1, width: '100%', height: mobile ? REVAMP_CONTENT_H - MOBILE_TABS_BLOCK_H : '100%', positionType: 'relative' }}>
      <UiEntity uiTransform={{ width: '100%', height: '100%', padding: { bottom: pagerReserve } }}>
        <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'center', margin: { top: ss(10) } }}>
          {rows.map((row, rowIndex) => (
            <UiEntity
              key={`mailbox-neighbour-row-${rowIndex}`}
              uiTransform={{
                flexDirection: 'row',
                width: row.length * slotWidth,
                height: slotHeight,
                justifyContent: 'center',
                margin: { bottom: rowIndex < rows.length - 1 ? ss(12) : 0 },
              }}
            >
              {row.map((entry) => (
                <UiEntity key={entry.address} uiTransform={{ width: slotWidth, height: slotHeight }}>
                  <UiEntity uiTransform={{ positionType: 'absolute', position: { left: offsetX, top: 0 } }}>
                    <NeighbourCard entry={entry} />
                  </UiEntity>
                </UiEntity>
              ))}
            </UiEntity>
          ))}
        </UiEntity>

        {state.errorAddr !== '' && state.errorAddr !== '__timeout__' && (
          <Label
            value={`Could not load ${displayLabel({ address: state.errorAddr, level: 0, displayName: '' })}'s farm.`}
            fontSize={isMobile() ? ss(18) : ss(16)}
            color={{ r: 0.75, g: 0.20, b: 0.12, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ width: '100%', margin: { top: ss(12) } }}
          />
        )}
      </UiEntity>

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: 0, right: 0, bottom: paginationInset },
          width: '100%',
          height: paginationHeight,
        }}
      >
        <SharedPaginationBar
          id="mailbox-directory"
          page={state.page}
          lastPage={Math.max(0, state.totalPages - 1)}
          onPrev={() => {
            state.loading = true
            state.errorAddr = ''
            requestPlayerRegistry(state.page - 1)
          }}
          onNext={() => {
            state.loading = true
            state.errorAddr = ''
            requestPlayerRegistry(state.page + 1)
          }}
          mode={isMobile() ? 'mobile' : 'desktop'}
        />
      </UiEntity>
    </UiEntity>
  )
}

const MailboxTab = () => {
  const mobile = isMobile()
  const rewards = playerState.mailbox
  const canCollect = rewards.length > 0 && !state.collecting
  const hintHeight = state.mailboxHint !== '' ? (mobile ? MAILBOX_HINT_BLOCK_H_MOBILE : ss(26)) : 0
  const mobileViewportHeight = Math.max(0, REVAMP_CONTENT_H - MOBILE_TABS_BLOCK_H - MAILBOX_HEADER_BLOCK_H_MOBILE - hintHeight)

  if (mobile) {
    return (
      <UiEntity uiTransform={{ flex: 1, width: '100%', height: REVAMP_CONTENT_H - MOBILE_TABS_BLOCK_H, positionType: 'relative' }}>
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: 0, top: 0 },
            width: '100%',
            height: MAILBOX_HEADER_BLOCK_H_MOBILE,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Label
            value={`Pending rewards: ${rewards.length}`}
            fontSize={ss(22)}
            color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
            textAlign="middle-center"
            uiTransform={{ width: '100%', margin: { top: ss(10), bottom: ss(16) } }}
          />

          <MiniTextButton
            label={state.collecting ? 'COLLECTING' : 'COLLECT ALL'}
            width={184}
            fontSize={ss(18)}
            topOffset={-ss(3)}
            disabled={!canCollect}
            onPress={() => {
              playSound('buttonclick')
              state.collecting = true
              state.mailboxHint = ''
              setTimeout(requestCollectMailbox, 290)
            }}
          />
        </UiEntity>

        {rewards.length === 0 ? (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, top: MAILBOX_HEADER_BLOCK_H_MOBILE },
              width: '100%',
              height: mobileViewportHeight,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Label
              value="Your mailbox is empty.\nLikes and visitor rewards will appear here."
              fontSize={ss(22)}
              color={CARD_TEXT_MUTE}
              textAlign="middle-center"
            />
          </UiEntity>
        ) : (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, top: MAILBOX_HEADER_BLOCK_H_MOBILE },
              width: '100%',
              height: mobileViewportHeight,
              flexDirection: 'column',
              overflow: 'scroll',
              padding: { right: 8, bottom: ss(8) },
            }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: { top: ss(4), bottom: ss(18) },
              }}
            >
              {rewards.map((reward) => (
                <UiEntity key={reward.id} uiTransform={{ width: '100%', alignItems: 'center' }}>
                  <RewardRow reward={reward} />
                </UiEntity>
              ))}
            </UiEntity>
          </UiEntity>
        )}

        {state.mailboxHint !== '' && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: 0, bottom: 0 },
              width: '100%',
              height: MAILBOX_HINT_BLOCK_H_MOBILE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Label
              value={state.mailboxHint}
              fontSize={ss(18)}
              color={CARD_STATUS}
              textAlign="middle-center"
              uiTransform={{ width: '100%' }}
            />
          </UiEntity>
        )}
      </UiEntity>
    )
  }

  return (
    <UiEntity uiTransform={{ flex: 1, width: '100%', flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{
          width: '100%',
          flexDirection: isMobile() ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: { top: ss(8), bottom: ss(18) },
        }}
      >
        <Label
          value={`Pending rewards: ${rewards.length}`}
          fontSize={isMobile() ? ss(22) : ss(21)}
          color={{ r: 0.97, g: 0.90, b: 0.68, a: 1 }}
          textAlign={isMobile() ? 'middle-center' : 'middle-left'}
          uiTransform={{ width: isMobile() ? '100%' : 300, margin: { bottom: isMobile() ? ss(10) : 0 } }}
        />

        <MiniTextButton
          label={state.collecting ? 'COLLECTING' : 'COLLECT ALL'}
          width={Math.round((isMobile() ? 184 : 150))}
          fontSize={isMobile() ? ss(18) : ss(17)}
          topOffset={-ss(3)}
          disabled={!canCollect}
          onPress={() => {
            playSound('buttonclick')
            state.collecting = true
            state.mailboxHint = ''
            setTimeout(requestCollectMailbox, 290)
          }}
        />
      </UiEntity>

      {rewards.length === 0 ? (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Label
            value="Your mailbox is empty.\nLikes and visitor rewards will appear here."
            fontSize={isMobile() ? ss(22) : ss(20)}
            color={CARD_TEXT_MUTE}
            textAlign="middle-center"
          />
        </UiEntity>
      ) : (
        <UiEntity
          uiTransform={{
            flex: 1,
            width: '100%',
            overflow: 'scroll',
            padding: { right: isMobile() ? 8 : 6, bottom: 6 },
          }}
        >
          <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
            {rewards.map((reward) => (
              <UiEntity key={reward.id} uiTransform={{ width: '100%', alignItems: 'center' }}>
                <RewardRow reward={reward} />
              </UiEntity>
            ))}
          </UiEntity>
        </UiEntity>
      )}

      {state.mailboxHint !== '' && (
        <Label
          value={state.mailboxHint}
          fontSize={isMobile() ? ss(18) : ss(16)}
          color={CARD_STATUS}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { top: ss(10) } }}
        />
      )}
    </UiEntity>
  )
}

export const MailboxMenu = () => {
  registryCallbacks.onRegistryLoaded = onRegistryLoaded
  visitUiCallbacks.onOtherFarmError = onVisitError
  socialUiCallbacks.onMailboxCollected = (data) => {
    state.collecting = false
    if (!data.success) {
      state.mailboxHint = 'Could not collect mailbox rewards'
      return
    }

    state.mailboxHint = data.rewardCount > 0
      ? `Collected ${data.rewardCount} rewards`
      : 'Mailbox already empty'
  }

  if (!state.initialized) {
    state.initialized = true
    state.tab = playerState.mailbox.length > 0 ? 'mailbox' : 'directory'
    state.loading = true
    playerState.mailboxSeenCount = playerState.mailbox.length
    requestPlayerRegistry(0)
    setTimeout(() => {
      if (state.loading) {
        state.loading = false
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
    <RevampPanelFrame titleText="Mailbox" onClose={close}>
      <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center' }}>
        <UiEntity uiTransform={{ flexDirection: 'row', justifyContent: 'center', width: '100%', margin: { top: ss(8), bottom: ss(12) } }}>
          <UiEntity uiTransform={{ margin: { right: TAB_GAP } }}>
            <PillTabButton
              label="Neighbours"
              selected={state.tab === 'directory'}
              width={TAB_W}
              fontSize={isMobile() ? ss(21) : ss(17)}
              onPress={() => {
                playSound('menu')
                state.tab = 'directory'
                state.mailboxHint = ''
              }}
            />
          </UiEntity>

          <PillTabButton
            label={`Mailbox (${playerState.mailbox.length})`}
            selected={state.tab === 'mailbox'}
            width={TAB_W}
            fontSize={isMobile() ? ss(20) : ss(16)}
            onPress={() => {
              playSound('menu')
              state.tab = 'mailbox'
              state.mailboxHint = ''
              playerState.mailboxSeenCount = playerState.mailbox.length
            }}
          />
        </UiEntity>

        {state.tab === 'directory' ? <DirectoryTab /> : <MailboxTab />}
      </UiEntity>
    </RevampPanelFrame>
  )
}
