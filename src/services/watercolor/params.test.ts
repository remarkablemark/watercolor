import { clampParams, DEFAULT_PARAMS, PARAM_META } from './params';

describe('clampParams', () => {
  it('returns defaults unchanged', () => {
    expect(clampParams(DEFAULT_PARAMS)).toEqual(DEFAULT_PARAMS);
  });

  it('clamps out-of-range values', () => {
    expect(
      clampParams({
        detail: -1,
        edge: 2,
        wash: Number.NaN,
        paperTexture: 0.5,
        saturation: 9,
        posterizeLevels: 100,
      }),
    ).toEqual({
      detail: 0,
      edge: 1,
      wash: 0,
      paperTexture: 0.5,
      saturation: 2,
      posterizeLevels: 8,
    });
  });

  it('replaces non-finite values with the minimum', () => {
    expect(
      clampParams({ ...DEFAULT_PARAMS, saturation: Number.NaN }).saturation,
    ).toBe(0);
  });

  it('rounds posterize levels to whole numbers', () => {
    expect(
      clampParams({ ...DEFAULT_PARAMS, posterizeLevels: 4.6 }).posterizeLevels,
    ).toBe(5);
    expect(
      clampParams({ ...DEFAULT_PARAMS, posterizeLevels: -3 }).posterizeLevels,
    ).toBe(0);
  });
});

describe('PARAM_META', () => {
  it('describes every parameter key', () => {
    const keys = PARAM_META.map(({ key }) => key).sort();
    expect(keys).toEqual(Object.keys(DEFAULT_PARAMS).sort());
  });

  it('uses ascending ranges with sensible steps', () => {
    for (const meta of PARAM_META) {
      expect(meta.min).toBeLessThan(meta.max);
      expect(meta.step).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });
});
