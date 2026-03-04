// ─── Biome Definitions ──────────────────────────────────────────────────
// Colors and glyphs for each biome type. Used by the renderer.

import type { Biome } from '../types.ts';

/** Tile background colors per biome. */
export const BIOME_COLORS: Record<Biome, string> = {
  plains:   '#4a7c3f',  // green
  forest:   '#2d5a27',  // dark green
  mountain: '#7a7a7a',  // grey
  desert:   '#c4a63a',  // sandy yellow
  tundra:   '#a8c0c0',  // icy blue-grey
  water:    '#2563a8',  // blue
};

/** ASCII glyphs per biome (for text-mode rendering fallback). */
export const BIOME_GLYPHS: Record<Biome, string> = {
  plains:   '.',
  forest:   '♣',
  mountain: '▲',
  desert:   '~',
  tundra:   '·',
  water:    '≈',
};
