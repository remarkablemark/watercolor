import type { WatercolorParams } from 'src/types/watercolor';

import { blurMask, blurRadius } from './blur';
import { saturateColor } from './color';
import { hash2d } from './noise';

/** Translucent blob count, matching the reference snippet's loop. */
const BLOB_COUNT = 1200;

/** Blob radius range in image pixels, matching the reference snippet. */
const BLOB_RADIUS_MIN = 2;
const BLOB_RADIUS_SPAN = 12;

/** Blob alpha at full strength; the studio example uses 0.08 at its default. */
const MAX_ALPHA = 0.32;

/** Fixed seed so texture renders are reproducible. */
const BLOB_SEED = 1337;

/** Paper white and warm shadow speck colors. */
const BLOB_LIGHT = [255, 255, 255] as const;
const BLOB_SHADOW = [0x66, 0x55, 0x44] as const;

/**
 * Overlays the paper texture as sparse translucent circles in paper
 * white and warm shadow, blended one after another so overlaps deepen
 * the way stacked glazes do. The reference snippet never resets
 * `ctx.filter` before its texture loop, so its circles are drawn
 * through the same blur and saturate as the base image — each speck
 * gets that soft edge and tint here before compositing. Count, radius,
 * and placement reproduce the snippet's loop; only the positions are
 * seeded so renders stay reproducible.
 */
export function applyGrain(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const strength = params.paperTexture;
  target.data.set(source.data);
  if (strength <= 0) {
    return;
  }
  const { width, height } = source;
  const dst = target.data;
  const alpha = strength * MAX_ALPHA;
  const boxRadius = blurRadius(params.blur);
  const margin = Math.ceil(2 * boxRadius) + 2;
  const light = saturateColor(
    BLOB_LIGHT[0],
    BLOB_LIGHT[1],
    BLOB_LIGHT[2],
    params.saturation,
  );
  const shadow = saturateColor(
    BLOB_SHADOW[0],
    BLOB_SHADOW[1],
    BLOB_SHADOW[2],
    params.saturation,
  );
  for (let i = 0; i < BLOB_COUNT; i++) {
    const cx = hash2d(i, 0, BLOB_SEED) * width;
    const cy = hash2d(i, 1, BLOB_SEED) * height;
    const radius = BLOB_RADIUS_MIN + hash2d(i, 2, BLOB_SEED) * BLOB_RADIUS_SPAN;
    const fill = hash2d(i, 3, BLOB_SEED) > 0.5 ? light : shadow;
    const radiusSquared = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius - margin));
    const x1 = Math.min(width - 1, Math.ceil(cx + radius + margin));
    const y0 = Math.max(0, Math.floor(cy - radius - margin));
    const y1 = Math.min(height - 1, Math.ceil(cy + radius + margin));
    if (boxRadius === 0) {
      // No blur means no soft edge: rasterize the disc directly.
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx;
          if (dx * dx + dy * dy > radiusSquared) {
            continue;
          }
          const p = (y * width + x) * 4;
          dst[p] += (fill[0] - dst[p]) * alpha;
          dst[p + 1] += (fill[1] - dst[p + 1]) * alpha;
          dst[p + 2] += (fill[2] - dst[p + 2]) * alpha;
        }
      }
      continue;
    }
    const boxWidth = x1 - x0 + 1;
    const boxHeight = y1 - y0 + 1;
    const mask = new Uint8ClampedArray(boxWidth * boxHeight);
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = (y - y0) * boxWidth - x0;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= radiusSquared) {
          mask[row + x] = 255;
        }
      }
    }
    blurMask(mask, boxWidth, boxHeight, boxRadius);
    for (let y = y0; y <= y1; y++) {
      const row = (y - y0) * boxWidth - x0;
      const p = y * width * 4;
      for (let x = x0; x <= x1; x++) {
        const soft = (mask[row + x] / 255) * alpha;
        const q = p + x * 4;
        dst[q] += (fill[0] - dst[q]) * soft;
        dst[q + 1] += (fill[1] - dst[q + 1]) * soft;
        dst[q + 2] += (fill[2] - dst[q + 2]) * soft;
      }
    }
  }
}
