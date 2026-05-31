import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createWorldSlice } from './world';
import type { GameStore } from '../types';

describe('world slice', () => {
  it('should deduct insight correctly', () => {
    const useStore = create<GameStore>((set, get, api) => ({
      ...createWorldSlice(set, get, api),
    } as GameStore));
    
    useStore.getState().setWorld({ player: { insight: 50, position: {x:0, y:0} }, events: [] } as any);
    
    useStore.getState().spendInsight(10);
    expect(useStore.getState().world?.player.insight).toBe(40);
    
    useStore.getState().spendInsight(100);
    expect(useStore.getState().world?.player.insight).toBe(0);
  });
});
