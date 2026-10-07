import type { WatercolorParams } from 'src/types/watercolor';

import { luminance } from './paint';

/** Maximum darkening applied where edges are strongest. */
const EDGE_DARKENING = 0.6;

/** Edge strength map plus the dimensions of the grid it was built on. */
export interface EdgeMap {
  data: Float32Array;
  width: number;
  height: number;
}

/** Sobel gradient magnitude of luminance, normalized to [0, 1]. */
export function sobelEdgeMap(source: ImageData): EdgeMap {
  const { width, height, data } = source;
  const grid = new Float32Array(width * height);
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; p < width * height; p++, i += 4) {
    luma[p] = luminance(data[i], data[i + 1], data[i + 2]) / 255;
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const a = luma[p - width - 1];
      const b = luma[p - width];
      const c = luma[p - width + 1];
      const d = luma[p - 1];
      const f = luma[p + 1];
      const g = luma[p + width - 1];
      const h = luma[p + width];
      const k = luma[p + width + 1];
      const gx = -a - 2 * d - g + c + 2 * f + k;
      const gy = -a - 2 * b - c + g + 2 * h + k;
      grid[p] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 4);
    }
  }
  return { data: grid, width, height };
}

/** Bilinear sample of an edge map at fractional map coordinates. */
function sampleMap(map: EdgeMap, x: number, y: number): number {
  const { data, width, height } = map;
  const fx = Math.min(width - 1, Math.max(0, x));
  const fy = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const top =
    data[y0 * width + x0] +
    (data[y0 * width + x1] - data[y0 * width + x0]) * tx;
  const bottom =
    data[y1 * width + x0] +
    (data[y1 * width + x1] - data[y1 * width + x0]) * tx;
  return top + (bottom - top) * ty;
}

/**
 * Darkens pixels along detected edges to mimic pigment pooling at the
 * boundary of a dried wash. The map is built on the smaller structure
 * pass and sampled here, which keeps edges soft at full resolution.
 */
export function applyEdges(
  source: ImageData,
  target: ImageData,
  edgeMap: EdgeMap,
  params: WatercolorParams,
): void {
  if (params.edge <= 0) {
    target.data.set(source.data);
    return;
  }
  const { width, height, data: src } = source;
  const dst = target.data;
  const strength = params.edge * EDGE_DARKENING;
  const scaleX = edgeMap.width / width;
  const scaleY = edgeMap.height / height;
  for (let y = 0; y < height; y++) {
    const mapY = (y + 0.5) * scaleY - 0.5;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const edge = sampleMap(edgeMap, (x + 0.5) * scaleX - 0.5, mapY);
      const factor = 1 - strength * edge;
      dst[i] = src[i] * factor;
      dst[i + 1] = src[i + 1] * factor;
      dst[i + 2] = src[i + 2] * factor;
      dst[i + 3] = src[i + 3];
    }
  }
}
