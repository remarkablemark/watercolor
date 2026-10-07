/**
 * Watercolor effect parameters. Values are normalized by
 * `clampParams` before rendering so consumers may hold loose values.
 */
export interface WatercolorParams {
  /** Edge-preserving smoothing strength. 0 disables, 1 is strongest. */
  detail: number;
  /** Dark pigment pooling along edges. 0 disables, 1 is strongest. */
  edge: number;
  /** Wet-on-wet color bleed. 0 disables, 1 is strongest. */
  wash: number;
  /** Paper grain and granulation. 0 disables, 1 is strongest. */
  paperTexture: number;
  /** Saturation multiplier where 1 is neutral and 0 is grayscale. */
  saturation: number;
  /** Posterize levels. Values below 2 disable quantization. */
  posterizeLevels: number;
}

/** Identifier for a bundled parameter preset. */
export type PresetId = 'loose' | 'wet' | 'sketch' | 'posterized';

/** Mimes that canvas can encode and the app can download. */
export type DownloadFormat = 'image/png' | 'image/jpeg' | 'image/webp';

/** UI metadata describing a single slider. */
export interface ParamMeta {
  key: keyof WatercolorParams;
  label: string;
  min: number;
  max: number;
  step: number;
}
