// ─── Canvas Tile Renderer ───────────────────────────────────────────────
// Draws the game map to a <canvas> element. Pure function: takes state, draws pixels.
// No game logic here — just rendering.

import type { 
  GameMap, Camera, NPC, Player, Settlement, Item, Faction, WorldState, 
  Ruin, ResourceNode, Biome 
} from '../types.ts';
import { TILE_SIZE } from '../types.ts';
import { BIOME_COLORS } from '../data/biomes.ts';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  map: GameMap;
  camera: Camera;
  player: Player;
  npcs: NPC[];
  settlements: Settlement[];
  ruins: Ruin[];
  resourceNodes: ResourceNode[];
  items: Item[];
  factions: Faction[];
  previousWorld?: WorldState | null; // Ghost of History layer
  debugMode?: 'none' | 'elevation' | 'rainfall';
}

/** Main render function — called once per turn (not per frame). */
export function renderWorld(rc: RenderContext): void {
  const { ctx, map, camera, player, npcs = [], settlements = [], ruins = [], resourceNodes = [], items = [], factions = [], previousWorld, debugMode = 'none' } = rc;
  const zoom = camera.zoom || 1.0;
  const tileSize = TILE_SIZE * zoom;
  const canvasW = camera.viewportWidth * tileSize;
  const canvasH = camera.viewportHeight * tileSize;

  const time = Date.now();

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
      const wx = Math.floor(camera.x) + vx;
      const wy = Math.floor(camera.y) + vy;

      if (wx < 0 || wy < 0 || wx >= map.width || wy >= map.height) continue;

      const tile = map.tiles[wy][wx];
      const sx = vx * tileSize;
      const sy = vy * tileSize;

      // ─── Pass 1: Terrain fill & Hillshading ───────────────────────────
      if (debugMode === 'elevation') {
        const val = Math.floor(tile.elevation * 255);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
      } else if (debugMode === 'rainfall') {
        const val = Math.floor(tile.rainfall * 255);
        ctx.fillStyle = `rgb(0,0,${val})`;
      } else {
        // Hillshading (Lambertian approximation)
        const westX = Math.max(0, wx - 1);
        const northY = Math.max(0, wy - 1);
        const westElev = map.tiles[wy][westX].elevation;
        const northElev = map.tiles[northY][wx].elevation;
        
        // Light from Top-Left (NW)
        const slope = (tile.elevation - westElev) + (tile.elevation - northElev);
        const brightness = Math.max(0.75, Math.min(1.25, 1.0 + slope * 0.5));
        
        ctx.fillStyle = adjustColor(BIOME_COLORS[tile.biome], brightness);
      }
      ctx.fillRect(sx, sy, Math.ceil(tileSize), Math.ceil(tileSize));

      // ─── Pass 2: Micro-textures ───────────────────────────────────────
      if (debugMode === 'none' && tileSize > 8) {
        drawMicroTexture(ctx, tile.biome, sx, sy, tileSize, wx, wy);
      }

      // ─── Pass 3: Faction territory tint ───────────────────────────────
      if (debugMode === 'none' && tile.factionId) {
        const color = factionColors.get(tile.factionId) ?? '#ffffff';
        drawFactionTerritory(ctx, map, camera, wx, wy, sx, sy, tile.factionId, color, tileSize);
      }
    }
  }

  // Draw entities (only in normal mode)
  if (debugMode === 'none') {
    const bob = Math.sin(time / 400) * (tileSize * 0.08);

    // Draw ruins
    for (const ruin of ruins) {
      drawGlyph(ctx, camera, ruin.position.x, ruin.position.y, '♜', '#888888', tileSize);
    }

    // Draw resource nodes
    for (const node of resourceNodes) {
      const glyph = node.type === 'iron' ? 'i' : node.type === 'gold' ? 'g' : '†';
      const color = node.type === 'iron' ? '#999' : node.type === 'gold' ? '#facc15' : '#c084fc';
      drawGlyph(ctx, camera, node.position.x, node.position.y, glyph, color, tileSize);
    }

    // Draw settlements (larger glyph, bright white)
    for (const s of settlements) {
      drawGlyph(ctx, camera, s.position.x, s.position.y, '■', '#ffffff', tileSize, bob * 0.5);
    }

    // Draw items
    for (const item of items) {
      drawGlyph(ctx, camera, item.position.x, item.position.y, '*', '#aaffaa', tileSize, Math.abs(bob));
    }

    // Draw NPCs
    for (const npc of npcs) {
      if (!npc.alive) continue;
      // Staggered bobbing for NPCs
      const npcBob = Math.sin((time + (parseInt(npc.id.slice(-4), 16) || 0)) / 300) * (tileSize * 0.1);
      drawGlyph(ctx, camera, npc.position.x, npc.position.y, 'N', '#ddd', tileSize, npcBob);
    }

    // Draw player (always on top)
    drawGlyph(ctx, camera, player.position.x, player.position.y, '@', '#ffcc00', tileSize, bob);
    
    // ─── Pass 4: Atmospheric Layer ─────────────────────────────────────
    drawClouds(ctx, canvasW, canvasH);
  }

  // Ghost layer support
  if (debugMode === 'none' && previousWorld) {
    const prevMap = previousWorld.map;
    const prevFactionColors = new Map<string, string>();
    for (const f of previousWorld.factions) {
      prevFactionColors.set(f.id, f.color);
    }

    ctx.setLineDash([4, 4]);
    for (let vy = 0; vy < camera.viewportHeight; vy++) {
      for (let vx = 0; vx < camera.viewportWidth; vx++) {
        const wx = Math.floor(camera.x) + vx;
        const wy = Math.floor(camera.y) + vy;
        if (wx < 0 || wy < 0 || wx >= prevMap.width || wy >= prevMap.height) continue;
        const tile = prevMap.tiles[wy][wx];
        if (tile.factionId) {
          const color = prevFactionColors.get(tile.factionId) ?? '#ffffff';
          drawGhostTerritory(ctx, prevMap, camera, wx, wy, vx * tileSize, vy * tileSize, tile.factionId, color, tileSize);
        }
      }
    }
    ctx.setLineDash([]);
  }
}

/** Draw moving atmospheric clouds. */
function drawClouds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const time = Date.now() / 20000;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  
  for (let i = 0; i < 6; i++) {
    const speed = 0.5 + i * 0.1;
    const size = 150 + i * 80;
    const x = ((time * speed + (i * 0.33)) % 1.5 - 0.25) * width;
    const y = ((Math.sin(time * 0.7 + i) * 0.3 + 0.5)) * height;
    
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.6, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Adjust a hex color by a brightness multiplier. */
function adjustColor(hex: string, multiplier: number): string {
  const r = Math.min(255, Math.floor(parseInt(hex.slice(1, 3), 16) * multiplier));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(3, 5), 16) * multiplier));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(5, 7), 16) * multiplier));
  return `rgb(${r},${g},${b})`;
}

/** Draw subtle biome-specific details. */
function drawMicroTexture(
  ctx: CanvasRenderingContext2D,
  biome: Biome,
  sx: number,
  sy: number,
  tileSize: number,
  wx: number,
  wy: number,
): void {
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  
  // Use tile coordinates as "seed" for stable texture
  const seed = (wx * 13 + wy * 37);
  
  if (biome === 'forest' || biome === 'rainforest') {
    if (seed % 3 === 0) ctx.fillRect(sx + tileSize * 0.3, sy + tileSize * 0.3, 2, 2);
  } else if (biome === 'desert' || biome === 'arid') {
    if (seed % 4 === 0) ctx.fillRect(sx + tileSize * 0.6, sy + tileSize * 0.2, 1, 1);
  } else if (biome === 'ocean') {
    if ((seed + Math.floor(Date.now() / 1000)) % 10 === 0) {
       ctx.fillRect(sx + tileSize * 0.5, sy + tileSize * 0.5, tileSize * 0.2, 1);
    }
  }
  
  ctx.globalAlpha = 1.0;
}

/** Draw a single character glyph at a world coordinate. */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  wx: number,
  wy: number,
  glyph: string,
  color: string,
  tileSize: number,
  yOffset: number = 0,
): void {
  const sx = (wx - camera.x) * tileSize;
  const sy = (wy - camera.y) * tileSize;

  // Off-screen check
  if (sx < -tileSize || sy < -tileSize) return;
  if (sx >= camera.viewportWidth * tileSize) return;
  if (sy >= camera.viewportHeight * tileSize) return;

  ctx.fillStyle = color;
  ctx.font = `bold ${tileSize - 4}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(glyph, sx + tileSize / 2 + 1, sy + tileSize / 2 + 1 + yOffset);
  
  ctx.fillStyle = color;
  ctx.fillText(glyph, sx + tileSize / 2, sy + tileSize / 2 + yOffset);
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
  tileSize: number,
): void {
  // Subtle color wash over the biome
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(sx, sy, tileSize, tileSize);
  ctx.globalAlpha = 1.0;

  // Draw border only on edges where the neighboring tile belongs to a different faction
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const neighbors = [
    { dx: 0, dy: -1, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx + tileSize, sy); } },            // top
    { dx: 0, dy: 1,  edge: () => { ctx.moveTo(sx, sy + tileSize); ctx.lineTo(sx + tileSize, sy + tileSize); } }, // bottom
    { dx: -1, dy: 0, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + tileSize); } },             // left
    { dx: 1, dy: 0,  edge: () => { ctx.moveTo(sx + tileSize, sy); ctx.lineTo(sx + tileSize, sy + tileSize); } }, // right
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
  tileSize: number,
): void {
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const neighbors = [
    { dx: 0, dy: -1, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx + tileSize, sy); } },            // top
    { dx: 0, dy: 1,  edge: () => { ctx.moveTo(sx, sy + tileSize); ctx.lineTo(sx + tileSize, sy + tileSize); } }, // bottom
    { dx: -1, dy: 0, edge: () => { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + tileSize); } },             // left
    { dx: 1, dy: 0,  edge: () => { ctx.moveTo(sx + tileSize, sy); ctx.lineTo(sx + tileSize, sy + tileSize); } }, // right
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
