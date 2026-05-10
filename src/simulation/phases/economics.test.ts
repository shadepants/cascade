import { describe, it, expect } from 'vitest';
import { phaseEconomics } from './economics.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction } from '../../types';
import { getMapOwnershipSummary } from '../helpers/spatial.ts';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [],
    population: 200, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [], ...overrides,
  };
}

function makeWorld(
  factions: Faction[],
  mapRows: (string | null)[][] = [[null]],
  overrides: Partial<WorldState> = {},
): WorldState {
  const height = mapRows.length;
  const width = mapRows[0].length;
  const tiles = mapRows.map(row =>
    row.map(factionId => ({
      biome: 'grassland' as const,
      elevation: 0, rainfall: 0,
      factionId, settlementId: null, walkable: true,
    })),
  );
  return {
    seed: 1, currentYear: 1,
    map: { width, height, tiles },
    factions, relationships: [],
    historicalFigures: [], settlements: [],
    ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes: [], religions: [], holySites: [], events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
    ...overrides,
  };
}

describe('phaseEconomics', () => {
  it('returns no events for a faction with no territory', () => {
    const faction = makeFaction('A');
    const world = makeWorld([faction], [[null]]);
    const summary = getMapOwnershipSummary(world.map);
    const events = phaseEconomics(world, 2, new SeededRNG(1), [], summary);
    expect(events).toHaveLength(0);
  });

  it('emits trade_boom for wealthy fertile territory', () => {
    // BIOME_WEALTH_DELTA.grassland = 1; netWealth after upkeep must > 1.5
    // low military (20) → upkeep = 0.4; wealthDelta ~1 → net ~0.6 (not enough)
    // Use forest (delta=2) and low military
    const faction = makeFaction('A', { military: 10, wealth: 50 });
    const mapRows: (string | null)[][] = [
      ['A', 'A', 'A'],
    ];
    const world = makeWorld([faction], mapRows);
    // Override tile biomes to forest
    world.map.tiles[0] = world.map.tiles[0].map(t => ({ ...t, biome: 'forest' as const }));
    const summary = getMapOwnershipSummary(world.map);

    // Force RNG to fire (< 0.25)
    const rng: GameRNG = { nextFloat: () => 0.1, nextInt: () => 0, next: () => 0, shuffle: (a) => a };
    const events = phaseEconomics(world, 2, rng, [], summary);
    expect(events.some(e => e.action === 'trade_boom')).toBe(true);
  });

  it('emits economic_decline for poor territory with heavy military', () => {
    // high military (80) → upkeep = 1.6; desert biome = -1; net = -2.6 < -1
    const faction = makeFaction('A', { military: 80, wealth: 50 });
    const world = makeWorld([faction], [['A', 'A']]);
    world.map.tiles[0] = world.map.tiles[0].map(t => ({ ...t, biome: 'desert' as const }));
    const summary = getMapOwnershipSummary(world.map);

    const rng: GameRNG = { nextFloat: () => 0.1, nextInt: () => 0, next: () => 0, shuffle: (a) => a };
    const events = phaseEconomics(world, 2, rng, [], summary);
    expect(events.some(e => e.action === 'economic_decline')).toBe(true);
  });

  it('applies resource node bonuses to faction stats', () => {
    const faction = makeFaction('A', { military: 40 });
    const world = makeWorld([faction], [['A']]);
    world.resourceNodes = [{
      id: 'iron1', type: 'iron', position: { x: 0, y: 0 },
    }];
    // Mark the tile as faction-owned (it already is from mapRows)
    const summary = getMapOwnershipSummary(world.map);
    phaseEconomics(world, 2, new SeededRNG(1), [], summary);

    // resource_yield events are pushed directly to world.events
    expect(world.events.some(e => e.action === 'resource_yield')).toBe(true);
    const yieldEvent = world.events.find(e => e.action === 'resource_yield');
    expect(yieldEvent?.statDeltas.some(d => d.stat === 'military')).toBe(true);
  });
});
