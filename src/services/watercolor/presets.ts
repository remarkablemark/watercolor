import type { PresetId, WatercolorParams } from 'src/types/watercolor';

/** A named bundle of parameters offered as a one-click look. */
export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  params: WatercolorParams;
}

/** Built-in looks covering the painterly and graphic ends of the range. */
export const PRESETS: readonly Preset[] = [
  {
    id: 'loose',
    label: 'Loose',
    description: 'Balanced painterly washes with soft detail.',
    params: {
      detail: 0.6,
      edge: 0.18,
      wash: 0.5,
      paperTexture: 0.45,
      saturation: 1.15,
      posterizeLevels: 0,
    },
  },
  {
    id: 'wet',
    label: 'Wet-on-wet',
    description: 'Heavy bleed and soft pigment edges.',
    params: {
      detail: 0.75,
      edge: 0.05,
      wash: 0.9,
      paperTexture: 0.6,
      saturation: 1.3,
      posterizeLevels: 0,
    },
  },
  {
    id: 'sketch',
    label: 'Sketch',
    description: 'Dark ink edges over pale, desaturated washes.',
    params: {
      detail: 0.3,
      edge: 0.85,
      wash: 0.08,
      paperTexture: 0.7,
      saturation: 0.12,
      posterizeLevels: 0,
    },
  },
  {
    id: 'posterized',
    label: 'Posterized',
    description: 'Flat graphic shapes with banded color.',
    params: {
      detail: 0.4,
      edge: 0.4,
      wash: 0.25,
      paperTexture: 0.35,
      saturation: 1.25,
      posterizeLevels: 5,
    },
  },
];

/** Looks up a preset by id, throwing when it does not exist. */
export function getPreset(id: PresetId): Preset {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

/**
 * Returns the id of the preset whose parameters match the given params
 * exactly, or `null` when the params have been customized.
 */
export function matchPreset(params: WatercolorParams): PresetId | null {
  const match = PRESETS.find(({ params: candidate }) =>
    (Object.keys(candidate) as (keyof WatercolorParams)[]).every(
      (key) => candidate[key] === params[key],
    ),
  );
  return match ? match.id : null;
}
