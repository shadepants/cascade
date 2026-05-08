# SPEC-001: Cascade "Gems" High-Fidelity Upgrade

## 1. Overview
Transition the Cascade POC into a high-fidelity "Living World" simulation. This involves a 30x increase in map scale, geological/climate simulation, deep pre-history, and complex internal faction politics.

## 2. Geological & Climate Engine
- **Fractal Elevation:** 4-octave Fractal Brownian Motion (FBM) noise.
- **Tectonic Simulation:** Voronoi-based plate boundaries (Mountains/Trenches).
- **Moisture Transport:** Wind-driven climate simulation creating realistic Rain Shadows.
- **Biomes (8):** Ocean, Coast, Tundra, Grassland, Forest, Rainforest, Arid, Desert.

## 3. Deep History & Ruins
- **Era Zero:** 500-year "headless" pre-game simulation.
- **Fossilization:** Collapsed settlements leave behind "Ruins" (♜).
- **Legendary Artifacts:** High-significance items seeded into Ruins with historical context.

## 4. Faction & Leadership Logic
- **Internal Interest Groups:** Factions contain competing Merchant/Military/Religious coalitions.
- **Ruler Traits:** Mechanics-altering traits (e.g., Bloodthirsty, Industrious).
- **Dynastic Succession:** Legitimacy stats, aging, and succession crises/fractures.

## 5. Dynamic World Systems
- **Strategic Resources:** Iron, Gold, and Relic nodes acting as conflict magnets.
- **Colonization:** Population-driven expansion (new settlements every 20y).
- **Settlement Growth:** 1-5 scaling with abandonment logic.

## 6. High-Fidelity Visuals
- **Lambertian Hillshading:** Pseudo-3D depth on 2D map.
- **Procedural Animation:** Idle bobbing, capes, and drop shadows for entities.
- **Atmospheric Layer:** Interactive zoom (+/-) and cloud/fog overlays.

## 7. Scale & Performance
- **Map Dimensions:** 128x128 (16,384 tiles).
- **Debug Views:** Toggleable heightmap/moisture map (M key).
- **Optimized Culling:** Viewport-only rendering for the 128x128 grid.
