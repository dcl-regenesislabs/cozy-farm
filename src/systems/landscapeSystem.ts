import { engine, Transform, GltfContainer, ColliderLayer } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

const LANDSCAPE_MODEL = 'assets/scene/Models/dcl_horizon_landscape.glb'
const LANDSCAPE_POSITION = Vector3.create(40, 0, 40)
const COLLISION_MASK = ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER

// Surrounding terrain for the 27x27 parcel scene — the farm sits in the
// central 5x5 parcels, this fills the rest of the land out to the edges.
// The model is a single visible mesh with no separate invisible collider,
// so collision is enabled directly on the visible mesh.
export function setupLandscape(): void {
  const landscape = engine.addEntity()
  Transform.create(landscape, { position: LANDSCAPE_POSITION })
  GltfContainer.create(landscape, {
    src: LANDSCAPE_MODEL,
    visibleMeshesCollisionMask: COLLISION_MASK,
  })
}
