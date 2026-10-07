/**
 * Deterministic, allocation-free noise helpers used to build the paper
 * grain tile. All functions are pure so renders are reproducible.
 */

/** Integer hash of lattice coordinates in the range [0, 1). */
export function hash2d(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h ^= Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/** Smooth value noise sampled at continuous coordinates. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const top = lerp(hash2d(x0, y0, seed), hash2d(x0 + 1, y0, seed), tx);
  const bottom = lerp(
    hash2d(x0, y0 + 1, seed),
    hash2d(x0 + 1, y0 + 1, seed),
    tx,
  );
  return lerp(top, bottom, ty);
}

/** Value noise that repeats every `period` lattice cells on both axes. */
export function periodicValueNoise(
  x: number,
  y: number,
  seed: number,
  period: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const top = lerp(
    hash2d(wrap(x0, period), wrap(y0, period), seed),
    hash2d(wrap(x0 + 1, period), wrap(y0, period), seed),
    tx,
  );
  const bottom = lerp(
    hash2d(wrap(x0, period), wrap(y0 + 1, period), seed),
    hash2d(wrap(x0 + 1, period), wrap(y0 + 1, period), seed),
    tx,
  );
  return lerp(top, bottom, ty);
}

/**
 * Layered noise combining octaves of increasing frequency. Pass `period`
 * to make the result tile seamlessly along both axes.
 */
export function fractalNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  period?: number,
): number {
  const levels = Math.max(1, octaves);
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let total = 0;
  for (let octave = 0; octave < levels; octave++) {
    const sample =
      period === undefined
        ? valueNoise(x * frequency, y * frequency, seed + octave * 7919)
        : periodicValueNoise(
            x * frequency,
            y * frequency,
            seed + octave * 7919,
            period * frequency,
          );
    sum += amplitude * sample;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
}

/** Number of source pixels one lattice cell covers in a grain tile. */
export const GRAIN_TILE_CELL = 8;

/** Side length of the paper grain tile, in tile pixels. */
export const GRAIN_TILE_SIZE = 512;

/** Paper grain seed, fixed so downloads are reproducible. */
export const GRAIN_SEED = 1337;

/**
 * Builds a seamless square of fractal value noise. One lattice cell spans
 * {@link GRAIN_TILE_CELL} tile pixels, so tile coordinates advance by
 * `imagePixels * GRAIN_TILE_CELL / cellSize`.
 */
export function createGrainTile(
  size: number = GRAIN_TILE_SIZE,
  seed: number = GRAIN_SEED,
  octaves = 3,
): Float32Array {
  const period = Math.max(1, Math.floor(size / GRAIN_TILE_CELL));
  const scale = period / size;
  const tile = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tile[y * size + x] = fractalNoise(
        x * scale,
        y * scale,
        seed,
        octaves,
        period,
      );
    }
  }
  return tile;
}

/** Bilinear tile sample with wrapping edges. */
export function sampleTile(
  tile: Float32Array,
  size: number,
  u: number,
  v: number,
): number {
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const tx = u - x0;
  const ty = v - y0;
  const ax = wrap(x0, size);
  const ay = wrap(y0, size);
  const bx = wrap(x0 + 1, size);
  const by = wrap(y0 + 1, size);
  const top = lerp(tile[ay * size + ax], tile[ay * size + bx], tx);
  const bottom = lerp(tile[by * size + ax], tile[by * size + bx], tx);
  return lerp(top, bottom, ty);
}
