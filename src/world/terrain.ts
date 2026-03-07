// ─── Terrain Generation ─────────────────────────────────────────────────
// Perlin noise → elevation + rainfall → biome classification.
// Produces a 2D grid of Tiles.

import type { GameMap, Tile, Biome } from '../types.ts';
import { createNoise2D, createFBM2D } from '../utils/noise.ts';
import { SeededRNG } from '../utils/rng.ts';

/** Generate a terrain map from a seed. */
export function generateTerrain(seed: number, size: number): GameMap {
  const rng = new SeededRNG(seed);
  // Elevation uses 4-octave FBM for more natural, jagged terrain
  const elevationNoise = createFBM2D(rng.next(), 4);

  // ─── Pass 1: Elevation (FBM + Tectonics) ──────────────────────────────
  const numPlates = 12;
  const plates = Array.from({ length: numPlates }, () => ({
    center: { x: rng.nextInt(size), y: rng.nextInt(size) },
    isOceanic: rng.nextFloat() < 0.45,
  }));

  const tiles: Tile[][] = Array.from({ length: size }, () => []);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const baseElevation = normalize(elevationNoise(x * 0.05, y * 0.05));

      // Plate interaction
      let d1 = Infinity;
      let d2 = Infinity;
      let p1 = 0;
      let p2 = 0;

      for (let i = 0; i < numPlates; i++) {
        const dx = x - plates[i].center.x;
        const dy = y - plates[i].center.y;
        const dist = dx * dx + dy * dy;
        if (dist < d1) {
          d2 = d1;
          p2 = p1;
          d1 = dist;
          p1 = i;
        } else if (dist < d2) {
          d2 = dist;
          p2 = i;
        }
      }

      const dist1 = Math.sqrt(d1);
      const dist2 = Math.sqrt(d2);
      const boundary = 1.0 - (dist2 - dist1) / 10;
      const intensity = Math.max(0, boundary);

      let tectonicMod = 0;
      if (intensity > 0) {
        if (!plates[p1].isOceanic && !plates[p2].isOceanic) {
          tectonicMod = intensity * 0.45; // Continental collision
        } else if (plates[p1].isOceanic && plates[p2].isOceanic) {
          tectonicMod = -intensity * 0.35; // Trench
        } else {
          tectonicMod = intensity * 0.2; // Subduction
        }
      }

      const elevation = Math.max(0, Math.min(1, baseElevation + tectonicMod));

      tiles[y][x] = {
        biome: 'ocean', // placeholder
        elevation,
        rainfall: 0.5,  // placeholder
        factionId: null,
        settlementId: null,
        walkable: true,
      };
    }
  }

  // ─── Pass 2: Moisture (Wind + Rain Shadows) ───────────────────────────
  // Simplified wind-driven moisture transport: Wind blows West to East (left to right)
  const moistureNoise = createNoise2D(rng.next());
  
  for (let y = 0; y < size; y++) {
    let moisture = 1.0; // Start with full moisture from the ocean (West edge)
    for (let x = 0; x < size; x++) {
      const tile = tiles[y][x];
      
      // If ocean, reset moisture to 1.0
      if (tile.elevation < 0.25) {
        moisture = 1.0;
      }

      // Elevation change penalty (Orographic Precipitation)
      const prevX = Math.max(0, x - 1);
      const elevationGain = Math.max(0, tile.elevation - tiles[y][prevX].elevation);
      
      // Rain falls as we go uphill
      const precipitation = moisture * (elevationGain * 2.0 + 0.05);
      moisture = Math.max(0, moisture - precipitation);

      // Add small local variance
      const localMoisture = normalize(moistureNoise(x * 0.1, y * 0.1)) * 0.2 + moisture * 0.8;
      tile.rainfall = localMoisture;
    }
  }

  // ─── Pass 3: Classification ───────────────────────────────────────────
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = tiles[y][x];
      tile.biome = classifyBiome(tile.elevation, tile.rainfall);
      tile.walkable = tile.biome !== 'ocean' && tile.biome !== 'coast' && tile.biome !== 'mountain';
    }
  }

  return { width: size, height: size, tiles };
}

/** 
 * Map elevation + rainfall to a biome type.
 * Biomes (8): Ocean, Coast, Tundra, Grassland, Forest, Rainforest, Arid, Desert.
 */
function classifyBiome(elevation: number, rainfall: number): Biome {
  // Water layers
  if (elevation < 0.22) return 'ocean';
  if (elevation < 0.3) return 'coast';
  
  // Land layers
  if (elevation > 0.85) return 'mountain';
  
  // High elevation/altitude = cold
  if (elevation > 0.75) return 'tundra';
  
  // Arid zones
  if (rainfall < 0.2) return 'desert';
  if (rainfall < 0.45) return 'arid';
  
  // Wet zones
  if (rainfall > 0.75) return 'rainforest';
  if (rainfall > 0.55) return 'forest';
  
  return 'grassland';
}

/** Normalize a noise value from [-1, 1] to [0, 1]. */
function normalize(value: number): number {
  return (value + 1) / 2;
}
