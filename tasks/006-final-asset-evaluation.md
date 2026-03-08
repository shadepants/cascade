# FINAL EVALUATION: Hybrid Asset Selection for Cascade

Based on the downloaded and extracted assets in `public/assets/`, here is the finalized selection for the "High-Fidelity" transition using PixiJS.

## 1. Terrain & Biomes (The World Map)
**Primary Set:** `DawnLike/Objects/Map0.png` and `Map1.png`
- **Why:** These are dedicated "Overworld" tiles (forests, mountains, hills) that look much better at scale than individual room-based dungeon tiles.
- **Mapping:**
  - **Grassland:** `Map0.png` (Tile [0,0])
  - **Forest:** `Map0.png` (Pine trees) / `Tree0.png` (Individual trees)
  - **Mountain:** `Map0.png` (Grey mountain peaks)
  - **Ocean:** `Map0.png` (Deep water)
  - **Coast:** `Map0.png` (Shallow water)
  - **Tundra/Snow:** `Map0.png` (White peaks/ground)

## 2. Settlements & Ruins (Historical Markers)
**Primary Set:** `ToenMedieval/Tile-set - Toen's Medieval Strategy (16x16) - v.1.0.png`
- **Why:** This set has beautiful, distinct "strategy map" icons for Castles, Villages, and Watchtowers. They feel much more like "Factions" than DawnLike's simple village tiles.
- **Mapping:**
  - **Active Settlement:** Toen Castle/Village sprites.
  - **Ruins:** Toen's "Destroyed Village" sprites or DawnLike's `Objects/Pit0.png` (rubble).

## 3. Characters & NPCs (The Living World)
**Primary Set:** `DawnLike/Characters/`
- **Why:** Every sprite has a **2-frame animation** (Frame 0 and Frame 1). This is critical for making the 128x128 map feel alive.
- **Mapping:**
  - **Military Faction:** `Humanoid0.png` (Guard/Knight rows).
  - **Religious Faction:** `Humanoid0.png` (Priest/Monk rows).
  - **Commoners:** `Player0.png` or `Misc0.png`.

## 4. Legendary Artifacts & Resource Nodes
**Primary Set:** `DCSS/item/` and `DawnLike/Items/`
- **Why:** **DCSS (Dungeon Crawl Stone Soup)** has the most detailed and iconic items (Shattered Crowns, ancient staves). 
- **Mapping:**
  - **Shattered Crown:** `DCSS/item/armour/headgear/crown_gold.png` (or similar).
  - **Resource Nodes:** `DawnLike/Objects/Ore0.png` (Iron/Gold veins).

---

## Technical Strategy for PixiJS Integration

1. **Sprite Batching:** Use `PIXI.Assets.load` to load the themed PNGs.
2. **Coordinate Mapping:** Create a `TILE_MAP` object that stores the source rectangle for each biome/entity (e.g., `{ x: 16, y: 32, w: 16, h: 16 }`).
3. **Layering:**
   - **Bottom:** Terrain grid (TilingSprite or ParticleContainer).
   - **Middle:** Settlements and Resource Nodes.
   - **Top:** Animated NPCs and Player.
   - **Atmosphere:** Cloud layer (moving sprites).

This hybrid approach combines **DawnLike's animation**, **Toen's strategic icons**, and **DCSS's item variety** into a cohesive, high-fidelity experience.
