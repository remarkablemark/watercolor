import {
  createGrainTile,
  fractalNoise,
  hash2d,
  periodicValueNoise,
  sampleTile,
  valueNoise,
} from './noise';

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

describe('valueNoise', () => {
  it('equals the lattice hash at integer coordinates', () => {
    expect(valueNoise(3, 4, 1)).toBe(hash2d(3, 4, 1));
  });

  it('stays within the hash range', () => {
    const value = valueNoise(2.5, 2.5, 1);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe('periodicValueNoise', () => {
  it('repeats every period cells', () => {
    expect(periodicValueNoise(1.25, 3.75, 5, 8)).toBe(
      periodicValueNoise(9.25, 3.75, 5, 8),
    );
    expect(periodicValueNoise(1.25, 3.75, 5, 8)).toBe(
      periodicValueNoise(1.25, 11.75, 5, 8),
    );
  });

  it('handles negative coordinates', () => {
    expect(periodicValueNoise(-6.75, -0.5, 5, 8)).toBe(
      periodicValueNoise(1.25, 7.5, 5, 8),
    );
  });
});

describe('fractalNoise', () => {
  it('combines octaves into the [0, 1) range', () => {
    const value = fractalNoise(10.4, 5.6, 3, 3);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('supports periodic sampling', () => {
    expect(fractalNoise(2.5, 2.5, 3, 3, 16)).toBe(
      fractalNoise(18.5, 2.5, 3, 3, 16),
    );
  });

  it('treats zero octaves as one', () => {
    expect(fractalNoise(2.5, 2.5, 3, 0)).toBe(valueNoise(2.5, 2.5, 3));
  });
});

describe('createGrainTile', () => {
  it('builds a square of values in [0, 1]', () => {
    const tile = createGrainTile(64, 99, 3);
    expect(tile).toHaveLength(64 * 64);
    for (const value of tile) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for a seed and differs across seeds', () => {
    expect(createGrainTile(32, 7, 2)).toEqual(createGrainTile(32, 7, 2));
    expect(createGrainTile(32, 7, 2)).not.toEqual(createGrainTile(32, 8, 2));
  });

  it('clamps degenerate sizes', () => {
    expect(createGrainTile(1, 7, 1)).toHaveLength(1);
  });
});

describe('sampleTile', () => {
  const tile = createGrainTile(64, 11, 3);

  it('interpolates between neighboring texels', () => {
    expect(sampleTile(tile, 64, 0, 0)).toBe(tile[0]);
    expect(sampleTile(tile, 64, 10.5, 0)).toBeCloseTo(
      (tile[10] + tile[11]) / 2,
      6,
    );
  });

  it('wraps at the tile edges', () => {
    expect(sampleTile(tile, 64, 64, 64)).toBe(tile[0]);
    expect(sampleTile(tile, 64, -1, -1)).toBeCloseTo(tile[63 * 64 + 63], 6);
  });
});
