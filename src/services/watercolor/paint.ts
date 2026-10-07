/** Shared paint constants and color math. */

/** Paper color that transparent areas and highlights resolve to. */
export const PAPER: readonly [number, number, number] = [251, 248, 241];

/** Rec. 709 luminance of an RGB triple, in the same 0-255 range. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
