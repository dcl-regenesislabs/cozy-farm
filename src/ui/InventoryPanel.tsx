import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { ALL_CROP_TYPES, CROP_NAMES, CropType } from '../data/cropData'
import { CROP_SEED_IMAGES, CROP_HARVEST_IMAGES } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'

type CardProps = { key?: string | number; cropType: CropType; count: number; imgSrc: string; countColor: typeof C.gold }

const CropCard = ({ cropType, count, imgSrc, countColor }: CardProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      width: 110,
      height: 122,
      margin: { right: 10, bottom: 10 },
      padding: { top: 10, bottom: 8, left: 6, right: 6 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    <UiEntity
      uiTransform={{ width: 62, height: 62, margin: { bottom: 6 } }}
      uiBackground={{
        texture: { src: imgSrc, wrapMode: 'clamp' },
        textureMode: 'stretch',
      }}
    />
    <Label value={CROP_NAMES[cropType]} fontSize={12} color={C.textMain} textAlign="middle-center" />
    <Label value={`x${count}`} fontSize={15} color={countColor} textAlign="middle-center" uiTransform={{ margin: { top: 2 } }} />
  </UiEntity>
)

export const InventoryPanel = () => {
  const seedRows    = ALL_CROP_TYPES.filter((c) => (playerState.seeds.get(c)     ?? 0) > 0)
  const harvestRows = ALL_CROP_TYPES.filter((c) => (playerState.harvested.get(c) ?? 0) > 0)

  return (
    <PanelShell title="Inventory" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flex: 1, width: '100%' }}>

        {/* Seeds */}
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1, margin: { right: 16 } }}>
          <Label value="Seeds" fontSize={15} color={{ r: 0.65, g: 1, b: 0.55, a: 1 }} uiTransform={{ margin: { bottom: 12 } }} />
          {seedRows.length === 0
            ? <Label value="No seeds in stock" fontSize={13} color={C.textMute} />
            : (
              <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {seedRows.map((c) => (
                  <CropCard
                    key={`s${c}`}
                    cropType={c}
                    count={playerState.seeds.get(c)!}
                    imgSrc={CROP_SEED_IMAGES[c]}
                    countColor={{ r: 0.55, g: 1, b: 0.35, a: 1 }}
                  />
                ))}
              </UiEntity>
            )
          }
        </UiEntity>

        {/* Vertical divider */}
        <UiEntity uiTransform={{ width: 2, margin: { right: 16 } }} uiBackground={{ color: C.divider }} />

        {/* Harvested */}
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
          <Label value="Harvested" fontSize={15} color={C.orange} uiTransform={{ margin: { bottom: 12 } }} />
          {harvestRows.length === 0
            ? <Label value="Nothing harvested yet" fontSize={13} color={C.textMute} />
            : (
              <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {harvestRows.map((c) => (
                  <CropCard
                    key={`h${c}`}
                    cropType={c}
                    count={playerState.harvested.get(c)!}
                    imgSrc={CROP_HARVEST_IMAGES[c]}
                    countColor={C.orange}
                  />
                ))}
              </UiEntity>
            )
          }
        </UiEntity>

      </UiEntity>
    </PanelShell>
  )
}
