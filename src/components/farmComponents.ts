import { Entity, engine, Schemas } from '@dcl/sdk/ecs'

export const PlotState = engine.defineComponent('cozyfarm::PlotState', {
  /** CropType enum value, -1 = empty */
  cropType: Schemas.Int,
  /** 0=empty, 1=sprout, 2=mid, 3=ready to harvest */
  growthStage: Schemas.Int,
  /** Date.now() timestamp when growth started (after first watering). 0 = not started */
  plantedAt: Schemas.Number,
  /** How many times the player has watered this crop */
  waterCount: Schemas.Int,
  /** Whether this plot is available to the player */
  isUnlocked: Schemas.Boolean,
  /** Index for identification (0-27) */
  plotIndex: Schemas.Int,
  /** Whether the crop has been watered at least once to start growing */
  growthStarted: Schemas.Boolean,
  /** Growth is 100%+ complete — ready to harvest on next click */
  isReady: Schemas.Boolean,
  /** Harvested but waiting for a second click before becoming plantable */
  justHarvested: Schemas.Boolean,
  /** Seed planting VFX is currently playing — watering is blocked until it finishes */
  isPlanting: Schemas.Boolean,
  /** Watering-can VFX is currently playing — interactions are blocked until it finishes */
  isWatering: Schemas.Boolean,
})

/** Maps soil entity -> crop child entity for model display */
export const cropChildEntities = new Map<Entity, Entity>()

/** Maps soil entity -> array of billboard icon child entities for icon display */
export const soilIconEntities = new Map<Entity, Entity[]>()

// ---------------------------------------------------------------------------
// BeautySpotState — one per beauty decoration slot (3 total)
// ---------------------------------------------------------------------------
export const BeautySpotState = engine.defineComponent('cozyfarm::BeautySpotState', {
  /** Slot index 0-2 */
  slotIndex: Schemas.Int,
  /** ID of the placed beauty object (0 = empty) */
  objectId: Schemas.Int,
})
