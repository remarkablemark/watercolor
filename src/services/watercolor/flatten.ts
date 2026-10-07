import { PAPER } from './paint';

/**
 * Composites the source over the paper color so every later stage sees
 * fully opaque pixels. Output alpha is always 255.
 */
export function applyFlatten(source: ImageData, target: ImageData): void {
  const src = source.data;
  const dst = target.data;
  for (let i = 0; i < src.length; i += 4) {
    const alpha = src[i + 3] / 255;
    dst[i] = src[i] * alpha + PAPER[0] * (1 - alpha);
    dst[i + 1] = src[i + 1] * alpha + PAPER[1] * (1 - alpha);
    dst[i + 2] = src[i + 2] * alpha + PAPER[2] * (1 - alpha);
    dst[i + 3] = 255;
  }
}
