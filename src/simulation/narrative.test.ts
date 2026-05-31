import { describe, it, expect } from 'vitest';
import { synthesizeFutureOutlook } from './narrative';
import type { WorldState, NPC } from '../types';

describe('narrative', () => {
  it('should synthesize a future outlook string based on faction stability and ethics', () => {
    const mockNpc: NPC = {
      id: 'N1',
      name: 'Test NPC',
      factionId: 'F1',
      personality: 'loyal',
      knowledge: [],
      alive: true,
    } as any;
    
    const mockWorld = {
      seed: 1234,
      currentYear: 10,
      factions: [{ id: 'F1', name: 'Test Faction', stability: 90, ethics: { 'trade:embraced': 1 } }],
      settlements: [],
      events: [],
      innovations: [],
    } as unknown as WorldState;

    const outlook = synthesizeFutureOutlook(mockNpc, mockWorld);
    expect(outlook).toContain('history we write today will echo forever');
    expect(outlook.length).toBeGreaterThan(10);
  });
});
