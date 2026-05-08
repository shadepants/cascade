import type { StateCreator } from 'zustand';
import type { GameStore, CameraSlice } from '../types';
import { VIEWPORT_TILES } from '../../types';

export const createCameraSlice: StateCreator<GameStore, [], [], CameraSlice> = (set) => ({
  camera: {
    x: 0,
    y: 0,
    viewportWidth: VIEWPORT_TILES,
    viewportHeight: VIEWPORT_TILES,
    zoom: 1.0,
  },

  setCamera: (camera) => set({ camera }),

  updateCamera: (updater) => set((state) => ({ 
    camera: updater(state.camera) 
  })),
});
