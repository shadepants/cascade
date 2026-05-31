import type { StateCreator } from 'zustand';
import type { GameStore, WorldSlice } from '../types';
import { initEventIds } from '../../world/events.ts';

export const createWorldSlice: StateCreator<GameStore, [], [], WorldSlice> = (set) => ({
  world: null,
  previousWorld: null,

  setWorld: (world) => {
    if (world) {
      initEventIds(world.events.length);
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
