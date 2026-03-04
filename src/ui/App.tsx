// ─── Root App Component ─────────────────────────────────────────────────
// Routes between game phases and lays out the main UI panels.

import { useReducer, useEffect, useState } from 'react';
import { GameContext, gameReducer, initialState } from '../store.ts';
import { TitleScreen } from './TitleScreen.tsx';
import { GameCanvas } from './GameCanvas.tsx';
import { DialoguePanel } from './DialoguePanel.tsx';
import { KnowledgeLog } from './KnowledgeLog.tsx';
import { ActionMenu } from './ActionMenu.tsx';
import { CascadeScore } from './CascadeScore.tsx';
import { HUD } from './HUD.tsx';

/** High-speed year counter overlay for the 'jumping' phase. */
function TemporalOverlay({ startYear, endYear }: { startYear: number; endYear: number }) {
  const [displayYear, setDisplayYear] = useState(startYear);

  useEffect(() => {
    let current = startYear;
    const duration = 1500; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth acceleration/deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(startYear + (endYear - startYear) * ease);
      
      setDisplayYear(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [startYear, endYear]);

  return (
    <div className="jumping-overlay">
      <div className="year-counter">Year {displayYear}</div>
      <div className="jumping-label">Temporal Cascade in Progress</div>
    </div>
  );
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Execute time jump when phase transitions to 'jumping'
  useEffect(() => {
    if (state.phase !== 'jumping' || !state.world) return;

    // Initialize the WebWorker
    // Note: Vite uses ?worker to import worker files
    const worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), {
      type: 'module'
    });

    const JUMP_YEARS = 10;
    const MAX_YEARS = 150;

    worker.onmessage = (event) => {
      const result = event.data;

      if (result.type === 'SIMULATION_COMPLETE') {
        const { world: newWorld, events: newEvents } = result;

        // Distribute new player-caused cascade events to NPCs
        // so they can tell the player about consequences after the jump
        const cascadeEvents = newEvents.filter((e: { playerCaused: boolean }) => e.playerCaused);
        if (cascadeEvents.length > 0) {
          for (const npc of newWorld.npcs) {
            if (npc.alive) {
              const toLearn = cascadeEvents.filter(() => Math.random() < 0.5);
              for (const event of toLearn) {
                if (!npc.knowledge.some((k: { eventId: string }) => k.eventId === event.id)) {
                  npc.knowledge.push({
                    eventId: event.id,
                    discoveredYear: newWorld.currentYear,
                    accuracy: 0.8, // gossip is less accurate than direct witnessing
                    sourceId: 'history',
                  });
                }
              }
            }
          }
        }

        // Update history of all items in player inventory
        if (state.world) {
          for (const item of newWorld.player.inventory) {
            if (!item.history) item.history = [];
            item.history.push({ 
              year: state.world.currentYear, 
              ownerName: state.world.player.name 
            });
          }
        }

        // SET_WORLD transitions phase → 'exploring'
        dispatch({ type: 'SET_WORLD', world: newWorld });

        if (newWorld.currentYear >= MAX_YEARS) {
          dispatch({ type: 'SET_PHASE', phase: 'score' });
        }
      } else if (result.type === 'SIMULATION_ERROR') {
        console.error('Simulation Worker Error:', result.error);
        dispatch({ type: 'SET_PHASE', phase: 'exploring' });
        dispatch({ type: 'SHOW_NOTIFICATION', text: 'Simulation error occurred.' });
      }

      worker.terminate();
    };

    worker.postMessage({
      type: 'RUN_SIMULATION',
      world: state.world,
      years: JUMP_YEARS
    });

    return () => worker.terminate();
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss cascade notifications after 3 seconds
  useEffect(() => {
    if (!state.notification) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 3000);
    return () => clearTimeout(timer);
  }, [state.notification, dispatch]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <div className="app">
        {state.phase === 'title' && <TitleScreen />}

        {state.phase === 'worldgen' && (
          <div className="loading">Generating world...</div>
        )}

        {(state.phase === 'exploring' ||
          state.phase === 'dialogue' ||
          state.phase === 'action' ||
          state.phase === 'jumping') && (
          <div className="game-layout">
            <HUD />
            <div className="game-main">
              <GameCanvas />
              <KnowledgeLog />
            </div>

            {/* Overlay panels */}
            {state.phase === 'jumping' && state.world && (
              <TemporalOverlay 
                startYear={state.world.currentYear} 
                endYear={state.world.currentYear + 10} 
              />
            )}
            {state.phase === 'dialogue' && <DialoguePanel />}
            {state.phase === 'action' && <ActionMenu />}
          </div>
        )}

        {state.phase === 'score' && <CascadeScore />}
      </div>
    </GameContext.Provider>
  );
}
