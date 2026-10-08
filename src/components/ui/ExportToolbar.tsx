import { FileJson, ImageDown, Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Vec3 } from '../../constants/joints'
import { buildPoseDocument, downloadBlob, parsePoseDocument, timestamp } from '../../lib/exporters'
import { useStudioStore } from '../../store/useStudioStore'
import { sceneBridge } from '../canvas/sceneBridge'
import { IconButton } from './controls'

export function ExportToolbar({ onStatus }: { onStatus: (msg: string) => void }) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportPng = async () => {
    const scene = sceneBridge.get()
    if (!scene || busy) return
    setBusy(true)
    try {
      const blob = await scene.exportPNG(3840)
      downloadBlob(blob, `contrappose-${timestamp()}.png`)
      onStatus('Exported transparent 4K PNG')
    } catch (err) {
      console.error(err)
      onStatus('PNG export failed')
    } finally {
      setBusy(false)
    }
  }

  const exportJson = () => {
    const scene = sceneBridge.get()
    if (!scene) return
    const s = useStudioStore.getState()
    scene.rig.root.updateMatrixWorld(true)
    const doc = buildPoseDocument({
      rotations: s.rotations,
      rootLift: s.rootLift,
      proportions: s.proportions,
      enforceLimits: s.enforceLimits,
      restFrames: scene.rig.restFrames(),
      rootPosition: scene.rig.sockets.hips.position.toArray() as Vec3,
    })
    downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `contrappose-pose-${timestamp()}.json`)
    onStatus('Exported pose JSON (URDF / JointState)')
  }

  const importJson = async (file: File) => {
    try {
      const data = parsePoseDocument(await file.text())
      useStudioStore.getState().loadPose(data)
      onStatus(`Loaded pose from ${file.name}`)
    } catch (err) {
      console.error(err)
      onStatus('Could not read pose file')
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importJson(f)
          e.target.value = ''
        }}
      />
      <IconButton label="Import pose JSON" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" />
      </IconButton>
      <IconButton label="Export pose JSON (ROS / URDF)" onClick={exportJson}>
        <FileJson className="h-4 w-4" />
        <span className="hidden md:inline">JSON</span>
      </IconButton>
      <button
        type="button"
        onClick={exportPng}
        disabled={busy}
        title="Download transparent 4K PNG"
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-blue-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
        <span className="hidden sm:inline">PNG 4K</span>
      </button>
    </div>
  )
}
