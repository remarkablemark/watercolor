import type { PresetId, WatercolorParams } from 'src/types/watercolor';

/** A named bundle of parameters offered as a one-click look. */
export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  params: WatercolorParams;
}

/** Built-in looks spanning soft, graphic, and monochrome treatments. */
export const PRESETS: readonly Preset[] = [
  {
    id: 'loose',
    label: 'Loose',
    description: 'Soft focus with flat, banded color and light texture.',
    params: {
      blur: 1.5,
      saturation: 1.25,
      quantizeStep: 32,
      paperTexture: 0.25,
    },
  },
  {
    id: 'wet',
    label: 'Wet-on-wet',
    description: 'Extra-soft focus with rich color and heavier texture.',
    params: {
      blur: 3,
      saturation: 1.4,
      quantizeStep: 48,
      paperTexture: 0.4,
    },
  },
  {
    id: 'sketch',
    label: 'Sketch',
    description: 'Near-monochrome with fine tonal bands and visible tooth.',
    params: {
      blur: 1,
      saturation: 0.15,
      quantizeStep: 16,
      paperTexture: 0.45,
    },
  },
  {
    id: 'posterized',
    label: 'Posterized',
    description: 'Bold flat shapes with coarse color banding.',
    params: {
      blur: 2,
      saturation: 1.3,
      quantizeStep: 64,
      paperTexture: 0.2,
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
