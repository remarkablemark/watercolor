/**
 * Renderer parameters. Values are normalized by `clampParams` before
 * rendering so consumers may hold loose values.
 */
export interface WatercolorParams {
  /** Gaussian sigma in image pixels. 0 disables the blur. */
  blur: number;
  /** Saturation multiplier where 1 is neutral and 0 is grayscale. */
  saturation: number;
  /** Quantization step; values below 2 disable banding. */
  quantizeStep: number;
  /** Translucent paper speckle. 0 disables, 1 is strongest. */
  paperTexture: number;
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
