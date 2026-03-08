# Playtest Guide: Gems Upgrade Verification
**Agent:** Claude Chrome Agent
**Environment:** `npm run dev` (http://localhost:5173)

## Goal
Verify the stability, performance, and mechanical depth of the "Gems" High-Fidelity upgrade on the new 128x128 map with 500 years of pre-history.

## 1. Visual & Performance Audit
- [ ] **Viewport Culling:** Pan the camera around the 128x128 map (`WASD`). Ensure rendering remains smooth (60FPS) and doesn't flicker at chunk boundaries.
- [ ] **Zoom:** Test `+` and `-` keys. Verify that zooming out provides a clear tactical overview and zooming in shows biome micro-textures and hillshading details.
- [ ] **Atmospherics:** Observe the cloud layer. It should move independently of the camera.
- [ ] **Hillshading:** Verify that mountains have a "shadowed" side (North/West light source) and valleys feel sunken.

## 2. Worldgen & History Audit (Console)
Run `(window as any).__CASCADE_STATE` in the browser console:
- [ ] **Era Zero:** Check `world.currentYear`. It should be `500`.
- [ ] **Ruins:** Check `world.ruins.length`. Ensure multiple ruins exist (from Era Zero collapses).
- [ ] **Artifacts:** Find an item in `world.items`. Verify it has a `history` entry if it's in a ruin.
- [ ] **Politics:** Inspect a faction in `world.factions`. Verify it has `interestGroups` with varied `power` levels.

## 3. Gameplay Mechanics (Browser)
- [ ] **Movement:** Traverse across different biomes. Verify that `ocean`, `coast`, and `mountain` tiles remain non-walkable.
- [ ] **Interaction:** Find an NPC and open dialogue. Verify the "Accuracy Tiered" dialogue still works (e.g., they talk about historical events from Era Zero).
- [ ] **Cascade:** Pick up an item, use it to change a faction's state (e.g., give weapon to boost Military), then perform a **Time Jump**.
- [ ] **Score Screen:** Reach the end-of-run score screen. Verify it is **900px wide**, displays the **Longest Causal Chain** tree, and looks cinematic.

## 4. Debug Toggles
- [ ] **M Key:** Cycle through 'Elevation' (Grayscale) and 'Moisture' (Blue) views. Verify tectonic boundaries (Elevation) and Rain Shadows (Moisture) are visible.
- [ ] **H Key:** Hold 'H' to view the Ghost of History. Verify it overlays the previous era's borders correctly.
