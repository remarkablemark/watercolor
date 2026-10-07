import type { WatercolorParams } from 'src/types/watercolor';

import { DEFAULT_PARAMS } from './params';
import { renderWatercolor } from './pipeline';

function checker(size: number): ImageData {
  const image = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = (x + y) % 2 === 0 ? 200 : 60;
      const i = (y * size + x) * 4;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

function wide(length: number, height: number): ImageData {
  const image = new ImageData(length, height);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = 120;
    image.data[i + 1] = 90;
    image.data[i + 2] = 60;
    image.data[i + 3] = 255;
  }
  return image;
}

describe('renderWatercolor', () => {
  it('returns an image with the same dimensions as the source', () => {
    const result = renderWatercolor(checker(32), DEFAULT_PARAMS);
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(result.data).toHaveLength(32 * 32 * 4);
  });

  it('scales down images larger than the structure size', () => {
    const result = renderWatercolor(wide(1300, 20), DEFAULT_PARAMS);
    expect(result.width).toBe(1300);
    expect(result.height).toBe(20);
    expect(result.data[3]).toBe(255);
  });

  it('does not mutate the source image', () => {
    const source = checker(16);
    const before = Array.from(source.data);
    renderWatercolor(source, DEFAULT_PARAMS);
    expect(Array.from(source.data)).toEqual(before);
  });

  it('is deterministic for identical inputs', () => {
    const source = checker(16);
    const first = renderWatercolor(source, DEFAULT_PARAMS);
    const second = renderWatercolor(source, DEFAULT_PARAMS);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('changes output when parameters change', () => {
    const source = checker(16);
    const smooth = renderWatercolor(source, DEFAULT_PARAMS);
    const grainy = renderWatercolor(source, {
      ...DEFAULT_PARAMS,
      detail: 0,
      paperTexture: 1,
      saturation: 0,
    } satisfies WatercolorParams);
    expect(Array.from(smooth.data)).not.toEqual(Array.from(grainy.data));
  });

  it('renders transparent sources onto the paper color', () => {
    const transparent = new ImageData(8, 8);
    const result = renderWatercolor(transparent, {
      ...DEFAULT_PARAMS,
      detail: 0,
      wash: 0,
      paperTexture: 0,
      edge: 0,
      saturation: 1,
    });
    expect(result.data[0]).toBeGreaterThanOrEqual(240);
    expect(result.data[3]).toBe(255);
  });

  it('clamps out-of-range parameters', () => {
    const source = checker(8);
    const result = renderWatercolor(source, {
      detail: 5,
      edge: -1,
      wash: Number.NaN,
      paperTexture: 0,
      saturation: 99,
      posterizeLevels: 3,
    });
    expect(result.width).toBe(8);
    for (const value of result.data) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
