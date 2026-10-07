import type { WatercolorParams } from 'src/types/watercolor';

import { applyEdges, sobelEdgeMap } from './edges';

const base: WatercolorParams = {
  detail: 0,
  edge: 0.5,
  wash: 0,
  paperTexture: 0,
  saturation: 1,
  posterizeLevels: 0,
};

function step(size: number, split: number): ImageData {
  const image = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = x < split ? 30 : 220;
      const i = (y * size + x) * 4;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

describe('sobelEdgeMap', () => {
  it('returns a zero grid for flat images', () => {
    const flat = new ImageData(5, 5);
    flat.data.fill(255);
    const map = sobelEdgeMap(flat);
    expect(map.width).toBe(5);
    expect(map.height).toBe(5);
    expect(Array.from(map.data)).toEqual(new Array(25).fill(0));
  });

  it('detects a vertical step and keeps borders at zero', () => {
    const map = sobelEdgeMap(step(7, 3));
    expect(map.data[0]).toBe(0);
    expect(map.data[7]).toBe(0);
    expect(map.data[3 * 7 + 3]).toBeGreaterThan(0.4);
    expect(map.data[3 * 7 + 1]).toBe(0);
  });

  it('normalizes the gradient magnitude to at most 1', () => {
    const map = sobelEdgeMap(step(7, 3));
    expect(Math.max(...map.data)).toBeLessThanOrEqual(1);
  });
});

describe('applyEdges', () => {
  it('passes pixels through when edge is 0', () => {
    const source = step(5, 2);
    const target = new ImageData(5, 5);
    applyEdges(source, target, sobelEdgeMap(source), { ...base, edge: 0 });
    expect(Array.from(target.data)).toEqual(Array.from(source.data));
  });

  it('darkens edge pixels but leaves flat areas alone', () => {
    const source = step(7, 3);
    const target = new ImageData(7, 7);
    applyEdges(source, target, sobelEdgeMap(source), base);
    const edgePixel = (3 * 7 + 3) * 4;
    const flatPixel = (3 * 7 + 0) * 4;
    expect(target.data[edgePixel]).toBeLessThan(source.data[edgePixel]);
    expect(target.data[flatPixel]).toBe(source.data[flatPixel]);
    expect(target.data[edgePixel + 3]).toBe(255);
  });

  it('samples an edge map smaller than the source', () => {
    const source = new ImageData(4, 4);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 200;
      source.data[i + 1] = 200;
      source.data[i + 2] = 200;
      source.data[i + 3] = 255;
    }
    const map = { data: new Float32Array([0, 1, 0, 0]), width: 2, height: 2 };
    const target = new ImageData(4, 4);
    applyEdges(source, target, map, base);
    expect(target.data[0]).toBe(200);
    expect(target.data[12]).toBe(140);
  });
});
