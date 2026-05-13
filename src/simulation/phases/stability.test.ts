import { describe, it, expect } from 'vitest';
import { phaseStability } from './stability.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction } from '../../types';
import { getMapOwnershipSummary } from '../helpers/spatial.ts';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [],
    population: 300, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [],
    techLevel: 1, innovations: [],
    ...overrides,
  };
}

function makeWorld(factions: Faction[], mapRows: (string | null)[][] = [[null]], overrides: Partial<WorldState> = {}): WorldState {
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
    innovations: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
    ...overrides,
  };
}

describe('phaseStability', () => {
  it('collapses a faction with no territory and converts settlements to ruins', () => {
    const faction = makeFaction('A');
    const world = makeWorld([faction], [[null]]); // faction has no tiles
    world.settlements = [{
      id: 's1', name: 'Old City', position: { x: 0, y: 0 },
      factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
      innovations: [],
    }];
    const summary = getMapOwnershipSummary(world.map);
    const events = phaseStability(world, 2, new SeededRNG(1), summary);

    expect(world.ruins).toHaveLength(1);
    expect(world.factions).toHaveLength(0);
    expect(world.settlements).toHaveLength(0);
    expect(events.some(e => e.action === 'collapse')).toBe(true);
  });

  it('kills NPCs in collapsed settlement', () => {
    const faction = makeFaction('A');
    const world = makeWorld([faction], [[null]]);
    world.npcs = [
      { id: 'n1', name: 'N1', position: { x: 0, y: 0 }, factionId: 'A', personality: 'loyal', knowledge: [], dialogueKey: 'k', alive: true },
    ];
    world.settlements = [{
      id: 's1', name: 'City', position: { x: 0, y: 0 },
      factionId: 'A', npcs: ['n1'], items: [], faith: [], dominantReligionId: null,
      innovations: [],
    }];
    const summary = getMapOwnershipSummary(world.map);
    phaseStability(world, 2, new SeededRNG(1), summary);
    expect(world.npcs[0].alive).toBe(false);
  });

  it('emits internal_rebellion when stability < 20 and pop > 100', () => {
    // REBELLION_STABILITY_MIN = 20
    const faction = makeFaction('A', { stability: 10, population: 200 });
    const world = makeWorld([faction], [['A']]);
    const summary = getMapOwnershipSummary(world.map);

    const rng: GameRNG = { nextFloat: () => 0.1, nextInt: () => 0, next: () => 0, shuffle: (a) => a, reseed: () => {} }; // < 0.25 threshold
    const events = phaseStability(world, 2, rng, summary);
    expect(events.some(e => e.action === 'internal_rebellion')).toBe(true);
  });

  it('does not emit rebellion when faction is stable', () => {
    const faction = makeFaction('A', { stability: 80, population: 300 });
    const world = makeWorld([faction], [['A']]);
    const summary = getMapOwnershipSummary(world.map);
    const events = phaseStability(world, 2, new SeededRNG(1), summary);
    expect(events.some(e => e.action === 'internal_rebellion')).toBe(false);
  });

  it('reduces aggression when faction is at peace', () => {
    const faction = makeFaction('A', { aggression: 50 });
    const world = makeWorld([faction], [['A']]);
    const summary = getMapOwnershipSummary(world.map);
    phaseStability(world, 2, new SeededRNG(1), summary);
    expect(faction.aggression).toBe(49);
  });

  it('increases aggression when faction is at war', () => {
    const faction = makeFaction('A', { aggression: 50 });
    const world = makeWorld([faction], [['A']], {
      relationships: [{ factionA: 'A', factionB: 'B', opinion: -80, animosity: 150, state: 'war' }],
    });
    const summary = getMapOwnershipSummary(world.map);
    phaseStability(world, 2, new SeededRNG(1), summary);
    expect(faction.aggression).toBe(51);
  });
});
