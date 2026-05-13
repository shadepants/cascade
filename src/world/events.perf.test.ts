import { describe, it, expect } from 'vitest';
import { buildCausalChains, createEvent } from './events';
import type { GameEvent } from '../types';

describe('Event Causal Chain Performance', () => {
  it('should build causal chains efficiently for large event logs', () => {
    const rootCount = 100;
    const chainDepth = 50;
    const events: GameEvent[] = [];

    for (let r = 0; r < rootCount; r++) {
      const root = createEvent({
        tick: r, year: 0, subject: 'Player', action: 'START', object: 'World',
        causedBy: null, significance: 10, playerCaused: true, description: `Root ${r}`
      });
      events.push(root);

      let lastId = root.id;
      for (let d = 1; d < chainDepth; d++) {
        const child = createEvent({
          tick: r * chainDepth + d, year: 0, subject: 'NPC', action: 'REACTION', object: 'Event',
          causedBy: lastId, significance: 1, playerCaused: false, description: `Reaction ${r}:${d}`
        });
        events.push(child);
        lastId = child.id;
      }
    }

    const start = performance.now();
    const chains = buildCausalChains(events);
    const end = performance.now();

    console.log(`Execution time for ${events.length} events: ${(end - start).toFixed(2)}ms`);
    
    expect(chains.length).toBe(rootCount);
    expect(chains[0].nodes.length).toBe(chainDepth);
    
    // Baseline check: even on a slow machine, this should be well under 100ms with optimization
    // Without optimization, O(N^2) would be several seconds for 5000 events
    expect(end - start).toBeLessThan(200); 
  });
});
