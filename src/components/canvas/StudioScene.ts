import * as THREE from 'three'
import { OrbitControls, TransformControls } from 'three-stdlib'
import { JOINTS, type JointName, type Vec3 } from '../../constants/joints'
import { computeDimensions } from '../../lib/proportionEngine'
import { RAD2DEG } from '../../lib/rotation'
import { useStudioStore, type StudioState } from '../../store/useStudioStore'
import { createLighting, type Lighting } from './lighting'
import { MannequinRig } from './MannequinRig'
import { MaterialLibrary } from './materials'

const CAMERA_TARGET = new THREE.Vector3(0, 1.0, 0)
const CAMERA_DIR = new THREE.Vector3(0.32, 0.18, 1).normalize()
/** Vertical extent (scene units) the default camera frames. */
const FRAME_HEIGHT = 2.9
/** Horizontal extent the default camera keeps in view on narrow (portrait) screens. */
const FRAME_WIDTH = 2.4

type Listener = (event: { value?: unknown }) => void
interface Dispatcher {
  addEventListener(type: string, listener: Listener): void
  removeEventListener(type: string, listener: Listener): void
}

/**
 * Imperative Three.js studio. Owns renderer, camera, controls and the rig, and
 * mirrors the Zustand store into the scene graph without React re-renders.
 */
export class StudioScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly rig: MannequinRig
  private readonly materials = new MaterialLibrary()
  private readonly orbit: OrbitControls
  private readonly gizmo: TransformControls<THREE.PerspectiveCamera>
  private readonly lighting: Lighting
  private readonly grid: THREE.GridHelper
  private readonly floor: THREE.Mesh
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointerDown = new THREE.Vector2()
  private readonly resizeObserver: ResizeObserver
  private readonly unsubscribe: () => void
  private gizmoActive = false
  private pointerIsDown = false
  private disposed = false

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.domElement.style.touchAction = 'none'
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    const state = useStudioStore.getState()
    this.camera = new THREE.PerspectiveCamera(state.fov, 1, 0.01, 500)

    this.lighting = createLighting(this.scene)

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }))
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    this.scene.add(this.floor)

    this.grid = new THREE.GridHelper(12, 48, 0x3b82f6, 0x283044)
    const gridMat = this.grid.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.45
    gridMat.depthWrite = false
    this.scene.add(this.grid)

    this.rig = new MannequinRig(this.materials)
    this.scene.add(this.rig.root)

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbit.enableDamping = true
    this.orbit.dampingFactor = 0.08
    this.orbit.minDistance = 0.4
    this.orbit.maxDistance = 120
    this.orbit.screenSpacePanning = true

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement)
    this.gizmo.setMode('rotate')
    this.gizmo.setSpace('local')
    this.gizmo.setSize(0.8)
    this.scene.add(this.gizmo)
    const gizmoEvents = this.gizmo as unknown as Dispatcher
    gizmoEvents.addEventListener('dragging-changed', this.onDraggingChanged)
    gizmoEvents.addEventListener('objectChange', this.onGizmoChange)

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)

    this.syncAll(state)
    this.resize()
    this.resetCamera()
    this.unsubscribe = useStudioStore.subscribe((s, prev) => this.sync(s, prev))
    this.renderer.setAnimationLoop(this.tick)
  }

  // ----------------------------------------------------------------- store sync

  private syncAll(s: StudioState): void {
    this.rig.build(computeDimensions(s.proportions))
    this.rig.setShading(s.shadingMode)
    this.rig.setAxesVisible(s.showAxes)
    this.applyShading(s)
    this.rig.applyRotations(s.rotations)
    this.rig.placeRoot(s.rootLift, s.autoGround)
    this.applySelection(s.selectedJoint)
    this.applyFov(s.fov, false)
  }

  private sync(s: StudioState, prev: StudioState): void {
    let pose = false
    if (s.proportions !== prev.proportions) {
      this.rig.build(computeDimensions(s.proportions))
      pose = true
    }
    if (s.rotations !== prev.rotations) {
      this.rig.applyRotations(s.rotations)
      pose = true
    }
    if (pose || s.rootLift !== prev.rootLift || s.autoGround !== prev.autoGround) {
      this.rig.placeRoot(s.rootLift, s.autoGround)
    }
    if (s.shadingMode !== prev.shadingMode) {
      this.rig.setShading(s.shadingMode)
      this.applyShading(s)
    }
    if (s.showAxes !== prev.showAxes) this.rig.setAxesVisible(s.showAxes)
    if (s.selectedJoint !== prev.selectedJoint) this.applySelection(s.selectedJoint)
    else if (s.enforceLimits !== prev.enforceLimits) this.updateGizmoAxes()
    if (s.fov !== prev.fov) this.applyFov(s.fov, true)
    if (s.cameraResetToken !== prev.cameraResetToken) this.resetCamera()
  }

  private applyShading(s: StudioState): void {
    const lineart = s.shadingMode === 'lineart'
    this.floor.visible = !lineart
    this.lighting.setMode(s.shadingMode)
  }

  private applySelection(joint: JointName | null): void {
    this.rig.setSelected(joint)
    if (joint) this.gizmo.attach(this.rig.joints[joint])
    else this.gizmo.detach()
    this.updateGizmoAxes()
  }

  /** Hide the yaw/roll rings of hinge joints while anatomical limits lock them. */
  private updateGizmoAxes(): void {
    const { selectedJoint, enforceLimits } = useStudioStore.getState()
    const hingeLocked = Boolean(selectedJoint && enforceLimits && JOINTS[selectedJoint].kind === 'hinge')
    const g = this.gizmo as unknown as { showY: boolean; showZ: boolean }
    g.showY = !hingeLocked
    g.showZ = !hingeLocked
  }

  /** Change FOV while dollying so the subject keeps the same apparent size. */
  private applyFov(fov: number, keepFraming: boolean): void {
    const oldFov = this.camera.fov
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
    this.materials.setOutlineFov(fov)
    if (!keepFraming || oldFov === fov) return
    const offset = this.camera.position.clone().sub(this.orbit.target)
    const ratio = Math.tan(THREE.MathUtils.degToRad(oldFov) / 2) / Math.tan(THREE.MathUtils.degToRad(fov) / 2)
    offset.multiplyScalar(ratio)
    this.camera.position.copy(this.orbit.target).add(offset)
    this.orbit.update()
  }

  resetCamera(): void {
    const halfV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
    const dist = Math.max(FRAME_HEIGHT / 2 / halfV, FRAME_WIDTH / 2 / (halfV * this.camera.aspect))
    this.orbit.target.copy(CAMERA_TARGET)
    this.camera.position.copy(CAMERA_TARGET).addScaledVector(CAMERA_DIR, dist)
    this.camera.lookAt(CAMERA_TARGET)
    this.orbit.update()
  }

  // ------------------------------------------------------------- interaction

  private onDraggingChanged: Listener = (event) => {
    this.gizmoActive = Boolean(event.value)
    this.orbit.enabled = !this.gizmoActive
  }

  private onGizmoChange: Listener = () => {
    const joint = useStudioStore.getState().selectedJoint
    if (!joint) return
    const r = this.rig.joints[joint].rotation
    const deg: Vec3 = [r.x * RAD2DEG, r.y * RAD2DEG, r.z * RAD2DEG]
    useStudioStore.getState().setJointRotation(joint, deg)
    // Write the (possibly clamped) store value back so the gizmo cannot exceed limits.
    this.rig.applyRotations(useStudioStore.getState().rotations)
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerIsDown = true
    this.pointerDown.set(e.clientX, e.clientY)
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerIsDown) return
    this.pointerIsDown = false
    if (this.gizmoActive) return
    if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return
    // A click on the gizmo handles themselves should not change the selection.
    if ((this.gizmo as unknown as { axis: string | null }).axis) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.intersectObjects(this.rig.pickables as THREE.Mesh[], false)[0]
    const joint = (hit?.object.userData.joint as JointName | undefined) ?? null
    useStudioStore.getState().selectJoint(joint)
  }

  // ------------------------------------------------------------------ render

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private tick = (): void => {
    this.orbit.update()
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Render a transparent PNG with the long edge at `longEdge` pixels.
   * Helpers (grid, floor shadow, gizmo, axes) are hidden for a clean cutout.
   */
  exportPNG(longEdge = 3840): Promise<Blob> {
    const canvas = this.renderer.domElement
    const prevSize = this.renderer.getSize(new THREE.Vector2())
    const prevRatio = this.renderer.getPixelRatio()
    const max = Math.min(this.renderer.capabilities.maxTextureSize, 8192)
    const edge = Math.min(longEdge, max)
    const aspect = this.camera.aspect
    const width = Math.round(aspect >= 1 ? edge : edge * aspect)
    const height = Math.round(aspect >= 1 ? edge / aspect : edge)

    const hidden: THREE.Object3D[] = [this.grid, this.floor, this.gizmo]
    const prevVisible = hidden.map((o) => o.visible)
    const showAxes = useStudioStore.getState().showAxes
    hidden.forEach((o) => (o.visible = false))
    this.rig.setAxesVisible(false)
    const selected = useStudioStore.getState().selectedJoint
    this.rig.setSelected(null)

    this.renderer.setPixelRatio(1)
    this.renderer.setSize(width, height, false)
    this.renderer.render(this.scene, this.camera)
    // toBlob snapshots the bitmap synchronously; encoding happens asynchronously.
    const blob = new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
    )

    this.renderer.setPixelRatio(prevRatio)
    this.renderer.setSize(prevSize.x, prevSize.y, false)
    hidden.forEach((o, i) => (o.visible = prevVisible[i]))
    this.rig.setAxesVisible(showAxes)
    this.rig.setSelected(selected)
    this.renderer.render(this.scene, this.camera)
    return blob
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.unsubscribe()
    this.resizeObserver.disconnect()
    const gizmoEvents = this.gizmo as unknown as Dispatcher
    gizmoEvents.removeEventListener('dragging-changed', this.onDraggingChanged)
    gizmoEvents.removeEventListener('objectChange', this.onGizmoChange)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.gizmo.detach()
    this.gizmo.dispose()
    this.orbit.dispose()
    this.rig.dispose()
    this.materials.dispose()
    this.lighting.dispose()
    this.floor.geometry.dispose()
    ;(this.floor.material as THREE.Material).dispose()
    this.grid.geometry.dispose()
    ;(this.grid.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
