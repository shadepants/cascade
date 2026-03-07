// ─── Biome Definitions ──────────────────────────────────────────────────
// Colors and glyphs for each biome type. Used by the renderer.

import type { Biome } from '../types.ts';

/** Tile background colors per biome. */
export const BIOME_COLORS: Record<Biome, string> = {
  ocean:      '#1a3c5e', // deep blue
  coast:      '#2a5d8f', // shallow blue
  grassland:  '#4a7c3f', // green
  forest:     '#2d5a27', // dark green
  rainforest: '#1b3d18', // very dark green
  arid:       '#8a8a4f', // brownish green
  desert:     '#c4a63a', // sandy yellow
  tundra:     '#a8c0c0', // icy blue-grey
  mountain:   '#7a7a7a', // grey
};

/** ASCII glyphs per biome (for text-mode rendering fallback). */
export const BIOME_GLYPHS: Record<Biome, string> = {
  ocean:      '≈',
  coast:      '~',
  grassland:  '.',
  forest:     '♣',
  rainforest: '♠',
  arid:       '=',
  desert:     '·',
  tundra:     '*',
  mountain:   '▲',
};
