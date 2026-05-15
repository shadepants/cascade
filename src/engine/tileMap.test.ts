// ─── tileMap.ts unit tests ──────────────────────────────────────────────
// Validates that every sprite coordinate lookup is well-formed.
// These are "calibration guards" — any accidental negative coord or
// wrong sprite size will be caught here before a visual regression hits.

import { describe, it, expect } from 'vitest';
import {
  SPRITE_SIZE,
  BIOME_TILES,
  SETTLEMENT_TILE,
  RUIN_TILE,
  NPC_TILE,
  PLAYER_TILE,
  SHEET_TERRAIN,
  SHEET_SETTLEMENT,
  SHEET_CHARACTER,
  SHEET_PLAYER,
} from './tileMap.ts';
import type { Biome } from '../types';

// All 9 biomes that must be present in BIOME_TILES
const ALL_BIOMES: Biome[] = [
  'ocean', 'coast', 'grassland', 'forest', 'rainforest',
  'arid', 'desert', 'tundra', 'mountain',
];

describe('SPRITE_SIZE', () => {
  it('is 16 (DawnLike native tile size)', () => {
    expect(SPRITE_SIZE).toBe(16);
  });
});

describe('BIOME_TILES', () => {
  it('has an entry for every Biome', () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_TILES[biome], `missing entry for biome: ${biome}`).toBeDefined();
    }
  });

  it('every region has non-negative x and y', () => {
    for (const biome of ALL_BIOMES) {
      const r = BIOME_TILES[biome];
      expect(r.x, `${biome}.x`).toBeGreaterThanOrEqual(0);
      expect(r.y, `${biome}.y`).toBeGreaterThanOrEqual(0);
    }
  });

  it('every region has w === h === SPRITE_SIZE', () => {
    for (const biome of ALL_BIOMES) {
      const r = BIOME_TILES[biome];
      expect(r.w, `${biome}.w`).toBe(SPRITE_SIZE);
      expect(r.h, `${biome}.h`).toBe(SPRITE_SIZE);
    }
  });

  it('no two biomes share the same source rect (distinct tiles)', () => {
    // Tile.png row 0 provides 8 distinct terrain fills for 9 biomes.
    // forest intentionally shares grassland's green tile — tree sprites
    // layered on top provide the visual distinction between these biomes.
    const ALLOWED_SHARING = new Set<string>(['forest:grassland', 'grassland:forest']);

    const seen = new Map<string, Biome>();
    for (const biome of ALL_BIOMES) {
      const r = BIOME_TILES[biome];
      const key = `${r.x},${r.y}`;
      if (seen.has(key)) {
        const prior = seen.get(key)!;
        const pairKey = `${biome}:${prior}`;
        expect(
          ALLOWED_SHARING.has(pairKey),
          `biome ${biome} shares rect ${key} with ${prior} (not in allowed-sharing list)`,
        ).toBe(true);
      }
      seen.set(key, biome);
    }
  });
});

describe('SETTLEMENT_TILE / RUIN_TILE', () => {
  it('are valid sprite regions', () => {
    for (const [name, tile] of [['SETTLEMENT_TILE', SETTLEMENT_TILE], ['RUIN_TILE', RUIN_TILE]] as const) {
      expect(tile.x, `${name}.x`).toBeGreaterThanOrEqual(0);
      expect(tile.y, `${name}.y`).toBeGreaterThanOrEqual(0);
      expect(tile.w, `${name}.w`).toBe(SPRITE_SIZE);
      expect(tile.h, `${name}.h`).toBe(SPRITE_SIZE);
    }
  });

  it('settlement and ruin do not share the same source rect', () => {
    expect(`${SETTLEMENT_TILE.x},${SETTLEMENT_TILE.y}`).not.toBe(
      `${RUIN_TILE.x},${RUIN_TILE.y}`,
    );
  });
});

describe('NPC_TILE / PLAYER_TILE', () => {
  it('are valid sprite regions', () => {
    for (const [name, tile] of [['NPC_TILE', NPC_TILE], ['PLAYER_TILE', PLAYER_TILE]] as const) {
      expect(tile.x, `${name}.x`).toBeGreaterThanOrEqual(0);
      expect(tile.y, `${name}.y`).toBeGreaterThanOrEqual(0);
      expect(tile.w, `${name}.w`).toBe(SPRITE_SIZE);
      expect(tile.h, `${name}.h`).toBe(SPRITE_SIZE);
    }
  });
});

describe('sheet path constants', () => {
  it('all sheet paths are non-empty strings starting with /assets/', () => {
    for (const [name, path] of [
      ['SHEET_TERRAIN',    SHEET_TERRAIN],
      ['SHEET_SETTLEMENT', SHEET_SETTLEMENT],
      ['SHEET_CHARACTER',  SHEET_CHARACTER],
      ['SHEET_PLAYER',     SHEET_PLAYER],
    ] as const) {
      expect(typeof path, name).toBe('string');
      expect(path.startsWith('/assets/'), `${name} should start with /assets/`).toBe(true);
    }
  });
});
