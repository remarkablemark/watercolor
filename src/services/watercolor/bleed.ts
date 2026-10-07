import type { WatercolorParams } from 'src/types/watercolor';

const BLEED_SCALE = 0.008;
const BLEED_MAX_RADIUS = 64;

/**
 * Blur radius for the wash pass. Returns 0 when the wash is disabled so
 * callers can skip the pass entirely.
 */
export function bleedRadius(minDimension: number, wash: number): number {
  if (wash <= 0) {
    return 0;
  }
  const radius = Math.round(minDimension * BLEED_SCALE * wash);
  return Math.min(BLEED_MAX_RADIUS, Math.max(1, radius));
}

/** Separable box blur over RGBA using per-axis prefix sums. */
function boxBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  const horizontal = new Uint8ClampedArray(pixels.length);
  const vertical = new Uint8ClampedArray(pixels.length);
  const columnPrefix = new Float64Array(width + 1);
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let channel = 0; channel < 4; channel++) {
      columnPrefix[0] = 0;
      for (let x = 0; x < width; x++) {
        columnPrefix[x + 1] = columnPrefix[x] + pixels[row + x * 4 + channel];
      }
      for (let x = 0; x < width; x++) {
        const from = Math.max(0, x - radius);
        const to = Math.min(width - 1, x + radius);
        horizontal[row + x * 4 + channel] =
          (columnPrefix[to + 1] - columnPrefix[from]) / (to - from + 1);
      }
    }
  }
  const rowPrefix = new Float64Array(height + 1);
  for (let x = 0; x < width; x++) {
    for (let channel = 0; channel < 4; channel++) {
      rowPrefix[0] = 0;
      for (let y = 0; y < height; y++) {
        rowPrefix[y + 1] =
          rowPrefix[y] + horizontal[(y * width + x) * 4 + channel];
      }
      for (let y = 0; y < height; y++) {
        const from = Math.max(0, y - radius);
        const to = Math.min(height - 1, y + radius);
        vertical[(y * width + x) * 4 + channel] =
          (rowPrefix[to + 1] - rowPrefix[from]) / (to - from + 1);
      }
    }
  }
  return vertical;
}

/**
 * Wet-on-wet bleed: mixes the input with a box blur of itself. The blur
 * radius and the mix amount both follow the wash parameter.
 */
export function applyBleed(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const radius = bleedRadius(
    Math.min(source.width, source.height),
    params.wash,
  );
  if (radius === 0) {
    target.data.set(source.data);
    return;
  }
  const blurred = boxBlur(source.data, source.width, source.height, radius);
  const src = source.data;
  const dst = target.data;
  const mix = params.wash;
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = src[i] + (blurred[i] - src[i]) * mix;
    dst[i + 1] = src[i + 1] + (blurred[i + 1] - src[i + 1]) * mix;
    dst[i + 2] = src[i + 2] + (blurred[i + 2] - src[i + 2]) * mix;
    dst[i + 3] = src[i + 3];
  }
}
