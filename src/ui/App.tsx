// ─── Root App Component ─────────────────────────────────────────────────
// Routes between game phases and lays out the main UI panels.

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/index';
import { TitleScreen } from './TitleScreen.tsx';
import { PixiViewport } from './PixiViewport.tsx';
import { DialoguePanel } from './DialoguePanel.tsx';
import { KnowledgeLog } from './KnowledgeLog.tsx';
import { ActionMenu } from './ActionMenu.tsx';
import { CascadeScore } from './CascadeScore.tsx';
import { HUD } from './HUD.tsx';
import { InterventionMenu } from './InterventionMenu.tsx';
import { GlobalLedger } from './GlobalLedger.tsx';
import { OraclesEye } from './OraclesEye.tsx';
import { saveGame } from '../data/db.ts';
import { processSimulationResult } from './simulationResult.ts';
import type { SimulationResult } from '../simulation/worker.ts';



/** High-speed era year counter overlay for the 'jumping' phase. */
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
      <div className="year-counter">Era Year {displayYear}</div>
      <div className="jumping-label">Temporal Cascade in Progress</div>
    </div>
  );
}

export function App() {
  const phase = useGameStore(s => s.phase);
  const world = useGameStore(s => s.world);
  const config = useGameStore(s => s.config);
  const notification = useGameStore(s => s.notification);
  const showLedger = useGameStore(s => s.showLedger);
  const showOraclesEye = useGameStore(s => s.showOraclesEye);
  
  const clearNotification = useGameStore(s => s.clearNotification);
  const toggleOraclesEye = useGameStore(s => s.toggleOraclesEye);
  const toggleLedger = useGameStore(s => s.toggleLedger);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key.toLowerCase() === 'o') {
        toggleOraclesEye();
      }
      if (e.key.toLowerCase() === 'l') {
        toggleLedger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOraclesEye, toggleLedger]);

  // Dev-only test hook — exposes state for Playwright

  // Always-current world ref — avoids stale closure in WebWorker effect
  const worldRef = useRef(world);
  useEffect(() => { worldRef.current = world; }, [world]);

  // Auto-save every 5 minutes
  useEffect(() => {
    if (!world) return;
    const timer = setInterval(() => {
      saveGame('auto_save', world!);
    }, 1000 * 60 * 5);
    return () => clearInterval(timer);
  }, [world]);

  // Save immediately after world update (e.g., after jump)
  useEffect(() => {
    if (world && phase === 'exploring') {
      saveGame('auto_save', world);
    }
  }, [world, phase]);

  // Execute time jump when phase transitions to 'jumping'
  useEffect(() => {
    if (phase !== 'jumping') return;
    const currentWorld = worldRef.current;
    if (!currentWorld) return;

    // Initialize the WebWorker
    const worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), {
      type: 'module'
    });

    const JUMP_YEARS     = 10;
    const MAX_GAME_YEARS = 200;

    worker.onmessage = (event: MessageEvent<SimulationResult>) => {
      const result = event.data;

      if (result.type === 'SIMULATION_COMPLETE') {
        const { world: newWorld, events: newEvents } = result;
        const { config, setPhase, setWorld, showNotification } = useGameStore.getState();

        const pendingNotification = processSimulationResult(newWorld, newEvents, currentWorld).notification;

        // setWorld transitions phase → 'exploring'
        setWorld(newWorld);

        // Surface the storyteller notification (if any) after the jump lands
        if (pendingNotification) {
          showNotification(pendingNotification);
        }

        if (newWorld.currentYear >= config.pregenYears + MAX_GAME_YEARS) {
          setPhase('score');
        }
      } else if (result.type === 'SIMULATION_ERROR') {
        const { setPhase, showNotification } = useGameStore.getState();
        console.error('Simulation Worker Error:', result.error);
        setPhase('exploring');
        showNotification('Simulation error occurred.');
      }

      worker.terminate();
    };

    worker.postMessage({
      type: 'RUN_SIMULATION',
      world: worldRef.current,
      years: JUMP_YEARS
    });

    return () => worker.terminate();
  }, [phase]);

  // Auto-dismiss cascade notifications after 3 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => clearNotification(), 3000);
    return () => clearTimeout(timer);
  }, [notification, clearNotification]);

  return (
    <div className="app">
      {phase === 'title' && <TitleScreen />}

      {phase === 'worldgen' && (
        <div className="loading">Generating world...</div>
      )}

      {(phase === 'exploring' ||
        phase === 'dialogue' ||
        phase === 'action' ||
        phase === 'intervention' ||
        phase === 'jumping') && (
        <div className="game-layout">
          <HUD />
          <div className="game-main">
            <PixiViewport />
            <KnowledgeLog />
          </div>

          {/* Overlay panels */}
          {phase === 'jumping' && world && (
            <TemporalOverlay 
              startYear={world.currentYear - (config.pregenYears - 1)}
              endYear={world.currentYear - (config.pregenYears - 1) + 10}
            />
          )}
          {phase === 'dialogue' && <DialoguePanel />}
          {phase === 'action' && <ActionMenu />}
          {phase === 'intervention' && <InterventionMenu />}
          {showLedger && <GlobalLedger />}
          {showOraclesEye && <OraclesEye />}
        </div>
      )}

      {phase === 'score' && <CascadeScore />}
    </div>
  );
}
