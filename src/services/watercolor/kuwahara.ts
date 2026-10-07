import type { WatercolorParams } from 'src/types/watercolor';

const KUWAHARA_SCALE = 0.006;
const KUWAHARA_MAX_RADIUS = 16;

/**
 * Smoothing radius for a given detail strength. Returns 0 when smoothing
 * is disabled, which lets callers skip the pass entirely.
 */
export function kuwaharaRadius(minDimension: number, detail: number): number {
  if (detail <= 0) {
    return 0;
  }
  const radius = Math.round(minDimension * KUWAHARA_SCALE * detail);
  return Math.min(KUWAHARA_MAX_RADIUS, Math.max(1, radius));
}

/** Builds row-cumulative sums and squared sums for one color channel. */
function buildIntegral(
  pixels: Uint8ClampedArray,
  channel: number,
  width: number,
  height: number,
  sum: Float32Array,
  square: Float32Array,
): void {
  const stride = width + 1;
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSquare = 0;
    const sourceOffset = y * width * 4;
    const previousRow = y * stride;
    const currentRow = (y + 1) * stride;
    for (let x = 0; x < width; x++) {
      const value = pixels[sourceOffset + x * 4 + channel];
      rowSum += value;
      rowSquare += value * value;
      sum[currentRow + x + 1] = sum[previousRow + x + 1] + rowSum;
      square[currentRow + x + 1] = square[previousRow + x + 1] + rowSquare;
    }
  }
}

/** Sum of the inclusive rectangle in an integral image. */
function rectangle(
  integral: Float32Array,
  stride: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  return (
    integral[(y1 + 1) * stride + x1 + 1] -
    integral[y0 * stride + x1 + 1] -
    integral[(y1 + 1) * stride + x0] +
    integral[y0 * stride + x0]
  );
}

/**
 * Four-sector Kuwahara filter: each pixel takes the mean of the quadrant
 * with the least variance, which smooths flat areas while keeping edges
 * crisp. Uses integral images so the cost is linear in pixels.
 */
export function applyKuwahara(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const radius = kuwaharaRadius(
    Math.min(source.width, source.height),
    params.detail,
  );
  if (radius === 0) {
    target.data.set(source.data);
    return;
  }
  const width = source.width;
  const height = source.height;
  const src = source.data;
  const dst = target.data;
  const stride = width + 1;
  const sum = new Float32Array(stride * (height + 1));
  const square = new Float32Array(stride * (height + 1));
  for (let channel = 0; channel < 3; channel++) {
    buildIntegral(src, channel, width, height, sum, square);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const xL = Math.max(0, x - radius);
        const xR = Math.min(width - 1, x + radius);
        const yT = Math.max(0, y - radius);
        const yB = Math.min(height - 1, y + radius);
        let bestVariance = Number.POSITIVE_INFINITY;
        let bestValue = 0;
        for (let quadrant = 0; quadrant < 4; quadrant++) {
          const qx0 = quadrant % 2 === 0 ? xL : x;
          const qx1 = quadrant % 2 === 0 ? x : xR;
          const qy0 = quadrant < 2 ? yT : y;
          const qy1 = quadrant < 2 ? y : yB;
          const count = (qx1 - qx0 + 1) * (qy1 - qy0 + 1);
          const total = rectangle(sum, stride, qx0, qy0, qx1, qy1);
          const totalSquare = rectangle(square, stride, qx0, qy0, qx1, qy1);
          const mean = total / count;
          const variance = totalSquare / count - mean * mean;
          if (variance < bestVariance) {
            bestVariance = variance;
            bestValue = mean;
          }
        }
        const offset = (y * width + x) * 4 + channel;
        dst[offset] = bestValue;
      }
    }
  }
  for (let i = 3; i < src.length; i += 4) {
    dst[i] = src[i];
  }
}
