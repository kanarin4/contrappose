import { AXES, JOINTS, JOINT_NAMES, type JointName, type Vec3 } from '../constants/joints'

export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI

/** Wrap an angle into [-180, 180). */
export function wrapDegrees(v: number): number {
  const w = ((((v + 180) % 360) + 360) % 360) - 180
  return Object.is(w, -0) ? 0 : w
}

const round = (v: number) => Math.round(v * 100) / 100

/** Clamp a local Euler rotation (degrees) to the joint's anatomical limits. */
export function clampRotation(joint: JointName, rot: Vec3, enforce: boolean): Vec3 {
  const def = JOINTS[joint]
  return AXES.map((axis, i) => {
    const v = wrapDegrees(rot[i])
    if (!enforce || def.kind === 'root') return round(v)
    const [min, max] = def.limits[axis]
    return round(Math.min(max, Math.max(min, v)))
  }) as Vec3
}

export function isWithinLimits(joint: JointName, rot: Vec3): boolean {
  const def = JOINTS[joint]
  if (def.kind === 'root') return true
  return AXES.every((axis, i) => rot[i] >= def.limits[axis][0] - 1e-6 && rot[i] <= def.limits[axis][1] + 1e-6)
}

export type PoseRotations = Record<JointName, Vec3>

export function zeroPose(): PoseRotations {
  return Object.fromEntries(JOINT_NAMES.map((n) => [n, [0, 0, 0] as Vec3])) as PoseRotations
}

export function clampPose(pose: PoseRotations, enforce: boolean): PoseRotations {
  return Object.fromEntries(JOINT_NAMES.map((n) => [n, clampRotation(n, pose[n], enforce)])) as PoseRotations
}
