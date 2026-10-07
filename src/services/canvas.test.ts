import { drawToImageData, imageToImageData } from './canvas';

describe('drawToImageData', () => {
  it('rasterizes an image at the requested size', () => {
    const image = document.createElement('img');
    const result = drawToImageData(image, 64, 32);
    expect(result.width).toBe(64);
    expect(result.height).toBe(32);
  });

  it('throws when a 2D context is unavailable', () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    expect(() => drawToImageData(document.createElement('img'), 4, 4)).toThrow(
      'Canvas 2D context is unavailable',
    );
    spy.mockRestore();
  });
});

describe('imageToImageData', () => {
  it('uses the natural image size by default', () => {
    const image = document.createElement('img');
    Object.defineProperty(image, 'naturalWidth', { value: 3000 });
    Object.defineProperty(image, 'naturalHeight', { value: 2000 });
    const result = imageToImageData(image);
    expect(result.width).toBe(3000);
    expect(result.height).toBe(2000);
  });

  it('caps the longest side when maxDim is given', () => {
    const image = document.createElement('img');
    Object.defineProperty(image, 'naturalWidth', { value: 3000 });
    Object.defineProperty(image, 'naturalHeight', { value: 2000 });
    const result = imageToImageData(image, 900);
    expect(result.width).toBe(900);
    expect(result.height).toBe(600);
  });
});
