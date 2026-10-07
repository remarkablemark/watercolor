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
  blur: 1.5,
  saturation: 1.25,
  quantizeStep: 32,
  paperTexture: 0.25,
};

/** Slider definitions rendered by the controls panel. */
export const PARAM_META: readonly ParamMeta[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 4, step: 0.1 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01 },
  { key: 'quantizeStep', label: 'Quantize', min: 0, max: 64, step: 1 },
  { key: 'paperTexture', label: 'Paper texture', min: 0, max: 1, step: 0.01 },
];

/**
 * Returns the parameters with every value clamped to its valid range and
 * quantize steps rounded to a whole number.
 */
export function clampParams(params: WatercolorParams): WatercolorParams {
  return {
    blur: clamp(params.blur, 0, 4),
    saturation: clamp(params.saturation, 0, 2),
    quantizeStep: clamp(Math.round(params.quantizeStep), 0, 64),
    paperTexture: clamp(params.paperTexture, 0, 1),
  };
}
