import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { GameStore } from './types';
import { createWorldSlice } from './slices/world';
import { createCameraSlice } from './slices/camera';
import { createUISlice } from './slices/ui';
import { createConfigSlice } from './slices/config';
import { resetEventIds } from '../world/events.ts';

export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector((...a) => ({
      ...createWorldSlice(...a),
      ...createCameraSlice(...a),
      ...createUISlice(...a),
      ...createConfigSlice(...a),
      
      reset: () => {
        const [set] = a;
        resetEventIds();
        // Manual reset to initial states of all slices
        set((state) => ({
          ...state,
          phase: 'title',
          world: null,
          previousWorld: null,
          activeNpc: null,
          activeItem: null,
          notification: null,
          camera: {
            ...state.camera,
            x: 0,
            y: 0,
            zoom: 1.0,
          },
        }));
      },
    })),
    { name: 'CascadeStore' }
  )
);

// Helper for non-hook access (e.g. in simulation engine or utility functions)
export const getGameState = () => useGameStore.getState();
export const dispatchGameAction = useGameStore.setState;
