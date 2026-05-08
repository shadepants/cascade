import type { StateCreator } from 'zustand';
import type { GameStore, WorldSlice } from '../types';

export const createWorldSlice: StateCreator<GameStore, [], [], WorldSlice> = (set) => ({
  world: null,
  previousWorld: null,

  setWorld: (world) => set((state) => ({ 
    ...state, 
    world, 
    phase: 'exploring' 
  })),

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
});
