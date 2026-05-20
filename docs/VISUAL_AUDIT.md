# Visual Audit — Cascade

**Date:** 2026-05-20  
**Scope:** Complete mapping of every visual concept to a concrete rendered sprite or graphics call.

---

## 1. Biome Coverage (`tileMap.ts → BIOME_TILES`)

| Biome | Tile Region | Sheet | Notes |
|---|---|---|---|
| `ocean` | (112, 0) | terrain | ✅ Solid light blue hex |
| `coast` | (16, 0) | terrain | ✅ Blue-purple shallow hex |
| `grassland` | (64, 0) | terrain | ✅ Green leafy hex |
| `forest` | (64, 0) + tree layer | terrain + tree | ✅ Shared ground tile, TREE_TILES[forest] differentiates |
| `rainforest` | (80, 0) + tree layer | terrain + tree | ✅ Dark canopy hex + dense tree sprite |
| `arid` | (0, 0) | terrain | ✅ Brown earth hex |
| `desert` | (96, 0) | terrain | ✅ Gold/sandy hex |
| `tundra` | (48, 0) | terrain | ✅ Ice/snow diagonal hex |
| `mountain` | (32, 0) | terrain | ✅ Grey stone hex; elevation > 0.75 gets snow-white tint |

**Gap:** None — all 9 biomes are mapped.

---

## 2. Innovation Coverage (`tileMap.ts → INNOVATION_SPRITE`)

| InnovationType | Sheet | Region | Notes |
|---|---|---|---|
| `agriculture` | icons | (0, 0) | ✅ |
| `metallurgy` | icons | (16, 0) | ✅ |
| `navigation` | icons | (32, 0) | ✅ |
| `scholarship` | books | (0, 0) | ✅ |
| `engineering` | icons | (48, 0) | ✅ |

**Gap:** None — all 5 `InnovationType` values are mapped.

**Rendering path:** The latest innovation per settlement is rendered as a half-tile icon offset to the top-right of the settlement tile (`worldRenderer.ts` → Layer 4.3). Only the most recent innovation is shown; if a settlement has multiple, older ones are invisible.

---

## 3. Resource Node Coverage (`tileMap.ts → RESOURCE_SPRITE`)

| ResourceNodeType | Sheet | Notes |
|---|---|---|
| `iron` | ore | ✅ |
| `gold` | ore | ✅ |
| `relic` | ore | ✅ |

**Gap:** None. All `ResourceNode['type']` values are mapped.

---

## 4. Item Coverage (`tileMap.ts → ITEM_SPRITE`)

| ItemType | Sheet | Notes |
|---|---|---|
| `artifact` | itemAmulet | ✅ |
| `letter` | itemScroll | ✅ |
| `key` | itemKey | ✅ |

**Gap:** None. All `Item['type']` values are mapped.

---

## 5. Diplomatic State — Visual Coverage

Diplomatic states (`Relationship['state']`) are **not directly rendered as sprites**. They influence:
- Trade route volume (decay/growth in `phaseTrade.ts`)  
- Conflict probability (in `phaseConflict.ts`)

**Visual gap:** No on-map indicator distinguishes `war`, `alliance`, `peace`, `hostile`. Players currently learn about diplomatic state via the KnowledgeLog and NPC dialogue. A future enhancement could add border-color coding to faction-territory tiles or a diplomacy overlay toggled with a key.

---

## 6. TileModifier Types — Visual Coverage (`visualEffects.ts → updateModifierLayer`)

| ModifierType | Visual Effect | Notes |
|---|---|---|
| `bloom` | Animated green circle (alpha 0.15–0.25, breathing) | ✅ Renders on tile center |
| `omen` | Animated cyan ring stroke (alpha 0.4–0.6, breathing) | ✅ Renders on tile center |

**Gap:** Any `TileModifier` type beyond `bloom` and `omen` is silently ignored. If new modifier types are added to the type system, they must also be added to `updateModifierLayer`.

---

## 7. VisualEffect Types — Visual Coverage (`visualEffects.ts → updateVisualEffectsLayer`)

| VisualEffect['type'] | Visual | Notes |
|---|---|---|
| `ripple` | Expanding stroke circle (animated scale + alpha) | ✅ |
| `sparkle` | Flickering cross (animated brightness) | ✅ |
| `aura` | Breathing filled circle + outer ring | ✅ |
| `tech_spark` | Flashing white square with outer ring | ✅ |

**Gap:** None — all 4 `VisualEffectType` values are handled.

---

## 8. Religion / Holy Sites

| Concept | Rendering | Location |
|---|---|---|
| Settlement with dominant religion | Faith glow underlay (colored circle at α=0.25) | `worldRenderer.ts` Layer 2 |
| Holy Site (generic) | `HOLYSITE_TILE` from religion sheet, tinted by faction color | `worldRenderer.ts` Layer 4.2 |
| Holy Site (deity-specific altar) | Altar texture from `ALTAR_PATHS[rel.tenets[0]]` if available | `worldRenderer.ts` Layer 4.2 |
| Religion heatmap overlay (`R` key) | Colored circles per settlement faith-pressure value | `visualEffects.ts → updateModifierLayer` |

**Gap:** Religion overlay fires only when `showReligionOverlay` is true in the store. Verify `R` keyboard shortcut is wired to toggle this in `PixiViewport.tsx` keyboard handler. ✅ Confirmed — it is.

---

## 9. Ghost of History (`H` key)

| Feature | Implementation | Notes |
|---|---|---|
| Ghost border rendering | Dashed border lines drawn at 0.4 alpha per faction color | `ghostLayer.ts → updateGhostLayer` |
| Alpha | Fixed 0.4 per `g.stroke({ ..., alpha: 0.4 })` | ✅ Matches spec |
| Activation | `showHistory` state toggled on `H` keydown/keyup | ✅ Confirmed |
| Performance | `segsByColor` batches multiple edges per draw call | ✅ No per-edge Graphics object |

**Gap:** No performance.mark instrumentation exists around the ghost draw call. Add `performance.mark('ghost-start')` / `performance.mark('ghost-end')` in `ghostLayer.ts` if profiling is needed.

---

## 10. Track B Visuals Verification

### Trade Routes
- **Fire condition:** `route.active === true && route.path.length >= 2`
- **Visual:** Golden pulsing line (`0xffcc00`), width scaled by `volume`, flow particle animated along path
- **Location:** `tradeLayer.ts → updateTradeLayer` (ticker callback, runs every frame)
- **Status:** ✅ Confirmed rendering fires correctly for all active routes with volume > 0

### Faith Blooms
- **Fire condition:** `tile.modifiers` contains `{ type: 'bloom' }`
- **Visual:** Animated green circle overlay centered on tile
- **Location:** `visualEffects.ts → updateModifierLayer`
- **Status:** ✅ Renders a colored overlay on affected tiles. Verified in `updateModifierLayer`.

### Innovation Icons
- **Fire condition:** `settlement.innovations.length > 0`
- **Visual:** Half-tile icon at top-right of settlement tile
- **Location:** `worldRenderer.ts` Layer 4.3
- **Status:** ✅ All 5 `InnovationType` values have sprite assignments. See §2 above.

---

## 11. UI Layering — React ↔ PixiJS

| Panel | Keyboard Shortcut | z-index | Blocks Pixi? |
|---|---|---|---|
| Oracle's Eye (`OraclesEye`) | `O` | 9999 | No — `pointerEvents: none` on inner elements |
| Global Ledger (`GlobalLedger`) | `L` | 9999 | No — positioned over UI area, not canvas |
| Dialogue Panel (`DialoguePanel`) | NPC interaction | 9999 | No — separate overlay div |
| Tooltip | Hover | 9999 | No — `pointerEvents: none` |

**Gap to verify:** Confirm `O` and `L` panels don't intercept click events on the PixiJS canvas. The canvas element is a sibling of the React overlay `div`, and overlays use `pointer-events: none` where appropriate. Full end-to-end verification requires a browser test.

---

## 12. Gaps Summary

| Gap | Severity | Action |
|---|---|---|
| No diplomatic state on-map indicator | Low | Future: diplomacy overlay layer |
| Ghost draw call not instrumented with `performance.mark` | Low | Add if performance regression detected |
| Modifier layer silently ignores unknown types | Medium | Add an `else` console.warn in `updateModifierLayer` for unknown modifier types |
| `O`/`L` panel click-intercept — not E2E verified | Medium | Covered by Playwright E2E suite (Gap 4) |
