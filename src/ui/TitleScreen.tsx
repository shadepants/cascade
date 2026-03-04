// ─── Title Screen ───────────────────────────────────────────────────────
// Simple start screen with game title and "New Game" button.

import { useGame } from '../store.ts';
import { generateWorld } from '../world/worldgen.ts';
import { createCamera } from '../engine/camera.ts';

export function TitleScreen() {
  const { state, dispatch } = useGame();

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
      <button className="start-btn" onClick={handleNewGame}>
        New Game
      </button>
    </div>
  );
}
