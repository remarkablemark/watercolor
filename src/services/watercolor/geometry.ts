/** Image geometry helpers shared by the pipeline and the UI. */

/** Width and height in pixels. */
export interface Size {
  width: number;
  height: number;
}

/** Longest side of the structure (smoothing) pass. */
export const STRUCTURE_MAX_DIM = 1200;

/** Longest side used for interactive renders while a control is dragged. */
export const WORKING_MAX_DIM = 800;

/** Pixel budget for the full-resolution pass; larger sources are scaled down. */
export const MAX_INPUT_PIXELS = 24_000_000;

/**
 * Longest side for the full-resolution pass of a source with the given
 * dimensions, or `undefined` when the source already fits within
 * {@link MAX_INPUT_PIXELS}.
 */
export function fullPassMaxDim(
  width: number,
  height: number,
): number | undefined {
  const pixels = width * height;
  if (pixels <= MAX_INPUT_PIXELS) {
    return undefined;
  }
  const scale = Math.sqrt(MAX_INPUT_PIXELS / pixels);
  return Math.max(1, Math.floor(Math.max(width, height) * scale));
}

/**
 * Returns the given dimensions scaled down so the longest side is at most
 * `maxDim`. Smaller images are returned unchanged.
 */
export function fitSize(width: number, height: number, maxDim: number): Size {
  const longest = Math.max(width, height);
  if (longest <= maxDim) {
    return { width, height };
  }
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
