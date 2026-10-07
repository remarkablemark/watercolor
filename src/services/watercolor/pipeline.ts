import type { WatercolorParams } from 'src/types/watercolor';

import { applyBleed } from './bleed';
import { applySaturation } from './color';
import { applyEdges, sobelEdgeMap } from './edges';
import { applyFlatten } from './flatten';
import { fitSize, STRUCTURE_MAX_DIM } from './geometry';
import { applyGrain } from './grain';
import { applyKuwahara } from './kuwahara';
import { clampParams } from './params';
import { applyPosterize } from './posterize';
import { downscale, isSize, upscale } from './resample';

/**
 * Runs the full watercolor pipeline on a decoded source image.
 *
 * Smoothing and bleed run on a bounded "structure" copy so cost stays flat
 * regardless of input size; grain, edges, posterize, and color are applied
 * at the source resolution so the resting render stays crisp.
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

  const structure = fitSize(width, height, STRUCTURE_MAX_DIM);
  const needsScale = !isSize(structure, width, height);
  const small = needsScale
    ? downscale(bufferA, structure.width, structure.height)
    : bufferA;
  const smoothed = new ImageData(structure.width, structure.height);
  applyKuwahara(small, smoothed, options);
  const washed = small;
  applyBleed(smoothed, washed, options);
  const edgeMap = sobelEdgeMap(washed);

  const base = needsScale ? upscale(washed, width, height) : washed;
  applySaturation(base, bufferB, options);
  applyPosterize(bufferB, bufferA, options);
  applyEdges(bufferA, bufferB, edgeMap, options);
  applyGrain(bufferB, bufferA, options);
  return bufferA;
}
