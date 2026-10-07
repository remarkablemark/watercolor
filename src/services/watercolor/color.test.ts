import type { WatercolorParams } from 'src/types/watercolor';

import { applySaturation, saturateColor } from './color';
import { luminance } from './paint';

const base: WatercolorParams = {
  blur: 0,
  saturation: 1,
  quantizeStep: 0,
  paperTexture: 0,
};

function pixel(r: number, g: number, b: number): ImageData {
  const image = new ImageData(1, 1);
  image.data.set([r, g, b, 255]);
  return image;
}

describe('saturateColor', () => {
  it('leaves white and neutral grays untouched', () => {
    const [r, g, b] = saturateColor(255, 255, 255, 1.25);
    expect(r).toBeCloseTo(255);
    expect(g).toBeCloseTo(255);
    expect(b).toBeCloseTo(255);
    const [gr, gg, gb] = saturateColor(90, 90, 90, 2);
    expect(gr).toBeCloseTo(90);
    expect(gg).toBeCloseTo(90);
    expect(gb).toBeCloseTo(90);
  });

  it('matches applySaturation on the same pixel', () => {
    const target = new ImageData(1, 1);
    applySaturation(pixel(137, 90, 60), target, { ...base, saturation: 1.25 });
    const [r, g, b] = saturateColor(137, 90, 60, 1.25);
    expect(Math.abs(target.data[0] - r)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(target.data[1] - g)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(target.data[2] - b)).toBeLessThanOrEqual(0.5);
  });
});

describe('applySaturation', () => {
  it('passes colors through at amount 1', () => {
    const target = new ImageData(1, 1);
    applySaturation(pixel(10, 20, 30), target, base);
    expect(Array.from(target.data)).toEqual([10, 20, 30, 255]);
  });

  it('collapses to luminance at amount 0', () => {
    const target = new ImageData(1, 1);
    applySaturation(pixel(200, 100, 50), target, { ...base, saturation: 0 });
    const gray = Math.round(luminance(200, 100, 50));
    expect(target.data[0]).toBe(gray);
    expect(target.data[1]).toBe(gray);
    expect(target.data[2]).toBe(gray);
    expect(target.data[3]).toBe(255);
  });

  it('boosts color above amount 1 and clamps at the channel limits', () => {
    const target = new ImageData(1, 1);
    applySaturation(pixel(100, 0, 0), target, { ...base, saturation: 2 });
    const gray = luminance(100, 0, 0);
    expect(target.data[0]).toBe(Math.round(gray + (100 - gray) * 2));
    expect(target.data[1]).toBe(0);
    expect(target.data[2]).toBe(0);
  });
});
