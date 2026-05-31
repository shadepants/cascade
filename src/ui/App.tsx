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
import { saveGame, loadGame } from '../data/db.ts';
import { listen } from '@tauri-apps/api/event';
import { processSimulationResult } from './simulationResult.ts';
import type { SimulationResult } from '../simulation/worker.ts';
import type { WorldState, GameEvent } from '../types';



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
  
  const setWorld = useGameStore(s => s.setWorld);
  const setPhase = useGameStore(s => s.setPhase);
  const showNotification = useGameStore(s => s.showNotification);
  const clearNotification = useGameStore(s => s.clearNotification);
  const toggleOraclesEye = useGameStore(s => s.toggleOraclesEye);
  const toggleLedger = useGameStore(s => s.toggleLedger);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cascade_llm_config');
    }
  }, []);

  useEffect(() => {
    const setupMenuListener = async () => {
      const w = window as any;
      if (w.__TAURI_INTERNALS__ || w.__TAURI__) {
        try {
          const unlisten = await listen('menu-click', async (event: any) => {
            const id = event.payload;
            const store = useGameStore.getState();
            if (id === 'new_game') {
              store.setPhase('title');
            } else if (id === 'load_auto') {
              const save = await loadGame('auto_save');
              if (save) {
                store.setWorld(save);
              } else {
                store.showNotification("No auto-save found.");
              }
            } else if (id === 'toggle_ledger') {
              store.toggleLedger();
            } else if (id === 'toggle_oracle') {
              store.toggleOraclesEye();
            }
          });
          return unlisten;
        } catch (e) {
          console.error("Tauri menu listen failed:", e);
        }
      }
    };
    let cleanupFn: (() => void) | undefined;
    setupMenuListener().then(fn => {
      cleanupFn = fn as (() => void) | undefined;
    });
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

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
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__CASCADE_STATE = useGameStore.getState();
      
      const unsubscribe = useGameStore.subscribe((state) => {
        window.__CASCADE_STATE = state;
      });

      window.__CASCADE_DISPATCH = (action) => {
        const store = useGameStore.getState();
        switch (action.type) {
          case 'SET_PHASE':
            store.setPhase(action.phase);
            break;
          case 'OPEN_DIALOGUE':
            store.openDialogue(action.npc);
            break;
          case 'CLOSE_DIALOGUE':
            store.closeDialogue();
            break;
          case 'OPEN_ACTION':
            store.openAction(action.item);
            break;
          case 'CLOSE_ACTION':
            store.closeAction();
            break;
          case 'SET_WORLD':
            store.setWorld(action.world);
            break;
          case 'SET_CONFIG':
            store.setConfig(action.config);
            break;
          case 'GAIN_INSIGHT':
            store.gainInsight(action.amount);
            break;
        }
      };

      return () => {
        unsubscribe();
        delete window.__CASCADE_STATE;
        delete window.__CASCADE_DISPATCH;
      };
    }
  }, []);  // Always-current world ref — avoids stale closure in WebWorker effect
  const worldRef = useRef(world);
  useEffect(() => { worldRef.current = world; }, [world]);

  const cachedSeed = useRef<number | null>(null);

  // Cache static map fields in Rust when world seed changes
  useEffect(() => {
    const w = window as any;
    const isTauri = typeof window !== 'undefined' && (w.__TAURI_INTERNALS__ !== undefined || w.__TAURI__ !== undefined);
    const invokeFn = w.__TAURI_INTERNALS__?.invoke || w.__TAURI__?.invoke;

    if (isTauri && invokeFn && world && world.seed !== cachedSeed.current) {
      invokeFn('cache_static_map', { map: world.map })
        .then(() => {
          console.log('[TAURI] Static map cached successfully.');
          cachedSeed.current = world.seed;
        })
        .catch((err: any) => console.error('[TAURI] Failed to cache static map:', err));
    }
  }, [world]);

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
    if (phase !== 'jumping' || !world) return;

    const JUMP_YEARS     = 10;
    const MAX_GAME_YEARS = 200;

    const w = window as any;
    const isTauri = typeof window !== 'undefined' && (w.__TAURI_INTERNALS__ !== undefined || w.__TAURI__ !== undefined);

    if (isTauri) {
      const invokeFn = w.__TAURI_INTERNALS__?.invoke || w.__TAURI__?.invoke;
      if (invokeFn) {
        console.log('[TAURI] Invoking native simulation tick...');

        if (!worldRef.current) return;
        const worldDyn = { ...worldRef.current, events: [] } as any;
        worldDyn.map = {
          ...worldRef.current.map,
          tiles: worldRef.current.map.tiles.map(row => row.map(t => ({
            factionId: t.factionId,
            settlementId: t.settlementId,
            modifiers: t.modifiers
          } as any)))
        } as any;

        const nextEventId = worldRef.current.events.reduce((max, e) => {
          if (e.id.startsWith('evt_')) {
            const id = parseInt(e.id.slice(4), 10);
            return id >= max ? id + 1 : max;
          }
          return max;
        }, 0);

        invokeFn('run_simulation', {
          worldDynamic: worldDyn,
          years: JUMP_YEARS,
          nextEventId: nextEventId,
        })
          .then((result: any) => {
            const [dynamicWorld, newEvents] = result as [any, GameEvent[]];
            
            // Reconstruct full world state
            const fullMapTiles = worldRef.current!.map.tiles.map((row, y) => 
              row.map((t, x) => ({
                ...t,
                factionId: dynamicWorld.map.tiles[y][x].factionId,
                settlementId: dynamicWorld.map.tiles[y][x].settlementId,
                modifiers: dynamicWorld.map.tiles[y][x].modifiers,
              }))
            );
            
            const newWorld = { 
              ...dynamicWorld, 
              events: [...worldRef.current!.events, ...newEvents], 
              map: { 
                ...dynamicWorld.map, 
                tiles: fullMapTiles 
              } 
            } as WorldState;

            const pendingNotification = world
              ? processSimulationResult(newWorld, newEvents, world).notification
              : null;

            setWorld(newWorld);

            if (pendingNotification) {
              showNotification(pendingNotification);
            }

            if (newWorld.currentYear >= config.pregenYears + MAX_GAME_YEARS) {
              setPhase('score');
            }
          })
          .catch((err: any) => {
            console.error('[TAURI] Simulation Command Error:', err);
            setPhase('exploring');
            showNotification('Simulation error occurred.');
          });
        return;
      }
    }

    // Initialize the WebWorker (Browser Fallback)
    const worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event: MessageEvent<SimulationResult>) => {
      const result = event.data;

      if (result.type === 'SIMULATION_COMPLETE') {
        const { world: newWorld, events: newEvents } = result;

        const pendingNotification = world
          ? processSimulationResult(newWorld, newEvents, world).notification
          : null;

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
  }, [phase]); // worldRef.current used instead of state.world to avoid stale closure

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
