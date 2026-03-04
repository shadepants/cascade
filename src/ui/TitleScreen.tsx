// ─── Title Screen ───────────────────────────────────────────────────────
// Simple start screen with game title and "New Game" button.

import { useState, useEffect } from 'react';
import { useGame } from '../store.ts';
import { generateWorld } from '../world/worldgen.ts';
import { createCamera } from '../engine/camera.ts';
import { loadMostRecentSave } from '../data/db.ts';

export function TitleScreen() {
  const { state, dispatch } = useGame();
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    loadMostRecentSave().then(save => {
      if (save) setHasSave(true);
    });
  }, []);

  async function handleResume() {
    const world = await loadMostRecentSave();
    if (world) {
      const camera = createCamera(world.player.position, world.map);
      dispatch({ type: 'SET_CAMERA', camera });
      dispatch({ type: 'SET_WORLD', world });
    }
  }

  function handleNewGame() {
    dispatch({ type: 'SET_PHASE', phase: 'worldgen' });

    // Generate world (synchronous for POC — no WebWorker)
    const config = { ...state.config, seed: Date.now() };
    const world = generateWorld(config);

    // Set camera centered on player
    const camera = createCamera(world.player.position, world.map);
    dispatch({ type: 'SET_CAMERA', camera });
    dispatch({ type: 'SET_WORLD', world });
  }

  return (
    <div className="title-screen">
      <h1 className="title">CASCADE</h1>
      <p className="subtitle">
        Travel through time. Shape history. Discover what you caused.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="start-btn" onClick={handleNewGame}>
          New Game
        </button>
        {hasSave && (
          <button className="start-btn" onClick={handleResume} style={{ borderColor: '#adcbe3', color: '#adcbe3' }}>
            Resume
          </button>
        )}
      </div>
    </div>
  );
}
