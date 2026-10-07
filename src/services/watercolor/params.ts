import type { ParamMeta, WatercolorParams } from 'src/types/watercolor';

const clamp = (value: number, min: number, max: number): number => {
  const safe = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, safe));
};

/**
 * Parameters used before the user touches any control. Matches the
 * {@link PRESETS} "Loose" preset so the initial state is consistent.
 */
export const DEFAULT_PARAMS: WatercolorParams = {
  detail: 0.6,
  edge: 0.18,
  wash: 0.5,
  paperTexture: 0.45,
  saturation: 1.15,
  posterizeLevels: 0,
};

/** Slider definitions rendered by the controls panel. */
export const PARAM_META: readonly ParamMeta[] = [
  { key: 'detail', label: 'Detail', min: 0, max: 1, step: 0.01 },
  { key: 'wash', label: 'Wash', min: 0, max: 1, step: 0.01 },
  { key: 'edge', label: 'Edges', min: 0, max: 1, step: 0.01 },
  { key: 'paperTexture', label: 'Paper texture', min: 0, max: 1, step: 0.01 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01 },
  { key: 'posterizeLevels', label: 'Posterize', min: 0, max: 8, step: 1 },
];

/**
 * Returns the parameters with every value clamped to its valid range and
 * posterize levels rounded to a whole number.
 */
export function clampParams(params: WatercolorParams): WatercolorParams {
  return {
    detail: clamp(params.detail, 0, 1),
    edge: clamp(params.edge, 0, 1),
    wash: clamp(params.wash, 0, 1),
    paperTexture: clamp(params.paperTexture, 0, 1),
    saturation: clamp(params.saturation, 0, 2),
    posterizeLevels: clamp(Math.round(params.posterizeLevels), 0, 8),
  };
}
