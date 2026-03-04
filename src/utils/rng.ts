// ─── Seeded Random Number Generator ─────────────────────────────────────
// Deterministic RNG using mulberry32 algorithm. Same seed = same sequence.
// Critical for reproducible world generation.

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Return a float in [0, 1). */
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Return an integer in [0, max). */
  nextInt(max: number): number {
    return Math.floor(this.nextFloat() * max);
  }

  /** Return the next raw seed value (for creating sub-generators). */
  next(): number {
    return Math.floor(this.nextFloat() * 2147483647);
  }

  /** Shuffle an array in place (Fisher-Yates). */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
