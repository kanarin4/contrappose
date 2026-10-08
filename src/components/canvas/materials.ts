import * as THREE from 'three'
import type { ShadingMode } from '../../store/useStudioStore'

export type MeshRole = 'body' | 'guide'

interface ModeMaterials {
  body: THREE.Material
  selected: THREE.Material
  guide: THREE.Material
}

const ACCENT = new THREE.Color('#3b82f6')

function toonGradient(steps: number[]): THREE.DataTexture {
  const data = new Uint8Array(steps.map((v) => Math.round(v * 255)))
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/**
 * Inverted-hull outline material. Vertices are pushed along their view-space
 * normal by an amount proportional to depth, which keeps the line weight
 * roughly constant in screen space regardless of zoom or FOV.
 */
function createOutlineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#0b0d14') },
      uThickness: { value: 0.0045 },
      uFovFactor: { value: Math.tan(THREE.MathUtils.degToRad(35) / 2) },
    },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      uniform float uFovFactor;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        float depth = max(-mvPosition.z, 0.05);
        mvPosition.xyz += n * uThickness * depth * uFovFactor * 2.0;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    toneMapped: false,
  })
}

export class MaterialLibrary {
  readonly outline = createOutlineMaterial()
  private readonly gradient = toonGradient([0.32, 0.62, 1])
  private readonly modes: Record<ShadingMode, ModeMaterials>

  constructor() {
    const clayColor = new THREE.Color('#d8d2c8')
    this.modes = {
      clay: {
        body: new THREE.MeshStandardMaterial({ color: clayColor, roughness: 0.72, metalness: 0 }),
        selected: new THREE.MeshStandardMaterial({
          color: clayColor.clone().lerp(ACCENT, 0.45),
          roughness: 0.6,
          emissive: ACCENT,
          emissiveIntensity: 0.18,
        }),
        guide: new THREE.MeshBasicMaterial({ color: '#4b5563' }),
      },
      toon: {
        body: new THREE.MeshToonMaterial({ color: '#e9e4dc', gradientMap: this.gradient }),
        selected: new THREE.MeshToonMaterial({ color: new THREE.Color('#e9e4dc').lerp(ACCENT, 0.5), gradientMap: this.gradient }),
        guide: new THREE.MeshBasicMaterial({ color: '#1f2937' }),
      },
      lineart: {
        body: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
        selected: new THREE.MeshBasicMaterial({ color: '#dbeafe', toneMapped: false }),
        guide: new THREE.MeshBasicMaterial({ color: '#0b0d14', toneMapped: false }),
      },
    }
  }

  get(mode: ShadingMode, role: MeshRole, selected: boolean): THREE.Material {
    const m = this.modes[mode]
    if (role === 'guide') return m.guide
    return selected ? m.selected : m.body
  }

  setOutlineFov(fovDeg: number): void {
    this.outline.uniforms.uFovFactor.value = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2)
  }

  dispose(): void {
    for (const m of Object.values(this.modes)) {
      m.body.dispose()
      m.selected.dispose()
      m.guide.dispose()
    }
    this.outline.dispose()
    this.gradient.dispose()
  }
}
