import { FlipHorizontal2, PersonStanding, RotateCcw } from 'lucide-react'
import { POSE_PRESETS } from '../../constants/poses'
import { useStudioStore } from '../../store/useStudioStore'
import { IconButton, Section } from './controls'

export function PosePresets() {
  const activePreset = useStudioStore((s) => s.activePreset)
  const applyPreset = useStudioStore((s) => s.applyPreset)
  const mirrorPose = useStudioStore((s) => s.mirrorPose)
  const resetPose = useStudioStore((s) => s.resetPose)

  return (
    <Section
      title="Pose Presets"
      icon={<PersonStanding className="h-3.5 w-3.5" />}
      actions={
        <IconButton label="Reset to T-Pose" onClick={resetPose}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      }
    >
      <div className="grid grid-cols-2 gap-1.5">
        {POSE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => applyPreset(p.id)}
            className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${
              activePreset === p.id
                ? 'border-accent/70 bg-accent/15 text-blue-200'
                : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => mirrorPose('left')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/5"
        >
          <FlipHorizontal2 className="h-3.5 w-3.5" /> Mirror L → R
        </button>
        <button
          type="button"
          onClick={() => mirrorPose('right')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/5"
        >
          <FlipHorizontal2 className="h-3.5 w-3.5 -scale-x-100" /> Mirror R → L
        </button>
      </div>
    </Section>
  )
}
