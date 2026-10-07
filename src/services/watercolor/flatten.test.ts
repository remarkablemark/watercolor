import { applyFlatten } from './flatten';
import { PAPER } from './paint';

function makeImage(
  width: number,
  height: number,
  fill?: (x: number, y: number) => number[],
): ImageData {
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill ? fill(x, y) : [0, 0, 0, 255];
      const i = (y * width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = a;
    }
  }
  return image;
}

describe('applyFlatten', () => {
  it('keeps opaque pixels and forces alpha to 255', () => {
    const source = makeImage(2, 1, () => [10, 20, 30, 255]);
    const target = new ImageData(2, 1);
    applyFlatten(source, target);
    expect(Array.from(target.data)).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
  });

  it('composites transparent pixels over the paper color', () => {
    const source = makeImage(1, 1, () => [0, 0, 0, 0]);
    const target = new ImageData(1, 1);
    applyFlatten(source, target);
    expect(Array.from(target.data)).toEqual([...PAPER, 255]);
  });

  it('partially blends half-transparent pixels', () => {
    const source = makeImage(1, 1, () => [0, 0, 0, 128]);
    const target = new ImageData(1, 1);
    applyFlatten(source, target);
    const [r, g, b, a] = Array.from(target.data);
    const expected = PAPER.map((channel) =>
      Math.round(channel * (1 - 128 / 255)),
    );
    expect(r).toBe(expected[0]);
    expect(g).toBe(expected[1]);
    expect(b).toBe(expected[2]);
    expect(a).toBe(255);
  });
});
