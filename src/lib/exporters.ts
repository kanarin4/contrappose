import * as THREE from 'three'
import { AXES, JOINTS, JOINT_NAMES, type JointName, type Vec3 } from '../constants/joints'
import type { Proportions } from '../constants/proportions'
import { DEG2RAD } from './rotation'

const AXIS_SUFFIX = { x: 'pitch', y: 'yaw', z: 'roll' } as const
const AXIS_VECTORS: Record<'x' | 'y' | 'z', Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
const linkName = (j: JointName) => `${JOINTS[j].urdf}_link`

export interface UrdfJoint {
  name: string
  type: 'revolute' | 'continuous' | 'fixed'
  parent: string
  child: string
  origin: { xyz: Vec3; rpy: Vec3 }
  axis?: Vec3
  limit?: { lower: number; upper: number; effort: number; velocity: number }
}

export interface PoseExportInput {
  rotations: Record<JointName, Vec3>
  rootLift: number
  proportions: Proportions
  enforceLimits: boolean
  restFrames: Record<JointName, { position: Vec3; quaternion: THREE.Quaternion }>
  rootPosition: Vec3
}

/**
 * Produce a ROS / URDF compatible pose document.
 *
 * URDF has no spherical joint, so every ball joint is expanded into a chain of
 * three revolute joints (X → Y → Z) linked by massless virtual links. This
 * matches the rig's intrinsic XYZ Euler order exactly (R = Rx · Ry · Rz).
 * `joint_state` mirrors sensor_msgs/JointState (radians).
 */
export function buildPoseDocument(input: PoseExportInput) {
  const joints: UrdfJoint[] = []
  const links = new Set<string>(['base_link'])
  const stateNames: string[] = []
  const statePositions: number[] = []

  // Floating base: base_link → pelvis is a fixed joint at the current root transform.
  const hipsRot = input.rotations.hips
  const rootQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(hipsRot[0] * DEG2RAD, hipsRot[1] * DEG2RAD, hipsRot[2] * DEG2RAD, 'XYZ'))
  const rootRpy = new THREE.Euler().setFromQuaternion(rootQ, 'ZYX')
  joints.push({
    name: 'pelvis_floating',
    type: 'fixed',
    parent: 'base_link',
    child: linkName('hips'),
    origin: { xyz: input.rootPosition.map(r6) as Vec3, rpy: [r6(rootRpy.x), r6(rootRpy.y), r6(rootRpy.z)] },
  })
  links.add(linkName('hips'))

  for (const name of JOINT_NAMES) {
    const def = JOINTS[name]
    if (!def.parent) continue
    const frame = input.restFrames[name]
    // URDF rpy is fixed-axis roll/pitch/yaw = Rz(yaw)·Ry(pitch)·Rx(roll), i.e. three.js Euler order 'ZYX'.
    const rpy = new THREE.Euler().setFromQuaternion(frame.quaternion, 'ZYX')
    const axes = def.kind === 'hinge' ? (['x'] as const) : AXES
    let parent = linkName(def.parent)
    axes.forEach((axis, i) => {
      const last = i === axes.length - 1
      const child = last ? linkName(name) : `${def.urdf}_${AXIS_SUFFIX[axis]}_link`
      const jointName = def.kind === 'hinge' ? def.urdf : `${def.urdf}_${AXIS_SUFFIX[axis]}`
      const [lower, upper] = def.limits[axis]
      joints.push({
        name: jointName,
        type: 'revolute',
        parent,
        child,
        origin:
          i === 0
            ? { xyz: frame.position.map(r6) as Vec3, rpy: [r6(rpy.x), r6(rpy.y), r6(rpy.z)] }
            : { xyz: [0, 0, 0], rpy: [0, 0, 0] },
        axis: AXIS_VECTORS[axis],
        limit: { lower: r6(lower * DEG2RAD), upper: r6(upper * DEG2RAD), effort: 10, velocity: 3 },
      })
      links.add(child)
      stateNames.push(jointName)
      statePositions.push(r6(input.rotations[name][AXES.indexOf(axis)] * DEG2RAD))
      parent = child
    })
  }

  return {
    format: 'contrappose.pose',
    version: 1,
    generator: 'Contrappose',
    exported_at: new Date().toISOString(),
    units: { length: 'scene units (figure ≈ 2.0 tall, Y-up)', angle: 'radians' },
    robot: {
      name: 'contrappose_mannequin',
      links: [...links].map((name) => ({ name })),
      joints,
    },
    joint_state: {
      header: { frame_id: 'base_link', stamp: Date.now() / 1000 },
      name: stateNames,
      position: statePositions,
    },
    contrappose: {
      euler_order: 'XYZ',
      rotations_deg: input.rotations,
      root_lift: input.rootLift,
      proportions: input.proportions,
      enforce_limits: input.enforceLimits,
    },
  }
}

export type PoseDocument = ReturnType<typeof buildPoseDocument>

/** Extract re-importable pose data from a previously exported document. */
export function parsePoseDocument(text: string): {
  rotations: Partial<Record<JointName, Vec3>>
  rootLift?: number
  proportions?: Partial<Proportions>
} {
  const data = JSON.parse(text) as Partial<PoseDocument> & { rotations?: Partial<Record<JointName, Vec3>> }
  if (data.contrappose?.rotations_deg) {
    return {
      rotations: data.contrappose.rotations_deg,
      rootLift: data.contrappose.root_lift,
      proportions: data.contrappose.proportions,
    }
  }
  // Fallback: rebuild from a sensor_msgs/JointState block.
  if (data.joint_state?.name && data.joint_state.position) {
    const rotations: Partial<Record<JointName, Vec3>> = {}
    for (const jn of JOINT_NAMES) {
      const def = JOINTS[jn]
      const v: Vec3 = [0, 0, 0]
      AXES.forEach((axis, i) => {
        const key = def.kind === 'hinge' ? (axis === 'x' ? def.urdf : null) : `${def.urdf}_${AXIS_SUFFIX[axis]}`
        const idx = key ? data.joint_state!.name.indexOf(key) : -1
        if (idx >= 0) v[i] = data.joint_state!.position[idx] / DEG2RAD
      })
      rotations[jn] = v
    }
    return { rotations }
  }
  if (data.rotations) return { rotations: data.rotations }
  throw new Error('Unrecognised pose file')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
