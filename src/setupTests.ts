// @testing-library/jest-dom adds custom matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `ImageData`, canvas rasterization, or object URLs.
 * The stubs below give the app's canvas pipeline just enough surface to run
 * in tests. Pixel-level behavior is covered by unit tests that build their
 * own `ImageData` fixtures.
 */

class JSDOMImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace: PredefinedColorSpace = 'srgb';

  constructor(source: number | Uint8ClampedArray, width: number, height = 0) {
    if (typeof source === 'number') {
      this.width = source;
      this.height = width;
      this.data = new Uint8ClampedArray(source * width * 4);
    } else {
      this.data = source;
      this.width = width;
      this.height = height;
    }
  }
}

const globals = globalThis as { ImageData?: typeof ImageData };
if (typeof globals.ImageData === 'undefined') {
  globals.ImageData = JSDOMImageData as unknown as typeof ImageData;
}

export interface CanvasContextStub {
  canvas: HTMLCanvasElement;
  drawImage: (...args: unknown[]) => void;
  getImageData: (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => ImageData;
  putImageData: (image: ImageData, dx: number, dy: number) => void;
}

const contextStubs = new WeakMap<HTMLCanvasElement, CanvasContextStub>();

HTMLCanvasElement.prototype.getContext = function getContext(
  this: HTMLCanvasElement,
  contextId: string,
) {
  if (contextId !== '2d') {
    return null;
  }
  let context = contextStubs.get(this);
  if (!context) {
    context = {
      canvas: this,
      drawImage: () => undefined,
      getImageData: (_x, _y, width, height) => new ImageData(width, height),
      putImageData: () => undefined,
    };
    contextStubs.set(this, context);
  }
  return context;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = function toDataURL(type = 'image/png') {
  return `data:${type};base64,AAAA`;
};

HTMLCanvasElement.prototype.toBlob = function toBlob(
  callback: BlobCallback,
  type = 'image/png',
) {
  callback(new Blob([new Uint8Array([1])], { type }));
};

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => undefined;
}
