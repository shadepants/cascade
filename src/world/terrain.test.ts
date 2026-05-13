import { describe, it, expect } from 'vitest';
import { generateTerrain } from './terrain.ts';
import type { Biome } from '../types';

describe('generateTerrain', () => {
  it('generates a map of the correct size', () => {
    const size = 10;
    const map = generateTerrain(12345, size);

    expect(map.width).toBe(size);
    expect(map.height).toBe(size);
    expect(map.tiles.length).toBe(size);
    expect(map.tiles[0].length).toBe(size);
  });

  it('is deterministic for the same seed', () => {
    const size = 15;
    const map1 = generateTerrain(42, size);
    const map2 = generateTerrain(42, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        expect(map1.tiles[y][x]).toEqual(map2.tiles[y][x]);
      }
    }
  });

  it('produces different results for different seeds', () => {
    const size = 15;
    const map1 = generateTerrain(42, size);
    const map2 = generateTerrain(999, size);

    let differences = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (map1.tiles[y][x].elevation !== map2.tiles[y][x].elevation ||
            map1.tiles[y][x].rainfall !== map2.tiles[y][x].rainfall) {
          differences++;
        }
      }
    }

    expect(differences).toBeGreaterThan(0);
  });

  it('generates valid biomes and properties', () => {
    const size = 20;
    const map = generateTerrain(12345, size);

    const validBiomes: Biome[] = ['ocean', 'coast', 'grassland', 'forest', 'rainforest', 'arid', 'desert', 'tundra', 'mountain'];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const tile = map.tiles[y][x];

        // Properties are initialized correctly
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(1);

        expect(tile.rainfall).toBeGreaterThanOrEqual(0);
        expect(tile.rainfall).toBeLessThanOrEqual(1);

        expect(validBiomes).toContain(tile.biome);
        expect(tile.factionId).toBeNull();
        expect(tile.settlementId).toBeNull();

        // Walkability logic
        const isWater = tile.biome === 'ocean' || tile.biome === 'coast';
        const isMountain = tile.biome === 'mountain';
        if (isWater || isMountain) {
          expect(tile.walkable).toBe(false);
        } else {
          expect(tile.walkable).toBe(true);
        }
      }
    }
  });

  it('has a distribution of different biomes', () => {
    const size = 50; // larger size to ensure biome variety
    const map = generateTerrain(12345, size);
    const biomes = new Set<Biome>();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        biomes.add(map.tiles[y][x].biome);
      }
    }

    // Ensure we generate at least a few distinct biomes across a 50x50 map
    expect(biomes.size).toBeGreaterThan(3);
  });
});
