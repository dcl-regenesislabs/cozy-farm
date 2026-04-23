import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { playerState } from '../game/gameState'
import { ALL_CROP_TYPES, CROP_NAMES, CropType } from '../data/cropData'
import { ALL_FERTILIZER_TYPES, FERTILIZER_DATA, FertilizerType } from '../data/fertilizerData'
import { CROP_SEED_IMAGES, CROP_HARVEST_IMAGES, ORGANIC_WASTE_ICON } from '../data/imagePaths'
import { PanelShell, C } from './PanelShell'

type CardProps = { key?: string | number; cropType: CropType; count: number; imgSrc: string; countColor: typeof C.gold }

const CropCard = ({ cropType, count, imgSrc, countColor }: CardProps) => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      width: 200,
      height: 215,
      margin: { right: 12, bottom: 12 },
      padding: { top: 12, bottom: 12, left: 10, right: 10 },
    }}
    uiBackground={{ color: C.rowBg }}
  >
    <UiEntity
      uiTransform={{ width: 108, height: 108, margin: { bottom: 10 } }}
      uiBackground={{ texture: { src: imgSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
    />
    <Label value={CROP_NAMES[cropType]} fontSize={22} color={C.textMain} textAlign="middle-center" />
    <Label value={`x${count}`} fontSize={22} color={countColor} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
  </UiEntity>
)

export const InventoryPanel = () => {
  const seedRows    = ALL_CROP_TYPES.filter((c) => (playerState.seeds.get(c)     ?? 0) > 0)
  const harvestRows = ALL_CROP_TYPES.filter((c) => (playerState.harvested.get(c) ?? 0) > 0)
  const fertRows    = ALL_FERTILIZER_TYPES.filter((f) => (playerState.fertilizers.get(f) ?? 0) > 0)
  const hasExtras   = playerState.organicWaste > 0 || fertRows.length > 0

  return (
    <PanelShell title="Inventory" onClose={() => { playerState.activeMenu = 'none' }}>
      <UiEntity uiTransform={{ flexDirection: 'row', flex: 1, width: '100%' }}>

        {/* Seeds */}
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1, margin: { right: 20 } }}>
          <Label value="Seeds" fontSize={24} color={{ r: 0.65, g: 1, b: 0.55, a: 1 }} uiTransform={{ margin: { bottom: 16 } }} />
          {seedRows.length === 0
            ? <Label value="No seeds in stock" fontSize={22} color={C.textMute} />
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
        <UiEntity uiTransform={{ width: 3, margin: { right: 20 } }} uiBackground={{ color: C.divider }} />

        {/* Harvested */}
        <UiEntity uiTransform={{ flexDirection: 'column', flex: 1, margin: { right: hasExtras ? 20 : 0 } }}>
          <Label value="Harvested" fontSize={24} color={C.orange} uiTransform={{ margin: { bottom: 16 } }} />
          {harvestRows.length === 0
            ? <Label value="Nothing harvested yet" fontSize={22} color={C.textMute} />
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

        {/* Vertical divider + Extras (organic waste + fertilizers) */}
        {hasExtras && (
          <UiEntity uiTransform={{ flexDirection: 'row', flex: 1 }}>
            <UiEntity uiTransform={{ width: 3, margin: { right: 20 } }} uiBackground={{ color: C.divider }} />
            <UiEntity uiTransform={{ flexDirection: 'column', flex: 1 }}>
              <Label value="Other Items" fontSize={24} color={C.blue} uiTransform={{ margin: { bottom: 16 } }} />
              <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap' }}>

                {/* Organic Waste */}
                {playerState.organicWaste > 0 && (
                  <UiEntity
                    uiTransform={{
                      flexDirection: 'column', alignItems: 'center',
                      width: 190, height: 215,
                      margin: { right: 12, bottom: 12 },
                      padding: { top: 12, bottom: 12, left: 10, right: 10 },
                    }}
                    uiBackground={{ color: C.rowBg }}
                  >
                    <UiEntity
                      uiTransform={{ width: 108, height: 108, margin: { bottom: 10 } }}
                      uiBackground={{ texture: { src: ORGANIC_WASTE_ICON, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                    />
                    <Label value="Organic Waste" fontSize={18} color={C.textMain} textAlign="middle-center" />
                    <Label value={`x${playerState.organicWaste}`} fontSize={22} color={{ r: 0.7, g: 0.5, b: 0.2, a: 1 }} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
                  </UiEntity>
                )}

                {/* Fertilizers */}
                {fertRows.map((f) => {
                  const def = FERTILIZER_DATA.get(f)!
                  return (
                    <UiEntity
                      key={f}
                      uiTransform={{
                        flexDirection: 'column', alignItems: 'center',
                        width: 190, height: 215,
                        margin: { right: 12, bottom: 12 },
                        padding: { top: 12, bottom: 12, left: 10, right: 10 },
                      }}
                      uiBackground={{ color: C.rowBg }}
                    >
                      <UiEntity
                        uiTransform={{ width: 108, height: 108, margin: { bottom: 10 } }}
                        uiBackground={{ texture: { src: def.iconSrc, wrapMode: 'clamp' }, textureMode: 'stretch' }}
                      />
                      <Label value={def.name} fontSize={18} color={C.textMain} textAlign="middle-center" />
                      <Label value={`x${playerState.fertilizers.get(f)}`} fontSize={22} color={C.green} textAlign="middle-center" uiTransform={{ margin: { top: 4 } }} />
                    </UiEntity>
                  )
                })}

              </UiEntity>
            </UiEntity>
          </UiEntity>
        )}

      </UiEntity>
    </PanelShell>
  )
}
