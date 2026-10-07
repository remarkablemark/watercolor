import { clampParams, DEFAULT_PARAMS, PARAM_META } from './params';

describe('clampParams', () => {
  it('returns defaults unchanged', () => {
    expect(clampParams(DEFAULT_PARAMS)).toEqual(DEFAULT_PARAMS);
  });

  it('clamps out-of-range values', () => {
    expect(
      clampParams({
        blur: -1,
        saturation: 9,
        quantizeStep: 100,
        paperTexture: 0.5,
      }),
    ).toEqual({
      blur: 0,
      saturation: 2,
      quantizeStep: 64,
      paperTexture: 0.5,
    });
  });

  it('replaces non-finite values with the minimum', () => {
    expect(clampParams({ ...DEFAULT_PARAMS, blur: Number.NaN }).blur).toBe(0);
  });

  it('rounds quantize steps to whole numbers', () => {
    expect(
      clampParams({ ...DEFAULT_PARAMS, quantizeStep: 4.6 }).quantizeStep,
    ).toBe(5);
    expect(
      clampParams({ ...DEFAULT_PARAMS, quantizeStep: -3 }).quantizeStep,
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
