// ─── 2D Perlin Noise ────────────────────────────────────────────────────
// Simplified Perlin noise for terrain generation. Returns values in [-1, 1].
// Based on the classic algorithm — no external dependencies.

/** Create a 2D noise function seeded by a given value. */
export function createNoise2D(seed: number): (x: number, y: number) => number {
  // Generate a permutation table from the seed
  const perm = generatePermutation(seed);

  return function noise2D(x: number, y: number): number {
    // Grid cell coordinates
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;

    // Fractional position within cell
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // Fade curves
    const u = fade(xf);
    const v = fade(yf);

    // Hash corners
    const aa = perm[(perm[xi] + yi) & 255];
    const ab = perm[(perm[xi] + yi + 1) & 255];
    const ba = perm[(perm[(xi + 1) & 255] + yi) & 255];
    const bb = perm[(perm[(xi + 1) & 255] + yi + 1) & 255];

    // Gradient dot products
    const g1 = grad(aa, xf, yf);
    const g2 = grad(ba, xf - 1, yf);
    const g3 = grad(ab, xf, yf - 1);
    const g4 = grad(bb, xf - 1, yf - 1);

    // Bilinear interpolation
    const x1 = lerp(g1, g2, u);
    const x2 = lerp(g3, g4, u);
    return lerp(x1, x2, v);
  };
}

/**
 * Create a 2D Fractal Brownian Motion (FBM) noise function.
 * Sums multiple octaves of Perlin noise for more natural, jagged texture.
 */
export function createFBM2D(
  seed: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): (x: number, y: number) => number {
  const noiseFuncs: ((x: number, y: number) => number)[] = [];
  for (let i = 0; i < octaves; i++) {
    // Offset each octave seed to ensure they are uncorrelated
    noiseFuncs.push(createNoise2D(seed + i * 1337 + 500));
  }

  return function fbm2D(x: number, y: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += noiseFuncs[i](x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Result is in [-1, 1]
    return total / maxValue;
  };
}

/** Generate a seeded permutation table (0-255 shuffled). */
function generatePermutation(seed: number): number[] {
  const p = Array.from({ length: 256 }, (_, i) => i);

  // Fisher-Yates shuffle with simple LCG
  let s = seed | 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Double the table to avoid wrapping
  return [...p, ...p];
}

/** Fade function: 6t^5 - 15t^4 + 10t^3 (smoother than classic 3t^2 - 2t^3). */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** Gradient function — picks a pseudo-random direction and dots with offset. */
function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  switch (h) {
    case 0: return  x + y;
    case 1: return -x + y;
    case 2: return  x - y;
    case 3: return -x - y;
    default: return 0;
  }
}
