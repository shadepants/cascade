import type { StateCreator } from 'zustand';
import type { GameStore, ConfigSlice } from '../types';
import { DEFAULT_CONFIG } from '../../types';

export const createConfigSlice: StateCreator<GameStore, [], [], ConfigSlice> = (set) => ({
  config: DEFAULT_CONFIG,

  setConfig: (config) => set({ config }),
});
