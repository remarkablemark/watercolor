import type { WatercolorParams } from 'src/types/watercolor';

import { applyPosterize } from './posterize';

const base: WatercolorParams = {
  detail: 0,
  edge: 0,
  wash: 0,
  paperTexture: 0,
  saturation: 1,
  posterizeLevels: 0,
};

function ramp(): ImageData {
  const image = new ImageData(256, 1);
  for (let value = 0; value < 256; value++) {
    image.data[value * 4] = value;
    image.data[value * 4 + 1] = value;
    image.data[value * 4 + 2] = value;
    image.data[value * 4 + 3] = 255;
  }
  return image;
}

function reds(target: ImageData): number[] {
  const values: number[] = [];
  for (let i = 0; i < target.data.length; i += 4) {
    values.push(target.data[i]);
  }
  return values;
}

describe('applyPosterize', () => {
  it('passes values through below 2 levels', () => {
    const source = ramp();
    const target = new ImageData(256, 1);
    applyPosterize(source, target, base);
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
    applyPosterize(source, target, { ...base, posterizeLevels: 1 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('collapses two levels to black and white', () => {
    const target = new ImageData(256, 1);
    applyPosterize(ramp(), target, { ...base, posterizeLevels: 2 });
    const values = reds(target);
    expect(values[0]).toBe(0);
    expect(values[100]).toBe(0);
    expect(values[128]).toBe(255);
    expect(values[255]).toBe(255);
    expect(new Set(values).size).toBe(2);
  });

  it('limits a ramp to the requested number of steps', () => {
    const target = new ImageData(256, 1);
    applyPosterize(ramp(), target, { ...base, posterizeLevels: 5 });
    const values = reds(target);
    expect(new Set(values).size).toBeLessThanOrEqual(5);
    expect(values[0]).toBe(0);
    expect(values[255]).toBe(255);
    expect(target.data[3]).toBe(255);
  });
});
