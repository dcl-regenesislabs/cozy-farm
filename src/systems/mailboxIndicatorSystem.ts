import {
  engine,
  Billboard,
  BillboardMode,
  Material,
  MeshRenderer,
  Transform
} from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { playerState } from '../game/gameState'
import { isVisiting } from '../services/visitService'

const ENVELOPE_SRC = 'assets/images/envelope.png'
const ROOT_Y = 2.35
const FLOAT_AMPLITUDE = 0.06
const FLOAT_SPEED = 2.2
const ENVELOPE_W = 0.78
const ENVELOPE_H = 0.50
const HIDDEN_SCALE = Vector3.create(0, 0, 0)
const VISIBLE_SCALE = Vector3.create(1, 1, 1)

let mailboxIndicatorRoot: ReturnType<typeof engine.addEntity> | null = null
let mailboxEntity: ReturnType<typeof engine.addEntity> | null = null
let indicatorVisible = false
let floatTime = 0

function ensureMailboxIndicator(): void {
  if (mailboxIndicatorRoot) return

  mailboxEntity = engine.getEntityOrNullByName('Mailbox')
  if (!mailboxEntity) return

  const root = engine.addEntity()
  mailboxIndicatorRoot = root
  Transform.create(root, {
    parent: mailboxEntity,
    position: Vector3.create(0, ROOT_Y, 0),
    scale: HIDDEN_SCALE,
  })

  const envelope = engine.addEntity()
  Transform.create(envelope, {
    parent: root,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(ENVELOPE_W, ENVELOPE_H, 1),
  })
  Billboard.create(envelope, { billboardMode: BillboardMode.BM_ALL })
  MeshRenderer.setPlane(envelope)
  Material.setPbrMaterial(envelope, {
    texture: Material.Texture.Common({ src: ENVELOPE_SRC }),
    emissiveTexture: Material.Texture.Common({ src: ENVELOPE_SRC }),
    emissiveIntensity: 0.9,
    emissiveColor: Color4.White(),
    alphaTest: 0.1,
    transparencyMode: 2,
  })
}

function setIndicatorVisible(visible: boolean): void {
  if (!mailboxIndicatorRoot || indicatorVisible === visible) return
  const transform = Transform.getMutable(mailboxIndicatorRoot)
  transform.scale = visible ? VISIBLE_SCALE : HIDDEN_SCALE
  indicatorVisible = visible
}

function mailboxIndicatorSystem(dt: number): void {
  ensureMailboxIndicator()
  if (!mailboxIndicatorRoot) return

  const pendingCount = playerState.mailbox.length
  const hasUnseen = pendingCount > playerState.mailboxSeenCount
  const shouldShow = pendingCount > 0 && hasUnseen && !isVisiting()
  setIndicatorVisible(shouldShow)
  if (!shouldShow) return

  floatTime += dt
  const y = ROOT_Y + Math.sin(floatTime * FLOAT_SPEED) * FLOAT_AMPLITUDE
  Transform.getMutable(mailboxIndicatorRoot).position = Vector3.create(0, y, 0)
}

engine.addSystem(mailboxIndicatorSystem, undefined, 'mailboxIndicatorSystem')
