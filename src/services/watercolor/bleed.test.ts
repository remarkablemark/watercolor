import type { WatercolorParams } from 'src/types/watercolor';

import { applyBleed, bleedRadius } from './bleed';

const base: WatercolorParams = {
  detail: 0,
  edge: 0,
  wash: 0.5,
  paperTexture: 0,
  saturation: 1,
  posterizeLevels: 0,
};

function row(values: number[]): ImageData {
  const image = new ImageData(values.length, 1);
  values.forEach((value, x) => {
    image.data[x * 4] = value;
    image.data[x * 4 + 1] = value;
    image.data[x * 4 + 2] = value;
    image.data[x * 4 + 3] = 255;
  });
  return image;
}

function output(target: ImageData): number[] {
  const values: number[] = [];
  for (let i = 0; i < target.data.length; i += 4) {
    values.push(target.data[i]);
  }
  return values;
}

describe('bleedRadius', () => {
  it('returns 0 when the wash is disabled', () => {
    expect(bleedRadius(1000, 0)).toBe(0);
    expect(bleedRadius(1000, -0.5)).toBe(0);
  });

  it('scales with wash and image size', () => {
    expect(bleedRadius(1000, 1)).toBe(8);
    expect(bleedRadius(1000, 0.5)).toBe(4);
    expect(bleedRadius(1, 1)).toBe(1);
  });

  it('caps the radius for very large images', () => {
    expect(bleedRadius(100_000, 1)).toBe(64);
  });
});

describe('applyBleed', () => {
  it('passes pixels through when wash is 0', () => {
    const source = row([10, 200, 30]);
    const target = new ImageData(3, 1);
    applyBleed(source, target, { ...base, wash: 0 });
    expect(output(target)).toEqual([10, 200, 30]);
  });

  it('fully replaces pixels with the blur at wash 1', () => {
    const source = row([50, 50, 50, 200, 200]);
    const target = new ImageData(5, 1);
    applyBleed(source, target, { ...base, wash: 1 });
    expect(output(target)).toEqual([50, 50, 100, 150, 200]);
  });

  it('mixes the blur proportionally at partial wash', () => {
    const source = row([50, 50, 50, 200, 200]);
    const target = new ImageData(5, 1);
    applyBleed(source, target, { ...base, wash: 0.5 });
    expect(output(target)).toEqual([50, 50, 75, 175, 200]);
  });

  it('preserves alpha', () => {
    const source = row([50, 200]);
    const target = new ImageData(2, 1);
    applyBleed(source, target, { ...base, wash: 1 });
    expect(target.data[3]).toBe(255);
    expect(target.data[7]).toBe(255);
  });
});
