// ─── Game Canvas Component ──────────────────────────────────────────────
// Wraps the HTML5 <canvas> element. Handles:
// - Canvas ref management
// - Calling the renderer on state changes
// - Keyboard event capture

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { useGame } from '../store.ts';
import { renderWorld } from '../engine/renderer.ts';
import { mapKeyToAction } from '../engine/input.ts';
import { centerOnPlayer } from '../engine/camera.ts';
import { TILE_SIZE } from '../types.ts';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, dispatch } = useGame();
  const [showHistory, setShowHistory] = useState(false);

  const canvasWidth = state.camera.viewportWidth * TILE_SIZE;
  const canvasHeight = state.camera.viewportHeight * TILE_SIZE;

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
    if (!ctx || !state.world) return;

    renderWorld({
      ctx,
      map: state.world.map,
      camera: state.camera,
      player: state.world.player,
      npcs: state.world.npcs,
      settlements: state.world.settlements,
      items: state.world.items,
      factions: state.world.factions,
      previousWorld: showHistory ? state.previousWorld : null,
    });
  }, [state.world, state.camera, showHistory, state.previousWorld]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.world) return;
    if (e.key.toLowerCase() === 'h') return; // Handled by history toggle

    const action = mapKeyToAction(e.key, state.phase);

    switch (action.type) {
      case 'MOVE': {
        const player = state.world.player;
        const newX = player.position.x + action.direction.x;
        const newY = player.position.y + action.direction.y;

        // Bounds check
        if (newX < 0 || newY < 0) return;
        if (newX >= state.world.map.width || newY >= state.world.map.height) return;

        // Walkability check
        if (!state.world.map.tiles[newY][newX].walkable) return;

        // Check for NPC at target position
        const npcAtTarget = state.world.npcs.find(
          n => n.alive && n.position.x === newX && n.position.y === newY,
        );
        if (npcAtTarget) {
          dispatch({ type: 'OPEN_DIALOGUE', npc: npcAtTarget });
          return;
        }

        // Move player
        dispatch({
          type: 'UPDATE_WORLD',
          updater: (world) => ({
            ...world,
            player: {
              ...world.player,
              position: { x: newX, y: newY },
            },
          }),
        });

        // Update camera
        const newCamera = centerOnPlayer(
          state.camera,
          { x: newX, y: newY },
          state.world.map,
        );
        dispatch({ type: 'SET_CAMERA', camera: newCamera });
        break;
      }

      case 'INTERACT': {
        const playerPos = state.world.player.position;
        const itemAtPlayer = state.world.items.find(
          item => item.position.x === playerPos.x && item.position.y === playerPos.y
        );

        if (itemAtPlayer) {
          dispatch({ type: 'OPEN_ACTION', item: itemAtPlayer });
        }
        break;
      }

      case 'CLOSE_PANEL':
        if (state.phase === 'dialogue') dispatch({ type: 'CLOSE_DIALOGUE' });
        if (state.phase === 'action') dispatch({ type: 'CLOSE_ACTION' });
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

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
