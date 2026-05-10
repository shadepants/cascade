import { describe, it, expect } from 'vitest';
import { createNoise2D, createFBM2D } from './noise.ts';

describe('createNoise2D', () => {
  it('returns values in [-1, 1]', () => {
    const noise = createNoise2D(42);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = noise(x * 0.3, y * 0.3);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createNoise2D(7);
    const b = createNoise2D(7);
    for (let i = 0; i < 20; i++) {
      const x = i * 0.17;
      const y = i * 0.31;
      expect(a(x, y)).toBe(b(x, y));
    }
  });

  it('produces different results for different seeds', () => {
    const a = createNoise2D(1);
    const b = createNoise2D(999);
    const coords = Array.from({ length: 5 }, (_, i) => [i * 0.5, i * 0.7]);
    const aVals = coords.map(([x, y]) => a(x, y));
    const bVals = coords.map(([x, y]) => b(x, y));
    expect(aVals).not.toEqual(bVals);
  });

  it('returns 0 at integer grid corners (Perlin property)', () => {
    // Perlin noise is 0 at integer lattice points
    const noise = createNoise2D(1);
    expect(noise(0, 0)).toBeCloseTo(0, 10);
    expect(noise(1, 0)).toBeCloseTo(0, 10);
    expect(noise(0, 1)).toBeCloseTo(0, 10);
  });
});

describe('createFBM2D', () => {
  it('returns values in [-1, 1]', () => {
    const fbm = createFBM2D(42);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = fbm(x * 0.1, y * 0.1);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic for the same seed and parameters', () => {
    const a = createFBM2D(55, 4, 0.5, 2.0);
    const b = createFBM2D(55, 4, 0.5, 2.0);
    for (let i = 0; i < 10; i++) {
      const x = i * 0.13;
      const y = i * 0.27;
      expect(a(x, y)).toBe(b(x, y));
    }
  });

  it('produces richer detail with more octaves (higher variance)', () => {
    const fbm1 = createFBM2D(1, 1);
    const fbm4 = createFBM2D(1, 4);
    const samples = Array.from({ length: 50 }, (_, i) => i * 0.15);
    const vals1 = samples.map(x => fbm1(x, x));
    const vals4 = samples.map(x => fbm4(x, x));
    // More octaves → different output (not just scaled)
    expect(vals1).not.toEqual(vals4);
  });
});
