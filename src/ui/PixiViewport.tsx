// ─── PixiViewport Component ─────────────────────────────────────────────
// PixiJS v8 WebGL renderer for the game world.
// Mirrors GameCanvas.tsx keyboard handling exactly so either component
// can be dropped into App.tsx without touching game logic.
//
// Phase 1 scope: terrain tiles + settlements/ruins + player/NPCs.
// Phase 2 scope: Ghost of History overlay (H key — dashed faction borders from previousWorld).
// Phase 3 scope: Texture pooling (sub-textures reused across turns; no per-turn GPU allocs).
// Phase 5 scope: Tree canopy + items + resource nodes (ore/relic) sprite layers.
// NOT wired into App.tsx yet — that swap happens in Phase 5.

import { useRef, useEffect, useCallback, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import { useGameStore } from '../store/index';
import { mapKeyToAction } from '../engine/input.ts';
import { centerOnPlayer } from '../engine/camera.ts';
import { TILE_SIZE } from '../types';
import type { Biome } from '../types';
import type { TileRegion } from '../engine/tileMap.ts';
import {
  SHEET_TERRAIN,
  SHEET_SETTLEMENT,
  SHEET_CHARACTER,
  SHEET_PLAYER,
  SHEET_TREE,
  SHEET_ORE,
  SHEET_ITEM_AMULET,
  SHEET_ITEM_SCROLL,
  SHEET_ITEM_KEY,
  SHEET_RELIGION,
  BIOME_TILES,
  SETTLEMENT_TILE,
  RUIN_TILE,
  HOLYSITE_TILE,
  NPC_TILE,
  PLAYER_TILE,
  TREE_TILES,
  RESOURCE_SPRITE,
  ITEM_SPRITE,
} from '../engine/tileMap.ts';

// ─── Internal types ──────────────────────────────────────────────────────

interface Sheets {
  terrain:    Texture;
  settlement: Texture;
  character:  Texture;
  player:     Texture;
  tree:       Texture;
  ore:        Texture;
  itemAmulet: Texture;
  itemScroll: Texture;
  itemKey:    Texture;
  religion:   Texture;
}

interface Layers {
  terrain:   Container;
  mid:       Container;  // settlements, ruins, tree canopy
  resources: Container;  // ore deposits and relic sites
  items:     Container;  // pickup items (artifacts, letters, keys)
  religion:  Container;  // Holy Sites (shrines, temples)
  trade:     Container;  // Phase 1: trade routes (golden pulsing lines)
  visuals:   Container;  // Phase 0: Echo System visual feedback (ripples, sparks)
  top:       Container;  // characters (NPCs + player)
  ghost:     Container;  // Phase 2: Ghost of History overlay
}

/** Stable string key for the texture pool — one entry per (sheet, frame) pair. */
type SheetKey = keyof Sheets;

// ─── Ghost layer helpers ─────────────────────────────────────────────────

/**
 * Accumulate moveTo/lineTo pairs for one tile-edge as a dashed line,
 * matching Canvas renderer's setLineDash([4, 4]) ghost territory effect.
 * Does NOT call g.stroke() — the caller batches multiple edges per faction
 * color and strokes them all in one call for efficiency.
 */
function strokeDashedEdge(
  g: Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  const DASH = 4;
  const GAP  = 4;
  const horiz = y1 === y2;
  const total = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  let pos  = 0;
  let draw = true;
  while (pos < total) {
    const len = Math.min(draw ? DASH : GAP, total - pos);
    if (draw) {
      if (horiz) {
        g.moveTo(x1 + pos, y1).lineTo(x1 + pos + len, y1);
      } else {
        g.moveTo(x1, y1 + pos).lineTo(x1, y1 + pos + len);
      }
    }
    pos  += len;
    draw = !draw;
  }
}

// ─── Terrain tinting ─────────────────────────────────────────────────────

/**
 * Returns a PixiJS tint value (0xRRGGBB) for a terrain tile.
 * 0xffffff = no change. Subtle shifts based on elevation/rainfall
 * add visual variety without additional sprite sheets.
 */
function terrainTint(biome: Biome, elevation: number, rainfall: number): number {
  switch (biome) {
    case 'ocean':
    case 'coast': {
      // Deeper (lower elevation) = darker blue, shallower = lighter
      const v = Math.floor(160 + elevation * 80); // 160–240
      return (v << 16) | (v << 8) | 0xff;
    }
    case 'mountain': {
      if (elevation > 0.75) {
        // Snow-capped peaks: cool grey-white tint
        const v = Math.floor(215 + elevation * 40); // 215–255
        return (v << 16) | (v << 8) | 0xff;
      }
      return 0xffffff;
    }
    case 'grassland':
    case 'forest':
    case 'rainforest': {
      // Higher rainfall → richer green (slightly reduce red channel)
      const r = Math.floor(255 - rainfall * 28); // 227–255
      return (r << 16) | 0x00ffff;
    }
    case 'arid': {
      // Drier = warmer/redder (reduce blue channel slightly)
      const b = Math.floor(255 - (1 - rainfall) * 35); // 220–255
      return (0xff << 16) | (0xff << 8) | b;
    }
    case 'desert': {
      // Higher elevation = slightly cooler sand
      const b = Math.floor(180 + elevation * 50); // 180–230
      return (0xff << 16) | (0xee << 8) | b;
    }
    case 'tundra': {
      // Higher elevation = icier blue-white
      const b = Math.floor(220 + elevation * 35); // 220–255
      const r = Math.floor(210 + elevation * 30); // 210–240
      return (r << 16) | (0xe0 << 8) | b;
    }
    default:
      return 0xffffff;
  }
}

// ─── Component ───────────────────────────────────────────────────────────

export function PixiViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<Application | null>(null);
  const sheetsRef    = useRef<Sheets | null>(null);
  const layersRef    = useRef<Layers | null>(null);
  // Phase 3: sub-texture pool — reuse one Texture per (sheet, frame) across turns.
  // Key: `sheetKey:region.x:region.y` — unique per sprite type in each sheet.
  const texPoolRef   = useRef<Map<string, Texture>>(new Map());

  const [ready, setReady] = useState(false);
  
  const phase = useGameStore(s => s.phase);
  const world = useGameStore(s => s.world);
  const previousWorld = useGameStore(s => s.previousWorld);
  const camera = useGameStore(s => s.camera);
  const zoom = useGameStore(s => s.camera.zoom ?? 1.0);
  
  const openIntervention = useGameStore(s => s.openIntervention);
  const showReligionOverlay = useGameStore(s => s.showReligionOverlay);

  // Local UI state — mirrors GameCanvas exactly
  const [showHistory, setShowHistory] = useState(false);

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{
    label: string;
    detail: string;
    x: number;
    y: number;
  } | null>(null);

  const canvasWidth  = camera.viewportWidth  * TILE_SIZE * zoom;
  const canvasHeight = camera.viewportHeight * TILE_SIZE * zoom;

  // ── Init PixiJS + load textures (mount only) ──────────────────────────
  useEffect(() => {
    let mounted = true;
    const app = new Application();

    (async () => {
      console.log('[PIXI] Initializing application...');
      await app.init({
        width:      canvasWidth,
        height:     canvasHeight,
        background: '#000000',
        antialias:  false,
        // roundPixels keeps pixel-art sharp at non-integer zoom levels
        roundPixels: true,
      });
      console.log('[PIXI] Application initialized.');

      if (!mounted) {
        app.destroy();
        return;
      }

      console.log('[PIXI] Loading textures...');
      const load = async (name: string, url: string) => {
        try {
          const tex = await Assets.load<Texture>(url);
          console.log(`[PIXI] Loaded ${name}: ${url}`);
          return tex;
        } catch (e) {
          console.error(`[PIXI] Failed to load ${name}: ${url}`, e);
          throw e;
        }
      };

      const terrain = await load('terrain', SHEET_TERRAIN);
      const settlement = await load('settlement', SHEET_SETTLEMENT);
      const character = await load('character', SHEET_CHARACTER);
      const player = await load('player', SHEET_PLAYER);
      const tree = await load('tree', SHEET_TREE);
      const ore = await load('ore', SHEET_ORE);
      const itemAmulet = await load('itemAmulet', SHEET_ITEM_AMULET);
      const itemScroll = await load('itemScroll', SHEET_ITEM_SCROLL);
      const itemKey = await load('itemKey', SHEET_ITEM_KEY);
      const religion = await load('religion', SHEET_RELIGION);
      console.log('[PIXI] Textures loaded successfully.');

      if (!mounted) {
        app.destroy();
        return;
      }

      // Pixel-art canvas style (mirrors GameCanvas imageRendering)
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.imageRendering = 'pixelated';
      canvas.style.display = 'block';
      containerRef.current?.appendChild(canvas);

      // Six-layer stage: terrain → mid → resources → items → top (chars) → ghost
      const terrainLayer   = new Container();
      const midLayer       = new Container();
      const resourcesLayer = new Container();
      const itemsLayer     = new Container();
      const religionLayer  = new Container();
      const tradeLayer     = new Container();
      const visualsLayer   = new Graphics(); // Use Graphics for ripples/lines
      const topLayer       = new Container();
      const ghostLayer     = new Container();
      app.stage.addChild(terrainLayer, midLayer, resourcesLayer, itemsLayer, religionLayer, tradeLayer, visualsLayer, topLayer, ghostLayer);

      appRef.current    = app;
      sheetsRef.current = { terrain, settlement, character, player, tree, ore, itemAmulet, itemScroll, itemKey, religion };
      layersRef.current = {
        terrain:   terrainLayer,
        mid:       midLayer,
        resources: resourcesLayer,
        items:     itemsLayer,
        religion:  religionLayer,
        trade:     tradeLayer,
        visuals:   visualsLayer as unknown as Container, // Cast to match interface or update interface
        top:       topLayer,
        ghost:     ghostLayer,
      };

      setReady(true);
    })();

    return () => {
      mounted = false;
      // Destroy pooled sub-textures before the app (GPU resources freed by app.destroy).
      texPoolRef.current.forEach(tex => tex.destroy());
      texPoolRef.current.clear();
      // Remove canvas from DOM manually before destroy
      const canvas = appRef.current?.canvas as HTMLCanvasElement | undefined;
      canvas?.parentElement?.removeChild(canvas);
      appRef.current?.destroy();
      appRef.current    = null;
      sheetsRef.current = null;
      layersRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally mount-only

  // ── Resize renderer when zoom or viewport size changes ────────────────
  useEffect(() => {
    appRef.current?.renderer.resize(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  // ── Rebuild sprites on world / camera / history change ───────────────
  useEffect(() => {
    if (!ready || !world || !appRef.current || !sheetsRef.current || !layersRef.current) return;

    const { terrain, mid, resources, items, trade, top, ghost } = layersRef.current;
    const sheets  = sheetsRef.current;
    const texPool = texPoolRef.current;
    const tileDisplay = TILE_SIZE * zoom;

    // Create a Sprite from a pooled sub-texture.
    // Pool key: `sheetKey:region.x:region.y` — same frame always returns the same Texture,
    // so PixiJS can batch draw calls for repeated tiles (e.g. grassland) automatically.
    function makeSprite(sheetKey: SheetKey, region: TileRegion, col: number, row: number): Sprite {
      const poolKey = `${sheetKey}:${region.x}:${region.y}`;
      let tex = texPool.get(poolKey);
      if (!tex) {
        tex = new Texture({
          source: sheets[sheetKey].source,
          frame:  new Rectangle(region.x, region.y, region.w, region.h),
        });
        texPool.set(poolKey, tex);
      }
      const sprite = new Sprite(tex);
      sprite.x      = col * tileDisplay;
      sprite.y      = row * tileDisplay;
      sprite.width  = tileDisplay;
      sprite.height = tileDisplay;
      return sprite;
    }

    // Clear all layers
    terrain.removeChildren();
    mid.removeChildren();
    resources.removeChildren();
    items.removeChildren();
    layersRef.current.religion.removeChildren();
    trade.removeChildren();
    top.removeChildren();
    ghost.removeChildren();

    // ── Layer 1: terrain ────────────────────────────────────────────────
    for (let row = 0; row < camera.viewportHeight; row++) {
      for (let col = 0; col < camera.viewportWidth; col++) {
        const wx = camera.x + col;
        const wy = camera.y + row;
        if (wx >= world.map.width || wy >= world.map.height) continue;
        const tile = world.map.tiles[wy][wx];
        const sprite = makeSprite('terrain', BIOME_TILES[tile.biome], col, row);
        // Apply subtle elevation/rainfall tint for visual variety
        sprite.tint = terrainTint(tile.biome, tile.elevation, tile.rainfall);
        terrain.addChild(sprite);
      }
    }

    // ── Layer 2: tree canopy (forest/rainforest biomes) ──────────────────
    for (let row = 0; row < camera.viewportHeight; row++) {
      for (let col = 0; col < camera.viewportWidth; col++) {
        const wx = camera.x + col;
        const wy = camera.y + row;
        if (wx >= world.map.width || wy >= world.map.height) continue;
        const tile = world.map.tiles[wy][wx];
        const treeRegion = TREE_TILES[tile.biome];
        if (treeRegion) {
          const sprite = makeSprite('tree', treeRegion, col, row);
          // Vary tree tint slightly by position for visual diversity
          const hash = (wx * 7 + wy * 13) & 0xff; // 0–255
          const tintShift = Math.floor(hash * 0.06); // 0–15
          const r = Math.max(200, 240 - tintShift);
          sprite.tint = (r << 16) | (0xff << 8) | (r & 0xaa);
          mid.addChild(sprite);
        }
      }
    }

    // ── Layer 2: settlements + ruins (above tree canopy) ────────────────
    for (const settlement of world.settlements) {
      const col = settlement.position.x - camera.x;
      const row = settlement.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;

      // Faith underlay glow (standard)
      if (settlement.dominantReligionId) {
        const religion = world.religions.find(r => r.id === settlement.dominantReligionId);
        if (religion) {
          const glow = new Graphics();
          const color = parseInt(religion.color.replace('#', ''), 16);
          glow.beginFill(color, 0.25);
          glow.drawCircle(col * tileDisplay + tileDisplay / 2, row * tileDisplay + tileDisplay / 2, tileDisplay / 1.5);
          glow.endFill();
          mid.addChild(glow);
        }
      }

      // Faith Bloom Overlay (when R is active)
      if (showReligionOverlay) {
        const bloom = new Graphics();
        
        // 1. Settlement Blooms
        for (const settlement of world.settlements) {
          if (settlement.faith.length === 0) continue;
          const col = settlement.position.x - camera.x;
          const row = settlement.position.y - camera.y;
          if (col < -2 || row < -2 || col >= camera.viewportWidth + 2 || row >= camera.viewportHeight + 2) continue;

          for (const f of settlement.faith) {
            const religion = world.religions.find(r => r.id === f.religionId);
            if (religion) {
              const color = parseInt(religion.color.replace('#', ''), 16);
              const alpha = (f.pressure / 100) * 0.3;
              const radius = (tileDisplay * 2.5) * (f.pressure / 100);
              bloom.beginFill(color, alpha);
              bloom.drawCircle(col * tileDisplay + tileDisplay / 2, row * tileDisplay + tileDisplay / 2, radius);
              bloom.endFill();
            }
          }
        }

        // 2. Holy Site Blooms (High intensity)
        for (const site of world.holySites) {
          const col = site.position.x - camera.x;
          const row = site.position.y - camera.y;
          if (col < -4 || row < -4 || col >= camera.viewportWidth + 4 || row >= camera.viewportHeight + 4) continue;

          const religion = world.religions.find(r => r.id === site.religionId);
          if (religion) {
            const color = parseInt(religion.color.replace('#', ''), 16);
            // Holy Sites have a constant strong bloom
            bloom.beginFill(color, 0.2);
            bloom.drawCircle(col * tileDisplay + tileDisplay / 2, row * tileDisplay + tileDisplay / 2, tileDisplay * 4);
            bloom.endFill();
            bloom.beginFill(color, 0.4);
            bloom.drawCircle(col * tileDisplay + tileDisplay / 2, row * tileDisplay + tileDisplay / 2, tileDisplay * 1.5);
            bloom.endFill();
          }
        }
        layersRef.current.religion.addChild(bloom);
      }

      mid.addChild(makeSprite('settlement', SETTLEMENT_TILE, col, row));
    }

    for (const ruin of world.ruins) {
      const col = ruin.position.x - camera.x;
      const row = ruin.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      mid.addChild(makeSprite('settlement', RUIN_TILE, col, row));
    }

    // ── Layer 3: resource nodes (ore deposits + relic sites) ─────────────
    for (const node of world.resourceNodes) {
      const col = node.position.x - camera.x;
      const row = node.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      const { sheetKey, region } = RESOURCE_SPRITE[node.type];
      resources.addChild(makeSprite(sheetKey, region, col, row));
    }

    // ── Layer 4: items on the ground ─────────────────────────────────────
    for (const item of world.items) {
      const col = item.position.x - camera.x;
      const row = item.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      const { sheetKey, region } = ITEM_SPRITE[item.type];
      items.addChild(makeSprite(sheetKey, region, col, row));
    }

    // ── Layer 4.2: Holy Sites ────────────────────────────────────────────
    for (const site of world.holySites) {
      const col = site.position.x - camera.x;
      const row = site.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      
      const religion = world.religions.find(r => r.id === site.religionId);
      const sprite = makeSprite('religion', HOLYSITE_TILE, col, row);
      if (religion) {
        sprite.tint = parseInt(religion.color.replace('#', ''), 16);
      }
      layersRef.current.religion.addChild(sprite);
    }

    // ── Layer 4.5: trade routes ─────────────────────────────────────────
    if (world.tradeRoutes && world.tradeRoutes.length > 0) {
      const g = new Graphics();
      for (const route of world.tradeRoutes) {
        if (!route.active || route.volume <= 0) continue;
        
        // Calculate if any part of the path is in view
        const inView = route.path.some(p => 
          p.x >= camera.x && p.x < camera.x + camera.viewportWidth &&
          p.y >= camera.y && p.y < camera.y + camera.viewportHeight
        );
        if (!inView) continue;

        const alpha = Math.max(0.15, (route.volume / 100) * 0.6);
        const color = 0xffcc00; // Pulsing gold
        
        const startX = (route.path[0].x - camera.x) * tileDisplay + tileDisplay / 2;
        const startY = (route.path[0].y - camera.y) * tileDisplay + tileDisplay / 2;
        g.moveTo(startX, startY);
        
        for (let i = 1; i < route.path.length; i++) {
          const p = route.path[i];
          g.lineTo(
            (p.x - camera.x) * tileDisplay + tileDisplay / 2,
            (p.y - camera.y) * tileDisplay + tileDisplay / 2
          );
        }
        
        const width = 1 + (route.volume / 40);
        g.stroke({ color, width, alpha });
      }
      trade.addChild(g);
    }

    // ── Layer 4.5: Visual Effects ─────────────────────────────────────────
    const visualsG = layersRef.current?.visuals as Graphics;
    if (visualsG) {
      visualsG.clear();
      const visuals = world.visuals || [];
      for (const effect of visuals) {
        const { x, y } = effect.position;
        const col = x - camera.x;
        const row = y - camera.y;
        if (col < -2 || row < -2 || col >= camera.viewportWidth + 2 || row >= camera.viewportHeight + 2) continue;

        const screenX = col * tileDisplay + tileDisplay / 2;
        const screenY = row * tileDisplay + tileDisplay / 2;
        const color = effect.color ? parseInt(effect.color.replace('#', ''), 16) : 0xFFFFFF;

        if (effect.type === 'ripple') {
          // Pulse expansion
          const scale = 1.0 + (Math.sin(Date.now() / 200) * 0.2);
          visualsG.lineStyle(2, color, 0.7);
          visualsG.drawCircle(screenX, screenY, (tileDisplay * 1.5) * scale);
        } else if (effect.type === 'sparkle') {
          visualsG.beginFill(color, 1.0);
          visualsG.drawCircle(screenX, screenY, tileDisplay / 6);
          visualsG.endFill();
        }
      }
    }

    // ── Layer 5: NPCs ────────────────────────────────────────────────────
    for (const npc of world.npcs) {
      if (!npc.alive) continue;
      const col = npc.position.x - camera.x;
      const row = npc.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      top.addChild(makeSprite('character', NPC_TILE, col, row));
    }

    // ── Layer 5: player ──────────────────────────────────────────────────
    const px = world.player.position.x - camera.x;
    const py = world.player.position.y - camera.y;
    if (px >= 0 && py >= 0 && px < camera.viewportWidth && py < camera.viewportHeight) {
      top.addChild(makeSprite('player', PLAYER_TILE, px, py));
    }

    // ── Layer 6: Ghost of History ─────────────────────────────────────────
    // Renders dashed faction-border lines from previousWorld at 0.4 alpha when
    // the player holds H. Matches Canvas renderer's setLineDash([4, 4]) effect.
    // Edges are batched per faction color so each color costs one g.stroke() call.
    if (showHistory && previousWorld) {
      const prevWorld = previousWorld;

      // Build color lookup: faction id → 0xRRGGBB integer (PixiJS format)
      const prevFactionColors = new Map<string, number>();
      for (const f of prevWorld.factions) {
        prevFactionColors.set(f.id, parseInt(f.color.replace('#', ''), 16));
      }

      // Collect border edge segments grouped by faction color
      const segsByColor = new Map<number, Array<[number, number, number, number]>>();

      for (let row = 0; row < camera.viewportHeight; row++) {
        for (let col = 0; col < camera.viewportWidth; col++) {
          const wx = camera.x + col;
          const wy = camera.y + row;
          if (wx < 0 || wy < 0 || wx >= prevWorld.map.width || wy >= prevWorld.map.height) continue;
          const tile = prevWorld.map.tiles[wy][wx];
          if (!tile.factionId) continue;

          const color = prevFactionColors.get(tile.factionId) ?? 0xffffff;
          const sx = col * tileDisplay;
          const sy = row * tileDisplay;

          // Check all 4 edges — emit border where neighbor belongs to a different faction
          const edgeCandidates = [
            { dx: 0, dy: -1, x1: sx,             y1: sy,              x2: sx + tileDisplay, y2: sy              },
            { dx: 0, dy:  1, x1: sx,             y1: sy + tileDisplay, x2: sx + tileDisplay, y2: sy + tileDisplay },
            { dx: -1, dy: 0, x1: sx,             y1: sy,              x2: sx,               y2: sy + tileDisplay },
            { dx:  1, dy: 0, x1: sx + tileDisplay, y1: sy,            x2: sx + tileDisplay, y2: sy + tileDisplay },
          ];

          for (const e of edgeCandidates) {
            const nx = wx + e.dx;
            const ny = wy + e.dy;
            const neighborFaction = (nx >= 0 && ny >= 0 && nx < prevWorld.map.width && ny < prevWorld.map.height)
              ? prevWorld.map.tiles[ny][nx].factionId
              : null;
            if (neighborFaction !== tile.factionId) {
              if (!segsByColor.has(color)) segsByColor.set(color, []);
              segsByColor.get(color)!.push([e.x1, e.y1, e.x2, e.y2]);
            }
          }
        }
      }

      // Draw all edges — one Graphics object, batched per faction color
      if (segsByColor.size > 0) {
        const g = new Graphics();
        for (const [color, segs] of segsByColor) {
          for (const [x1, y1, x2, y2] of segs) {
            strokeDashedEdge(g, x1, y1, x2, y2);
          }
          // stroke() in PixiJS v8 commits all accumulated moveTo/lineTo as a single draw command
          g.stroke({ color, width: 2, alpha: 0.4 });
        }
        ghost.addChild(g);
      }
    }

  }, [world, camera, previousWorld, ready, showHistory, zoom]);

  // ── H key: Ghost of History toggle (mirrors GameCanvas) ──────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setShowHistory(e.type === 'keydown');
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  // ── Main keyboard handler ─────────────────────────────────────────────
  // We use a stable ref for the handler to prevent the global listener from
  // being re-registered on every world state change. This also fixes the
  // React Compiler's memoization mismatch warnings.
  const handlerRef = useRef<(e: KeyboardEvent) => void>(null);

  handlerRef.current = (e: KeyboardEvent) => {
    // Get freshest state from store directly to avoid handler churn
    const state = useGameStore.getState();
    const { world, camera, phase } = state;
    if (!world) return;
    if (e.key.toLowerCase() === 'h') return; // handled by history toggle above

    // Zoom in / out
    if (e.key === '=' || e.key === '+') {
      state.updateCamera((c) => ({ ...c, zoom: Math.min(2.0, (c.zoom ?? 1.0) + 0.1) }));
      return;
    }
    if (e.key === '-' || e.key === '_') {
      state.updateCamera((c) => ({ ...c, zoom: Math.max(0.2, (c.zoom ?? 1.0) - 0.1) }));
      return;
    }

    const action = mapKeyToAction(e.key, phase);

    // Religion Overlay Toggle (R key)
    if (e.key.toLowerCase() === 'r') {
      state.toggleReligionOverlay();
      return;
    }

    switch (action.type) {
      case 'MOVE': {
        const player = world.player;
        const newX = player.position.x + action.direction.x;
        const newY = player.position.y + action.direction.y;

        if (newX < 0 || newY < 0) return;
        if (newX >= world.map.width || newY >= world.map.height) return;
        if (!world.map.tiles[newY][newX].walkable) return;

        const npcAtTarget = world.npcs.find(
          n => n.alive && n.position.x === newX && n.position.y === newY,
        );
        if (npcAtTarget) {
          state.openDialogue(npcAtTarget);
          return;
        }

        state.updateWorld((w) => ({
          ...w,
          player: { ...w.player, position: { x: newX, y: newY } },
        }));
        const newCamera = centerOnPlayer(camera, { x: newX, y: newY }, world.map);
        state.setCamera(newCamera);
        break;
      }

      case 'INTERACT': {
        const playerPos = world.player.position;
        const itemAtPlayer = world.items.find(
          item => item.position.x === playerPos.x && item.position.y === playerPos.y,
        );
        if (itemAtPlayer) state.openAction(itemAtPlayer);
        break;
      }

      case 'CLOSE_PANEL':
        if (phase === 'dialogue')     state.closeDialogue();
        if (phase === 'action')       state.closeAction();
        if (phase === 'intervention') state.closeIntervention();
        break;

      case 'JUMP':
        state.setPreviousWorld(world);
        state.setPhase('jumping');
        break;
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => handlerRef.current?.(e);
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Mouse hover: biome tooltip ────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!world) { setTooltip(null); return; }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const tileDisplay = TILE_SIZE * zoom;
    const col = Math.floor((e.clientX - rect.left) / tileDisplay);
    const row = Math.floor((e.clientY - rect.top)  / tileDisplay);
    const wx = camera.x + col;
    const wy = camera.y + row;
    if (wx < 0 || wy < 0 || wx >= world.map.width || wy >= world.map.height) {
      setTooltip(null);
      return;
    }
    const tile = world.map.tiles[wy][wx];
    const biomeName = tile.biome.charAt(0).toUpperCase() + tile.biome.slice(1);
    const faction   = tile.factionId ? world.factions.find(f => f.id === tile.factionId) : null;
    const settlement = world.settlements.find(s => s.position.x === wx && s.position.y === wy);
    const holySite   = world.holySites.find(s => s.position.x === wx && s.position.y === wy);
    const ruin       = world.ruins.find(r => r.position.x === wx && r.position.y === wy);
    const resource   = world.resourceNodes.find(n => n.position.x === wx && n.position.y === wy);

    let label = biomeName;
    if (settlement) label = `${settlement.name}`;
    else if (holySite) {
      const rel = world.religions.find(r => r.id === holySite.religionId);
      label = `${holySite.name} (${rel?.name || 'Faith'})`;
    }
    else if (ruin)  label = `Ruins`;

    const details: string[] = [biomeName];
    details.push(`Elev ${tile.elevation.toFixed(2)}  Rain ${tile.rainfall.toFixed(2)}`);
    if (faction) details.push(`Territory: ${faction.name}`);
    if (resource) details.push(`Resource: ${resource.type}`);
    if (settlement?.dominantReligionId) {
      const rel = world.religions.find(r => r.id === settlement.dominantReligionId);
      details.push(`Religion: ${rel?.name || 'None'}`);
    }

    setTooltip({ label, detail: details.join('\n'), x: e.clientX, y: e.clientY });
  }, [world, camera, zoom]);

  const handleViewportClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!world || phase !== 'exploring') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const tileDisplay = TILE_SIZE * zoom;
    const col = Math.floor((e.clientX - rect.left) / tileDisplay);
    const row = Math.floor((e.clientY - rect.top)  / tileDisplay);
    const wx = camera.x + col;
    const wy = camera.y + row;

    if (wx < 0 || wy < 0 || wx >= world.map.width || wy >= world.map.height) return;

    openIntervention({ x: wx, y: wy });
  }, [world, phase, camera, zoom, openIntervention]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);


  return (
    <div
      className="pixi-viewport-container"
      style={{ position: 'relative', display: 'inline-block', cursor: phase === 'exploring' ? 'crosshair' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleViewportClick}
    >
      <div ref={containerRef} style={{ display: 'block' }} />
      {tooltip && (
        <div style={{
          position:   'fixed',
          left:       tooltip.x + 14,
          top:        tooltip.y + 14,
          background: 'rgba(8, 12, 20, 0.92)',
          color:      '#b8ccdd',
          padding:    '6px 10px',
          borderRadius: '4px',
          fontSize:   '11px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex:     9999,
          border:     '1px solid #2a3a4a',
          lineHeight: '1.6',
          whiteSpace: 'pre-line',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.6)',
          minWidth:   '120px',
        }}>
          <div style={{ color: '#ddeeff', fontWeight: 'bold', marginBottom: '2px' }}>
            {tooltip.label}
          </div>
          <div style={{ color: '#6a8a9a', fontSize: '10px' }}>
            {tooltip.detail}
          </div>
        </div>
      )}
    </div>
  );
}
