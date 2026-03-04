// ─── Terrain Generation ─────────────────────────────────────────────────
// Perlin noise → elevation + rainfall → biome classification.
// Produces a 2D grid of Tiles.

import type { GameMap, Tile, Biome } from '../types.ts';
import { createNoise2D } from '../utils/noise.ts';
import { SeededRNG } from '../utils/rng.ts';

/** Generate a terrain map from a seed. */
export function generateTerrain(seed: number, size: number): GameMap {
  const rng = new SeededRNG(seed);
  const elevationNoise = createNoise2D(rng.next());
  const rainfallNoise = createNoise2D(rng.next());

  const tiles: Tile[][] = [];

  for (let y = 0; y < size; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < size; x++) {
      const elevation = normalize(elevationNoise(x * 0.1, y * 0.1));
      const rainfall = normalize(rainfallNoise(x * 0.12 + 50, y * 0.12 + 50));
      const biome = classifyBiome(elevation, rainfall);

      row.push({
        biome,
        elevation,
        rainfall,
        factionId: null,
        settlementId: null,
        walkable: biome !== 'water' && biome !== 'mountain',
      });
    }
    tiles.push(row);
  }

  return { width: size, height: size, tiles };
}

/** Map elevation + rainfall to a biome type. */
function classifyBiome(elevation: number, rainfall: number): Biome {
  if (elevation < 0.25) return 'water';
  if (elevation > 0.8) return 'mountain';
  if (elevation > 0.65 && rainfall < 0.3) return 'tundra';
  if (rainfall < 0.3) return 'desert';
  if (rainfall > 0.6) return 'forest';
  return 'plains';
}

/** Normalize a noise value from [-1, 1] to [0, 1]. */
function normalize(value: number): number {
  return (value + 1) / 2;
}
