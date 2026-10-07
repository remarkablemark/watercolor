import type { WatercolorParams } from 'src/types/watercolor';

import { applyBlur, blurMask, blurRadius } from './blur';

const base: WatercolorParams = {
  blur: 1.5,
  saturation: 1,
  quantizeStep: 0,
  paperTexture: 0,
};

function flat(value: number, width = 8, height = 8): ImageData {
  const image = new ImageData(width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  return image;
}

/** Two flat tones split by a vertical edge: 40 on the left, 240 right. */
function verticalStep(width = 8, height = 8): ImageData {
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = x < width / 2 ? 40 : 240;
      const i = (y * width + x) * 4;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

/** Separable reference Gaussian used to pin the blur strength. */
function referenceGaussian(source: ImageData, sigma: number): ImageData {
  const { width, height } = source;
  const radius = Math.ceil(sigma * 3);
  const weights: number[] = [];
  for (let k = -radius; k <= radius; k++) {
    weights.push(Math.exp((-k * k) / (2 * sigma * sigma)));
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const horizontal = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const sx = Math.min(width - 1, Math.max(0, x + k));
          sum +=
            source.data[(y * width + sx) * 4 + channel] * weights[k + radius];
        }
        horizontal.data[(y * width + x) * 4 + channel] = sum / total;
      }
      horizontal.data[(y * width + x) * 4 + 3] = 255;
    }
  }
  const output = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const sy = Math.min(height - 1, Math.max(0, y + k));
          sum +=
            horizontal.data[(sy * width + x) * 4 + channel] *
            weights[k + radius];
        }
        output.data[(y * width + x) * 4 + channel] = sum / total;
      }
      output.data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return output;
}

describe('blurRadius', () => {
  it('returns 0 when the blur is disabled', () => {
    expect(blurRadius(0)).toBe(0);
    expect(blurRadius(-1)).toBe(0);
  });

  it('matches the studio blur', () => {
    expect(blurRadius(1.5)).toBeCloseTo(0.8919, 4);
  });

  it('grows with the requested sigma', () => {
    expect(blurRadius(6)).toBeCloseTo(4.72, 2);
  });
});

describe('blurMask', () => {
  it('leaves the mask alone at radius 0', () => {
    const mask = new Uint8ClampedArray([0, 0, 255, 255, 0, 0]);
    expect(Array.from(blurMask(mask, 6, 1, 0))).toEqual([0, 0, 255, 255, 0, 0]);
  });

  it('softens a hard mask edge', () => {
    const mask = new Uint8ClampedArray([0, 0, 255, 255, 0, 0]);
    blurMask(mask, 6, 1, blurRadius(1.5));
    expect(mask[1]).toBeGreaterThan(0);
    expect(mask[4]).toBeGreaterThan(0);
    expect(mask[2]).toBeLessThan(255);
    for (const value of mask) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    }
  });
});

describe('applyBlur', () => {
  it('passes pixels through when the blur is 0', () => {
    const source = verticalStep();
    const target = new ImageData(8, 8);
    applyBlur(source, target, { ...base, blur: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('keeps a uniform image uniform', () => {
    const target = new ImageData(8, 8);
    applyBlur(flat(96), target, base);
    for (let i = 0; i < target.data.length; i += 4) {
      expect(target.data[i]).toBe(96);
      expect(target.data[i + 1]).toBe(96);
      expect(target.data[i + 2]).toBe(96);
      expect(target.data[i + 3]).toBe(255);
    }
  });

  it('softens a hard edge into intermediate values', () => {
    const target = new ImageData(8, 8);
    applyBlur(verticalStep(), target, base);
    const reds = new Set<number>();
    for (let i = 0; i < target.data.length; i += 4) {
      reds.add(target.data[i]);
    }
    expect(reds.size).toBeGreaterThan(2);
    expect([...reds].some((value) => value > 40 && value < 240)).toBe(true);
  });

  it('approximates the studio Gaussian', () => {
    const source = verticalStep(16, 16);
    const target = new ImageData(16, 16);
    applyBlur(source, target, base);
    const reference = referenceGaussian(source, 1.5);
    let maxDiff = 0;
    for (let i = 0; i < target.data.length; i += 4) {
      maxDiff = Math.max(maxDiff, Math.abs(target.data[i] - reference.data[i]));
    }
    // Four box passes approximate a Gaussian; a hard 200-level edge is
    // the worst case, and the reference stays within ~12 levels.
    expect(maxDiff).toBeLessThanOrEqual(12);
  });

  it('does not mutate the source', () => {
    const source = verticalStep();
    const before = Array.from(source.data);
    applyBlur(source, new ImageData(8, 8), base);
    expect(Array.from(source.data)).toEqual(before);
  });

  it('is deterministic for the same input', () => {
    const source = verticalStep();
    const first = new ImageData(8, 8);
    const second = new ImageData(8, 8);
    applyBlur(source, first, base);
    applyBlur(source, second, base);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('preserves alpha instead of blurring it', () => {
    const source = flat(120, 8, 8);
    for (let i = 3; i < source.data.length; i += 4) {
      source.data[i] = 128;
    }
    const target = new ImageData(8, 8);
    applyBlur(source, target, base);
    for (let i = 3; i < target.data.length; i += 4) {
      expect(target.data[i]).toBe(128);
    }
  });

  it('handles degenerate image shapes', () => {
    for (const [width, height] of [
      [1, 8],
      [8, 1],
      [1, 1],
    ] as const) {
      const target = new ImageData(width, height);
      applyBlur(verticalStep(width, height), target, base);
      for (const value of target.data) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      }
    }
  });
});
