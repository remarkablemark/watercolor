import type { Size } from './geometry';

/**
 * Box-filters the source down to `width` x `height`. Every destination
 * pixel averages the source rectangle it covers.
 */
export function downscale(
  source: ImageData,
  width: number,
  height: number,
): ImageData {
  const src = source.data;
  const srcWidth = source.width;
  const srcHeight = source.height;
  const target = new ImageData(width, height);
  const dst = target.data;
  const scaleX = srcWidth / width;
  const scaleY = srcHeight / height;
  for (let y = 0; y < height; y++) {
    const fromY = Math.floor(y * scaleY);
    const toY = Math.max(
      fromY + 1,
      Math.min(srcHeight, Math.ceil((y + 1) * scaleY)),
    );
    for (let x = 0; x < width; x++) {
      const fromX = Math.floor(x * scaleX);
      const toX = Math.max(
        fromX + 1,
        Math.min(srcWidth, Math.ceil((x + 1) * scaleX)),
      );
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = fromY; sy < toY; sy++) {
        for (let sx = fromX; sx < toX; sx++) {
          const i = (sy * srcWidth + sx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          count++;
        }
      }
      const o = (y * width + x) * 4;
      dst[o] = r / count;
      dst[o + 1] = g / count;
      dst[o + 2] = b / count;
      dst[o + 3] = a / count;
    }
  }
  return target;
}

/**
 * Bilinearly enlarges the source to `width` x `height`, preserving the
 * aspect ratio implied by the requested size.
 */
export function upscale(
  source: ImageData,
  width: number,
  height: number,
): ImageData {
  const src = source.data;
  const srcWidth = source.width;
  const srcHeight = source.height;
  const target = new ImageData(width, height);
  const dst = target.data;
  const scaleX = srcWidth / width;
  const scaleY = srcHeight / height;
  for (let y = 0; y < height; y++) {
    const fy = Math.min(srcHeight - 1, Math.max(0, (y + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(srcHeight - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(srcWidth - 1, Math.max(0, (x + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(srcWidth - 1, x0 + 1);
      const tx = fx - x0;
      const i00 = (y0 * srcWidth + x0) * 4;
      const i01 = (y0 * srcWidth + x1) * 4;
      const i10 = (y1 * srcWidth + x0) * 4;
      const i11 = (y1 * srcWidth + x1) * 4;
      const o = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top =
          src[i00 + channel] + (src[i01 + channel] - src[i00 + channel]) * tx;
        const bottom =
          src[i10 + channel] + (src[i11 + channel] - src[i10 + channel]) * tx;
        dst[o + channel] = top + (bottom - top) * ty;
      }
    }
  }
  return target;
}

/** Returns true when `size` already matches the target dimensions. */
export function isSize(size: Size, width: number, height: number): boolean {
  return size.width === width && size.height === height;
}
