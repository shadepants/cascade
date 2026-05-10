import { describe, it, expect } from 'vitest';
import { getFactionStat, applyStatDeltas } from './stats.ts';
import type { Faction, WorldState } from '../../types';
import { defaultStorytellerState } from '../../types';

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 'f1',
    name: 'Test',
    color: '#fff',
    aggression: 50,
    settlements: [],
    population: 500,
    stability: 80,
    wealth: 60,
    military: 40,
    culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null,
    interestGroups: [],
    ...overrides,
  };
}

function makeWorld(factions: Faction[]): WorldState {
  return {
    seed: 1,
    currentYear: 1,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0.5, rainfall: 0.5, factionId: null, settlementId: null, walkable: true }]] },
    factions,
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
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

describe('getFactionStat', () => {
  const faction = makeFaction();

  it.each([
    ['population', 500],
    ['stability', 80],
    ['wealth', 60],
    ['military', 40],
    ['culture', 30],
  ] as const)('reads %s correctly', (stat, expected) => {
    expect(getFactionStat(faction, stat)).toBe(expected);
  });
});

describe('applyStatDeltas', () => {
  it('applies a positive delta to the correct faction stat', () => {
    const faction = makeFaction({ wealth: 50 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'wealth', delta: 10 }]);
    expect(faction.wealth).toBe(60);
  });

  it('applies a negative delta', () => {
    const faction = makeFaction({ stability: 80 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'stability', delta: -20 }]);
    expect(faction.stability).toBe(60);
  });

  it('clamps non-population stats at 0', () => {
    const faction = makeFaction({ military: 5 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'military', delta: -100 }]);
    expect(faction.military).toBe(0);
  });

  it('clamps non-population stats at 100', () => {
    const faction = makeFaction({ culture: 95 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'culture', delta: 20 }]);
    expect(faction.culture).toBe(100);
  });

  it('clamps population at 0 and 2000', () => {
    const faction = makeFaction({ population: 10 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'population', delta: -100 }]);
    expect(faction.population).toBe(0);

    faction.population = 1990;
    applyStatDeltas(world, [{ factionId: 'f1', stat: 'population', delta: 100 }]);
    expect(faction.population).toBe(2000);
  });

  it('silently skips unknown faction ids', () => {
    const faction = makeFaction({ wealth: 50 });
    const world = makeWorld([faction]);
    applyStatDeltas(world, [{ factionId: 'unknown', stat: 'wealth', delta: 99 }]);
    expect(faction.wealth).toBe(50); // unchanged
  });

  it('applies multiple deltas across multiple factions', () => {
    const fA = makeFaction({ id: 'A', stability: 60 });
    const fB = makeFaction({ id: 'B', military: 30 });
    const world = makeWorld([fA, fB]);
    applyStatDeltas(world, [
      { factionId: 'A', stat: 'stability', delta: 10 },
      { factionId: 'B', stat: 'military', delta: -5 },
    ]);
    expect(fA.stability).toBe(70);
    expect(fB.military).toBe(25);
  });
});
