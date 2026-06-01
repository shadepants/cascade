import type { StateCreator } from 'zustand';
import type { GameStore, WorldSlice } from '../types';
import { initEventIds } from '../../world/events.ts';

export const createWorldSlice: StateCreator<GameStore, [], [], WorldSlice> = (set) => ({
  world: null,
  previousWorld: null,

  setWorld: (world) => {
    if (world) {
      const nextId = world.events.reduce((max, e) => {
        if (e.id.startsWith('evt_')) {
          const n = Number.parseInt(e.id.slice(4), 10);
          return Number.isFinite(n) ? Math.max(max, n + 1) : max;
        }
        return max;
      }, 0);
      initEventIds(nextId);
    }
    return set((state) => ({ 
      ...state, 
      world, 
      phase: 'exploring' 
    }));
  },

  setPreviousWorld: (world) => set({ previousWorld: world }),

  updateWorld: (updater) => set((state) => {
    if (!state.world) return state;
    return { world: updater(state.world) };
  }),

  gainInsight: (amount) => set((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        player: {
          ...state.world.player,
          insight: state.world.player.insight + amount
        }
      }
    };
  }),

  spendInsight: (amount) => set((state) => {
    if (!state.world) return state;
    const newInsight = Math.max(0, state.world.player.insight - amount);
    return {
      world: {
        ...state.world,
        player: {
          ...state.world.player,
          insight: newInsight
        }
      }
    };
  }),
});
