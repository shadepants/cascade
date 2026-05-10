import { describe, it, expect } from 'vitest';
import { SeededRNG } from './rng.ts';

describe('SeededRNG — determinism', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRNG(42);
    const b = new SeededRNG(42);
    for (let i = 0; i < 20; i++) {
      expect(a.nextFloat()).toBe(b.nextFloat());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRNG(1);
    const b = new SeededRNG(2);
    const aVals = Array.from({ length: 10 }, () => a.nextFloat());
    const bVals = Array.from({ length: 10 }, () => b.nextFloat());
    expect(aVals).not.toEqual(bVals);
  });
});

describe('SeededRNG — nextFloat', () => {
  it('returns values in [0, 1)', () => {
    const rng = new SeededRNG(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('SeededRNG — nextInt', () => {
  it('returns integers in [0, max)', () => {
    const rng = new SeededRNG(7);
    const max = 6;
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(max);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(max);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('returns 0 for max=1', () => {
    const rng = new SeededRNG(5);
    for (let i = 0; i < 20; i++) {
      expect(rng.nextInt(1)).toBe(0);
    }
  });
});

describe('SeededRNG — next', () => {
  it('returns a positive integer < 2^31', () => {
    const rng = new SeededRNG(123);
    for (let i = 0; i < 20; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2147483647);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('SeededRNG — shuffle', () => {
  it('returns an array with the same elements', () => {
    const rng = new SeededRNG(13);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled.sort()).toEqual(arr);
  });

  it('is deterministic for the same seed and input', () => {
    const a = new SeededRNG(77);
    const b = new SeededRNG(77);
    const input = [10, 20, 30, 40, 50];
    expect(a.shuffle([...input])).toEqual(b.shuffle([...input]));
  });

  it('modifies the array in place and returns it', () => {
    const rng = new SeededRNG(1);
    const arr = [1, 2, 3];
    const result = rng.shuffle(arr);
    expect(result).toBe(arr);
  });
});
