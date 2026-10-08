import * as THREE from 'three'
import type { ShadingMode } from '../../store/useStudioStore'

export interface Lighting {
  setMode: (mode: ShadingMode) => void
  dispose: () => void
}

/** Soft three-point studio rig with a shadow-casting key light. */
export function createLighting(scene: THREE.Scene): Lighting {
  const group = new THREE.Group()
  group.name = 'lighting'

  const hemi = new THREE.HemisphereLight(0xe8eefc, 0x2a2f3d, 1.1)
  group.add(hemi)

  const key = new THREE.DirectionalLight(0xfff4e6, 2.4)
  key.position.set(2.5, 5, 3.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 20
  key.shadow.camera.left = -3
  key.shadow.camera.right = 3
  key.shadow.camera.top = 4
  key.shadow.camera.bottom = -2
  key.shadow.bias = -0.0005
  key.shadow.normalBias = 0.02
  key.shadow.radius = 6
  group.add(key)

  const fill = new THREE.DirectionalLight(0xc7d7ff, 0.7)
  fill.position.set(-4, 2, 2)
  group.add(fill)

  const rim = new THREE.DirectionalLight(0x93c5fd, 1.3)
  rim.position.set(-1.5, 3.5, -4)
  group.add(rim)

  scene.add(group)

  return {
    setMode(mode) {
      // Toon shading reads best with a single dominant light direction.
      const toon = mode === 'toon'
      hemi.intensity = toon ? 0.9 : 1.1
      fill.intensity = toon ? 0.15 : 0.7
      rim.intensity = toon ? 0.4 : 1.3
      key.intensity = toon ? 2.8 : 2.4
      key.castShadow = mode !== 'lineart'
    },
    dispose() {
      key.shadow.map?.dispose()
      group.removeFromParent()
    },
  }
}
