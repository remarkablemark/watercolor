import { hash2d } from './noise';

describe('hash2d', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const value = hash2d(i * 7, i * 13, 42);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for the same inputs', () => {
    expect(hash2d(3, 9, 7)).toBe(hash2d(3, 9, 7));
  });

  it('varies with coordinates and seed', () => {
    expect(hash2d(3, 9, 7)).not.toBe(hash2d(4, 9, 7));
    expect(hash2d(3, 9, 7)).not.toBe(hash2d(3, 9, 8));
  });
});
