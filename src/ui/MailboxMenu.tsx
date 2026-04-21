import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { CropType, CROP_NAMES } from '../data/cropData'
import { CROP_SEED_IMAGES, COINS_IMAGE } from '../data/imagePaths'
import { playerState } from '../game/gameState'
import { requestPlayerRegistry, requestOtherFarm, visitUiCallbacks } from '../services/visitService'
import { registryCallbacks } from '../services/saveService'
import { requestCollectMailbox, socialUiCallbacks } from '../services/socialService'
import { PlayerEntry, PlayerRegistryResponse, type MailboxReward } from '../shared/farmMessages'
import { playSound } from '../systems/sfxSystem'
import { formatPlayerLabel } from '../utils/playerLabel'
import { PanelShell, C } from './PanelShell'

const state = {
  tab:          'directory' as 'directory' | 'mailbox',
  page:         0,
  players:      [] as PlayerEntry[],
  totalPages:   1,
  loading:      false,
  visitingAddr: '',
  errorAddr:    '',
  collecting:   false,
  mailboxHint:  '',
  initialized:  false,
}

export function resetMailboxState(): void {
  state.initialized  = false
  state.loading      = false
  state.players      = []
  state.errorAddr    = ''
  state.visitingAddr = ''
  state.collecting   = false
  state.mailboxHint  = ''
}

function displayLabel(entry: PlayerEntry): string {
  return formatPlayerLabel(entry.displayName, entry.address)
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

const TAB_BUTTON_W = 220
const MAILBOX_ROW_W = 1160
const MAILBOX_TEXT_W = 1040
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
  if (entry.displayName && entry.displayName.length > 0) return entry.displayName.slice(0, 2).toUpperCase()
  return entry.address.slice(2, 4).toUpperCase()
}

type CardProps = { entry: PlayerEntry; isVisiting: boolean; isError: boolean }

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
      <Label value={initials(entry)} fontSize={28} color={C.textMain} textAlign="middle-center" />
    </UiEntity>

    <UiEntity uiTransform={{ width: '100%', alignItems: 'center', flexDirection: 'column' }}>
      <Label
        value={displayLabel(entry)}
        fontSize={24}
        color={isError ? C.orange : C.header}
        textAlign="middle-center"
        uiTransform={{ width: '100%' }}
      />
    </UiEntity>

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
        uiBackground={{
          color: isVisiting
            ? { r: 0.18, g: 0.40, b: 0.18, a: 1 }
            : { r: 0.20, g: 0.55, b: 0.20, a: 1 },
        }}
        onMouseDown={!isVisiting ? () => {
          playSound('buttonclick')
          state.visitingAddr      = entry.address
          state.errorAddr         = ''
          playerState.activeMenu  = 'none'
          requestOtherFarm(entry.address, entry.displayName)
        } : undefined}
      >
        <Label
          value={isVisiting ? '...' : 'Visit'}
          fontSize={22}
          color={C.textMain}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  </UiEntity>
)

type RewardRowProps = { reward: MailboxReward }

const RewardRow = ({ reward }: RewardRowProps) => (
  <UiEntity
    uiTransform={{
      width: MAILBOX_ROW_W,
      height: 104,
      flexDirection: 'row',
      alignItems: 'center',
      padding: { left: 16, right: 16, top: 12, bottom: 12 },
      margin: { bottom: 12 },
      flexShrink: 0,
    }}
    uiBackground={{ color: C.rowBg }}
  >
    <UiEntity
      uiTransform={{ width: 62, height: 62, margin: { right: 18 } }}
      uiBackground={{ texture: { src: rewardIcon(reward), wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />

    <UiEntity
      uiTransform={{
        width: MAILBOX_TEXT_W,
        height: 64,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Label
        value={rewardDescription(reward)}
        fontSize={20}
        color={C.textMain}
        textAlign="middle-left"
        uiTransform={{ width: MAILBOX_TEXT_W, height: 26 }}
      />
      <Label
        value={rewardAmountLabel(reward)}
        fontSize={18}
        color={reward.type === 'coins' ? C.gold : C.green}
        textAlign="middle-left"
        uiTransform={{ width: MAILBOX_TEXT_W, height: 22, margin: { top: 4 } }}
      />
    </UiEntity>
  </UiEntity>
)

const DirectoryTab = () => (
  <UiEntity uiTransform={{ flex: 1, width: '100%', flexDirection: 'column' }}>
    {state.loading && (
      <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <Label value="Loading..." fontSize={30} color={C.textMute} textAlign="middle-center" />
      </UiEntity>
    )}

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

    {state.errorAddr !== '' && state.errorAddr !== '__timeout__' && !state.loading && (
      <Label
        value={`Could not load ${displayLabel({ address: state.errorAddr, level: 0, displayName: '' })}'s farm.`}
        fontSize={22}
        color={C.orange}
        textAlign="middle-center"
        uiTransform={{ width: '100%', margin: { top: 6 } }}
      />
    )}

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
  </UiEntity>
)

const MailboxTab = () => {
  const rewards = playerState.mailbox
  const canCollect = rewards.length > 0 && !state.collecting

  return (
    <UiEntity uiTransform={{ flex: 1, width: '100%', flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: { bottom: 18 },
        }}
      >
        <Label
          value={`Pending rewards: ${rewards.length}`}
          fontSize={24}
          color={C.textMute}
          textAlign="middle-left"
          uiTransform={{ width: 320 }}
        />
        <UiEntity
          uiTransform={{ width: 190, height: 48, alignItems: 'center', justifyContent: 'center' }}
          uiBackground={{ color: canCollect ? { r: 0.20, g: 0.55, b: 0.20, a: 1 } : { r: 0.12, g: 0.10, b: 0.06, a: 1 } }}
          onMouseDown={canCollect ? () => {
            playSound('buttonclick')
            state.collecting  = true
            state.mailboxHint = ''
            requestCollectMailbox()
          } : undefined}
        >
          <Label
            value={state.collecting ? 'Collecting...' : 'Collect All'}
            fontSize={22}
            color={canCollect ? C.textMain : C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>
      </UiEntity>

      {rewards.length === 0 && (
        <UiEntity uiTransform={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Label
            value="Your mailbox is empty.\nLikes and visitor rewards will appear here."
            fontSize={28}
            color={C.textMute}
            textAlign="middle-center"
          />
        </UiEntity>
      )}

      {rewards.length > 0 && (
        <UiEntity
          uiTransform={{
            flex: 1,
            width: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'scroll',
          }}
        >
          {rewards.map((reward) => (
            <UiEntity key={reward.id} uiTransform={{ width: MAILBOX_ROW_W, height: 116, flexShrink: 0 }}>
              <RewardRow reward={reward} />
            </UiEntity>
          ))}
        </UiEntity>
      )}

      {state.mailboxHint !== '' && (
        <Label
          value={state.mailboxHint}
          fontSize={22}
          color={C.green}
          textAlign="middle-center"
          uiTransform={{ width: '100%', margin: { top: 10 } }}
        />
      )}
    </UiEntity>
  )
}

export const MailboxMenu = () => {
  registryCallbacks.onRegistryLoaded = onRegistryLoaded
  visitUiCallbacks.onOtherFarmError  = onVisitError
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
    state.tab         = playerState.mailbox.length > 0 ? 'mailbox' : 'directory'
    state.loading     = true
    playerState.mailboxSeenCount = playerState.mailbox.length
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
    <PanelShell title="Neighbours & Mailbox" onClose={close}>
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { bottom: 20 } }}>
        {([
          ['directory', 'Neighbours'],
          ['mailbox', `Mailbox (${playerState.mailbox.length})`],
        ] as const).map(([tab, label]) => (
          <UiEntity
            key={tab}
            uiTransform={{
              width: TAB_BUTTON_W,
              height: 58,
              alignItems: 'center',
              justifyContent: 'center',
              margin: { right: 14 },
            }}
            uiBackground={{ color: state.tab === tab ? { r: 0.34, g: 0.24, b: 0.08, a: 1 } : C.rowBg }}
              onMouseDown={() => {
              playSound('buttonclick')
              state.tab = tab
              state.mailboxHint = ''
              if (tab === 'mailbox') playerState.mailboxSeenCount = playerState.mailbox.length
            }}
          >
            <Label value={label} fontSize={24} color={state.tab === tab ? C.header : C.textMain} textAlign="middle-center" />
          </UiEntity>
        ))}
      </UiEntity>

      {state.tab === 'directory' ? <DirectoryTab /> : <MailboxTab />}
    </PanelShell>
  )
}
