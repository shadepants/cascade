// ─── Canvas Tile Renderer ───────────────────────────────────────────────
// Draws the game map to a <canvas> element. Pure function: takes state, draws pixels.
// No game logic here — just rendering.

import type { GameMap, Camera, NPC, Player, Settlement, Item, Faction, WorldState } from '../types.ts';
import { TILE_SIZE } from '../types.ts';
import { BIOME_COLORS } from '../data/biomes.ts';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  map: GameMap;
  camera: Camera;
  player: Player;
  npcs: NPC[];
  settlements: Settlement[];
  items: Item[];
  factions: Faction[];
  previousWorld?: WorldState | null; // Ghost of History layer
}

/** Main render function — called once per turn (not per frame). */
export function renderWorld(rc: RenderContext): void {
  const { ctx, map, camera, player, npcs, settlements, items, factions, previousWorld } = rc;
  const canvasW = camera.viewportWidth * TILE_SIZE;
  const canvasH = camera.viewportHeight * TILE_SIZE;

  // Build faction color lookup
  const factionColors = new Map<string, string>();
  for (const f of factions) {
    factionColors.set(f.id, f.color);
  }

  // Clear
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Draw terrain tiles
  for (let vy = 0; vy < camera.viewportHeight; vy++) {
    for (let vx = 0; vx < camera.viewportWidth; vx++) {
      const wx = camera.x + vx;
      const wy = camera.y + vy;

      if (wx < 0 || wy < 0 || wx >= map.width || wy >= map.height) continue;

      const tile = map.tiles[wy][wx];
      const sx = vx * TILE_SIZE;
      const sy = vy * TILE_SIZE;

      // Terrain fill
      ctx.fillStyle = BIOME_COLORS[tile.biome];
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

      // Faction territory tint — colored overlay + border
      if (tile.factionId) {
        const color = factionColors.get(tile.factionId) ?? '#ffffff';
        drawFactionTerritory(ctx, map, camera, wx, wy, sx, sy, tile.factionId, color);
      }
    }
  }

  // Draw Ghost Layer if requested
  if (previousWorld) {
    const prevMap = previousWorld.map;
    const prevFactionColors = new Map<string, string>();
    for (const f of previousWorld.factions) {
      prevFactionColors.set(f.id, f.color);
    }

    ctx.setLineDash([4, 4]); // Dashed lines for history
    
    for (let vy = 0; vy < camera.viewportHeight; vy++) {
      for (let vx = 0; vx < camera.viewportWidth; vx++) {
        const wx = camera.x + vx;
        const wy = camera.y + vy;

        if (wx < 0 || wy < 0 || wx >= prevMap.width || wy >= prevMap.height) continue;

        const tile = prevMap.tiles[wy][wx];
        const sx = vx * TILE_SIZE;
        const sy = vy * TILE_SIZE;

        if (tile.factionId) {
          const color = prevFactionColors.get(tile.factionId) ?? '#ffffff';
          drawGhostTerritory(ctx, prevMap, camera, wx, wy, sx, sy, tile.factionId, color);
        }
      }
    }
    
    ctx.setLineDash([]); // Reset dash

    // Draw destroyed settlements as Ruins
    const currentSettlementIds = new Set(settlements.map(s => s.id));
    for (const oldS of previousWorld.settlements) {
      if (!currentSettlementIds.has(oldS.id)) {
        drawGlyph(ctx, camera, oldS.position.x, oldS.position.y, 'r', '#666666'); // 'r' for ruin
      }
    }
  }

  // Draw settlements (larger glyph, bright white)
  for (const s of settlements) {
    drawGlyph(ctx, camera, s.position.x, s.position.y, '■', '#ffffff');
  }

  // Draw items
  for (const item of items) {
    drawGlyph(ctx, camera, item.position.x, item.position.y, '*', '#aaffaa');
  }

  // Draw NPCs
  for (const npc of npcs) {
    if (!npc.alive) continue;
    drawGlyph(ctx, camera, npc.position.x, npc.position.y, 'N', '#ddd');
  }

  // Draw player (always on top)
  drawGlyph(ctx, camera, player.position.x, player.position.y, '@', '#ffcc00');
}

/** Draw a single character glyph at a world coordinate. */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  wx: number,
  wy: number,
  glyph: string,
  color: string,
): void {
  const sx = (wx - camera.x) * TILE_SIZE;
  const sy = (wy - camera.y) * TILE_SIZE;

  // Off-screen check
  if (sx < 0 || sy < 0) return;
  if (sx >= camera.viewportWidth * TILE_SIZE) return;
  if (sy >= camera.viewportHeight * TILE_SIZE) return;

  ctx.fillStyle = color;
  ctx.font = `${TILE_SIZE - 4}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
}

/** Draw faction territory: subtle color wash + border on edges where faction changes. */
function drawFactionTerritory(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  camera: Camera,
  wx: number,
  wy: number,
  sx: number,
  sy: number,
  factionId: string,
  color: string,
): void {
  // Subtle color wash over the biome
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.globalAlpha = 1.0;

  // Draw border only on edges where the neighboring tile belongs to a different faction
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const neighbors = [
    { dx: 0, dy: -1, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx + TILE_SIZE, sy); } },            // top
    { dx: 0, dy: 1,  edge: () => { ctx.moveTo(sx, sy + TILE_SIZE); ctx.lineTo(sx + TILE_SIZE, sy + TILE_SIZE); } }, // bottom
    { dx: -1, dy: 0, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + TILE_SIZE); } },             // left
    { dx: 1, dy: 0,  edge: () => { ctx.moveTo(sx + TILE_SIZE, sy); ctx.lineTo(sx + TILE_SIZE, sy + TILE_SIZE); } }, // right
  ];

  for (const n of neighbors) {
    const nx = wx + n.dx;
    const ny = wy + n.dy;

    // Draw border if neighbor is off-map or belongs to a different faction
    const neighborFaction = (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height)
      ? map.tiles[ny][nx].factionId
      : null;

    if (neighborFaction !== factionId) {
      // Offset to keep borders within viewport
      const nvx = nx - camera.x;
      const nvy = ny - camera.y;
      if (nvx < -1 || nvy < -1 || nvx > camera.viewportWidth || nvy > camera.viewportHeight) continue;

      ctx.beginPath();
      n.edge();
      ctx.stroke();
    }
  }
}

/** Draw ghost territory: no fill, dashed border. */
function drawGhostTerritory(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  camera: Camera,
  wx: number,
  wy: number,
  sx: number,
  sy: number,
  factionId: string,
  color: string,
): void {
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const neighbors = [
    { dx: 0, dy: -1, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx + TILE_SIZE, sy); } },            // top
    { dx: 0, dy: 1,  edge: () => { ctx.moveTo(sx, sy + TILE_SIZE); ctx.lineTo(sx + TILE_SIZE, sy + TILE_SIZE); } }, // bottom
    { dx: -1, dy: 0, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + TILE_SIZE); } },             // left
    { dx: 1, dy: 0,  edge: () => { ctx.moveTo(sx + TILE_SIZE, sy); ctx.lineTo(sx + TILE_SIZE, sy + TILE_SIZE); } }, // right
  ];

  for (const n of neighbors) {
    const nx = wx + n.dx;
    const ny = wy + n.dy;

    const neighborFaction = (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height)
      ? map.tiles[ny][nx].factionId
      : null;

    if (neighborFaction !== factionId) {
      const nvx = nx - camera.x;
      const nvy = ny - camera.y;
      if (nvx < -1 || nvy < -1 || nvx > camera.viewportWidth || nvy > camera.viewportHeight) continue;

      ctx.beginPath();
      n.edge();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;
}

