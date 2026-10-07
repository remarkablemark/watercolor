import { fitSize } from './watercolor/geometry';

/** Throws when jsdom or a locked-down browser denies a 2D context. */
function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }
  return context;
}

/**
 * Draws `image` scaled into a new canvas of exactly `width` x `height`
 * pixels and returns the rasterized result.
 */
export function drawToImageData(
  image: CanvasImageSource,
  width: number,
  height: number,
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = requireContext(canvas);
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/**
 * Reads an HTMLImageElement at its natural size, optionally capped to
 * `maxDim` on the longest side.
 */
export function imageToImageData(
  image: HTMLImageElement,
  maxDim: number = Number.MAX_SAFE_INTEGER,
): ImageData {
  const { width, height } = fitSize(
    image.naturalWidth,
    image.naturalHeight,
    maxDim,
  );
  return drawToImageData(image, width, height);
}
