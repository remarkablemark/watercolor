import { DEFAULT_PARAMS } from './params';
import { getPreset, matchPreset, PRESETS } from './presets';

describe('PRESETS', () => {
  it('offers a loose, graphic, and monochrome look', () => {
    expect(PRESETS.map(({ id }) => id)).toEqual([
      'loose',
      'wet',
      'sketch',
      'posterized',
    ]);
  });

  it('keeps every preset parameter in range', () => {
    for (const { params, label } of PRESETS) {
      expect(params.blur).toBeGreaterThanOrEqual(0);
      expect(params.blur).toBeLessThanOrEqual(4);
      expect(params.paperTexture).toBeGreaterThanOrEqual(0);
      expect(params.paperTexture).toBeLessThanOrEqual(1);
      expect(params.saturation).toBeGreaterThanOrEqual(0);
      expect(params.saturation).toBeLessThanOrEqual(2);
      expect(params.quantizeStep).toBeGreaterThanOrEqual(0);
      expect(params.quantizeStep).toBeLessThanOrEqual(64);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('getPreset', () => {
  it('returns the preset with the given id', () => {
    expect(getPreset('sketch').label).toBe('Sketch');
  });

  it('throws for unknown ids', () => {
    expect(() => getPreset('nope' as never)).toThrow('Unknown preset: nope');
  });
});

describe('matchPreset', () => {
  it('matches a preset by its exact parameters', () => {
    expect(matchPreset(PRESETS[0].params)).toBe('loose');
    expect(matchPreset(PRESETS[3].params)).toBe('posterized');
  });

  it('returns null for customized parameters', () => {
    expect(matchPreset({ ...PRESETS[0].params, blur: 0.11 })).toBeNull();
  });

  it('matches the default parameters to the loose preset', () => {
    expect(matchPreset(DEFAULT_PARAMS)).toBe('loose');
  });
});
