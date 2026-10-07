import type { WatercolorParams } from 'src/types/watercolor';

import { createGrainTile, GRAIN_TILE_SIZE, sampleTile } from './noise';
import { luminance, PAPER } from './paint';

/** Granulation is stronger where pigment settles: the dark end. */
const DARK_WEIGHT = 0.8;

/** Highlights are lifted toward the paper color by up to this fraction. */
const HIGHLIGHT_TINT = 0.35;

let cachedTile: Float32Array | null = null;

function getGrainTile(): Float32Array {
  cachedTile ??= createGrainTile();
  return cachedTile;
}

/**
 * Overlays the paper grain tile and lifts highlights toward the paper
 * color. Grain scales with the image so it reads the same on screen at
 * any resolution.
 */
export function applyGrain(
  source: ImageData,
  target: ImageData,
  params: WatercolorParams,
): void {
  const strength = params.paperTexture;
  if (strength <= 0) {
    target.data.set(source.data);
    return;
  }
  const tile = getGrainTile();
  const { width, height, data: src } = source;
  const dst = target.data;
  const cell = Math.max(0.25, Math.min(width, height) / 768);
  for (let y = 0; y < height; y++) {
    const tileY = y / cell;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const grain = sampleTile(tile, GRAIN_TILE_SIZE, x / cell, tileY) - 0.5;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const gray = luminance(r, g, b);
      const factor =
        1 + grain * strength * (1 + DARK_WEIGHT * (1 - gray / 255));
      let nextR = r * factor;
      let nextG = g * factor;
      let nextB = b * factor;
      const tint =
        gray > 190
          ? strength * HIGHLIGHT_TINT * Math.min(1, (gray - 190) / 65)
          : 0;
      if (tint > 0) {
        nextR += (PAPER[0] - nextR) * tint;
        nextG += (PAPER[1] - nextG) * tint;
        nextB += (PAPER[2] - nextB) * tint;
      }
      dst[i] = nextR;
      dst[i + 1] = nextG;
      dst[i + 2] = nextB;
      dst[i + 3] = src[i + 3];
    }
  }
}
