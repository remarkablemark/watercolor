import type { WatercolorParams } from 'src/types/watercolor';

/** Separable box passes (H,V,H,V) that approximate a Gaussian blur. */
const PASS_COUNT = 4;

/**
 * Box radius whose {@link PASS_COUNT} box passes produce the requested
 * Gaussian sigma. Sizes are image pixels, matching the reference
 * snippet's `blur(1.5px)` exactly at any resolution. Returns 0 when the
 * blur is disabled.
 */
export function blurRadius(blur: number): number {
  if (blur <= 0) {
    return 0;
  }
  return (Math.sqrt(1 + (12 * blur * blur) / PASS_COUNT) - 1) / 2;
}

/**
 * Runs one axis of the box blur. The window has a fractional radius and
 * interpolates the samples it only partially covers, so the blur
 * strength varies continuously with the parameter. Edges are
 * renormalized to the samples inside the line. `pixelStride` and
 * `channelCount` allow the same pass to run over RGB(A) pixels (4/3)
 * or a flat 8-bit mask (1/1).
 */
function boxPass(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
  pixelStride: number,
  channelCount: number,
): void {
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? pixelStride : width * pixelStride;
  const lineGap = horizontal ? width * pixelStride : pixelStride;
  const prefix = new Float64Array(length + 1);
  for (let line = 0; line < lines; line++) {
    const base = line * lineGap;
    for (let channel = 0; channel < channelCount; channel++) {
      prefix[0] = 0;
      for (let i = 0; i < length; i++) {
        prefix[i + 1] = prefix[i] + src[base + i * step + channel];
      }
      for (let i = 0; i < length; i++) {
        const lo = i - radius - 0.5;
        const hi = i + radius + 0.5;
        const u = Math.max(lo, -0.5);
        const v = Math.min(hi, length - 0.5);
        const first = Math.ceil(u + 0.5);
        const last = Math.floor(v - 0.5);
        let sum = prefix[last + 1] - prefix[first];
        const left = first - 1;
        if (left >= 0) {
          const start = Math.max(left - 0.5, u);
          sum +=
            src[base + left * step + channel] *
            (Math.min(left + 0.5, v) - start);
        }
        const right = last + 1;
        if (right < length) {
          const start = Math.max(right - 0.5, u);
          sum +=
            src[base + right * step + channel] *
            (Math.min(right + 0.5, v) - start);
        }
        dst[base + i * step + channel] = sum / (v - u);
      }
    }
  }
}

/**
 * Softens the source with a Gaussian-style blur matching the studio
 * reference (`blur(1.5px)` at its default). Alpha passes through
 * untouched; the pipeline flattens transparency before this stage.
 */
export function applyBlur(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const { width, height } = source;
  const radius = blurRadius(params.blur);
  if (radius === 0) {
    target.data.set(source.data);
    return;
  }
  const scratch = new ImageData(width, height);
  boxPass(source.data, scratch.data, width, height, radius, true, 4, 3);
  boxPass(scratch.data, target.data, width, height, radius, false, 4, 3);
  boxPass(target.data, scratch.data, width, height, radius, true, 4, 3);
  boxPass(scratch.data, target.data, width, height, radius, false, 4, 3);
  for (let i = 3; i < target.data.length; i += 4) {
    target.data[i] = source.data[i];
  }
}

/**
 * Blurs an 8-bit alpha mask in place with the same Gaussian as
 * {@link applyBlur}. The texture specks use it so they get the soft
 * edge the reference snippet's still-active canvas filter gives them.
 */
export function blurMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  const scratch = new Uint8ClampedArray(mask.length);
  boxPass(mask, scratch, width, height, radius, true, 1, 1);
  boxPass(scratch, mask, width, height, radius, false, 1, 1);
  boxPass(mask, scratch, width, height, radius, true, 1, 1);
  boxPass(scratch, mask, width, height, radius, false, 1, 1);
  return mask;
}
