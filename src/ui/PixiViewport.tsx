// ─── PixiViewport Component ─────────────────────────────────────────────
// PixiJS v8 WebGL renderer for the game world.
// Mirrors GameCanvas.tsx keyboard handling exactly so either component
// can be dropped into App.tsx without touching game logic.
//
// Phase 1 scope: terrain tiles + settlements/ruins + player/NPCs.
// NOT wired into App.tsx yet — that swap happens in Phase 5.
//
// Performance note: sprites are rebuilt from scratch on every world/camera
// change. Turn-based game means at most one rebuild per keypress — acceptable.
// Texture pooling is deferred to Phase 3.

import { useRef, useEffect, useCallback, useState } from 'react';
import { Application, Assets, Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { useGame } from '../store.ts';
import { mapKeyToAction } from '../engine/input.ts';
import { centerOnPlayer } from '../engine/camera.ts';
import { TILE_SIZE } from '../types.ts';
import type { TileRegion } from '../engine/tileMap.ts';
import {
  SHEET_TERRAIN,
  SHEET_SETTLEMENT,
  SHEET_CHARACTER,
  SHEET_PLAYER,
  BIOME_TILES,
  SETTLEMENT_TILE,
  RUIN_TILE,
  NPC_TILE,
  PLAYER_TILE,
} from '../engine/tileMap.ts';

// ─── Internal types ──────────────────────────────────────────────────────

interface Sheets {
  terrain:    Texture;
  settlement: Texture;
  character:  Texture;
  player:     Texture;
}

interface Layers {
  terrain: Container;
  mid:     Container;
  top:     Container;
}

// ─── Component ───────────────────────────────────────────────────────────

export function PixiViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<Application | null>(null);
  const sheetsRef    = useRef<Sheets | null>(null);
  const layersRef    = useRef<Layers | null>(null);

  const [ready, setReady] = useState(false);
  const { state, dispatch } = useGame();

  // Local UI state — mirrors GameCanvas exactly
  const [showHistory, setShowHistory] = useState(false);
  const [debugMode, setDebugMode] = useState<'none' | 'elevation' | 'rainfall'>('none');

  const zoom         = state.camera.zoom ?? 1.0;
  const canvasWidth  = state.camera.viewportWidth  * TILE_SIZE * zoom;
  const canvasHeight = state.camera.viewportHeight * TILE_SIZE * zoom;

  // ── Init PixiJS + load textures (mount only) ──────────────────────────
  useEffect(() => {
    let mounted = true;
    const app = new Application();

    (async () => {
      await app.init({
        width:      canvasWidth,
        height:     canvasHeight,
        background: '#000000',
        antialias:  false,
        // roundPixels keeps pixel-art sharp at non-integer zoom levels
        roundPixels: true,
      });

      if (!mounted) {
        app.destroy();
        return;
      }

      // Parallel texture load — never await sequentially (React best-practice)
      const [terrain, settlement, character, player] = await Promise.all([
        Assets.load<Texture>(SHEET_TERRAIN),
        Assets.load<Texture>(SHEET_SETTLEMENT),
        Assets.load<Texture>(SHEET_CHARACTER),
        Assets.load<Texture>(SHEET_PLAYER),
      ]);

      if (!mounted) {
        app.destroy();
        return;
      }

      // Pixel-art canvas style (mirrors GameCanvas imageRendering)
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.imageRendering = 'pixelated';
      canvas.style.display = 'block';
      containerRef.current?.appendChild(canvas);

      // Three-layer stage: terrain → mid (structures) → top (characters)
      const terrainLayer = new Container();
      const midLayer     = new Container();
      const topLayer     = new Container();
      app.stage.addChild(terrainLayer, midLayer, topLayer);

      appRef.current    = app;
      sheetsRef.current = { terrain, settlement, character, player };
      layersRef.current = { terrain: terrainLayer, mid: midLayer, top: topLayer };

      setReady(true);
    })();

    return () => {
      mounted = false;
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

  // ── Rebuild sprites on world / camera change ──────────────────────────
  useEffect(() => {
    if (!ready || !state.world || !appRef.current || !sheetsRef.current || !layersRef.current) return;

    const { terrain, mid, top } = layersRef.current;
    const sheets  = sheetsRef.current;
    const { world, camera } = state;
    const tileDisplay = TILE_SIZE * zoom;

    // Helper: create a sub-texture sprite from a sheet at screen position col/row.
    // TODO Phase 3: pool Texture objects keyed by sheet+frame to avoid per-turn allocs.
    function makeSprite(sheet: Texture, region: TileRegion, col: number, row: number): Sprite {
      const tex = new Texture({
        source: sheet.source,
        frame:  new Rectangle(region.x, region.y, region.w, region.h),
      });
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
    top.removeChildren();

    // ── Layer 1: terrain ────────────────────────────────────────────────
    for (let row = 0; row < camera.viewportHeight; row++) {
      for (let col = 0; col < camera.viewportWidth; col++) {
        const wx = camera.x + col;
        const wy = camera.y + row;
        if (wx >= world.map.width || wy >= world.map.height) continue;
        const tile = world.map.tiles[wy][wx];
        terrain.addChild(makeSprite(sheets.terrain, BIOME_TILES[tile.biome], col, row));
      }
    }

    // ── Layer 2: settlements + ruins ────────────────────────────────────
    for (const settlement of world.settlements) {
      const col = settlement.position.x - camera.x;
      const row = settlement.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      mid.addChild(makeSprite(sheets.settlement, SETTLEMENT_TILE, col, row));
    }

    for (const ruin of world.ruins) {
      const col = ruin.position.x - camera.x;
      const row = ruin.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      mid.addChild(makeSprite(sheets.settlement, RUIN_TILE, col, row));
    }

    // ── Layer 3: NPCs ────────────────────────────────────────────────────
    for (const npc of world.npcs) {
      if (!npc.alive) continue;
      const col = npc.position.x - camera.x;
      const row = npc.position.y - camera.y;
      if (col < 0 || row < 0 || col >= camera.viewportWidth || row >= camera.viewportHeight) continue;
      top.addChild(makeSprite(sheets.character, NPC_TILE, col, row));
    }

    // ── Layer 3: player ──────────────────────────────────────────────────
    const px = world.player.position.x - camera.x;
    const py = world.player.position.y - camera.y;
    if (px >= 0 && py >= 0 && px < camera.viewportWidth && py < camera.viewportHeight) {
      top.addChild(makeSprite(sheets.player, PLAYER_TILE, px, py));
    }

  }, [state.world, state.camera, ready, showHistory, zoom]);
  // showHistory is intentionally in deps — Phase 2 will add the ghost layer here.

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

  // ── Main keyboard handler (mirrors GameCanvas exactly) ────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.world) return;
    if (e.key.toLowerCase() === 'h') return; // handled by history toggle above

    // Debug view cycle: none → elevation → rainfall → none
    if (e.key.toLowerCase() === 'm') {
      setDebugMode(prev => {
        if (prev === 'none') return 'elevation';
        if (prev === 'elevation') return 'rainfall';
        return 'none';
      });
      return;
    }

    // Zoom in / out
    if (e.key === '=' || e.key === '+') {
      dispatch({ type: 'UPDATE_CAMERA', updater: (c) => ({ ...c, zoom: Math.min(2.0, (c.zoom ?? 1.0) + 0.1) }) });
      return;
    }
    if (e.key === '-' || e.key === '_') {
      dispatch({ type: 'UPDATE_CAMERA', updater: (c) => ({ ...c, zoom: Math.max(0.2, (c.zoom ?? 1.0) - 0.1) }) });
      return;
    }

    const action = mapKeyToAction(e.key, state.phase);

    switch (action.type) {
      case 'MOVE': {
        const player = state.world.player;
        const newX = player.position.x + action.direction.x;
        const newY = player.position.y + action.direction.y;

        if (newX < 0 || newY < 0) return;
        if (newX >= state.world.map.width || newY >= state.world.map.height) return;
        if (!state.world.map.tiles[newY][newX].walkable) return;

        const npcAtTarget = state.world.npcs.find(
          n => n.alive && n.position.x === newX && n.position.y === newY,
        );
        if (npcAtTarget) {
          dispatch({ type: 'OPEN_DIALOGUE', npc: npcAtTarget });
          return;
        }

        dispatch({
          type: 'UPDATE_WORLD',
          updater: (world) => ({
            ...world,
            player: { ...world.player, position: { x: newX, y: newY } },
          }),
        });
        const newCamera = centerOnPlayer(state.camera, { x: newX, y: newY }, state.world.map);
        dispatch({ type: 'SET_CAMERA', camera: newCamera });
        break;
      }

      case 'INTERACT': {
        const playerPos = state.world.player.position;
        const itemAtPlayer = state.world.items.find(
          item => item.position.x === playerPos.x && item.position.y === playerPos.y,
        );
        if (itemAtPlayer) dispatch({ type: 'OPEN_ACTION', item: itemAtPlayer });
        break;
      }

      case 'CLOSE_PANEL':
        if (state.phase === 'dialogue') dispatch({ type: 'CLOSE_DIALOGUE' });
        if (state.phase === 'action')   dispatch({ type: 'CLOSE_ACTION' });
        break;

      case 'JUMP':
        dispatch({ type: 'SET_PREVIOUS_WORLD', world: state.world });
        dispatch({ type: 'SET_PHASE', phase: 'jumping' });
        break;
    }
  }, [state, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // debugMode is read here for future use (elevation/rainfall overlay in Phase 3).
  // Suppress unused-variable lint until then.
  void debugMode;

  return <div ref={containerRef} style={{ display: 'block' }} />;
}
