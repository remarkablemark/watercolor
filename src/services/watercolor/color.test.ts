import type { WatercolorParams } from 'src/types/watercolor';

import { applySaturation } from './color';
import { luminance } from './paint';

const base: WatercolorParams = {
  detail: 0,
  edge: 0,
  wash: 0,
  paperTexture: 0,
  saturation: 1,
  posterizeLevels: 0,
};

function pixel(r: number, g: number, b: number): ImageData {
  const image = new ImageData(1, 1);
  image.data.set([r, g, b, 255]);
  return image;
}

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
