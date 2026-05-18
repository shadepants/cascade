import { describe, expect, it } from 'vitest';
import {
  computeTension,
  accumulateDebt,
  applyIntervention,
} from './storyteller.ts';
import { defaultStorytellerState, type WorldState, type GameEvent, type StorytellerState } from '../types';
import { SeededRNG } from '../utils/rng.ts';

function makeState(overrides: Partial<StorytellerState> = {}): StorytellerState {
  return { ...defaultStorytellerState('clio'), ...overrides };
}

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    seed: 1,
    currentYear: 100,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions: [],
    relationships: [],
    historicalFigures: [],
    settlements: [],
    ruins: [],
    resourceNodes: [],
    npcs: [],
    items: [],
    tradeRoutes: [],
    religions: [],
    holySites: [],
    events: [],
    innovations: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: makeState(),
    visuals: [],
    ...overrides,
  };
}

function createEvent(id: string, significance: number, playerCaused = true, causedBy: string | null = null, year = 100): GameEvent {
  return {
    id, tick: 0, year, secondsOffset: 0,
    subject: 'A', action: 'test', object: 'B',
    causedBy, significance, playerCaused,
    description: 'test', motivation: '',
    statDeltas: [],
  };
}

describe('Storyteller Performance', () => {
  it('benchmarks storyteller functions with large event logs', () => {
    const eventCount = 20000;
    const events: GameEvent[] = [];
    for (let i = 0; i < eventCount; i++) {
      // Create chains of events
      const causedBy = i > 0 && i % 5 !== 0 ? `e${i - 1}` : null;
      events.push(createEvent(`e${i}`, 1, true, causedBy, 100));
    }

    const world = makeWorld({
      events,
      currentYear: 100,
      player: {
        id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [],
        knowledgeLog: events.slice(-100).map(e => ({
          eventId: e.id, discoveredYear: 99, source: 'direct', factionPerspective: '', text: ''
        })),
        actionsThisEra: [], insight: 0,
      },
      settlements: [{
        id: 's1', name: 'Town', position: { x: 0, y: 0 },
        factionId: 'f1', npcs: [], items: [], faith: [], dominantReligionId: null,
        innovations: [],
      }],
    });
    const state = world.storyteller;
    state.playerActionCount = 1;

    // 1. Benchmark computeTension
    const startTension = performance.now();
    computeTension(state, world);
    const endTension = performance.now();
    console.log(`computeTension (1 iteration, ${eventCount} events): ${(endTension - startTension).toFixed(2)}ms`);
    // O(N²) regression guard: must complete well under 2s for 20k events
    expect(endTension - startTension).toBeLessThan(2000);

    // 2. Benchmark accumulateDebt
    const startDebt = performance.now();
    accumulateDebt(state, world, 100);
    const endDebt = performance.now();
    console.log(`accumulateDebt (1 iteration, ${eventCount} events): ${(endDebt - startDebt).toFixed(2)}ms`);
    // O(N²) regression guard: must complete well under 2s for 20k events
    expect(endDebt - startDebt).toBeLessThan(2000);

    // 3. Benchmark applyIntervention (PLACE_WITNESS)
    const intervention = {
        type: 'PLACE_WITNESS' as const,
        eventId: events[eventCount - 1].id,
        secondaryEventIds: [events[eventCount - 2].id, events[eventCount - 3].id],
    };
    const rng = new SeededRNG(1);
    const startIntervention = performance.now();
    applyIntervention(intervention, world, rng, 100);
    const endIntervention = performance.now();
    console.log(`applyIntervention (1 iteration, ${eventCount} events): ${(endIntervention - startIntervention).toFixed(2)}ms`);
    // O(N²) regression guard: must complete well under 2s for 20k events
    expect(endIntervention - startIntervention).toBeLessThan(2000);
  });
});
