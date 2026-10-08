import { JOINT_NAMES, mirrorRotation, type JointName, type Vec3 } from './joints'

export interface PosePreset {
  id: string
  label: string
  description: string
  rotations: Partial<Record<JointName, Vec3>>
  /** Extra height above the auto-grounded position, in figure heights. */
  lift?: number
  /** Optional suggested camera FOV for dramatic presets. */
  fov?: number
}

type LimbKey = 'Shoulder' | 'UpperArm' | 'LowerArm' | 'Hand' | 'UpperLeg' | 'LowerLeg' | 'Foot'
type SidePose = Partial<Record<LimbKey, Vec3>>

/** Build rotations from explicit left/right limb poses (right side authored in left-side terms). */
function sides(left: SidePose, right: SidePose = left): Partial<Record<JointName, Vec3>> {
  const out: Partial<Record<JointName, Vec3>> = {}
  for (const [k, v] of Object.entries(left)) out[`left${k}` as JointName] = v
  for (const [k, v] of Object.entries(right)) out[`right${k}` as JointName] = mirrorRotation(v)
  return out
}

export const POSE_PRESETS: PosePreset[] = [
  {
    id: 't-pose',
    label: 'T-Pose',
    description: 'Neutral rest pose (VRM bind pose).',
    rotations: {},
  },
  {
    id: 'standing-hero',
    label: 'Standing Hero',
    description: 'Wide stance, chest out, fists on hips.',
    rotations: {
      spine: [-4, 0, 0],
      chest: [-6, 0, 0],
      neck: [-4, 0, 0],
      head: [-6, 12, 0],
      ...sides(
        { Shoulder: [-5, 0, 4], UpperArm: [60, -30, 88], LowerArm: [68, 0, 0], Hand: [0, 0, -55], UpperLeg: [0, -8, 9], LowerLeg: [2, 0, 0], Foot: [0, 8, -9] },
      ),
    },
  },
  {
    id: 'cute-sit',
    label: 'Cute Sit',
    description: 'Sitting on the floor, legs out, hands in lap.',
    rotations: {
      hips: [-6, 0, 0],
      spine: [14, 0, 0],
      chest: [6, 0, 0],
      neck: [6, 0, 0],
      head: [8, -8, 14],
      ...sides({
        Shoulder: [10, 0, 8],
        UpperArm: [45, -20, 62],
        LowerArm: [55, 0, 0],
        Hand: [0, 0, 15],
        UpperLeg: [-86, 0, 14],
        LowerLeg: [18, 0, 0],
        Foot: [-10, 0, -6],
      }),
    },
  },
  {
    id: 'dynamic-jump',
    label: 'Dynamic Jump',
    description: 'Airborne, arms thrown up, one knee tucked.',
    lift: 0.08,
    rotations: {
      hips: [8, 0, 0],
      spine: [-18, 0, 0],
      chest: [-12, 0, 0],
      neck: [-12, 0, 0],
      head: [-15, 0, 0],
      ...sides(
        { Shoulder: [0, 0, -20], UpperArm: [40, 0, -60], LowerArm: [30, 0, 0], Hand: [0, 0, -20], UpperLeg: [-95, 0, 8], LowerLeg: [120, 0, 0], Foot: [30, 0, 0] },
        { Shoulder: [0, 0, -15], UpperArm: [10, 0, -70], LowerArm: [20, 0, 0], Hand: [0, 0, -20], UpperLeg: [25, 0, 6], LowerLeg: [95, 0, 0], Foot: [40, 0, 0] },
      ),
    },
  },
  {
    id: 'standing-relaxed',
    label: 'Contrapposto',
    description: 'Weight on one leg, classic relaxed stance.',
    rotations: {
      hips: [0, 6, 6],
      spine: [0, -2, -5],
      chest: [0, -6, -5],
      neck: [0, 0, 4],
      head: [4, -10, 4],
      ...sides(
        { Shoulder: [0, 0, 4], UpperArm: [6, 0, 78], LowerArm: [12, 0, 0], Hand: [0, 0, 8], UpperLeg: [-4, 0, -2], LowerLeg: [4, 0, 0], Foot: [0, 0, -4] },
        { Shoulder: [0, 0, 8], UpperArm: [-4, 0, 74], LowerArm: [8, 0, 0], Hand: [0, 0, 6], UpperLeg: [-14, -6, 8], LowerLeg: [24, 0, 0], Foot: [8, 0, -8] },
      ),
    },
  },
  {
    id: 'floating',
    label: 'Floating',
    description: 'Weightless drift with softly bent limbs.',
    lift: 0.1,
    rotations: {
      hips: [-10, 0, 4],
      spine: [-6, 0, 0],
      chest: [-4, 0, 0],
      neck: [-10, 0, 0],
      head: [-12, 0, 8],
      ...sides(
        { Shoulder: [0, 0, -4], UpperArm: [15, 0, 40], LowerArm: [30, 0, 0], Hand: [20, 0, -10], UpperLeg: [-25, 0, 6], LowerLeg: [45, 0, 0], Foot: [40, 0, 0] },
        { Shoulder: [0, 0, -4], UpperArm: [-10, 0, 30], LowerArm: [25, 0, 0], Hand: [20, 0, -10], UpperLeg: [5, 0, 4], LowerLeg: [30, 0, 0], Foot: [45, 0, 0] },
      ),
    },
  },
  {
    id: 'perspective-kick',
    label: 'Perspective Kick',
    description: 'Foot thrust at the camera for dramatic foreshortening.',
    fov: 78,
    rotations: {
      hips: [-14, -10, 0],
      spine: [-14, 6, 0],
      chest: [-10, 6, 0],
      neck: [8, 0, 0],
      head: [12, -6, 0],
      ...sides(
        { Shoulder: [0, 0, -6], UpperArm: [-35, 0, 40], LowerArm: [70, 0, 0], Hand: [0, 0, 0], UpperLeg: [-10, 0, 10], LowerLeg: [30, 0, 0], Foot: [5, 0, -6] },
        { Shoulder: [10, 0, 0], UpperArm: [60, 0, 35], LowerArm: [80, 0, 0], Hand: [0, 0, 0], UpperLeg: [-105, 0, 4], LowerLeg: [8, 0, 0], Foot: [-20, 0, 0] },
      ),
    },
  },
]

export function presetRotations(preset: PosePreset): Record<JointName, Vec3> {
  return Object.fromEntries(JOINT_NAMES.map((n) => [n, [...(preset.rotations[n] ?? [0, 0, 0])] as Vec3])) as Record<JointName, Vec3>
}
