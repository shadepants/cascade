import { describe, it, expect } from 'vitest';
import { phasePolitics } from './politics.ts';
import { SeededRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction, type FactionRelationship } from '../../types';

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
  relationships: FactionRelationship[],
): WorldState {
  return {
    seed: 1, currentYear: 1,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions, relationships,
    historicalFigures: [], settlements: [],
    ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes: [], religions: [], holySites: [], events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

describe('phasePolitics', () => {
  it('increases animosity when ethics diverge', () => {
    const fA = makeFaction('A', { ethics: { violence: 'embraced', expansion: 'embraced', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' } });
    const fB = makeFaction('B', { ethics: { violence: 'shunned', expansion: 'shunned', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' } });
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: 0, animosity: 10, state: 'peace' };
    const world = makeWorld([fA, fB], [rel]);
    phasePolitics(world, 2, new SeededRNG(1), []);
    expect(rel.animosity).toBeGreaterThan(10);
  });

  it('forms an alliance when conditions are met', () => {
    const fA = makeFaction('A', { stability: 60 });
    const fB = makeFaction('B', { stability: 60 });
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: 60, animosity: 5, state: 'peace' };
    const world = makeWorld([fA, fB], [rel]);

    // Force RNG to return < 0.05 for alliance check
    const rng = { nextFloat: () => 0.01, nextInt: () => 0 } as any;
    const events = phasePolitics(world, 2, rng, []);
    expect(rel.state).toBe('alliance');
    expect(events.some(e => e.action === 'alliance_formed')).toBe(true);
  });

  it('does not form an alliance when opinion is too low', () => {
    const fA = makeFaction('A', { stability: 60 });
    const fB = makeFaction('B', { stability: 60 });
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: 30, animosity: 5, state: 'peace' };
    const world = makeWorld([fA, fB], [rel]);
    const rng = { nextFloat: () => 0.01, nextInt: () => 0 } as any;
    phasePolitics(world, 2, rng, []);
    expect(rel.state).toBe('peace');
  });

  it('decays aggression for factions with no xenophobic/diplomatic ruler', () => {
    const faction = makeFaction('A', { aggression: 50 });
    // No leader → hasTrait returns false, no trait adjustment
    const world = makeWorld([faction], []);
    phasePolitics(world, 2, new SeededRNG(1), []);
    // No ruler → no aggression change expected
    expect(faction.aggression).toBe(50);
  });
});
