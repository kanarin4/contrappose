import { RotateCcw, Ruler } from 'lucide-react'
import { DEFAULT_PROPORTIONS, PROPORTION_PRESETS, PROPORTION_SLIDERS } from '../../constants/proportions'
import { useStudioStore } from '../../store/useStudioStore'
import { IconButton, Section, Slider } from './controls'

export function ProportionPanel() {
  const proportions = useStudioStore((s) => s.proportions)
  const setProportion = useStudioStore((s) => s.setProportion)
  const setProportions = useStudioStore((s) => s.setProportions)
  const resetProportions = useStudioStore((s) => s.resetProportions)

  const activePreset = PROPORTION_PRESETS.find((p) =>
    (Object.keys(p.values) as (keyof typeof p.values)[]).every((k) => Math.abs(p.values[k] - proportions[k]) < 1e-6),
  )?.id

  return (
    <>
      <Section
        title="Body Type"
        icon={<Ruler className="h-3.5 w-3.5" />}
        actions={
          <IconButton label="Reset proportions" onClick={resetProportions}>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PROPORTION_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProportions(p.values)}
              className={`rounded-md border px-1.5 py-1.5 text-[11px] leading-tight transition-colors ${
                activePreset === p.id
                  ? 'border-accent/70 bg-accent/15 text-blue-200'
                  : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/5'
              }`}
            >
              <span className="block font-medium">{p.label}</span>
              <span className="font-mono text-[10px] text-slate-500">{p.values.headRatio.toFixed(1)}h</span>
            </button>
          ))}
        </div>
      </Section>
      {PROPORTION_SLIDERS.map((section) => (
        <Section key={section.section} title={section.section}>
          {section.sliders.map((s) => (
            <Slider
              key={s.key}
              label={s.label}
              value={proportions[s.key]}
              min={s.min}
              max={s.max}
              step={s.step}
              format={s.format}
              hint={s.hint?.(proportions[s.key])}
              onChange={(v) => setProportion(s.key, v)}
              onReset={() => setProportion(s.key, DEFAULT_PROPORTIONS[s.key])}
            />
          ))}
        </Section>
      ))}
      <p className="px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        Double-click a slider to reset it. Proportions rebuild live while preserving the current pose.
      </p>
    </>
  )
}
