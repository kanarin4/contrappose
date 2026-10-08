import type { Proportions } from '../constants/proportions'

/** Reference figure height (head top to sole) at neutral length multipliers. */
export const FIGURE_HEIGHT = 2

/**
 * Resolved world-space dimensions for every part of the rig.
 * All lengths are in scene units (the figure is ~2 units tall).
 */
export interface RigDimensions {
  headHeight: number
  /** Head ellipsoid radii (x, y, z). */
  headRadii: [number, number, number]
  neckLength: number
  neckRadius: number
  torsoLength: number
  shoulderHalfWidth: number
  hipHalfWidth: number
  pelvisToSpine: number
  spineLength: number
  chestLength: number
  clavicleLength: number
  upperArmLength: number
  lowerArmLength: number
  armRadius: number
  handLength: number
  handRadius: number
  upperLegLength: number
  lowerLegLength: number
  legRadius: number
  ankleHeight: number
  footLength: number
  footRadius: number
  /** Height of the hip joints above the floor in rest pose. */
  hipHeight: number
  /** Total height in rest pose. */
  totalHeight: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Mii-maker style proportion engine. The head ratio drives a stylization blend
 * `t` between chibi (2 heads) and realistic (7.5 heads) anatomy; the remaining
 * sliders are multipliers layered on top.
 */
export function computeDimensions(p: Proportions): RigDimensions {
  const t = clamp01((p.headRatio - 2) / 5.5)
  const headHeight = FIGURE_HEIGHT / p.headRatio
  const bodyHeight = FIGURE_HEIGHT - headHeight

  // Fractions of the body (below the head) taken by neck / torso / legs.
  const neckFrac = lerp(0.05, 0.045, t)
  const torsoFrac = lerp(0.5, 0.4, t)
  const legFrac = 1 - neckFrac - torsoFrac

  const baseTorso = bodyHeight * torsoFrac
  const baseLegs = bodyHeight * legFrac

  const torsoLength = baseTorso * p.torsoLength
  const legLength = baseLegs * p.limbLength
  const neckLength = bodyHeight * neckFrac

  const headR = headHeight / 2
  const headRadii: [number, number, number] = [headR * lerp(1.06, 0.82, t), headR, headR * lerp(1.0, 0.92, t)]

  const shoulderHalfWidth = lerp(0.27, 0.24, t) * p.torsoWidth
  const hipHalfWidth = shoulderHalfWidth * lerp(0.48, 0.4, t)

  const legRadius = lerp(0.1, 0.075, t) * p.limbThickness
  const armRadius = lerp(0.075, 0.055, t) * p.limbThickness

  const armSegment = (baseTorso * 0.5 + baseLegs * 0.5) * 0.47 * p.limbLength
  const ankleHeight = Math.max(legLength * 0.07, legRadius * 0.75)
  const legSegment = (legLength - ankleHeight) / 2

  const handLength = lerp(0.17, 0.2, t) * p.handScale
  const footLength = lerp(0.3, 0.27, t) * p.footScale

  return {
    headHeight,
    headRadii,
    neckLength,
    neckRadius: Math.min(headR * 0.45, lerp(0.075, 0.052, t)) * Math.sqrt(p.limbThickness),
    torsoLength,
    shoulderHalfWidth,
    hipHalfWidth,
    pelvisToSpine: torsoLength * 0.2,
    spineLength: torsoLength * 0.3,
    chestLength: torsoLength * 0.42,
    clavicleLength: shoulderHalfWidth * 0.68,
    upperArmLength: armSegment,
    lowerArmLength: armSegment * 0.92,
    armRadius,
    handLength,
    handRadius: handLength * 0.3 * Math.sqrt(p.limbThickness),
    upperLegLength: legSegment,
    lowerLegLength: legSegment,
    legRadius,
    ankleHeight,
    footLength,
    footRadius: Math.max(ankleHeight * 0.55, footLength * 0.17),
    hipHeight: legLength,
    totalHeight: legLength + torsoLength * 0.92 + neckLength + headHeight,
  }
}
