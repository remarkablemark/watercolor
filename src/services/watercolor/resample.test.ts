import type { Size } from './geometry';
import { downscale, isSize, upscale } from './resample';

function gradient(width: number, height: number): ImageData {
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.data[i] = (x * 255) / (width - 1);
      image.data[i + 1] = (y * 255) / (height - 1);
      image.data[i + 2] = 128;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

describe('downscale', () => {
  it('averages source rectangles', () => {
    const source = gradient(4, 4);
    const target = downscale(source, 2, 2);
    expect(target.width).toBe(2);
    expect(target.height).toBe(2);
    const average = (source.data[0] + source.data[4]) / 2;
    expect(Math.abs(target.data[0] - average)).toBeLessThan(1);
    expect(target.data[3]).toBe(255);
  });

  it('preserves constant colors', () => {
    const source = new ImageData(8, 8);
    source.data.fill(200);
    const target = downscale(source, 3, 3);
    for (const value of Array.from(target.data)) {
      expect(value).toBe(200);
    }
  });
});

describe('upscale', () => {
  it('returns the same dimensions when already large enough', () => {
    const source = gradient(4, 4);
    const target = upscale(source, 4, 4);
    expect(target.width).toBe(4);
    expect(target.data[0]).toBeCloseTo(source.data[0], 0);
  });

  it('interpolates between neighbors when enlarging', () => {
    const source = new ImageData(2, 1);
    source.data.set([0, 0, 0, 255, 255, 255, 255, 255]);
    const target = upscale(source, 4, 1);
    const values = [0, 1, 2, 3].map((x) => target.data[x * 4]);
    expect(values[0]).toBeLessThan(values[1]);
    expect(values[1]).toBeLessThan(values[2]);
    expect(values[2]).toBeLessThan(values[3]);
    expect(values[3]).toBe(255);
  });
});

describe('isSize', () => {
  it('compares width and height', () => {
    const size: Size = { width: 2, height: 3 };
    expect(isSize(size, 2, 3)).toBe(true);
    expect(isSize(size, 3, 2)).toBe(false);
  });
});
