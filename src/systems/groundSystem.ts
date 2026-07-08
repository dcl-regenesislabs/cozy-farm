import { engine, Transform, MeshRenderer, Material, TextureWrapMode } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

const GRASS_TEXTURE = 'assets/scene/Images/Grasstexture.png'
const GROUND_SIZE   = 80  // 5x5 parcels @ 16m each
const GROUND_CENTER = GROUND_SIZE / 2
const TILE_REPEAT   = 16  // texture repeats across the ground (~5m per tile) — tweak to taste

// Custom-textured ground plane laid flat over the built-in Tile/Ground system,
// since that tool only offers its own preset textures.
export function setupGrassGround(): void {
  const ground = engine.addEntity()
  Transform.create(ground, {
    position: Vector3.create(GROUND_CENTER, 0.02, GROUND_CENTER),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale:    Vector3.create(GROUND_SIZE, GROUND_SIZE, 1),
  })
  MeshRenderer.setPlane(ground, [
    0, 0,  TILE_REPEAT, 0,  TILE_REPEAT, TILE_REPEAT,  0, TILE_REPEAT,
    0, 0,  TILE_REPEAT, 0,  TILE_REPEAT, TILE_REPEAT,  0, TILE_REPEAT,
  ])
  Material.setPbrMaterial(ground, {
    texture: Material.Texture.Common({
      src: GRASS_TEXTURE,
      wrapMode: TextureWrapMode.TWM_REPEAT,
    }),
    roughness: 1,
    metallic: 0,
  })
}
