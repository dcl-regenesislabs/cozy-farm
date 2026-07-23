import { engine, Transform, GltfContainer, ColliderLayer } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

const LANDSCAPE_MODEL = 'assets/scene/Models/dcl_horizon_landscape.glb'
const LANDSCAPE_POSITION = Vector3.create(40, 0, 40)
const COLLISION_MASK = ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER

// Model's raw footprint is ~416m across (10x10 parcels = 160m) — scaled
// uniformly so it fits without stretching/deforming.
const LANDSCAPE_SCALE = 160 / 416.12
const LANDSCAPE_SCALE_VEC = Vector3.create(LANDSCAPE_SCALE, LANDSCAPE_SCALE, LANDSCAPE_SCALE)

export function setupLandscape(): void {
  const landscape = engine.addEntity()
  Transform.create(landscape, { position: LANDSCAPE_POSITION, scale: LANDSCAPE_SCALE_VEC })
  GltfContainer.create(landscape, {
    src: LANDSCAPE_MODEL,
    visibleMeshesCollisionMask: COLLISION_MASK,
  })
}
