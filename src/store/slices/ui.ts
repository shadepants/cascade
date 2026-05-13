import type { StateCreator } from 'zustand';
import type { GameStore, UISlice } from '../types';

export const createUISlice: StateCreator<GameStore, [], [], UISlice> = (set) => ({
  phase: 'title',
  activeNpc: null,
  activeItem: null,
  activeTile: null,
  notification: null,
  showReligionOverlay: false,
  showLedger: false,
  showOraclesEye: false,

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

  openIntervention: (pos) => set({
    activeTile: pos,
    phase: 'intervention'
  }),

  closeIntervention: () => set({
    activeTile: null,
    phase: 'exploring'
  }),

  showNotification: (text) => set({ notification: text }),

  clearNotification: () => set({ notification: null }),

  toggleReligionOverlay: () => set((state) => ({ 
    showReligionOverlay: !state.showReligionOverlay 
  })),

  toggleLedger: () => set((state) => ({
    showLedger: !state.showLedger
  })),
  
  toggleOraclesEye: () => set((state) => ({
    showOraclesEye: !state.showOraclesEye
  })),
});
