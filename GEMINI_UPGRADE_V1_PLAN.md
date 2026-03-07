# PLAN-001: Cascade "Gems" Implementation Plan

## Phase 1: Scale & Foundation (Worldgen Upgrade)
- [ ] Update `types.ts` for 128x128 grid support.
- [ ] Implement FBM noise generator for elevation.
- [ ] Implement Voronoi plate boundary logic.
- [ ] Add 'M' key debug view (Elevation/Moisture toggle).
- [ ] Optimize `renderer.ts` with viewport culling.

## Phase 2: Climate & Biomes
- [ ] Implement moisture transport logic (wind + rain shadows).
- [ ] Define the 8-biome lookup table (Elevation x Moisture).
- [ ] Update map generation to use the new biome system.

## Phase 3: Deep History & Ruins
- [ ] Create `runDeepHistory(years)` headless simulation mode.
- [ ] Implement settlement collapse -> ruins fossilization logic.
- [ ] Seed high-significance artifacts into ruins.

## Phase 4: Faction & Leadership Logic
- [ ] Add `InterestGroup` and `RulerTrait` types to `types.ts`.
- [ ] Implement interest group weight shifting based on world events.
- [ ] Implement dynastic succession and crises (faction splitting).
- [ ] Integrate trait modifiers into `tick.ts` (economics/conflict phases).

## Phase 5: High-Fidelity Visuals
- [ ] Implement Lambertian Hillshading in the renderer.
- [ ] Add micro-textures to biomes.
- [ ] Implement procedural idle bobbing for NPC/Settlement glyphs.
- [ ] Add zoom support (+/-) and atmospheric cloud overlay.

## Phase 6: Dynamic World Systems
- [ ] Add strategic resource nodes (Iron, Gold, Relics).
- [ ] Implement colonization logic (factions founding new settlements).
- [ ] Implement settlement growth/abandonment cycles.
