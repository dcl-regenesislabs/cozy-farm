import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { room } from '../shared/farmMessages'
import type { FarmSlot } from '../shared/farmMessages'
import { C } from './PanelShell'
import { playSound } from '../systems/sfxSystem'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function requestClaimSlot(slotId: number): void {
  playSound('buttonclick')
  void room.send('claimFarmSlot', { slotId })
}

// ---------------------------------------------------------------------------
// Slot card
// ---------------------------------------------------------------------------

const SlotCard = ({ slot }: { key?: number; slot: FarmSlot }) => {
  const isMine    = slot.wallet !== '' && slot.wallet === playerState.wallet
  const isTaken   = slot.wallet !== '' && !isMine
  const isEmpty   = slot.wallet === ''

  const borderColor = isMine
    ? { r: 0.2, g: 0.8, b: 0.3, a: 1 }
    : isTaken
      ? { r: 0.4, g: 0.3, b: 0.1, a: 1 }
      : { r: 0.3, g: 0.5, b: 0.9, a: 1 }

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 280,
        height: 320,
        margin: { right: 24 },
        padding: { top: 24, bottom: 24, left: 20, right: 20 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      {/* Farm number */}
      <Label
        value={`Farm ${slot.slotId + 1}`}
        fontSize={30}
        color={C.header}
        textAlign="middle-center"
        uiTransform={{ margin: { bottom: 12 } }}
      />

      {/* Status */}
      {isMine && (
        <Label value="Your Farm" fontSize={20} color={{ r: 0.2, g: 0.9, b: 0.3, a: 1 }} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}
      {isTaken && (
        <Label value={slot.displayName || slot.wallet.slice(0, 10)} fontSize={20} color={C.orange} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}
      {isEmpty && (
        <Label value="Available" fontSize={20} color={C.textMute} textAlign="middle-center" uiTransform={{ margin: { bottom: 8 } }} />
      )}

      {/* Action button */}
      {isEmpty && (
        <UiEntity
          uiTransform={{
            width: 220,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            margin: { top: 16 },
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
            margin: { top: 16 },
          }}
          uiBackground={{ color: { r: 0.15, g: 0.5, b: 0.2, a: 1 } }}
          onMouseDown={() => { playerState.activeMenu = 'none' }}
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
            margin: { top: 16 },
          }}
          uiBackground={{ color: { r: 0.3, g: 0.2, b: 0.05, a: 1 } }}
          onMouseDown={() => {
            // TODO: visit this farm (wire into visitService)
          }}
        >
          <Label value="Visit" fontSize={24} color={C.textMain} textAlign="middle-center" />
        </UiEntity>
      )}

      {/* Claimed date for occupied slots */}
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

// ---------------------------------------------------------------------------
// Main panel — full-screen overlay, no close button
// (dismissed only by claiming a slot or entering your own farm)
// ---------------------------------------------------------------------------

export const FarmSelectPanel = () => {
  const slots        = playerState.farmSlots
  const allFull      = slots.length > 0 && slots.every((s) => s.wallet !== '')
  const mySlot       = slots.find((s) => s.wallet === playerState.wallet)
  const isLoading    = slots.length === 0

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
        <Label
          value="All farms are taken. You can visit them below."
          fontSize={24}
          color={C.orange}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 32 } }}
        />
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
