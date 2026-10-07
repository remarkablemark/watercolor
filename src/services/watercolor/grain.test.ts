import type { WatercolorParams } from 'src/types/watercolor';

import { applyGrain } from './grain';

const base: WatercolorParams = {
  detail: 0,
  edge: 0,
  wash: 0,
  paperTexture: 0.5,
  saturation: 1,
  posterizeLevels: 0,
};

function constant(value: number, size = 32): ImageData {
  const image = new ImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  return image;
}

function distinctValues(image: ImageData): Set<number> {
  const values = new Set<number>();
  for (let i = 0; i < image.data.length; i += 4) {
    values.add(image.data[i]);
  }
  return values;
}

describe('applyGrain', () => {
  it('passes pixels through when paper texture is 0', () => {
    const source = constant(128);
    const target = new ImageData(32, 32);
    applyGrain(source, target, { ...base, paperTexture: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('breaks flat areas into grain', () => {
    const source = constant(128);
    const target = new ImageData(32, 32);
    applyGrain(source, target, base);
    expect(distinctValues(target).size).toBeGreaterThan(2);
    for (const value of target.data) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    }
  });

  it('is deterministic for the same input', () => {
    const source = constant(128);
    const first = new ImageData(32, 32);
    const second = new ImageData(32, 32);
    applyGrain(source, first, base);
    applyGrain(source, second, base);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('lifts highlights toward the warm paper color', () => {
    const source = constant(255);
    const target = new ImageData(32, 32);
    applyGrain(source, target, base);
    let red = 0;
    let blue = 0;
    let samples = 0;
    for (let i = 0; i < target.data.length; i += 4) {
      red += target.data[i];
      blue += target.data[i + 2];
      samples++;
    }
    expect(blue / samples).toBeLessThan(red / samples);
  });

  it('granulates dark pigment more than light pigment', () => {
    const dark = constant(40);
    const light = constant(220);
    const darkOut = new ImageData(32, 32);
    const lightOut = new ImageData(32, 32);
    applyGrain(dark, darkOut, base);
    applyGrain(light, lightOut, base);
    const relativeSpread = (image: ImageData, baseValue: number): number => {
      const values = Array.from(image.data).filter(
        (_, index) => index % 4 === 0,
      );
      return (Math.max(...values) - Math.min(...values)) / baseValue;
    };
    expect(relativeSpread(darkOut, 40)).toBeGreaterThan(
      relativeSpread(lightOut, 220),
    );
  });
});
