import type { WatercolorParams } from 'src/types/watercolor';

import { luminance } from './paint';

/**
 * Adjusts saturation around Rec. 709 luminance. 1 is a pass-through, 0
 * produces grayscale, and values above 1 boost color.
 */
export function applySaturation(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const amount = params.saturation;
  if (amount === 1) {
    target.data.set(source.data);
    return;
  }
  const src = source.data;
  const dst = target.data;
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const gray = luminance(r, g, b);
    dst[i] = gray + (r - gray) * amount;
    dst[i + 1] = gray + (g - gray) * amount;
    dst[i + 2] = gray + (b - gray) * amount;
    dst[i + 3] = src[i + 3];
  }
}

/**
 * The single-color version of {@link applySaturation}'s math, for the
 * texture specks. CSS `saturate()` uses the same Rec. 709 luminance
 * gain, so this also reproduces the reference snippet's filter on the
 * speck fill colors.
 */
export function saturateColor(
  r: number,
  g: number,
  b: number,
  amount: number,
): [number, number, number] {
  const gray = luminance(r, g, b);
  return [
    gray + (r - gray) * amount,
    gray + (g - gray) * amount,
    gray + (b - gray) * amount,
  ];
}
