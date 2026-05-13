// ─── Tile Coordinate Map ────────────────────────────────────────────────
// Maps game entities to source rectangles in their sprite sheets.
// All coordinates are pixel offsets into 16×16-sprite sheets.
//
// Calibrated 2026-03-08: verified visually via Chrome DevTools canvas overlay.
// Tile.png row 0 — 8 hex-pattern terrain fills (x = col*16, y = 0):
//   col 0 (x=  0): brown earth     → arid
//   col 1 (x= 16): blue-purple hex → coast
//   col 2 (x= 32): grey-teal stone → mountain
//   col 3 (x= 48): ice/snow diag   → tundra
//   col 4 (x= 64): green leafy hex → grassland / forest
//   col 5 (x= 80): dark red hex    → rainforest
//   col 6 (x= 96): gold/sandy hex  → desert
//   col 7 (x=112): solid light blue → ocean

import type { Biome, ItemType } from '../types';

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

export const SHEET_TERRAIN    = '/assets/DawnLike/Objects/Tile.png';
// Toen's filename contains apostrophe + spaces — keep as a plain string literal.
export const SHEET_SETTLEMENT = "/assets/ToenMedieval/Tile-set - Toen's Medieval Strategy (16x16) - v.1.0.png";
export const SHEET_CHARACTER  = '/assets/DawnLike/Characters/Humanoid0.png';
export const SHEET_PLAYER     = '/assets/DawnLike/Characters/Player0.png';
export const SHEET_TREE       = '/assets/DawnLike/Objects/Tree0.png';
export const SHEET_ORE        = '/assets/DawnLike/Objects/Ore0.png';
export const SHEET_ITEM_AMULET = '/assets/DawnLike/Items/Amulet.png';
export const SHEET_ITEM_SCROLL = '/assets/DawnLike/Items/Scroll.png';
export const SHEET_ITEM_KEY    = '/assets/DawnLike/Items/Key.png';
export const SHEET_RELIGION    = '/assets/DawnLike/Items/Amulet.png';

// ─── Terrain tiles — DawnLike/Objects/Tile.png ───────────────────────────
// Sheet is 8 cols × 4 rows (128×64 px), each tile 16×16 px.
// All biome ground fills live on row 0 (y = 0).
// forest shares grassland's green tile — canopy/tree layers differentiate them.

export const BIOME_TILES: Record<Biome, TileRegion> = {
  ocean:      { x: 112, y:  0, w: 16, h: 16 }, // solid light blue
  coast:      { x:  16, y:  0, w: 16, h: 16 }, // blue-purple hex (shallow)
  grassland:  { x:  64, y:  0, w: 16, h: 16 }, // green leafy hex
  forest:     { x:  64, y:  0, w: 16, h: 16 }, // same green — tree layer differentiates
  rainforest: { x:  80, y:  0, w: 16, h: 16 }, // dark red hex (dense canopy)
  arid:       { x:   0, y:  0, w: 16, h: 16 }, // brown earth
  desert:     { x:  96, y:  0, w: 16, h: 16 }, // gold/sandy hex
  tundra:     { x:  48, y:  0, w: 16, h: 16 }, // ice/snow diagonal
  mountain:   { x:  32, y:  0, w: 16, h: 16 }, // grey-teal stone hex
};

// ─── Tree canopy — DawnLike/Objects/Tree0.png ────────────────────────────
// Only forest and rainforest biomes get a tree overlay on top of the ground tile.
// TODO CALIBRATE: open Tree0.png and verify column positions for each tree type.

export const TREE_TILES: Partial<Record<Biome, TileRegion>> = {
  forest:     { x:  0, y: 0, w: 16, h: 16 }, // deciduous tree (col 0)
  rainforest: { x: 32, y: 0, w: 16, h: 16 }, // dense canopy (col 2)
};

// ─── Settlements / Ruins — Toen's Medieval Strategy sheet ────────────────
// TODO CALIBRATE: open the Toen PNG and identify castle & destroyed-village sprites.

export const SETTLEMENT_TILE: TileRegion = { x:  0, y:  0, w: 16, h: 16 }; // castle/village
export const RUIN_TILE:       TileRegion = { x: 16, y:  0, w: 16, h: 16 }; // destroyed site
export const HOLYSITE_TILE:   TileRegion = { x: 32, y:  0, w: 16, h: 16 }; // shrine/temple (DawnLike Symbol0 or Toen)

// ─── Characters — DawnLike Characters sheets ─────────────────────────────
// Humanoid0.png row 0 = guards/knights (frame 0 = idle left).
// Player0.png   row 0 col 0 = hero (frame 0).
// TODO CALIBRATE: confirm frame positions in each sheet.

export const NPC_TILE:    TileRegion = { x: 0, y: 0, w: 16, h: 16 }; // Humanoid0
export const PLAYER_TILE: TileRegion = { x: 0, y: 0, w: 16, h: 16 }; // Player0

// ─── Resource nodes — DawnLike/Objects/Ore0.png + Items/Amulet.png ───────
// iron/gold pull from Ore0.png; relic reuses the itemAmulet sheet.
// TODO CALIBRATE: open Ore0.png and verify exact column positions.

export type ResourceNodeType = 'iron' | 'gold' | 'relic';

export const RESOURCE_SPRITE: Record<ResourceNodeType, {
  sheetKey: 'ore' | 'itemAmulet';
  region: TileRegion;
}> = {
  iron:  { sheetKey: 'ore',        region: { x:  0, y: 0, w: 16, h: 16 } }, // TODO CALIBRATE
  gold:  { sheetKey: 'ore',        region: { x: 16, y: 0, w: 16, h: 16 } }, // TODO CALIBRATE
  relic: { sheetKey: 'itemAmulet', region: { x:  0, y: 0, w: 16, h: 16 } },
};

// ─── Items on the ground — DawnLike Items sheets ─────────────────────────
// Each ItemType maps to a sheet name (used as SheetKey) and a source rectangle.
// TODO CALIBRATE: open each Items PNG and verify row/col for the desired sprite.

export const ITEM_SPRITE: Record<ItemType, {
  sheetKey: 'itemAmulet' | 'itemScroll' | 'itemKey';
  region: TileRegion;
}> = {
  artifact: { sheetKey: 'itemAmulet', region: { x: 0, y: 0, w: 16, h: 16 } },
  letter:   { sheetKey: 'itemScroll', region: { x: 0, y: 0, w: 16, h: 16 } },
  key:      { sheetKey: 'itemKey',    region: { x: 0, y: 0, w: 16, h: 16 } },
};
