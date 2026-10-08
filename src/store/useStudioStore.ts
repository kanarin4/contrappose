import { create } from 'zustand'
import { JOINT_NAMES, mirrorRotation, oppositeJoint, type JointName, type Vec3 } from '../constants/joints'
import { DEFAULT_PROPORTIONS, type ProportionKey, type Proportions } from '../constants/proportions'
import { POSE_PRESETS, presetRotations } from '../constants/poses'
import { clampPose, clampRotation, zeroPose, type PoseRotations } from '../lib/rotation'

export type ShadingMode = 'clay' | 'toon' | 'lineart'

export const DEFAULT_FOV = 35

export interface StudioState {
  proportions: Proportions
  rotations: PoseRotations
  /** Height added above the auto-grounded position, in figure heights. */
  rootLift: number
  selectedJoint: JointName | null
  enforceLimits: boolean
  showAxes: boolean
  autoGround: boolean
  shadingMode: ShadingMode
  fov: number
  activePreset: string | null
  /** Incremented to request a camera reset from the viewport. */
  cameraResetToken: number

  setProportion: (key: ProportionKey, value: number) => void
  setProportions: (values: Proportions) => void
  resetProportions: () => void

  setJointRotation: (joint: JointName, rotation: Vec3) => void
  setJointAxis: (joint: JointName, axis: 0 | 1 | 2, value: number) => void
  resetJoint: (joint: JointName) => void
  resetPose: () => void
  applyPreset: (id: string) => void
  mirrorPose: (from: 'left' | 'right') => void
  loadPose: (data: { rotations: Partial<Record<JointName, Vec3>>; rootLift?: number; proportions?: Partial<Proportions> }) => void
  setRootLift: (lift: number) => void

  selectJoint: (joint: JointName | null) => void
  setEnforceLimits: (v: boolean) => void
  setShowAxes: (v: boolean) => void
  setAutoGround: (v: boolean) => void
  setShadingMode: (m: ShadingMode) => void
  setFov: (fov: number) => void
  requestCameraReset: () => void
}

const sanitizeProportions = (p: Partial<Proportions>): Proportions => {
  const out = { ...DEFAULT_PROPORTIONS }
  for (const key of Object.keys(out) as ProportionKey[]) {
    const v = p[key]
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
  }
  return out
}

export const useStudioStore = create<StudioState>()((set, get) => ({
  proportions: { ...DEFAULT_PROPORTIONS },
  rotations: zeroPose(),
  rootLift: 0,
  selectedJoint: null,
  enforceLimits: true,
  showAxes: false,
  autoGround: true,
  shadingMode: 'clay',
  fov: DEFAULT_FOV,
  activePreset: 't-pose',
  cameraResetToken: 0,

  setProportion: (key, value) => set((s) => ({ proportions: { ...s.proportions, [key]: value } })),
  setProportions: (values) => set({ proportions: { ...values } }),
  resetProportions: () => set({ proportions: { ...DEFAULT_PROPORTIONS } }),

  setJointRotation: (joint, rotation) => {
    const { rotations, enforceLimits } = get()
    const next = clampRotation(joint, rotation, enforceLimits)
    const prev = rotations[joint]
    if (prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2]) return
    set({ rotations: { ...rotations, [joint]: next }, activePreset: null })
  },
  setJointAxis: (joint, axis, value) => {
    const r = [...get().rotations[joint]] as Vec3
    r[axis] = value
    get().setJointRotation(joint, r)
  },
  resetJoint: (joint) => set((s) => ({ rotations: { ...s.rotations, [joint]: [0, 0, 0] }, activePreset: null })),
  resetPose: () => set({ rotations: zeroPose(), rootLift: 0, activePreset: 't-pose' }),
  applyPreset: (id) => {
    const preset = POSE_PRESETS.find((p) => p.id === id)
    if (!preset) return
    set((s) => ({
      rotations: clampPose(presetRotations(preset), s.enforceLimits),
      rootLift: preset.lift ?? 0,
      fov: preset.fov ?? s.fov,
      activePreset: id,
    }))
  },
  mirrorPose: (from) =>
    set((s) => {
      const rotations = { ...s.rotations }
      for (const name of JOINT_NAMES) {
        if (name.startsWith(from)) {
          const target = oppositeJoint(name)
          rotations[target] = clampRotation(target, mirrorRotation(s.rotations[name]), s.enforceLimits)
        }
      }
      return { rotations, activePreset: null }
    }),
  loadPose: (data) =>
    set((s) => {
      const rotations = zeroPose()
      for (const name of JOINT_NAMES) {
        const r = data.rotations[name]
        if (Array.isArray(r) && r.length === 3 && r.every((v) => typeof v === 'number' && Number.isFinite(v))) {
          rotations[name] = [r[0], r[1], r[2]]
        }
      }
      return {
        rotations: clampPose(rotations, s.enforceLimits),
        rootLift: typeof data.rootLift === 'number' && Number.isFinite(data.rootLift) ? data.rootLift : 0,
        proportions: data.proportions ? sanitizeProportions(data.proportions) : s.proportions,
        activePreset: null,
      }
    }),
  setRootLift: (lift) => set({ rootLift: lift, activePreset: null }),

  selectJoint: (joint) => set({ selectedJoint: joint }),
  setEnforceLimits: (v) => set((s) => ({ enforceLimits: v, rotations: v ? clampPose(s.rotations, true) : s.rotations })),
  setShowAxes: (v) => set({ showAxes: v }),
  setAutoGround: (v) => set({ autoGround: v }),
  setShadingMode: (m) => set({ shadingMode: m }),
  setFov: (fov) => set({ fov }),
  requestCameraReset: () => set((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),
}))
