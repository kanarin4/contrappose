import { useEffect, useRef, useState } from 'react'
import { StudioScene } from './StudioScene'
import { sceneBridge } from './sceneBridge'

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let scene: StudioScene | null = null
    try {
      scene = new StudioScene(el)
      sceneBridge.register(scene)
    } catch (err) {
      console.error(err)
      queueMicrotask(() => setError('WebGL could not be initialised. Please use a browser with WebGL 2 support.'))
    }
    return () => {
      sceneBridge.register(null)
      scene?.dispose()
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" data-testid="viewport" />
      {error && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-400">{error}</div>
      )}
    </div>
  )
}
