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

import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useGameStore } from '../store/index';
import { mapKeyToAction } from '../engine/input.ts';
import { centerOnPlayer } from '../engine/camera.ts';
import { TILE_SIZE } from '../types';
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
  SHEET_BOOKS,
  SHEET_ICONS,
  ALTAR_PATHS,
} from '../engine/tileMap.ts';
import type { Sheets, Layers } from '../engine/pixiTypes.ts';
import { rebuildWorldSprites } from '../engine/worldRenderer.ts';
import { updateTradeLayer } from '../engine/tradeLayer.ts';
import { updateVisualEffectsLayer, updateModifierLayer } from '../engine/visualEffects.ts';

// ─── Terrain tinting removed — moved to src/engine/worldRenderer.ts ─────

// ─── Component ───────────────────────────────────────────────────────────

function PixiViewportInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<Application | null>(null);
  const sheetsRef    = useRef<Sheets | null>(null);
  const layersRef    = useRef<Layers | null>(null);
  // Phase 3: sub-texture pool — reuse one Texture per (sheet, frame) across turns.
  // Key: `sheetKey:region.x:region.y` — unique per sprite type in each sheet.
  const texPoolRef   = useRef<Map<string, Texture>>(new Map());

  const [ready, setReady] = useState(false);

  // Dev-only performance tracking
  const [devPerf, setDevPerf] = useState<{ fps: number; poolSize: number } | null>(null);
  const lastPerfUpdateRef = useRef(0);
  
  const phase = useGameStore(s => s.phase);
  const world = useGameStore(s => s.world);
  const previousWorld = useGameStore(s => s.previousWorld);
  const camera = useGameStore(s => s.camera);
  const zoom = useGameStore(s => s.camera.zoom ?? 1.0);
  
  const openIntervention = useGameStore(s => s.openIntervention);

  // Local UI state — mirrors GameCanvas exactly
  const [showHistory, setShowHistory] = useState(false);

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{
    label: string;
    detail: string;
    x: number;
    y: number;
  } | null>(null);

  // ─── Animation state (Ref based for 60FPS performance) ──────────────────
  const animStateRef = useRef({
    time: 0,
    frameIndex: 0,
    lastFrameToggle: 0
  });

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
      const books = await load('books', SHEET_BOOKS);
      const icons = await load('icons', SHEET_ICONS);
      
      // Load individual DCSS altar textures
      const altars: Record<string, Texture> = {};
      for (const [tenet, path] of Object.entries(ALTAR_PATHS)) {
        altars[tenet] = await load(`altar_${tenet}`, path);
      }

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
      const innovationLayer = new Container();
      const tradeLayer     = new Graphics();
      const modifiersLayer = new Graphics();
      const visualsLayer   = new Graphics();
      const topLayer       = new Container();
      const ghostLayer     = new Container();
      app.stage.addChild(terrainLayer, midLayer, resourcesLayer, itemsLayer, religionLayer, innovationLayer, tradeLayer, modifiersLayer, visualsLayer, topLayer, ghostLayer);

      appRef.current    = app;
      sheetsRef.current = { terrain, settlement, character, player, tree, ore, itemAmulet, itemScroll, itemKey, religion, books, icons, altars } as any;
      layersRef.current = {
        terrain:   terrainLayer,
        mid:       midLayer,
        resources: resourcesLayer,
        items:     itemsLayer,
        religion:  religionLayer,
        innovations: innovationLayer,
        trade:     tradeLayer,
        modifiers: modifiersLayer,
        visuals:   visualsLayer,
        top:       topLayer,
        ghost:     ghostLayer,
      };

      const tickerCallback = () => {
        if (!mounted || !layersRef.current) return;
        const now = performance.now();
        const delta = app.ticker.elapsedMS;
        animStateRef.current.time += delta;

        const { world, camera, showReligionOverlay } = useGameStore.getState();
        if (!world) return;
        const zoom = camera.zoom ?? 1.0;
        const tileDisplay = TILE_SIZE * zoom;
        const animTime = animStateRef.current.time;

        // 1. Redraw Trade Routes — use live renderer dimensions, not captured mount-time values
        if (layersRef.current.trade) {
          const rendererW = app.renderer.width;
          const rendererH = app.renderer.height;
          updateTradeLayer(layersRef.current.trade, world, camera, tileDisplay, rendererW, rendererH, animTime);
        }

        // 2. Redraw Visual Effects (ripples, sparkles, auras)
        if (layersRef.current.visuals) {
          updateVisualEffectsLayer(layersRef.current.visuals, world, camera, tileDisplay, animTime);
        }

        // 3. Redraw Modifiers & Religion Overlay
        if (layersRef.current.modifiers) {
          updateModifierLayer(layersRef.current.modifiers, world, camera, tileDisplay, animTime, showReligionOverlay);
        }

        // 4. Character 2-frame animation
        if (now - animStateRef.current.lastFrameToggle > 500) {
          animStateRef.current.frameIndex = (animStateRef.current.frameIndex + 1) % 2;
          animStateRef.current.lastFrameToggle = now;
          layersRef.current.top.children.forEach(child => {
            const sprite = child as Sprite;
            const meta = (sprite as any)._cascadeMeta;
            if (meta && (meta.sheetKey === 'character' || meta.sheetKey === 'player')) {
              const baseRegion = meta.baseRegion;
              const frameOffset = animStateRef.current.frameIndex * 16;
              const poolKey = `${meta.sheetKey}:${baseRegion.x + frameOffset}:${baseRegion.y}`;
              const tex = texPoolRef.current.get(poolKey);
              if (tex) {
                sprite.texture = tex;
              }
            }
          });
        }

        // 5. Dev performance overlay (updated once per second)
        if (import.meta.env.DEV && now - lastPerfUpdateRef.current > 1000) {
          lastPerfUpdateRef.current = now;
          setDevPerf({
            fps: Math.round(app.ticker.FPS),
            poolSize: texPoolRef.current.size,
          });
        }
      };
      app.ticker.add(tickerCallback);

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
    if (appRef.current) {
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight]);

  // ── Rebuild sprites on world / camera / history change ───────────────
  useEffect(() => {
    if (!ready || !world || !appRef.current || !sheetsRef.current || !layersRef.current) return;
    rebuildWorldSprites(
      world, camera, previousWorld, showHistory, TILE_SIZE * zoom,
      layersRef.current, sheetsRef.current, texPoolRef.current,
      animStateRef.current.frameIndex,
    );
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
    const { world, camera, phase, showLedger } = state;
    if (!world) return;

    // Block game actions if a modal is open, EXCEPT for Escape (to close)
    const isModalOpen = phase === 'dialogue' || phase === 'action' || phase === 'intervention' || phase === 'jumping' || phase === 'worldgen' || showLedger;
    
    if (isModalOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showLedger) state.toggleLedger();
        else if (phase === 'dialogue') state.closeDialogue();
        else if (phase === 'action') state.closeAction();
        else if (phase === 'intervention') state.closeIntervention();
        return;
      }
      
      // Strict isolation: block all keys when modal is open to prevent 
      // movement or unintended actions in the background.
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key.toLowerCase() === 'h') return; // handled by history toggle above

    // Zoom in / out (Allowed even if ledger is open? No, let's block to be safe)
    if (!isModalOpen) {
      if (e.key === '=' || e.key === '+') {
        state.updateCamera((c) => ({ ...c, zoom: Math.min(2.0, (c.zoom ?? 1.0) + 0.1) }));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        state.updateCamera((c) => ({ ...c, zoom: Math.max(0.2, (c.zoom ?? 1.0) - 0.1) }));
        return;
      }
    }

    const action = mapKeyToAction(e.key, phase);

    // Religion Overlay Toggle (R key)
    if (!isModalOpen && e.key.toLowerCase() === 'r') {
      state.toggleReligionOverlay();
      return;
    }

    // Ledger Toggle (L key)
    if (e.key.toLowerCase() === 'l') {
      state.toggleLedger();
      return;
    }

    switch (action.type) {
      case 'MOVE': {
        if (isModalOpen) break;
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
        if (isModalOpen) break;
        const playerPos = world.player.position;
        const itemAtPlayer = world.items.find(
          item => item.position.x === playerPos.x && item.position.y === playerPos.y,
        );
        if (itemAtPlayer) state.openAction(itemAtPlayer);
        break;
      }

      case 'JUMP':
        if (isModalOpen) break;
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
      {import.meta.env.DEV && devPerf && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: 'rgba(0,0,0,0.6)',
          color: '#00ff88',
          fontSize: '10px',
          fontFamily: 'monospace',
          padding: '3px 6px',
          borderRadius: '3px',
          pointerEvents: 'none',
          lineHeight: '1.5',
        }}>
          {devPerf.fps} FPS | pool: {devPerf.poolSize} tex
        </div>
      )}
    </div>
  );
}

/** Memoized wrapper — prevents re-renders caused by unrelated store changes (e.g. notifications). */
export const PixiViewport = memo(PixiViewportInner);
