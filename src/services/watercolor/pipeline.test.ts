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

  it('keeps source dimensions for wide images', () => {
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
    const graphic = renderWatercolor(source, {
      ...DEFAULT_PARAMS,
      blur: 0,
      paperTexture: 1,
      saturation: 0,
    } satisfies WatercolorParams);
    expect(Array.from(smooth.data)).not.toEqual(Array.from(graphic.data));
  });

  it('flattens a uniform source to a single band', () => {
    const source = new ImageData(24, 24);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 128;
      source.data[i + 1] = 128;
      source.data[i + 2] = 128;
      source.data[i + 3] = 255;
    }
    const result = renderWatercolor(source, {
      ...DEFAULT_PARAMS,
      paperTexture: 0,
    });
    const reds = new Set<number>();
    for (let i = 0; i < result.data.length; i += 4) {
      reds.add(result.data[i]);
    }
    expect(reds).toEqual(new Set([128]));
  });

  it('renders transparent sources onto the paper color', () => {
    const transparent = new ImageData(8, 8);
    const result = renderWatercolor(transparent, {
      ...DEFAULT_PARAMS,
      blur: 0,
      paperTexture: 0,
      saturation: 1,
      quantizeStep: 0,
    });
    expect(result.data[0]).toBeGreaterThanOrEqual(240);
    expect(result.data[3]).toBe(255);
  });

  it('clamps out-of-range parameters', () => {
    const source = checker(8);
    const result = renderWatercolor(source, {
      blur: 9,
      saturation: Number.NaN,
      quantizeStep: 3.7,
      paperTexture: -2,
    });
    expect(result.width).toBe(8);
    for (const value of result.data) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
