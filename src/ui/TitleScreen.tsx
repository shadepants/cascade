// ─── Title Screen ───────────────────────────────────────────────────────
// Start screen with storyteller mode selection and AI settings.

import { useState, useEffect } from 'react';
import { useGameStore } from '../store/index';
import { generateWorld } from '../world/worldgen.ts';
import { createCamera } from '../engine/camera.ts';
import { loadMostRecentSave } from '../data/db.ts';
import type { StorytellerMode } from '../types';

const MODE_INFO: Record<StorytellerMode, { label: string; description: string; color: string }> = {
  clio:  { label: 'Clio',  description: 'Historian. Slow burn — consequences unfold across decades.',    color: '#adcbe3' },
  ares:  { label: 'Ares',  description: 'War. Rapid escalation — your actions ignite conflict fast.',     color: '#f87171' },
  tyche: { label: 'Tyche', description: 'Chaos. Unpredictable — no cooldowns, anything can cascade.',     color: '#facc15' },
};

export function TitleScreen() {
  const configState = useGameStore(s => s.config);
  const setPhase = useGameStore(s => s.setPhase);
  const setConfig = useGameStore(s => s.setConfig);
  const setCamera = useGameStore(s => s.setCamera);
  const setWorld = useGameStore(s => s.setWorld);

  const [hasSave, setHasSave]         = useState(false);
  const [mode, setMode]               = useState<StorytellerMode>(configState.storytellerMode ?? 'clio');

  useEffect(() => {
    loadMostRecentSave().then(save => { if (save) setHasSave(true); });
  }, []);

  async function handleResume() {
    const world = await loadMostRecentSave();
    if (world) {
      const camera = createCamera(world.player.position, world.map);
      setCamera(camera);
      setWorld(world);
    }
  }

  function handleNewGame() {
    setPhase('worldgen');
    const newConfig = { ...configState, seed: Date.now(), storytellerMode: mode };
    const world  = generateWorld(newConfig);
    const camera = createCamera(world.player.position, world.map);
    setConfig(newConfig);
    setCamera(camera);
    setWorld(world);
  }

  return (
    <div className="title-screen">
      <h1 className="title">CASCADE</h1>
      <p className="subtitle">
        Travel through time. Shape history. Discover what you caused.
      </p>

      {/* Storyteller mode selector */}
      <div style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <p style={{ color: '#6b8fa3', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Storyteller</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(Object.keys(MODE_INFO) as StorytellerMode[]).map(m => {
            const info = MODE_INFO[m];
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '0.4rem 1rem',
                  border: `1px solid ${active ? info.color : '#333'}`,
                  background: active ? '#111' : 'transparent',
                  color: active ? info.color : '#555',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s',
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
        <p style={{ color: '#6b8fa3', fontSize: '0.8rem', maxWidth: '280px', textAlign: 'center' }}>
          {MODE_INFO[mode].description}
        </p>
      </div>

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
      </div>
    </div>
  );
}
