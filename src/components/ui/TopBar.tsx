import { Box, PanelLeft, PanelRight, PenTool, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStudioStore, type ShadingMode } from '../../store/useStudioStore'
import { ExportToolbar } from './ExportToolbar'
import { IconButton } from './controls'

const MODES: { id: ShadingMode; label: string; icon: ReactNode }[] = [
  { id: 'clay', label: 'Clay', icon: <Box className="h-3.5 w-3.5" /> },
  { id: 'toon', label: 'Toon', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'lineart', label: 'Line Art', icon: <PenTool className="h-3.5 w-3.5" /> },
]

interface TopBarProps {
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  onStatus: (msg: string) => void
}

export function TopBar({ leftOpen, rightOpen, onToggleLeft, onToggleRight, onStatus }: TopBarProps) {
  const mode = useStudioStore((s) => s.shadingMode)
  const setMode = useStudioStore((s) => s.setShadingMode)

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-white/5 bg-studio-900/95 px-2 backdrop-blur sm:px-3">
      <IconButton label="Toggle proportions panel" onClick={onToggleLeft} active={leftOpen}>
        <PanelLeft className="h-4 w-4" />
      </IconButton>
      <div className="flex items-center gap-2 pr-1">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white">
          C
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-semibold tracking-tight text-white">Contrappose</div>
          <div className="text-[10px] text-slate-500">Stylized mannequin studio</div>
        </div>
      </div>

      <div className="mx-auto flex rounded-lg bg-studio-950/70 p-0.5 ring-1 ring-white/5" role="radiogroup" aria-label="Shading mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-2.5 ${
              mode === m.id ? 'bg-studio-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.icon}
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      <ExportToolbar onStatus={onStatus} />
      <IconButton label="Toggle posing panel" onClick={onToggleRight} active={rightOpen}>
        <PanelRight className="h-4 w-4" />
      </IconButton>
    </header>
  )
}
