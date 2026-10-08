/**
 * Joint definitions, hierarchy and anatomical range-of-motion (ROM) tables.
 *
 * Conventions
 * - Joint names follow the VRM 1.0 humanoid bone naming.
 * - Rotations are local Euler angles in degrees, order XYZ (pitch, yaw, roll).
 * - Every limb segment points down its local -Y axis. Arm sockets carry a fixed
 *   rest orientation so that +X (pitch) is always flexion for hinges.
 * - Right-side joints are mirror images of left-side joints across the sagittal
 *   (YZ) plane, so their yaw/roll limits are the negated left-side ranges.
 */

export const JOINT_NAMES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
] as const

export type JointName = (typeof JOINT_NAMES)[number]
export type Vec3 = [number, number, number]
export type Axis = 'x' | 'y' | 'z'
export type JointKind = 'root' | 'ball' | 'hinge'
export type Side = 'left' | 'right' | 'center'
export type Range = readonly [min: number, max: number]

export interface JointLimits {
  x: Range
  y: Range
  z: Range
}

export interface JointDef {
  name: JointName
  label: string
  /** snake_case name used for URDF / ROS export */
  urdf: string
  parent: JointName | null
  /** Name of the static socket group between parent and joint (e.g. "leftHip"). */
  socket: string
  kind: JointKind
  side: Side
  limits: JointLimits
}

export const AXES: readonly Axis[] = ['x', 'y', 'z']

export const AXIS_LABELS: Record<Axis, { name: string; color: string }> = {
  x: { name: 'Pitch', color: '#ef4444' },
  y: { name: 'Yaw', color: '#22c55e' },
  z: { name: 'Roll', color: '#3b82f6' },
}

const FREE: JointLimits = { x: [-180, 180], y: [-180, 180], z: [-180, 180] }

type CenterName = 'hips' | 'spine' | 'chest' | 'neck' | 'head'
type LimbBase = 'Shoulder' | 'UpperArm' | 'LowerArm' | 'Hand' | 'UpperLeg' | 'LowerLeg' | 'Foot'

const CENTER: Record<CenterName, Omit<JointDef, 'name' | 'side'>> = {
  hips: { label: 'Pelvis (Root)', urdf: 'pelvis', parent: null, socket: 'root', kind: 'root', limits: FREE },
  spine: {
    label: 'Spine',
    urdf: 'spine',
    parent: 'hips',
    socket: 'spineSocket',
    kind: 'ball',
    limits: { x: [-30, 50], y: [-35, 35], z: [-30, 30] },
  },
  chest: {
    label: 'Chest',
    urdf: 'chest',
    parent: 'spine',
    socket: 'chestSocket',
    kind: 'ball',
    limits: { x: [-25, 30], y: [-30, 30], z: [-25, 25] },
  },
  neck: {
    label: 'Neck',
    urdf: 'neck',
    parent: 'chest',
    socket: 'neckSocket',
    kind: 'ball',
    limits: { x: [-40, 45], y: [-60, 60], z: [-30, 30] },
  },
  head: {
    label: 'Head',
    urdf: 'head',
    parent: 'neck',
    socket: 'headSocket',
    kind: 'ball',
    limits: { x: [-35, 30], y: [-30, 30], z: [-25, 25] },
  },
}

/** Left-side limb definitions. Right side is derived by mirroring. */
const LIMB: Record<LimbBase, { label: string; urdf: string; parent: LimbBase | 'chest' | 'hips'; socket: string; kind: JointKind; limits: JointLimits }> = {
  Shoulder: {
    label: 'Shoulder',
    urdf: 'shoulder',
    parent: 'chest',
    socket: 'ShoulderSocket',
    kind: 'ball',
    // +z lowers the clavicle, -z shrugs it up.
    limits: { x: [-15, 25], y: [-10, 10], z: [-30, 10] },
  },
  UpperArm: {
    label: 'Upper Arm',
    urdf: 'upper_arm',
    parent: 'Shoulder',
    socket: 'UpperArmSocket',
    kind: 'ball',
    // +x swings forward, +z lowers the arm towards the body.
    limits: { x: [-60, 140], y: [-90, 90], z: [-95, 90] },
  },
  LowerArm: {
    label: 'Elbow',
    urdf: 'lower_arm',
    parent: 'UpperArm',
    socket: 'LowerArmSocket',
    kind: 'hinge',
    limits: { x: [0, 145], y: [0, 0], z: [0, 0] },
  },
  Hand: {
    label: 'Wrist',
    urdf: 'hand',
    parent: 'LowerArm',
    socket: 'HandSocket',
    kind: 'ball',
    limits: { x: [-70, 70], y: [-30, 30], z: [-60, 60] },
  },
  UpperLeg: {
    label: 'Upper Leg',
    urdf: 'upper_leg',
    parent: 'hips',
    socket: 'Hip',
    kind: 'ball',
    // -x flexes the hip (leg forward), +z abducts (leg outward).
    limits: { x: [-125, 35], y: [-45, 45], z: [-25, 60] },
  },
  LowerLeg: {
    label: 'Knee',
    urdf: 'lower_leg',
    parent: 'UpperLeg',
    socket: 'LowerLegSocket',
    kind: 'hinge',
    limits: { x: [0, 145], y: [0, 0], z: [0, 0] },
  },
  Foot: {
    label: 'Ankle',
    urdf: 'foot',
    parent: 'LowerLeg',
    socket: 'FootSocket',
    kind: 'ball',
    // +x points the toes down (plantar flexion).
    limits: { x: [-25, 50], y: [-20, 20], z: [-25, 25] },
  },
}

const mirrorRange = (r: Range): Range => [r[1] === 0 ? 0 : -r[1], r[0] === 0 ? 0 : -r[0]]

export const mirrorLimits = (l: JointLimits): JointLimits => ({ x: l.x, y: mirrorRange(l.y), z: mirrorRange(l.z) })

function buildDefs(): Record<JointName, JointDef> {
  const defs = {} as Record<JointName, JointDef>
  for (const name of Object.keys(CENTER) as CenterName[]) {
    defs[name] = { name, side: 'center', ...CENTER[name] }
  }
  for (const side of ['left', 'right'] as const) {
    for (const base of Object.keys(LIMB) as LimbBase[]) {
      const d = LIMB[base]
      const name = `${side}${base}` as JointName
      const parent = (d.parent === 'chest' || d.parent === 'hips' ? d.parent : `${side}${d.parent}`) as JointName
      defs[name] = {
        name,
        label: `${side === 'left' ? 'L' : 'R'} ${d.label}`,
        urdf: `${side}_${d.urdf}`,
        parent,
        socket: `${side}${d.socket}`,
        kind: d.kind,
        side,
        limits: side === 'left' ? d.limits : mirrorLimits(d.limits),
      }
    }
  }
  return defs
}

export const JOINTS: Record<JointName, JointDef> = buildDefs()

/** Returns the joint on the opposite side of the body (or itself for center joints). */
export function oppositeJoint(name: JointName): JointName {
  if (name.startsWith('left')) return name.replace('left', 'right') as JointName
  if (name.startsWith('right')) return name.replace('right', 'left') as JointName
  return name
}

/** Mirror a local rotation across the sagittal plane. */
export const mirrorRotation = ([x, y, z]: Vec3): Vec3 => [x, y === 0 ? 0 : -y, z === 0 ? 0 : -z]

/** Grouping used by the UI joint picker. */
export const JOINT_GROUPS: { label: string; joints: JointName[] }[] = [
  { label: 'Core', joints: ['hips', 'spine', 'chest', 'neck', 'head'] },
  { label: 'Left Arm', joints: ['leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand'] },
  { label: 'Right Arm', joints: ['rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand'] },
  { label: 'Left Leg', joints: ['leftUpperLeg', 'leftLowerLeg', 'leftFoot'] },
  { label: 'Right Leg', joints: ['rightUpperLeg', 'rightLowerLeg', 'rightFoot'] },
]
