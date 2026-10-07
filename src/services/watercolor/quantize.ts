import type { WatercolorParams } from 'src/types/watercolor';

/**
 * Quantizes color channels into flat bands: every channel snaps to a
 * multiple of `quantizeStep`, so the default of 32 matches the studio
 * reference (`Math.round(value / 32) * 32`). Values below 2 disable
 * quantization and pass pixels through unchanged.
 */
export function applyQuantize(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const step = Math.round(params.quantizeStep);
  if (step < 2) {
    target.data.set(source.data);
    return;
  }
  const lookup = new Uint8ClampedArray(256);
  for (let value = 0; value < 256; value++) {
    lookup[value] = Math.round(value / step) * step;
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
