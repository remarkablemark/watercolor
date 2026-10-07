import type { WatercolorParams } from 'src/types/watercolor';

import { applyKuwahara, kuwaharaRadius } from './kuwahara';

const base: WatercolorParams = {
  detail: 0.5,
  edge: 0,
  wash: 0,
  paperTexture: 0,
  saturation: 1,
  posterizeLevels: 0,
};

function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => number[],
): ImageData {
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

describe('kuwaharaRadius', () => {
  it('returns 0 when detail is disabled', () => {
    expect(kuwaharaRadius(1200, 0)).toBe(0);
    expect(kuwaharaRadius(1200, -1)).toBe(0);
  });

  it('scales with detail and image size', () => {
    expect(kuwaharaRadius(100, 1)).toBe(1);
    expect(kuwaharaRadius(2000, 1)).toBe(12);
    expect(kuwaharaRadius(2000, 0.5)).toBe(6);
  });

  it('clamps to at least 1 and at most 16', () => {
    expect(kuwaharaRadius(1, 1)).toBe(1);
    expect(kuwaharaRadius(100_000, 1)).toBe(16);
  });
});

describe('applyKuwahara', () => {
  it('passes pixels through when detail is 0', () => {
    const source = makeImage(3, 3, (x) => [x * 10, x * 20, x * 30]);
    const target = new ImageData(3, 3);
    applyKuwahara(source, target, { ...base, detail: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('leaves constant images unchanged', () => {
    const source = makeImage(6, 4, () => [128, 128, 128]);
    const target = new ImageData(6, 4);
    applyKuwahara(source, target, base);
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('preserves a hard vertical edge', () => {
    const source = makeImage(8, 4, (x) =>
      x < 4 ? [50, 50, 50] : [200, 200, 200],
    );
    const target = new ImageData(8, 4);
    applyKuwahara(source, target, base);
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('smooths noisy regions', () => {
    const source = makeImage(6, 6, (x, y) =>
      (x + y) % 2 === 0 ? [255, 255, 255] : [0, 0, 0],
    );
    const target = new ImageData(6, 6);
    applyKuwahara(source, target, base);
    const center = (3 * 6 + 3) * 4;
    expect(target.data[center]).toBeGreaterThanOrEqual(100);
    expect(target.data[center]).toBeLessThanOrEqual(155);
    const mean = (255 + 0) / 2;
    let variance = 0;
    for (let i = 0; i < target.data.length; i += 4) {
      variance += (target.data[i] - mean) ** 2;
    }
    expect(variance).toBeLessThan(6 * 6 * (255 / 2) ** 2);
  });
});
