import type { WatercolorParams } from 'src/types/watercolor';

import { applyQuantize } from './quantize';

const base: WatercolorParams = {
  blur: 0,
  saturation: 1,
  quantizeStep: 32,
  paperTexture: 0,
};

/** Horizontal ramp covering every byte value. */
function ramp(width = 256, height = 1): ImageData {
  const image = new ImageData(width, height);
  for (let x = 0; x < width; x++) {
    const i = x * 4;
    image.data[i] = x % 256;
    image.data[i + 1] = (x * 3) % 256;
    image.data[i + 2] = (x * 7) % 256;
    image.data[i + 3] = 255;
  }
  return image;
}

function distinctReds(image: ImageData): Set<number> {
  const values = new Set<number>();
  for (let i = 0; i < image.data.length; i += 4) {
    values.add(image.data[i]);
  }
  return values;
}

describe('applyQuantize', () => {
  it('passes pixels through when the step is below 2', () => {
    const source = ramp();
    const target = new ImageData(256, 1);
    applyQuantize(source, target, { ...base, quantizeStep: 1 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
    applyQuantize(source, target, { ...base, quantizeStep: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('snaps channels to multiples of the step', () => {
    const bands = [0, 32, 64, 96, 128, 160, 192, 224, 255];
    const target = new ImageData(256, 1);
    applyQuantize(ramp(), target, base);
    for (let i = 0; i < target.data.length; i += 4) {
      // 255 rounds up to 256 and clamps, matching the studio reference.
      expect(bands).toContain(target.data[i]);
      expect(bands).toContain(target.data[i + 1]);
      expect(bands).toContain(target.data[i + 2]);
    }
    expect(target.data[255 * 4]).toBe(255);
  });

  it('collapses a smooth ramp into a handful of bands', () => {
    const target = new ImageData(256, 1);
    applyQuantize(ramp(), target, base);
    expect(distinctReds(target).size).toBeLessThanOrEqual(9);
  });

  it('honors a different step', () => {
    const target = new ImageData(256, 1);
    applyQuantize(ramp(), target, { ...base, quantizeStep: 64 });
    expect(distinctReds(target).size).toBeLessThanOrEqual(5);
    expect(target.data[0]).toBe(0);
    expect(target.data[4 * 40]).toBe(64);
  });

  it('rounds a fractional step to a whole number', () => {
    const target = new ImageData(256, 1);
    applyQuantize(ramp(), target, { ...base, quantizeStep: 4.6 });
    // 4.6 rounds to 5, so channels snap to multiples of 5.
    expect(target.data[4 * 5]).toBe(5);
    expect(target.data[4 * 8]).toBe(10);
  });

  it('preserves alpha', () => {
    const source = new ImageData(2, 1);
    source.data.set([10, 20, 30, 77, 200, 100, 50, 155]);
    const target = new ImageData(2, 1);
    applyQuantize(source, target, base);
    expect(target.data[3]).toBe(77);
    expect(target.data[7]).toBe(155);
  });
});
