export interface Proportions {
  /** Total figure height measured in head heights. */
  headRatio: number
  torsoLength: number
  torsoWidth: number
  limbLength: number
  limbThickness: number
  handScale: number
  footScale: number
}

export type ProportionKey = keyof Proportions

export interface ProportionSliderDef {
  key: ProportionKey
  label: string
  min: number
  max: number
  step: number
  format: (v: number) => string
  hint?: (v: number) => string
}

const mult = (v: number) => `${v.toFixed(2)}×`

export function headRatioLabel(v: number): string {
  if (v < 2.6) return 'Ultra Chibi'
  if (v < 3.4) return 'Chibi'
  if (v < 4.6) return 'Cute Anime'
  if (v < 6.2) return 'Stylized'
  return 'Standard Human'
}

export const PROPORTION_SLIDERS: { section: string; sliders: ProportionSliderDef[] }[] = [
  {
    section: 'Head',
    sliders: [
      {
        key: 'headRatio',
        label: 'Head-to-Body Ratio',
        min: 2,
        max: 7.5,
        step: 0.05,
        format: (v) => `${v.toFixed(2)} heads`,
        hint: headRatioLabel,
      },
    ],
  },
  {
    section: 'Torso',
    sliders: [
      { key: 'torsoLength', label: 'Torso Length', min: 0.7, max: 1.4, step: 0.01, format: mult },
      { key: 'torsoWidth', label: 'Torso Width', min: 0.7, max: 1.5, step: 0.01, format: mult },
    ],
  },
  {
    section: 'Limbs',
    sliders: [
      { key: 'limbLength', label: 'Limb Length', min: 0.6, max: 1.5, step: 0.01, format: mult },
      {
        key: 'limbThickness',
        label: 'Limb Thickness',
        min: 0.5,
        max: 2,
        step: 0.01,
        format: mult,
        hint: (v) => (v < 0.8 ? 'Slim' : v > 1.3 ? 'Chubby' : 'Balanced'),
      },
    ],
  },
  {
    section: 'Extremities',
    sliders: [
      { key: 'handScale', label: 'Hand Scale', min: 0.6, max: 2, step: 0.01, format: mult },
      { key: 'footScale', label: 'Foot Scale', min: 0.6, max: 2, step: 0.01, format: mult },
    ],
  },
]

export const DEFAULT_PROPORTIONS: Proportions = {
  headRatio: 3,
  torsoLength: 1,
  torsoWidth: 1,
  limbLength: 1,
  limbThickness: 1.15,
  handScale: 1.15,
  footScale: 1.1,
}

export interface ProportionPreset {
  id: string
  label: string
  values: Proportions
}

export const PROPORTION_PRESETS: ProportionPreset[] = [
  {
    id: 'ultra-chibi',
    label: 'Ultra Chibi',
    values: { headRatio: 2, torsoLength: 1, torsoWidth: 1.1, limbLength: 0.95, limbThickness: 1.4, handScale: 1.3, footScale: 1.25 },
  },
  { id: 'chibi', label: 'Chibi', values: DEFAULT_PROPORTIONS },
  {
    id: 'anime',
    label: 'Cute Anime',
    values: { headRatio: 4, torsoLength: 1, torsoWidth: 0.95, limbLength: 1.05, limbThickness: 0.95, handScale: 1, footScale: 1 },
  },
  {
    id: 'stylized',
    label: 'Stylized',
    values: { headRatio: 5.5, torsoLength: 1, torsoWidth: 1, limbLength: 1.05, limbThickness: 0.9, handScale: 1, footScale: 1 },
  },
  {
    id: 'human',
    label: 'Human',
    values: { headRatio: 7.5, torsoLength: 1, torsoWidth: 1, limbLength: 1, limbThickness: 1, handScale: 1, footScale: 1 },
  },
]
