# PLAN-002: PixiJS & Tileset Implementation Plan

## Phase 1: Setup & Assets (Foundation)
- [ ] Install `pixi.js` dependency.
- [ ] Research and download Kenney Roguelike Pack (Tiles + Characters).
- [ ] Generate a JSON Sprite Atlas for the selected assets.
- [ ] Create `src/ui/PixiViewport.tsx` to host the Pixi application.

## Phase 2: Terrain Migration (The Grid)
- [ ] Map `Biome` types to specific tileset sprites.
- [ ] Implement optimized grid rendering (Container-based or `CompositeRectTilemap`).
- [ ] Sync Pixi camera position with the existing `camera` state in `GameStore`.
- [ ] Re-implement the 'H' key (Ghost of History) as a togglable Pixi layer.

## Phase 3: Entity Sprites (Characters & Items)
- [ ] Map NPCs and Player to character sprites.
- [ ] Implement Sprite Pooling for NPCs to handle large counts efficiently.
- [ ] Add smooth position interpolation (Lerp) for sub-tile movement.
- [ ] Re-implement entity bobbing using PixiJS tickers.

## Phase 4: Visual Juice (The "Fidelity" Part)
- [ ] Implement a simple dynamic lighting filter (torchlight effect around player).
- [ ] Add particle effects for specific biomes (e.g., mist in Rainforest, sand in Desert).
- [ ] Implement smooth zoom/pan transitions using PixiJS containers.

## Phase 5: UI & Final Integration
- [ ] Switch `App.tsx` from `GameCanvas` to `PixiViewport`.
- [ ] Ensure all DOM overlays (Dialogue, Score) are correctly depth-sorted above the Pixi canvas.
- [ ] Perform a 128x128 performance audit.
