import { DEFAULT_PARAMS } from './params';
import { getPreset, matchPreset, PRESETS } from './presets';

describe('PRESETS', () => {
  it('covers painterly and graphic looks', () => {
    expect(PRESETS.map(({ id }) => id)).toEqual([
      'loose',
      'wet',
      'sketch',
      'posterized',
    ]);
  });

  it('keeps every preset parameter in range', () => {
    for (const { params, label } of PRESETS) {
      expect(params.detail).toBeGreaterThanOrEqual(0);
      expect(params.detail).toBeLessThanOrEqual(1);
      expect(params.edge).toBeGreaterThanOrEqual(0);
      expect(params.edge).toBeLessThanOrEqual(1);
      expect(params.wash).toBeGreaterThanOrEqual(0);
      expect(params.wash).toBeLessThanOrEqual(1);
      expect(params.paperTexture).toBeGreaterThanOrEqual(0);
      expect(params.paperTexture).toBeLessThanOrEqual(1);
      expect(params.saturation).toBeGreaterThanOrEqual(0);
      expect(params.saturation).toBeLessThanOrEqual(2);
      expect(params.posterizeLevels).toBeGreaterThanOrEqual(0);
      expect(params.posterizeLevels).toBeLessThanOrEqual(8);
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
    expect(matchPreset({ ...PRESETS[0].params, detail: 0.11 })).toBeNull();
  });

  it('matches the default parameters to the loose preset', () => {
    expect(matchPreset(DEFAULT_PARAMS)).toBe('loose');
  });
});
