// ─── Root App Component ─────────────────────────────────────────────────
// Routes between game phases and lays out the main UI panels.

import { useReducer, useEffect } from 'react';
import { GameContext, gameReducer, initialState } from '../store.ts';
import { runSimulation } from '../simulation';
import { TitleScreen } from './TitleScreen.tsx';
import { GameCanvas } from './GameCanvas.tsx';
import { DialoguePanel } from './DialoguePanel.tsx';
import { KnowledgeLog } from './KnowledgeLog.tsx';
import { ActionMenu } from './ActionMenu.tsx';
import { CascadeScore } from './CascadeScore.tsx';
import { HUD } from './HUD.tsx';

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Execute time jump when phase transitions to 'jumping'
  useEffect(() => {
    if (state.phase !== 'jumping' || !state.world) return;

    const timer = setTimeout(() => {
      const JUMP_YEARS = 10;
      const MAX_YEARS = 150;

      // Deep copy so runSimulation can mutate safely
      const newWorld = JSON.parse(JSON.stringify(state.world));
      const newEvents = runSimulation(newWorld, JUMP_YEARS);

      // Distribute new player-caused cascade events to NPCs
      // so they can tell the player about consequences after the jump
      const cascadeEvents = newEvents.filter((e: { playerCaused: boolean }) => e.playerCaused);
      if (cascadeEvents.length > 0) {
        for (const npc of newWorld.npcs) {
          if (npc.alive) {
            const toLearn = cascadeEvents.filter(() => Math.random() < 0.5);
            npc.knownEvents.push(...toLearn.map((e: { id: string }) => e.id));
          }
        }
      }

      // SET_WORLD transitions phase → 'exploring'
      dispatch({ type: 'SET_WORLD', world: newWorld });

      if (newWorld.currentYear >= MAX_YEARS) {
        dispatch({ type: 'SET_PHASE', phase: 'score' });
      }
    }, 50);

    return () => clearTimeout(timer);
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
            {state.phase === 'dialogue' && <DialoguePanel />}
            {state.phase === 'action' && <ActionMenu />}
          </div>
        )}

        {state.phase === 'score' && <CascadeScore />}
      </div>
    </GameContext.Provider>
  );
}
