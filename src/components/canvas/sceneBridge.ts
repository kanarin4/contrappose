import type { StudioScene } from './StudioScene'

/** Lets UI components reach the imperative viewport (export, camera) without prop drilling. */
let current: StudioScene | null = null

export const sceneBridge = {
  register(scene: StudioScene | null): void {
    current = scene
  },
  get(): StudioScene | null {
    return current
  },
}
