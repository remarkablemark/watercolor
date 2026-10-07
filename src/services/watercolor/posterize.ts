import type { WatercolorParams } from 'src/types/watercolor';

/**
 * Quantizes color channels into `levels` evenly spaced steps. Values
 * below 2 disable quantization and pass pixels through unchanged.
 */
export function applyPosterize(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const levels = Math.round(params.posterizeLevels);
  if (levels < 2) {
    target.data.set(source.data);
    return;
  }
  const lookup = new Uint8ClampedArray(256);
  const steps = levels - 1;
  for (let value = 0; value < 256; value++) {
    lookup[value] = Math.round(
      (Math.round((value / 255) * steps) / steps) * 255,
    );
  }
  const src = source.data;
  const dst = target.data;
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = lookup[src[i]];
    dst[i + 1] = lookup[src[i + 1]];
    dst[i + 2] = lookup[src[i + 2]];
    dst[i + 3] = src[i + 3];
  }
}
