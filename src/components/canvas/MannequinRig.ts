import * as THREE from 'three'
import { JOINTS, JOINT_NAMES, type JointName, type Vec3 } from '../../constants/joints'
import type { RigDimensions } from '../../lib/proportionEngine'
import { DEG2RAD } from '../../lib/rotation'
import type { ShadingMode } from '../../store/useStudioStore'
import type { MaterialLibrary, MeshRole } from './materials'

/** Fixed rest orientation of the arm sockets: limb -Y points outward, +X pitch flexes forward. */
const LEFT_ARM_FRAME = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, Math.PI / 2, 'ZYX'))
const RIGHT_ARM_FRAME = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, -Math.PI / 2, 'ZYX'))

const SEG = 28

interface BodyMeshData {
  joint: JointName
  role: MeshRole
  outline: THREE.Mesh | null
}

/**
 * Procedural stylized mannequin.
 *
 * Structure per joint:  parentJoint → socket (static offset / rest frame) → joint (rotation pivot)
 *                                                                          ├── visual (meshes, offset from pivot)
 *                                                                          └── axes helper
 * Sockets and joints persist across proportion changes so selections, gizmos
 * and poses survive; only socket offsets and visual meshes are rebuilt.
 */
export class MannequinRig {
  readonly root = new THREE.Group()
  readonly joints = {} as Record<JointName, THREE.Group>
  readonly sockets = {} as Record<JointName, THREE.Group>
  private readonly visuals = {} as Record<JointName, THREE.Group>
  private readonly axes: THREE.AxesHelper[] = []
  private bodyMeshes: THREE.Mesh[] = []
  private dims: RigDimensions | null = null
  private mode: ShadingMode = 'clay'
  private selected: JointName | null = null

  constructor(private readonly materials: MaterialLibrary) {
    this.root.name = 'mannequin'
    for (const name of JOINT_NAMES) {
      const def = JOINTS[name]
      const socket = new THREE.Group()
      socket.name = def.socket
      const joint = new THREE.Group()
      joint.name = name
      const visual = new THREE.Group()
      visual.name = `${name}Visual`
      joint.add(visual)
      socket.add(joint)
      const parent = def.parent ? this.joints[def.parent] : this.root
      parent.add(socket)

      const axes = new THREE.AxesHelper(1)
      axes.name = `${name}Axes`
      axes.visible = false
      axes.renderOrder = 999
      const axesMat = axes.material as THREE.LineBasicMaterial
      axesMat.depthTest = false
      axesMat.transparent = true
      joint.add(axes)
      this.axes.push(axes)

      this.sockets[name] = socket
      this.joints[name] = joint
      this.visuals[name] = visual
    }
    this.sockets.leftShoulder.quaternion.copy(LEFT_ARM_FRAME)
    this.sockets.rightShoulder.quaternion.copy(RIGHT_ARM_FRAME)
  }

  /** All meshes that can be picked with the mouse. */
  get pickables(): readonly THREE.Mesh[] {
    return this.bodyMeshes
  }

  get dimensions(): RigDimensions | null {
    return this.dims
  }

  // ---------------------------------------------------------------- build

  build(d: RigDimensions): void {
    this.dims = d
    this.clearVisuals()

    // Socket offsets (bone translations).
    const s = this.sockets
    s.hips.position.set(0, d.hipHeight, 0)
    s.spine.position.set(0, d.pelvisToSpine, 0)
    s.chest.position.set(0, d.spineLength, 0)
    s.neck.position.set(0, d.chestLength, 0)
    s.head.position.set(0, d.neckLength, 0)
    const shoulderY = d.chestLength * 0.8
    const shoulderX = d.shoulderHalfWidth * 0.26
    s.leftShoulder.position.set(shoulderX, shoulderY, 0)
    s.rightShoulder.position.set(-shoulderX, shoulderY, 0)
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1
      s[`${side}UpperArm`].position.set(0, -d.clavicleLength, 0)
      s[`${side}LowerArm`].position.set(0, -d.upperArmLength, 0)
      s[`${side}Hand`].position.set(0, -d.lowerArmLength, 0)
      s[`${side}UpperLeg`].position.set(sign * d.hipHalfWidth, 0, 0)
      s[`${side}LowerLeg`].position.set(0, -d.upperLegLength, 0)
      s[`${side}Foot`].position.set(0, -d.lowerLegLength, 0)
    }

    this.buildTorso(d)
    this.buildHead(d)
    for (const side of ['left', 'right'] as const) {
      this.buildArm(side, d)
      this.buildLeg(side, d)
    }

    const axisSize = Math.max(0.12, d.headHeight * 0.32)
    for (const a of this.axes) a.scale.setScalar(axisSize)
    this.refreshMaterials()
  }

  private buildTorso(d: RigDimensions): void {
    const hw = d.shoulderHalfWidth
    const L = d.torsoLength
    // Pelvis: a soft ellipsoid around the hip joints.
    this.addEllipsoid('hips', [hw * 0.74, L * 0.15, hw * 0.5], [0, L * 0.04, 0])
    // Abdomen.
    this.addEllipsoid('spine', [hw * 0.6, d.spineLength * 0.68, hw * 0.43], [0, d.spineLength * 0.45, 0])
    // Rib cage.
    this.addEllipsoid('chest', [hw * 0.84, d.chestLength * 0.56, hw * 0.52], [0, d.chestLength * 0.5, 0])
    // Pelvis/chest bevel rings to read the torso masses clearly.
    this.addSphere('spine', hw * 0.36, [0, 0, 0])
    this.addSphere('chest', hw * 0.4, [0, 0, 0])
  }

  private buildHead(d: RigDimensions): void {
    const [rx, ry, rz] = d.headRadii
    const neckTop = d.neckLength + ry * 0.35
    this.addMesh('neck', new THREE.CylinderGeometry(d.neckRadius, d.neckRadius * 1.15, neckTop, SEG), [0, neckTop / 2, 0])

    // Head: unit sphere scaled into an ellipsoid; guide rings and nose are its children so they deform with it.
    const head = this.addMesh('head', new THREE.SphereGeometry(1, 40, 28), [0, ry * 0.92, 0])
    head.scale.set(rx, ry, rz)

    const guideTube = 0.018
    const eyeY = -0.12
    const eyeLine = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - eyeY * eyeY) + 0.004, guideTube, 6, 72))
    eyeLine.rotation.x = Math.PI / 2
    eyeLine.position.y = eyeY
    const centerLine = new THREE.Mesh(new THREE.TorusGeometry(1.004, guideTube, 6, 72))
    centerLine.rotation.y = Math.PI / 2
    for (const g of [eyeLine, centerLine]) this.registerChild('head', head, g, 'guide')

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12))
    nose.position.set(0, eyeY - 0.18, 0.97)
    this.registerChild('head', head, nose, 'body', true)

    // Ear nubs give the head a readable yaw/roll silhouette.
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10))
      ear.scale.set(0.5, 1, 0.8)
      ear.position.set(sx * 0.98, eyeY, -0.05)
      this.registerChild('head', head, ear, 'body', true)
    }
  }

  private buildArm(side: 'left' | 'right', d: RigDimensions): void {
    const r = d.armRadius
    const shoulder = `${side}Shoulder` as const
    const upper = `${side}UpperArm` as const
    const lower = `${side}LowerArm` as const
    const hand = `${side}Hand` as const

    // Clavicle: a slim capsule from the sternum to the shoulder ball.
    this.addLimb(shoulder, d.clavicleLength, r * 0.62, r * 0.78)
    this.addSphere(upper, r * 1.28, [0, 0, 0])
    this.addLimb(upper, d.upperArmLength, r * 1.08, r * 0.86)
    this.addSphere(lower, r * 0.94, [0, 0, 0])
    this.addLimb(lower, d.lowerArmLength, r * 0.88, r * 0.7)
    this.addSphere(hand, r * 0.72, [0, 0, 0])

    // Mitten hand: flattened capsule; local X is the palm normal, -Z faces forward.
    const hr = d.handRadius
    const palmLen = Math.max(d.handLength - hr * 2, 0.001)
    const palm = this.addMesh(hand, new THREE.CapsuleGeometry(hr, palmLen, 6, 18), [0, -d.handLength / 2 - r * 0.25, 0])
    palm.scale.set(0.55, 1, 1)
    const thumbLen = d.handLength * 0.32
    const thumb = this.addMesh(hand, new THREE.CapsuleGeometry(hr * 0.42, thumbLen, 4, 12), [0, -d.handLength * 0.32, -hr * 0.85])
    thumb.rotation.x = -0.6
  }

  private buildLeg(side: 'left' | 'right', d: RigDimensions): void {
    const r = d.legRadius
    const upper = `${side}UpperLeg` as const
    const lower = `${side}LowerLeg` as const
    const foot = `${side}Foot` as const

    this.addSphere(upper, r * 1.12, [0, 0, 0])
    this.addLimb(upper, d.upperLegLength, r * 1.08, r * 0.86)
    this.addSphere(lower, r * 0.9, [0, 0, 0])
    this.addLimb(lower, d.lowerLegLength, r * 0.86, r * 0.66)
    this.addSphere(foot, r * 0.68, [0, 0, 0])

    // Foot: capsule lying along +Z with the sole resting on the floor plane.
    const fr = d.footRadius
    const len = Math.max(d.footLength - fr * 2, 0.001)
    const heel = fr * 0.9
    const footMesh = this.addMesh(foot, new THREE.CapsuleGeometry(fr, len, 6, 18), [0, -d.ankleHeight + fr * 0.8, d.footLength / 2 - heel])
    footMesh.rotation.x = Math.PI / 2
    footMesh.scale.set(1.15, 1, 0.8)
  }

  // ------------------------------------------------------------ primitives

  /** Tapered limb segment hanging down -Y from the joint pivot. */
  private addLimb(joint: JointName, length: number, rTop: number, rBottom: number): void {
    this.addMesh(joint, new THREE.CylinderGeometry(rTop, rBottom, length, SEG, 1, false), [0, -length / 2, 0])
  }

  private addSphere(joint: JointName, radius: number, pos: Vec3): THREE.Mesh {
    return this.addMesh(joint, new THREE.SphereGeometry(radius, SEG, 20), pos)
  }

  private addEllipsoid(joint: JointName, radii: Vec3, pos: Vec3): THREE.Mesh {
    const m = this.addMesh(joint, new THREE.SphereGeometry(1, 36, 24), pos)
    m.scale.set(...radii)
    return m
  }

  private addMesh(joint: JointName, geometry: THREE.BufferGeometry, pos: Vec3): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(...pos)
    this.registerChild(joint, this.visuals[joint], mesh, 'body', true)
    return mesh
  }

  private registerChild(joint: JointName, parent: THREE.Object3D, mesh: THREE.Mesh, role: MeshRole, outlined = false): void {
    mesh.castShadow = role === 'body'
    mesh.receiveShadow = role === 'body'
    let outline: THREE.Mesh | null = null
    if (outlined) {
      outline = new THREE.Mesh(mesh.geometry, this.materials.outline)
      outline.name = 'outline'
      outline.raycast = () => {}
      mesh.add(outline)
    }
    mesh.userData = { joint, role, outline } satisfies BodyMeshData
    parent.add(mesh)
    this.bodyMeshes.push(mesh)
  }

  private clearVisuals(): void {
    for (const mesh of this.bodyMeshes) {
      mesh.geometry.dispose()
      mesh.removeFromParent()
    }
    this.bodyMeshes = []
  }

  // ------------------------------------------------------------- state

  applyRotations(rotations: Record<JointName, Vec3>): void {
    for (const name of JOINT_NAMES) {
      const [x, y, z] = rotations[name]
      this.joints[name].rotation.set(x * DEG2RAD, y * DEG2RAD, z * DEG2RAD, 'XYZ')
    }
  }

  /**
   * Position the root. With auto-grounding the lowest point of the posed
   * figure is snapped to the floor before the lift (in figure heights) is added.
   */
  placeRoot(lift: number, autoGround: boolean): void {
    if (!this.dims) return
    const hips = this.sockets.hips
    hips.position.y = this.dims.hipHeight
    if (autoGround) {
      this.root.updateMatrixWorld(true)
      let minY = Infinity
      for (const m of this.bodyMeshes) {
        if ((m.userData as BodyMeshData).role !== 'body') continue
        const pos = m.geometry.attributes.position
        const e = m.matrixWorld.elements
        // Only the world Y of each vertex is needed: row 2 of the world matrix.
        for (let i = 0; i < pos.count; i++) {
          const y = e[1] * pos.getX(i) + e[5] * pos.getY(i) + e[9] * pos.getZ(i) + e[13]
          if (y < minY) minY = y
        }
      }
      if (Number.isFinite(minY)) hips.position.y -= minY - this.root.position.y
    }
    hips.position.y += lift * this.dims.totalHeight
  }

  setShading(mode: ShadingMode): void {
    this.mode = mode
    this.refreshMaterials()
  }

  setSelected(joint: JointName | null): void {
    this.selected = joint
    this.refreshMaterials()
  }

  setAxesVisible(visible: boolean): void {
    for (const a of this.axes) a.visible = visible
  }

  private refreshMaterials(): void {
    const outlined = this.mode !== 'clay'
    for (const mesh of this.bodyMeshes) {
      const data = mesh.userData as BodyMeshData
      mesh.material = this.materials.get(this.mode, data.role, data.joint === this.selected)
      mesh.castShadow = data.role === 'body' && this.mode !== 'lineart'
      if (data.outline) data.outline.visible = outlined
    }
  }

  /** Rest-pose transform of each socket relative to its parent joint (used for URDF export). */
  restFrames(): Record<JointName, { position: Vec3; quaternion: THREE.Quaternion }> {
    const out = {} as Record<JointName, { position: Vec3; quaternion: THREE.Quaternion }>
    for (const name of JOINT_NAMES) {
      const s = this.sockets[name]
      out[name] = { position: s.position.toArray() as Vec3, quaternion: s.quaternion.clone() }
    }
    return out
  }

  dispose(): void {
    this.clearVisuals()
    for (const a of this.axes) a.dispose()
    this.root.removeFromParent()
  }
}
