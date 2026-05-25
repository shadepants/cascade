import { describe, it, expect } from 'vitest';
import { phaseColonization } from './colonization.ts';
import type { Faction, WorldState, Tile } from '../../types';
import { defaultStorytellerState } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id,
    name: id,
    color: '#fff',
    aggression: 50,
    settlements: [],
    population: 700,
    stability: 70,
    wealth: 80,
    military: 40,
    culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null,
    interestGroups: [],
    techLevel: 1,
    innovations: [],
    ...overrides,
  };
}

function makeTile(factionId: string | null = null, biome: Tile['biome'] = 'grassland'): Tile {
  return { biome, elevation: 0, rainfall: 0, factionId, settlementId: null, walkable: true };
}

function makeWorld(width = 10, height = 10): WorldState {
  return {
    seed: 1,
    currentYear: 1,
    map: {
      width,
      height,
      tiles: Array.from({ length: height }, () => Array.from({ length: width }, () => makeTile())),
    },
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
    innovations: [],
    events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

function stubRng(nextFloatValue = 0, nextIntValue = 0): GameRNG {
  return {
    nextFloat: () => nextFloatValue,
    nextInt: () => nextIntValue,
    next: () => 0,
    shuffle: <T>(arr: T[]) => arr,
    reseed: () => {},
  };
}

describe('phaseColonization', () => {
  it('creates settlement, pioneer NPC, and colonization event when requirements are met', () => {
    const world = makeWorld();
    const faction = makeFaction('A');
    world.factions = [faction];
    world.map.tiles[2][2] = makeTile('A', 'grassland');

    const events = phaseColonization(world, 10, stubRng(0, 0));

    expect(events).toHaveLength(1);
    expect(events[0].action).toBe('colonization');
    expect(events[0].subject).toBe('A');
    expect(events[0].statDeltas).toEqual([
      { factionId: 'A', stat: 'population', delta: -100 },
      { factionId: 'A', stat: 'wealth', delta: -20 },
    ]);

    const newSettlementId = events[0].object;
    const settlement = world.settlements.find(s => s.id === newSettlementId);
    expect(settlement).toBeDefined();
    expect(settlement?.factionId).toBe('A');
    expect(faction.settlements).toContain(newSettlementId);
    expect(world.map.tiles[2][2].settlementId).toBe(newSettlementId);

    expect(world.npcs).toHaveLength(1);
    expect(world.npcs[0].factionId).toBe('A');
    expect(world.npcs[0].alive).toBe(true);
    expect(world.npcs[0].id).toBe(`npc_pioneer_${newSettlementId}`);
  });

  it('returns no events when all candidate spots are too close to existing settlements', () => {
    const world = makeWorld();
    const faction = makeFaction('A');
    world.factions = [faction];
    world.map.tiles[2][2] = makeTile('A', 'grassland');
    world.settlements.push({
      id: 's_existing',
      name: 'Existing',
      position: { x: 2, y: 3 },
      factionId: 'A',
      npcs: [],
      items: [],
      faith: [],
      dominantReligionId: null,
      innovations: [],
    });

    const events = phaseColonization(world, 10, stubRng(0, 0));

    expect(events).toHaveLength(0);
    expect(world.settlements).toHaveLength(1);
    expect(world.npcs).toHaveLength(0);
  });

  it('prefers valid tiles adjacent to unclaimed resource nodes for trade-embraced factions', () => {
    const world = makeWorld();
    const faction = makeFaction('A', {
      ethics: { violence: 'neutral', expansion: 'neutral', trade: 'embraced', tradition: 'neutral', mercy: 'neutral' },
    });
    world.factions = [faction];

    world.map.tiles[2][2] = makeTile('A', 'grassland');
    world.map.tiles[8][8] = makeTile('A', 'grassland');
    world.resourceNodes.push({
      id: 'r1',
      type: 'gold',
      position: { x: 3, y: 2 },
      value: 10,
    });

    const events = phaseColonization(world, 10, stubRng(0, 0));

    expect(events).toHaveLength(1);
    const settlement = world.settlements.find(s => s.id === events[0].object);
    expect(settlement?.position).toMatchObject({ x: 2, y: 2 });
  });

  it('skips colonization when annual colonization roll fails', () => {
    const world = makeWorld();
    const faction = makeFaction('A');
    world.factions = [faction];
    world.map.tiles[2][2] = makeTile('A', 'grassland');

    const events = phaseColonization(world, 10, stubRng(0.99, 0));

    expect(events).toHaveLength(0);
    expect(world.settlements).toHaveLength(0);
    expect(world.npcs).toHaveLength(0);
  });
});
