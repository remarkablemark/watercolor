import {
  fitSize,
  fullPassMaxDim,
  MAX_INPUT_PIXELS,
  STRUCTURE_MAX_DIM,
  WORKING_MAX_DIM,
} from './geometry';

describe('fitSize', () => {
  it('returns small images unchanged', () => {
    expect(fitSize(800, 600, 1200)).toEqual({ width: 800, height: 600 });
    expect(fitSize(1200, 1200, 1200)).toEqual({ width: 1200, height: 1200 });
  });

  it('scales the longest side down to maxDim', () => {
    expect(fitSize(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitSize(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });

  it('never returns a zero dimension', () => {
    expect(fitSize(1, 4000, 100)).toEqual({ width: 1, height: 100 });
  });
});

describe('fullPassMaxDim', () => {
  it('leaves images within the pixel budget alone', () => {
    expect(fullPassMaxDim(8, 6)).toBeUndefined();
    expect(fullPassMaxDim(5000, 4800)).toBeUndefined();
  });

  it('scales the longest side so the result fits the budget', () => {
    const maxDim = fullPassMaxDim(6000, 5000) ?? 0;
    expect(maxDim).toBe(5366);
    const fitted = fitSize(6000, 5000, maxDim);
    expect(fitted.width * fitted.height).toBeLessThanOrEqual(MAX_INPUT_PIXELS);
  });

  it('measures the budget on the longest side in either orientation', () => {
    expect(fullPassMaxDim(5000, 6000)).toBe(fullPassMaxDim(6000, 5000));
    expect(fullPassMaxDim(5000, 4801)).toBeLessThan(5000);
  });
});

describe('constants', () => {
  it('keeps the working size smaller than the structure size', () => {
    expect(WORKING_MAX_DIM).toBeLessThan(STRUCTURE_MAX_DIM);
  });
});
