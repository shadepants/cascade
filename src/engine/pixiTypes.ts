// ─── Shared PixiJS Layer/Sheet Types ────────────────────────────────────
// These types are defined here so both PixiViewport.tsx and worldRenderer.ts
// can share them without circular imports.

import type { Texture, Container, Graphics, Sprite } from 'pixi.js';
import type { TileRegion } from './tileMap.ts';

export interface Sheets {
  terrain:    Texture;
  settlement: Texture;
  character:  Texture;
  player:     Texture;
  tree:       Texture;
  ore:        Texture;
  itemAmulet: Texture;
  itemScroll: Texture;
  itemKey:    Texture;
  religion:   Texture;
  books:      Texture;
  icons:      Texture;
  decor:      Texture;
  altars:     Record<string, Texture>;
}

export interface Layers {
  terrain:     Container;
  mid:         Container;  // settlements, ruins, tree canopy
  resources:   Container;  // ore deposits and relic sites
  items:       Container;  // pickup items (artifacts, letters, keys)
  religion:    Container;  // Holy Sites (shrines, temples)
  innovations: Container;  // Innovation icons
  trade:       Graphics;   // Phase 1: trade routes (golden pulsing lines)
  modifiers:   Graphics;   // Persistent tile modifiers (Omens, Blooms)
  visuals:     Graphics;   // Phase 0: Echo System visual feedback (ripples, sparks)
  top:         Container;  // characters (NPCs + player)
  ghost:       Container;  // Phase 2: Ghost of History overlay
}

/** Stable string key for the texture pool — one entry per (sheet, frame) pair. */
export type SheetKey = keyof Sheets;

/** Metadata attached to animated sprites so the ticker can swap animation frames. */
export interface SpriteMeta {
  sheetKey: SheetKey;
  baseRegion: TileRegion;
}

/** A PixiJS Sprite extended with optional Cascade animation metadata. */
export type CascadeSprite = Sprite & { _cascadeMeta?: SpriteMeta };
