// ─── Title Screen ───────────────────────────────────────────────────────
// Simple start screen with game title and "New Game" button.

import { useState, useEffect } from 'react';
import { useGame } from '../store.ts';
import { generateWorld } from '../world/worldgen.ts';
import { createCamera } from '../engine/camera.ts';
import { loadMostRecentSave } from '../data/db.ts';
import { getLLMConfig, saveLLMConfig } from '../simulation/llm.ts';

export function TitleScreen() {
  const { state, dispatch } = useGame();
  const [hasSave, setHasSave] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadMostRecentSave().then(save => {
      if (save) setHasSave(true);
    });
    const config = getLLMConfig();
    if (config?.apiKey) {
      setApiKey(config.apiKey);
    }
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

  function handleSaveSettings() {
    if (apiKey.trim()) {
      saveLLMConfig({
        provider: 'anthropic',
        apiKey: apiKey.trim(),
        model: 'claude-3-5-sonnet-20241022'
      });
    } else {
      saveLLMConfig(null);
    }
    setShowSettings(false);
  }

  return (
    <div className="title-screen">
      <h1 className="title">CASCADE</h1>
      <p className="subtitle">
        Travel through time. Shape history. Discover what you caused.
      </p>
      
      {!showSettings ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="start-btn" onClick={handleNewGame}>
              New Game
            </button>
            {hasSave && (
              <button className="start-btn" onClick={handleResume} style={{ borderColor: '#adcbe3', color: '#adcbe3' }}>
                Resume
              </button>
            )}
          </div>
            <button className="start-btn" style={{ fontSize: '14px', padding: '8px 16px', marginTop: '2rem', borderStyle: 'dashed' }} onClick={() => setShowSettings(true)}>
              ⚙️ AI Settings
            </button>
        </div>
      ) : (
        <div className="panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
          <h3>AI Settings (Socratic Gate)</h3>
          <p style={{ margin: '1rem 0', color: '#aaa' }}>
            Enter an Anthropic API Key to enable dynamic, biased NPC dialogue based on the simulation's causal history.
          </p>
          <input 
            type="password" 
            placeholder="sk-ant-..." 
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '1rem', background: '#000', color: '#fff', border: '1px solid #333' }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="start-btn" style={{ flex: 1 }} onClick={handleSaveSettings}>Save</button>
            <button className="start-btn" style={{ flex: 1, borderColor: '#555', color: '#aaa' }} onClick={() => setShowSettings(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
