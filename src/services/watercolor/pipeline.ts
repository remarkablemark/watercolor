import type { WatercolorParams } from 'src/types/watercolor';

import { applyBlur } from './blur';
import { applySaturation } from './color';
import { applyFlatten } from './flatten';
import { applyGrain } from './grain';
import { clampParams } from './params';
import { applyQuantize } from './quantize';

/**
 * Runs the studio look on a decoded source image: flatten onto paper,
 * soft blur, saturated color, flat quantized bands, and a sparse paper
 * texture — in that order, matching the reference canvas snippet.
 *
 * Returns a buffer owned by the caller. The source is never mutated.
 */
export function renderWatercolor(
  source: ImageData,
  params: WatercolorParams,
): ImageData {
  const options = clampParams(params);
  const { width, height } = source;
  const bufferA = new ImageData(width, height);
  const bufferB = new ImageData(width, height);
  applyFlatten(source, bufferA);
  applyBlur(bufferA, bufferB, options);
  applySaturation(bufferB, bufferA, options);
  applyQuantize(bufferA, bufferB, options);
  applyGrain(bufferB, bufferA, options);
  return bufferA;
}
