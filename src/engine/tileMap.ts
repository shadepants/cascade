// ─── Tile Coordinate Map ────────────────────────────────────────────────
// Maps game entities to source rectangles in their sprite sheets.
// All coordinates are pixel offsets into 16×16-sprite sheets.
//
// TODO CALIBRATE: These coordinates are estimated from DawnLike's known layout.
// Open each PNG in an image viewer, verify each biome maps to the correct tile,
// and update the x/y values accordingly before the Phase 3 polish pass.

import type { Biome } from '../types.ts';

/** Native px per tile in all source sheets (DawnLike / Toen Medieval). */
export const SPRITE_SIZE = 16;

/** Source rectangle into a sprite sheet (pixel coords). */
export interface TileRegion {
  x: number;  // left edge in sheet
  y: number;  // top edge in sheet
  w: number;  // width  (always SPRITE_SIZE)
  h: number;  // height (always SPRITE_SIZE)
}

// ─── Asset paths (relative to public/) ──────────────────────────────────

export const SHEET_TERRAIN    = '/assets/DawnLike/Objects/Map0.png';
// Toen's filename contains apostrophe + spaces — keep as a plain string literal.
export const SHEET_SETTLEMENT = "/assets/ToenMedieval/Tile-set - Toen's Medieval Strategy (16x16) - v.1.0.png";
export const SHEET_CHARACTER  = '/assets/DawnLike/Characters/Humanoid0.png';
export const SHEET_PLAYER     = '/assets/DawnLike/Characters/Player0.png';

// ─── Terrain tiles — DawnLike/Objects/Map0.png ───────────────────────────
// Sheet is 16 columns × N rows, each tile 16×16 px.
// Column index k → x = k * 16.  Row index r → y = r * 16.
// TODO CALIBRATE: visually verify each row/col in Map0.png.

export const BIOME_TILES: Record<Biome, TileRegion> = {
  ocean:      { x:   0, y:   0, w: 16, h: 16 }, // deep water
  coast:      { x:  16, y:   0, w: 16, h: 16 }, // shallow water / shoreline
  grassland:  { x:   0, y:  16, w: 16, h: 16 }, // open grass
  forest:     { x:  16, y:  16, w: 16, h: 16 }, // pine/deciduous canopy
  rainforest: { x:  32, y:  16, w: 16, h: 16 }, // dense canopy
  arid:       { x:   0, y:  32, w: 16, h: 16 }, // dry scrubland
  desert:     { x:  16, y:  32, w: 16, h: 16 }, // sand dunes
  tundra:     { x:  32, y:  32, w: 16, h: 16 }, // snow / ice ground
  mountain:   { x:   0, y:  48, w: 16, h: 16 }, // grey peaks
};

// ─── Settlements / Ruins — Toen's Medieval Strategy sheet ────────────────
// TODO CALIBRATE: open the Toen PNG and identify castle & destroyed-village sprites.

export const SETTLEMENT_TILE: TileRegion = { x:  0, y:  0, w: 16, h: 16 }; // castle/village
export const RUIN_TILE:       TileRegion = { x: 16, y:  0, w: 16, h: 16 }; // destroyed site

// ─── Characters — DawnLike Characters sheets ─────────────────────────────
// Humanoid0.png row 0 = guards/knights (frame 0 = idle left).
// Player0.png   row 0 col 0 = hero (frame 0).
// TODO CALIBRATE: confirm frame positions in each sheet.

export const NPC_TILE:    TileRegion = { x: 0, y: 0, w: 16, h: 16 }; // Humanoid0
export const PLAYER_TILE: TileRegion = { x: 0, y: 0, w: 16, h: 16 }; // Player0
