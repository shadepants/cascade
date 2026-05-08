// ─── Game Canvas Component ──────────────────────────────────────────────
// Wraps the HTML5 <canvas> element. Handles:
// - Canvas ref management
// - Calling the renderer on state changes
// - Keyboard event capture

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { useGameStore } from '../store/index';
import { renderWorld } from '../engine/renderer.ts';
import { mapKeyToAction } from '../engine/input.ts';
import { centerOnPlayer } from '../engine/camera.ts';
import { TILE_SIZE } from '../types';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const world = useGameStore(s => s.world);
  const camera = useGameStore(s => s.camera);
  const previousWorld = useGameStore(s => s.previousWorld);
  const phase = useGameStore(s => s.phase);
  
  const updateCamera = useGameStore(s => s.updateCamera);
  const setCamera = useGameStore(s => s.setCamera);
  const updateWorld = useGameStore(s => s.updateWorld);
  const setPreviousWorld = useGameStore(s => s.setPreviousWorld);
  const setPhase = useGameStore(s => s.setPhase);
  const openDialogue = useGameStore(s => s.openDialogue);
  const closeDialogue = useGameStore(s => s.closeDialogue);
  const openAction = useGameStore(s => s.openAction);
  const closeAction = useGameStore(s => s.closeAction);

  const [showHistory, setShowHistory] = useState(false);
  const [debugMode, setDebugMode] = useState<'none' | 'elevation' | 'rainfall'>('none');

  const zoom = camera.zoom || 1.0;
  const canvasWidth = camera.viewportWidth * TILE_SIZE * zoom;
  const canvasHeight = camera.viewportHeight * TILE_SIZE * zoom;

  // Track 'H' key for Ghost of History layer
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

  // Render whenever world or camera changes (useLayoutEffect avoids flash before paint)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !world) return;

    renderWorld({
      ctx,
      map: world.map,
      camera: camera,
      player: world.player,
      npcs: world.npcs,
      settlements: world.settlements,
      ruins: world.ruins,
      resourceNodes: world.resourceNodes,
      items: world.items,
      factions: world.factions,
      previousWorld: showHistory ? previousWorld : null,
      debugMode,
    });
  }, [world, camera, showHistory, previousWorld, debugMode]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!world) return;
    if (e.key.toLowerCase() === 'h') return; // Handled by history toggle

    // Debug View Toggle
    if (e.key.toLowerCase() === 'm') {
      setDebugMode(prev => {
        if (prev === 'none') return 'elevation';
        if (prev === 'elevation') return 'rainfall';
        return 'none';
      });
      return;
    }

    // Zoom Controls
    if (e.key === '=' || e.key === '+') {
      updateCamera((c) => ({ ...c, zoom: Math.min(2.0, (c.zoom || 1.0) + 0.1) }));
      return;
    }
    if (e.key === '-' || e.key === '_') {
      updateCamera((c) => ({ ...c, zoom: Math.max(0.2, (c.zoom || 1.0) - 0.1) }));
      return;
    }

    const action = mapKeyToAction(e.key, phase);

    switch (action.type) {
      case 'MOVE': {
        const player = world.player;
        const newX = player.position.x + action.direction.x;
        const newY = player.position.y + action.direction.y;

        // Bounds check
        if (newX < 0 || newY < 0) return;
        if (newX >= world.map.width || newY >= world.map.height) return;

        // Walkability check
        if (!world.map.tiles[newY][newX].walkable) return;

        // Check for NPC at target position
        const npcAtTarget = world.npcs.find(
          n => n.alive && n.position.x === newX && n.position.y === newY,
        );
        if (npcAtTarget) {
          openDialogue(npcAtTarget);
          return;
        }

        // Move player
        updateWorld((w) => ({
          ...w,
          player: {
            ...w.player,
            position: { x: newX, y: newY },
          },
        }));

        // Update camera
        const newCamera = centerOnPlayer(
          camera,
          { x: newX, y: newY },
          world.map,
        );
        setCamera(newCamera);
        break;
      }

      case 'INTERACT': {
        const playerPos = world.player.position;
        const itemAtPlayer = world.items.find(
          item => item.position.x === playerPos.x && item.position.y === playerPos.y
        );

        if (itemAtPlayer) {
          openAction(itemAtPlayer);
        }
        break;
      }

      case 'CLOSE_PANEL':
        if (phase === 'dialogue') closeDialogue();
        if (phase === 'action')   closeAction();
        break;

      case 'JUMP':
        setPreviousWorld(world);
        setPhase('jumping');
        break;
    }
  }, [world, camera, phase, updateCamera, setCamera, updateWorld, setPreviousWorld, setPhase, openDialogue, closeDialogue, openAction, closeAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
