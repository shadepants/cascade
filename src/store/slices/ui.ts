import type { StateCreator } from 'zustand';
import type { GameStore, UISlice } from '../types';

export const createUISlice: StateCreator<GameStore, [], [], UISlice> = (set) => ({
  phase: 'title',
  activeNpc: null,
  activeItem: null,
  notification: null,

  setPhase: (phase) => set({ phase }),

  openDialogue: (npc) => set({ 
    activeNpc: npc, 
    phase: 'dialogue' 
  }),

  closeDialogue: () => set({ 
    activeNpc: null, 
    phase: 'exploring' 
  }),

  openAction: (item) => set({ 
    activeItem: item, 
    phase: 'action' 
  }),

  closeAction: () => set({ 
    activeItem: null, 
    phase: 'exploring' 
  }),

  showNotification: (text) => set({ notification: text }),

  clearNotification: () => set({ notification: null }),
});
