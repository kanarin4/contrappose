import { Camera, Focus } from 'lucide-react'
import { useStudioStore } from '../../store/useStudioStore'
import { IconButton } from './controls'

function fovLabel(fov: number): string {
  if (fov <= 15) return 'Flat / Iso'
  if (fov <= 30) return 'Telephoto'
  if (fov <= 55) return 'Normal'
  if (fov <= 80) return 'Wide'
  return 'Fisheye'
}

export function CameraBar() {
  const fov = useStudioStore((s) => s.fov)
  const setFov = useStudioStore((s) => s.setFov)
  const resetCamera = useStudioStore((s) => s.requestCameraReset)

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/5 bg-studio-900/90 px-3 py-2 shadow-xl backdrop-blur">
      <Camera className="h-4 w-4 shrink-0 text-slate-400" />
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <span className="hidden sm:inline">FOV</span>
        <input
          type="range"
          min={8}
          max={100}
          step={1}
          value={fov}
          onChange={(e) => setFov(Number(e.target.value))}
          onDoubleClick={() => setFov(35)}
          className="w-28 sm:w-40"
          aria-label="Camera field of view"
        />
        <span className="w-8 text-right font-mono tabular-nums text-slate-200">{fov}°</span>
        <span className="hidden w-16 text-[10px] uppercase tracking-wide text-accent sm:inline">{fovLabel(fov)}</span>
      </label>
      <IconButton label="Reset camera" onClick={resetCamera}>
        <Focus className="h-4 w-4" />
      </IconButton>
    </div>
  )
}
