// ─── World Sprite Renderer ───────────────────────────────────────────────
// Rebuilds all world-state-driven sprites onto their respective Pixi layers.
// Called from PixiViewport.tsx whenever world, camera, or history changes.
//
// Sprite pooling strategy: Index-based reuse. Sprites are never destroyed;
// they are hidden when not needed. This eliminates GC pressure during jumps.

import { Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { WorldState } from '../types';
import type { Biome } from '../types';
import type { Camera } from '../types/ui.ts';
import type { TileRegion } from './tileMap.ts';
import type { Sheets, Layers, SheetKey } from './pixiTypes.ts';
import {
  BIOME_TILES,
  SETTLEMENT_TILE,
  RUIN_TILE,
  HOLYSITE_TILE,
  NPC_TILE,
  PLAYER_TILE,
  TREE_TILES,
  RESOURCE_SPRITE,
  ITEM_SPRITE,
  INNOVATION_SPRITE,
} from './tileMap.ts';
import { updateGhostLayer } from './ghostLayer.ts';

// ─── Terrain tinting ─────────────────────────────────────────────────────

/**
 * Returns a PixiJS tint value (0xRRGGBB) for a terrain tile.
 * 0xffffff = no tint change. Subtle elevation/rainfall shifts add visual
 * variety without additional sprite sheets.
 */
export function terrainTint(biome: Biome, elevation: number, rainfall: number): number {
  switch (biome) {
    case 'ocean':
    case 'coast': {
      const v = Math.floor(160 + elevation * 80);
      return (v << 16) | (v << 8) | 0xff;
    }
    case 'mountain': {
      if (elevation > 0.75) {
        const v = Math.floor(215 + elevation * 40);
        return (v << 16) | (v << 8) | 0xff;
      }
      return 0xffffff;
    }
    case 'grassland':
    case 'forest':
    case 'rainforest': {
      const r = Math.floor(255 - rainfall * 28);
      return (r << 16) | 0x00ffff;
    }
    case 'arid': {
      const b = Math.floor(255 - (1 - rainfall) * 35);
      return (0xff << 16) | (0xff << 8) | b;
    }
    case 'desert': {
      const b = Math.floor(180 + elevation * 50);
      return (0xff << 16) | (0xee << 8) | b;
    }
    case 'tundra': {
      const b = Math.floor(220 + elevation * 35);
      const r = Math.floor(210 + elevation * 30);
      return (r << 16) | (0xe0 << 8) | b;
    }
    default:
      return 0xffffff;
  }
}

// ─── Sprite pool helpers ─────────────────────────────────────────────────

function getOrCreateSprite(
  layer: Container,
  texPool: Map<string, Texture>,
  sheets: Sheets,
  index: number,
  sheetKey: SheetKey,
  region: TileRegion,
  col: number,
  row: number,
  tileDisplay: number,
  frameIndex: number,
): Sprite {
  const isAnimated = sheetKey === 'character' || sheetKey === 'player';
  const frameOffset = isAnimated ? frameIndex * 16 : 0;
  const poolKey = `${sheetKey}:${region.x + frameOffset}:${region.y}`;

  let tex = texPool.get(poolKey);
  if (!tex) {
    tex = new Texture({
      source: (sheets[sheetKey] as any).source,
      frame:  new Rectangle(region.x + frameOffset, region.y, region.w, region.h),
    });
    texPool.set(poolKey, tex);
  }

  let sprite: Sprite;
  const existingChild = index < layer.children.length ? layer.children[index] : undefined;
  if (existingChild instanceof Sprite) {
    sprite = existingChild;
    sprite.visible = true;
    sprite.texture = tex;
  } else if (existingChild !== undefined) {
    // Wrong type at this pool slot (e.g. a Graphics glow replaced a Sprite or vice-versa).
    // Swap it out so we don't corrupt the pool.
    layer.removeChildAt(index);
    sprite = new Sprite(tex);
    layer.addChildAt(sprite, index);
  } else {
    sprite = new Sprite(tex);
    layer.addChild(sprite);
  }

  sprite.x      = col * tileDisplay;
  sprite.y      = row * tileDisplay;
  sprite.width  = tileDisplay;
  sprite.height = tileDisplay;

  if (isAnimated) {
    (sprite as any)._cascadeMeta = { sheetKey, baseRegion: region };
  } else {
    (sprite as any)._cascadeMeta = undefined;
  }

  return sprite;
}

function hideUnusedSprites(layer: Container, startIndex: number): void {
  for (let i = startIndex; i < layer.children.length; i++) {
    layer.children[i].visible = false;
  }
}

// ─── Main rebuild function ────────────────────────────────────────────────

/**
 * Rebuild all world-state-driven sprites for one render frame.
 * This is called inside a `useEffect` that depends on [world, camera, ...].
 * `tileDisplay` is the already computed display size of a tile in pixels
 * (for example, TILE_SIZE * zoom).
 */
export function rebuildWorldSprites(
  world: WorldState,
  camera: Camera,
  previousWorld: WorldState | null,
  showHistory: boolean,
  tileDisplay: number,
  layers: Layers,
  sheets: Sheets,
  texPool: Map<string, Texture>,
  frameIndex: number,
): void {
  const { terrain, mid, resources, items, religion, innovations, top, ghost } = layers;

  // Bind helper with shared context
  const getSprite = (
    layer: Container, index: number, sheetKey: SheetKey, region: TileRegion, col: number, row: number,
  ) => getOrCreateSprite(layer, texPool, sheets, index, sheetKey, region, col, row, tileDisplay, frameIndex);

  let terrainIdx    = 0;
  let midIdx        = 0;
  let resourceIdx   = 0;
  let itemIdx       = 0;
  let religionIdx   = 0;
  let innovationIdx = 0;
  let topIdx        = 0;

  // ── Layer 1: terrain ──────────────────────────────────────────────────
  for (let row = 0; row < camera.viewportHeight; row++) {
    for (let col = 0; col < camera.viewportWidth; col++) {
      const wx = camera.x + col;
      const wy = camera.y + row;
      if (wx < 0 || wy < 0 || wx >= world.map.width || wy >= world.map.height) continue;
      const tile = world.map.tiles[wy][wx];
      const sprite = getSprite(terrain, terrainIdx++, 'terrain', BIOME_TILES[tile.biome], col, row);
      sprite.tint = terrainTint(tile.biome, tile.elevation, tile.rainfall);
    }
  }
  hideUnusedSprites(terrain, terrainIdx);

  // ── Layer 2: tree canopy (forest/rainforest biomes) ───────────────────
  for (let row = 0; row < camera.viewportHeight; row++) {
    for (let col = 0; col < camera.viewportWidth; col++) {
      const wx = camera.x + col;
      const wy = camera.y + row;
      if (wx >= world.map.width || wy >= world.map.height) continue;
      const tile = world.map.tiles[wy][wx];
      const treeRegion = TREE_TILES[tile.biome];
      if (treeRegion) {
        const sprite = getSprite(mid, midIdx++, 'tree', treeRegion, col, row);
        const hash = (wx * 7 + wy * 13) & 0xff;
        const tintShift = Math.floor(hash * 0.06);
        const r = Math.max(200, 240 - tintShift);
        sprite.tint = (r << 16) | (0xff << 8) | (r & 0xaa);
      }
    }
  }

  // ── Layer 2: settlements + ruins (above tree canopy) ─────────────────
  for (const settlement of world.settlements) {
    const col = settlement.position.x - camera.x;
    const row = settlement.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;

    if (settlement.dominantReligionId) {
      const dominantReligion = world.religions.find(r => r.id === settlement.dominantReligionId);
      if (dominantReligion) {
        let glow: Graphics;
        if (midIdx < mid.children.length && mid.children[midIdx] instanceof Graphics) {
          glow = mid.children[midIdx] as Graphics;
          glow.visible = true;
        } else {
          glow = new Graphics();
          mid.addChildAt(glow, midIdx);
        }
        glow.clear();
        const color = parseInt(dominantReligion.color.replace('#', ''), 16);
        glow.fill({ color, alpha: 0.25 });
        glow.circle(col * tileDisplay + tileDisplay / 2, row * tileDisplay + tileDisplay / 2, tileDisplay / 1.5);
        midIdx++;
      }
    }
    getSprite(mid, midIdx++, 'settlement', SETTLEMENT_TILE, col, row);
  }

  for (const ruin of world.ruins) {
    const col = ruin.position.x - camera.x;
    const row = ruin.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
    getSprite(mid, midIdx++, 'settlement', RUIN_TILE, col, row);
  }
  hideUnusedSprites(mid, midIdx);

  // ── Layer 3: resource nodes ───────────────────────────────────────────
  for (const node of world.resourceNodes) {
    const col = node.position.x - camera.x;
    const row = node.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
    const { sheetKey, region } = RESOURCE_SPRITE[node.type];
    getSprite(resources, resourceIdx++, sheetKey as SheetKey, region, col, row);
  }
  hideUnusedSprites(resources, resourceIdx);

  // ── Layer 4: items on the ground ──────────────────────────────────────
  for (const item of world.items) {
    const col = item.position.x - camera.x;
    const row = item.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
    const { sheetKey, region } = ITEM_SPRITE[item.type];
    getSprite(items, itemIdx++, sheetKey as SheetKey, region, col, row);
  }
  hideUnusedSprites(items, itemIdx);

  // ── Layer 4.2: Holy Sites ─────────────────────────────────────────────
  for (const site of world.holySites) {
    const col = site.position.x - camera.x;
    const row = site.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;

    const siteReligion = world.religions.find(r => r.id === site.religionId);
    let holySiteSprite: Sprite;
    if (siteReligion && sheets.altars[siteReligion.tenets[0]]) {
      const tex = sheets.altars[siteReligion.tenets[0]];
      if (religionIdx < religion.children.length) {
        holySiteSprite = religion.children[religionIdx] as Sprite;
        holySiteSprite.visible = true;
        holySiteSprite.texture = tex;
      } else {
        holySiteSprite = new Sprite(tex);
        religion.addChild(holySiteSprite);
      }
      holySiteSprite.x      = col * tileDisplay;
      holySiteSprite.y      = row * tileDisplay;
      holySiteSprite.width  = tileDisplay;
      holySiteSprite.height = tileDisplay;
      holySiteSprite.tint   = 0xffffff;
      religionIdx++;
    } else {
      holySiteSprite = getSprite(religion, religionIdx++, 'religion', HOLYSITE_TILE, col, row);
      holySiteSprite.tint = siteReligion ? parseInt(siteReligion.color.replace('#', ''), 16) : 0xffffff;
    }
  }
  hideUnusedSprites(religion, religionIdx);

  // ── Layer 4.3: Innovations ────────────────────────────────────────────
  for (const settlement of world.settlements) {
    if (settlement.innovations.length === 0) continue;
    const col = settlement.position.x - camera.x;
    const row = settlement.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;

    const latestId = settlement.innovations[settlement.innovations.length - 1];
    const tech = world.innovations.find(i => i.id === latestId);
    if (tech) {
      const { sheetKey, region: innovRegion } = INNOVATION_SPRITE[tech.type];
      const sprite = getSprite(innovations, innovationIdx++, sheetKey as SheetKey, innovRegion, col, row);
      sprite.width  = tileDisplay / 2;
      sprite.height = tileDisplay / 2;
      sprite.x     += tileDisplay / 2;
    }
  }
  hideUnusedSprites(innovations, innovationIdx);

  // ── Layer 5: NPCs ─────────────────────────────────────────────────────
  for (const npc of world.npcs) {
    if (!npc.alive) continue;
    const col = npc.position.x - camera.x;
    const row = npc.position.y - camera.y;
    if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
    getSprite(top, topIdx++, 'character', NPC_TILE, col, row);
  }

  // ── Layer 5: player ───────────────────────────────────────────────────
  const px = world.player.position.x - camera.x;
  const py = world.player.position.y - camera.y;
  if (px >= 0 && py >= 0 && px < camera.viewportWidth && py < camera.viewportHeight) {
    getSprite(top, topIdx++, 'player', PLAYER_TILE, px, py);
  }
  hideUnusedSprites(top, topIdx);

  // ── Layer 6: Ghost of History ─────────────────────────────────────────
  updateGhostLayer(ghost, previousWorld, camera, tileDisplay, showHistory);
}
