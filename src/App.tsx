import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Viewport } from './components/canvas/Viewport'
import { CameraBar } from './components/ui/CameraBar'
import { JointInspector } from './components/ui/JointInspector'
import { PosePresets } from './components/ui/PosePresets'
import { ProportionPanel } from './components/ui/ProportionPanel'
import { TopBar } from './components/ui/TopBar'
import { useStudioStore } from './store/useStudioStore'

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

function SidePanel({ side, open, children }: { side: 'left' | 'right'; open: boolean; children: ReactNode }) {
  const position = side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
  const hidden = side === 'left' ? '-translate-x-full' : 'translate-x-full'
  return (
    <aside
      aria-hidden={!open}
      className={`studio-scroll absolute top-0 bottom-0 z-20 w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto border-white/5 bg-studio-900/95 backdrop-blur transition-transform duration-200 ${position} ${
        open ? 'translate-x-0' : `${hidden} pointer-events-none`
      }`}
    >
      {children}
    </aside>
  )
}

export default function App() {
  const [leftOpen, setLeftOpen] = useState(isDesktop)
  const [rightOpen, setRightOpen] = useState(isDesktop)
  const [status, setStatus] = useState<string | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)

  const showStatus = useCallback((msg: string) => {
    setStatus(msg)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 2800)
  }, [])

  // On narrow screens only one drawer is open at a time.
  const toggleLeft = () => {
    setLeftOpen((o) => !o)
    if (!isDesktop()) setRightOpen(false)
  }
  const toggleRight = () => {
    setRightOpen((o) => !o)
    if (!isDesktop()) setLeftOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') useStudioStore.getState().selectJoint(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={toggleLeft}
        onToggleRight={toggleRight}
        onStatus={showStatus}
      />
      <main className="viewport-bg relative flex-1 overflow-hidden">
        <Viewport />
        <SidePanel side="left" open={leftOpen}>
          <ProportionPanel />
        </SidePanel>
        <SidePanel side="right" open={rightOpen}>
          <PosePresets />
          <JointInspector />
        </SidePanel>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
          {status && (
            <div className="rounded-lg bg-studio-800/95 px-3 py-1.5 text-xs text-slate-200 shadow-lg ring-1 ring-white/10" role="status">
              {status}
            </div>
          )}
          <CameraBar />
          <p className="hidden text-[11px] text-slate-500 md:block">
            Click a body part to pose · Left-drag orbit · Right-drag pan · Scroll zoom · Esc deselect
          </p>
        </div>
      </main>
    </div>
  )
}
