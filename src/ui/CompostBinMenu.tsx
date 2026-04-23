import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType, randomFertilizer } from '../data/fertilizerData'
import { PanelShell, C } from './PanelShell'
import { ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { playSound } from '../systems/sfxSystem'
import { formatTime } from '../systems/growthSystem'

const COMPOST_CYCLE_MS = 300_000  // 5 minutes per waste unit

function getCompostState() {
  const now = Date.now()
  const wasteInBin = playerState.compostWasteCount
  const lastCollected = playerState.compostLastCollectedAt

  const timeElapsed = (lastCollected > 0 && wasteInBin > 0) ? now - lastCollected : 0
  const cyclesDone = Math.min(Math.floor(timeElapsed / COMPOST_CYCLE_MS), wasteInBin)
  const nextCycleMs = (wasteInBin > cyclesDone && lastCollected > 0)
    ? COMPOST_CYCLE_MS - (timeElapsed % COMPOST_CYCLE_MS)
    : null

  return { wasteInBin, cyclesDone, nextCycleMs }
}

function collectReady() {
  const now = Date.now()
  const lastCollected = playerState.compostLastCollectedAt
  const wasteInBin = playerState.compostWasteCount
  if (wasteInBin === 0 || lastCollected === 0) return

  const elapsed = now - lastCollected
  const cycles = Math.min(Math.floor(elapsed / COMPOST_CYCLE_MS), wasteInBin)
  if (cycles <= 0) return

  for (let i = 0; i < cycles; i++) {
    const fert = randomFertilizer()
    playerState.fertilizers.set(fert, (playerState.fertilizers.get(fert) ?? 0) + 1)
  }
  playerState.compostWasteCount -= cycles
  playerState.compostLastCollectedAt = now
  playSound('buttonclick')
}

function addWaste() {
  if (playerState.organicWaste <= 0) return
  playerState.organicWaste -= 1
  playerState.compostWasteCount += 1
  if (playerState.compostLastCollectedAt === 0) {
    playerState.compostLastCollectedAt = Date.now()
  }
  playSound('buttonclick')
}

type FertCardProps = { key?: number; fertType: FertilizerType }

const FertCard = ({ fertType }: FertCardProps) => {
  const def = FERTILIZER_DATA.get(fertType)!
  const count = playerState.fertilizers.get(fertType) ?? 0
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'center',
        width: 240,
        margin: { right: 12, bottom: 8 },
        padding: { top: 10, bottom: 10, left: 8, right: 8 },
      }}
      uiBackground={{ color: C.rowBg }}
    >
      <UiEntity
        uiTransform={{ width: 72, height: 72, margin: { bottom: 6 } }}
        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
      />
      <Label value={def.name} fontSize={19} color={C.textMain} textAlign="middle-center" />
      <Label value={def.description} fontSize={16} color={C.textMute} textAlign="middle-center" />
      <Label value={`x${count}`} fontSize={22} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
    </UiEntity>
  )
}

export const CompostBinMenu = () => {
  const { wasteInBin, cyclesDone, nextCycleMs } = getCompostState()
  const canAddWaste  = playerState.organicWaste > 0
  const canCollect   = cyclesDone > 0

  return (
    <PanelShell title="Compost Bin" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flex: 1, width: '100%' }}>

        {/* Left — bin status + controls */}
        <UiEntity uiTransform={{ flexDirection: 'column', width: 380, margin: { right: 32 } }}>

          {/* Organic waste in hand */}
          <UiEntity
            uiTransform={{ flexDirection: 'row', alignItems: 'center', margin: { bottom: 16 } }}
          >
            <UiEntity
              uiTransform={{ width: 52, height: 52, margin: { right: 10 } }}
              uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
            />
            <UiEntity uiTransform={{ flexDirection: 'column' }}>
              <Label value="Organic Waste" fontSize={20} color={C.textMain} />
              <Label value={`In hand: ${playerState.organicWaste}`} fontSize={22} color={C.orange} />
            </UiEntity>
          </UiEntity>

          {/* Bin count */}
          <Label value={`In bin: ${wasteInBin} units`} fontSize={22} color={C.textMain} uiTransform={{ margin: { bottom: 8 } }} />

          {/* Timer */}
          {nextCycleMs !== null && (
            <Label
              value={`Next fertilizer: ${formatTime(nextCycleMs)}`}
              fontSize={20}
              color={C.green}
              uiTransform={{ margin: { bottom: 8 } }}
            />
          )}
          {wasteInBin === 0 && (
            <Label value="Add waste to start composting" fontSize={19} color={C.textMute} uiTransform={{ margin: { bottom: 8 } }} />
          )}
          {canCollect && (
            <Label value={`${cyclesDone} fertilizer${cyclesDone > 1 ? 's' : ''} ready!`} fontSize={20} color={C.gold} uiTransform={{ margin: { bottom: 8 } }} />
          )}

          {/* Add Waste button */}
          <UiEntity
            uiTransform={{
              width: 320, height: 66,
              alignItems: 'center', justifyContent: 'center',
              margin: { bottom: 14 },
            }}
            uiBackground={{ color: canAddWaste ? { r: 0.25, g: 0.55, b: 0.15, a: 1 } : { r: 0.2, g: 0.2, b: 0.2, a: 1 } }}
            onMouseDown={canAddWaste ? addWaste : undefined}
          >
            <Label
              value="Add Waste"
              fontSize={26}
              color={canAddWaste ? C.textMain : C.textMute}
              textAlign="middle-center"
            />
          </UiEntity>

          {/* Collect button */}
          <UiEntity
            uiTransform={{
              width: 320, height: 66,
              alignItems: 'center', justifyContent: 'center',
            }}
            uiBackground={{ color: canCollect ? { r: 0.6, g: 0.45, b: 0.05, a: 1 } : { r: 0.2, g: 0.2, b: 0.2, a: 1 } }}
            onMouseDown={canCollect ? collectReady : undefined}
          >
            <Label
              value={canCollect ? `Collect (${cyclesDone})` : 'Nothing ready'}
              fontSize={26}
              color={canCollect ? C.textMain : C.textMute}
              textAlign="middle-center"
            />
          </UiEntity>
        </UiEntity>

        {/* Vertical divider */}
        <UiEntity uiTransform={{ width: 3, margin: { right: 32 } }} uiBackground={{ color: C.divider }} />

        {/* Right — fertilizer inventory */}
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label value="Your Fertilizers" fontSize={24} color={C.header} uiTransform={{ margin: { bottom: 16 } }} />
          <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ALL_FERTILIZER_TYPES.map((ft) => (
              <FertCard key={ft} fertType={ft} />
            ))}
          </UiEntity>
        </UiEntity>

      </UiEntity>
    </PanelShell>
  )
}
