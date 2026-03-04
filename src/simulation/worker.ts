// ─── Simulation WebWorker ───────────────────────────────────────────────
// Offloads heavy world-generation and time-jump computations from the main 
// thread to prevent UI freezing.

import { runSimulation } from './tick.ts';
import type { WorldState, GameEvent } from '../types.ts';

// ─── Worker Inbound Messages ───────────────────────────────────────────

export type SimulationMessage = 
  | { type: 'RUN_SIMULATION'; world: WorldState; years: number };

// ─── Worker Outbound Messages ──────────────────────────────────────────

export type SimulationResult = 
  | { type: 'SIMULATION_COMPLETE'; world: WorldState; events: GameEvent[] }
  | { type: 'SIMULATION_ERROR'; error: string };

// ─── Message Handling ───────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<SimulationMessage>) => {
  const { type } = event.data;

  switch (type) {
    case 'RUN_SIMULATION': {
      const { world, years } = event.data;
      
      try {
        // Deep copy the world to ensure no thread-safety issues (though worker 
        // receives a cloned object via structuredClone already).
        const newEvents = runSimulation(world, years);
        
        self.postMessage({ 
          type: 'SIMULATION_COMPLETE', 
          world, 
          events: newEvents 
        });
      } catch (err) {
        self.postMessage({ 
          type: 'SIMULATION_ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error during simulation'
        });
      }
      break;
    }
  }
};
