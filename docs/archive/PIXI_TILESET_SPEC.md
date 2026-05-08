# SPEC-002: PixiJS & Tileset Integration

## 1. Overview
Migrate the "Cascade" rendering layer from raw HTML5 Canvas 2D to **PixiJS v8**. This move unlocks WebGL-accelerated sprite rendering, enabling the use of high-fidelity tilesets (Kenney Roguelike Pack) while maintaining the superior React DOM-based UI.

## 2. Technical Stack
- **Engine:** PixiJS v8 (WebGL/WebGPU).
- **Asset Format:** Sprite Atlases (TexturePacker format).
- **State Management:** existing React Context (`store.ts`).
- **Integration Layer:** `PixiViewport.tsx` React component.

## 3. Rendering Pipeline
- **Layer 1: Terrain:** A large container or optimized tilemap for the 128x128 grid.
- **Layer 2: Historical Ghost:** A semi-transparent layer showing previous era borders (H key).
- **Layer 3: Entities:** Sprites for NPCs, Player, and Items with procedural animations.
- **Layer 4: Atmosphere:** Cloud sprites and lighting filters.

## 4. Tileset Selection
- **Primary:** Kenney Roguelike/RPG Pack (16x16 or scaled to 24x24).
- **Rationale:** CC0 license, exhaustive variety, clean aesthetic that preserves simulation readability.

## 5. Optimization Strategy
- **Viewport Culling:** Only update and render sprites within the camera's bounding box.
- **Shared Ticker:** Coordinate simulation ticks and rendering frames via the Pixi ticker.
- **Texture Batching:** Group all tiles and entities into a single sprite atlas to minimize draw calls.
