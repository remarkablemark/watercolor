import type { WatercolorParams } from 'src/types/watercolor';

import { applyGrain } from './grain';
import { DEFAULT_PARAMS } from './params';

const base: WatercolorParams = {
  blur: 0,
  saturation: 1,
  quantizeStep: 0,
  paperTexture: 0.5,
};

function constant(value: number, width = 32, height = width): ImageData {
  const image = new ImageData(width, height);
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

function spread(image: ImageData): number {
  let min = 255;
  let max = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const value = image.data[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

/** Standard deviation of the red channel: the source is flat gray. */
function std(image: ImageData): number {
  let sum = 0;
  let sumSq = 0;
  let samples = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const value = image.data[i];
    sum += value;
    sumSq += value * value;
    samples++;
  }
  const mean = sum / samples;
  return Math.sqrt(sumSq / samples - mean * mean);
}

/** True when any byte differs; an early-exit scan for big canvases. */
function differs(a: ImageData, b: ImageData): boolean {
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) {
      return true;
    }
  }
  return false;
}

describe('applyGrain', () => {
  it('passes pixels through when paper texture is 0', () => {
    const source = constant(128);
    const target = new ImageData(32, 32);
    applyGrain(source, target, { ...base, paperTexture: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('scatters speckles across flat areas', () => {
    const source = constant(128, 640, 480);
    const target = new ImageData(640, 480);
    applyGrain(source, target, base);
    expect(distinctValues(target).size).toBeGreaterThan(2);
    // Uint8ClampedArray cannot escape 0-255, but prove it for this render.
    let inRange = true;
    for (const value of target.data) {
      if (value < 0 || value > 255) inRange = false;
    }
    expect(inRange).toBe(true);
  });

  it('blends both light and warm shadow speckles', () => {
    const source = constant(128, 640, 480);
    const target = new ImageData(640, 480);
    applyGrain(source, target, base);
    const values = Array.from(target.data).filter(
      (_, index) => index % 4 === 0,
    );
    expect(values.some((value) => value > 128)).toBe(true);
    expect(values.some((value) => value < 128)).toBe(true);
    // The shadow speck is warm, so it pulls blue below red where it lands.
    let warmShadow = false;
    for (let i = 0; i < target.data.length; i += 4) {
      if (target.data[i] > target.data[i + 2]) {
        warmShadow = true;
        break;
      }
    }
    expect(warmShadow).toBe(true);
  });

  it('is deterministic for the same input', () => {
    const source = constant(128);
    const first = new ImageData(32, 32);
    const second = new ImageData(32, 32);
    applyGrain(source, first, base);
    applyGrain(source, second, base);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('scales the texture with the paper texture slider', () => {
    const source = constant(128, 640, 480);
    const gentle = new ImageData(640, 480);
    const strong = new ImageData(640, 480);
    applyGrain(source, gentle, { ...base, paperTexture: 0.25 });
    applyGrain(source, strong, { ...base, paperTexture: 1 });
    expect(spread(strong)).toBeGreaterThan(spread(gentle));
  });

  it('softens the speckles with the blur slider', () => {
    // Large flat canvas so specks barely overlap: spreading a speck's
    // alpha over more pixels must lower the texture's variance. Two
    // blurred renders under coverage instrumentation run slowly.
    const source = constant(128, 1280, 960);
    const sharp = new ImageData(1280, 960);
    const soft = new ImageData(1280, 960);
    applyGrain(source, sharp, { ...base, blur: 0 });
    applyGrain(source, soft, { ...base, blur: 1.5 });
    expect(std(soft)).toBeLessThan(std(sharp));
  }, 15000);

  it('spreads the speckles across the whole canvas', () => {
    const source = constant(128, 640, 480);
    const target = new ImageData(640, 480);
    applyGrain(source, target, { ...base, blur: 1.5 });
    let left = 0;
    let right = 0;
    for (let y = 0; y < 480; y++) {
      for (let x = 0; x < 640; x++) {
        if (target.data[(y * 640 + x) * 4] !== 128) {
          if (x < 320) left++;
          else right++;
        }
      }
    }
    expect(left).toBeGreaterThan(1000);
    expect(right).toBeGreaterThan(1000);
  });

  it('tints the speckles with the saturation slider', () => {
    const source = constant(128, 640, 480);
    const neutral = new ImageData(640, 480);
    const vivid = new ImageData(640, 480);
    applyGrain(source, neutral, { ...base, saturation: 1 });
    applyGrain(source, vivid, { ...base, saturation: 2 });
    expect(differs(vivid, neutral)).toBe(true);
  });

  it('keeps the default paper texture subtle', () => {
    const source = constant(128, 640, 480);
    const target = new ImageData(640, 480);
    applyGrain(source, target, DEFAULT_PARAMS);
    let sum = 0;
    let sumSq = 0;
    let samples = 0;
    for (let i = 0; i < target.data.length; i += 4) {
      const value = target.data[i];
      sum += value;
      sumSq += value * value;
      samples++;
    }
    const mean = sum / samples;
    const std = Math.sqrt(sumSq / samples - mean * mean);
    // Sparse, gentle texture: variation stays low and brightness stays neutral.
    expect(std).toBeLessThan(9);
    expect(mean).toBeGreaterThan(123);
    expect(mean).toBeLessThan(135);
  });
});
