import { Bone, Crosshair, RotateCcw, ShieldCheck } from 'lucide-react'
import { AXES, AXIS_LABELS, JOINTS, JOINT_GROUPS, type JointName } from '../../constants/joints'
import { isWithinLimits } from '../../lib/rotation'
import { useStudioStore } from '../../store/useStudioStore'
import { IconButton, Section, Slider, Toggle } from './controls'

const fmtDeg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`

function JointPicker() {
  const selected = useStudioStore((s) => s.selectedJoint)
  const select = useStudioStore((s) => s.selectJoint)
  const rotations = useStudioStore((s) => s.rotations)
  return (
    <div className="space-y-2">
      {JOINT_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">{g.label}</div>
          <div className="flex flex-wrap gap-1">
            {g.joints.map((j) => {
              const posed = rotations[j].some((v) => v !== 0)
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => select(selected === j ? null : j)}
                  className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                    selected === j
                      ? 'bg-accent text-white'
                      : posed
                        ? 'bg-white/[0.06] text-slate-200 hover:bg-white/10'
                        : 'bg-white/[0.02] text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {JOINTS[j].label.replace(/^[LR] /, '')}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActiveJoint({ joint }: { joint: JointName }) {
  const rotation = useStudioStore((s) => s.rotations[joint])
  const enforce = useStudioStore((s) => s.enforceLimits)
  const setAxis = useStudioStore((s) => s.setJointAxis)
  const resetJoint = useStudioStore((s) => s.resetJoint)
  const rootLift = useStudioStore((s) => s.rootLift)
  const setRootLift = useStudioStore((s) => s.setRootLift)
  const def = JOINTS[joint]
  const within = isWithinLimits(joint, rotation)

  return (
    <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/[0.06] p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">{def.label}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {def.kind === 'hinge' ? 'Hinge · 1-DOF' : def.kind === 'root' ? 'Root · free' : 'Ball & socket · 3-DOF'}
            {!within && <span className="ml-1.5 text-amber-400">· beyond ROM</span>}
          </div>
        </div>
        <IconButton label="Reset joint" onClick={() => resetJoint(joint)}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs tabular-nums">
        {AXES.map((axis, i) => (
          <div key={axis} className="rounded bg-studio-950/60 px-1 py-1.5">
            <div className="font-sans text-[9px] uppercase tracking-wider" style={{ color: AXIS_LABELS[axis].color }}>
              {AXIS_LABELS[axis].name}
            </div>
            <div className="text-slate-100">{fmtDeg(rotation[i])}</div>
          </div>
        ))}
      </div>
      {AXES.map((axis, i) => {
        const [lo, hi] = enforce ? def.limits[axis] : [-180, 180]
        const locked = enforce && lo === hi
        return (
          <Slider
            key={axis}
            label={`${AXIS_LABELS[axis].name} (${axis.toUpperCase()})`}
            accent={AXIS_LABELS[axis].color}
            value={rotation[i]}
            min={lo}
            max={locked ? lo + 1 : hi}
            step={0.5}
            disabled={locked}
            hint={locked ? 'locked' : enforce && def.kind !== 'root' ? `${lo}…${hi}` : undefined}
            format={fmtDeg}
            onChange={(v) => setAxis(joint, i as 0 | 1 | 2, v)}
            onReset={() => setAxis(joint, i as 0 | 1 | 2, 0)}
          />
        )
      })}
      {def.kind === 'root' && (
        <Slider
          label="Root Lift"
          value={rootLift}
          min={-0.3}
          max={0.6}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          onChange={setRootLift}
          onReset={() => setRootLift(0)}
        />
      )}
    </div>
  )
}

export function JointInspector() {
  const selected = useStudioStore((s) => s.selectedJoint)
  const enforce = useStudioStore((s) => s.enforceLimits)
  const showAxes = useStudioStore((s) => s.showAxes)
  const autoGround = useStudioStore((s) => s.autoGround)
  const setEnforce = useStudioStore((s) => s.setEnforceLimits)
  const setShowAxes = useStudioStore((s) => s.setShowAxes)
  const setAutoGround = useStudioStore((s) => s.setAutoGround)

  return (
    <>
      <Section title="Joint Inspector" icon={<Bone className="h-3.5 w-3.5" />}>
        {selected ? (
          <ActiveJoint joint={selected} />
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
            Click a body part in the viewport or pick a joint below to pose it.
          </p>
        )}
        <JointPicker />
      </Section>
      <Section title="Rig Settings" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
        <Toggle
          label="Enforce Anatomical Limits"
          description="Clamp joints to a natural range of motion. Disable for extreme stylized poses."
          checked={enforce}
          onChange={setEnforce}
        />
        <Toggle
          label="Show Joint Axes"
          description="Debug helpers: red = X (pitch), green = Y (yaw), blue = Z (roll)."
          checked={showAxes}
          onChange={setShowAxes}
        />
        <Toggle
          label="Keep Feet on Ground"
          description="Automatically rests the lowest point of the figure on the floor."
          checked={autoGround}
          onChange={setAutoGround}
        />
        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
          <Crosshair className="h-3 w-3" /> Esc deselects · drag gizmo rings to rotate
        </div>
      </Section>
    </>
  )
}
