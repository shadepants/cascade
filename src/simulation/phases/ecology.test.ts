import { describe, it, expect } from 'vitest';
import { phaseEcology } from './ecology.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction, type Biome } from '../../types';
import { getMapOwnershipSummary } from '../helpers/spatial.ts';

function makeWorld(factions: Faction[], biomeMap: Biome[][]): WorldState {
  const height = biomeMap.length;
  const width = biomeMap[0].length;
  const tiles = biomeMap.map((row, y) =>
    row.map((biome, x) => ({
      biome,
      elevation: 0,
      rainfall: 0,
      factionId: `f${x + y * width}` in {} ? null : factions[0]?.id ?? null,
      settlementId: null,
      walkable: true,
    })),
  );
  // assign factionId from a parallel factionId map for clarity
  return {
    seed: 1,
    currentYear: 1,
    map: { width, height, tiles },
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

function makeWorldWithFactionTiles(factions: Faction[], factionIds: (string | null)[][], biomes: Biome[][]): WorldState {
  const height = factionIds.length;
  const width = factionIds[0].length;
  const tiles = factionIds.map((row, y) =>
    row.map((factionId, x) => ({
      biome: biomes[y]?.[x] ?? 'grassland',
      elevation: 0, rainfall: 0,
      factionId,
      settlementId: null, walkable: true,
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
  };
}

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [],
    population: 500, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [], ...overrides,
  };
}

describe('phaseEcology', () => {
  it('returns no events for faction with no territory', () => {
    const faction = makeFaction('A');
    const world = makeWorldWithFactionTiles(
      [faction],
      [[null]], // no tiles owned
      [['grassland']],
    );
    const summary = getMapOwnershipSummary(world.map);
    const events = phaseEcology(world, 2, new SeededRNG(1), summary);
    expect(events).toHaveLength(0);
  });

  it('emits a famine event when harsh terrain > threshold and population > min', () => {
    // FAMINE_DESERT_THRESHOLD = 0.55, FAMINE_POPULATION_MIN = 300
    // 3 desert tiles out of 4 = 75% harshness → famine eligible
    const faction = makeFaction('A', { population: 500 });
    const world = makeWorldWithFactionTiles(
      [faction],
      [['A', 'A', 'A', 'A']],
      [['desert', 'desert', 'desert', 'grassland']],
    );
    const summary = getMapOwnershipSummary(world.map);

    // Use RNG that always returns < 0.4 to guarantee famine fires
    const rng: GameRNG = { nextFloat: () => 0, nextInt: () => 0, next: () => 0, shuffle: (a) => a };
    const events = phaseEcology(world, 2, rng, summary);
    expect(events.some(e => e.action === 'famine')).toBe(true);
  });

  it('emits a population_boom event on fertile land', () => {
    const faction = makeFaction('A', { population: 500 });
    const world = makeWorldWithFactionTiles(
      [faction],
      [['A', 'A']],
      [['grassland', 'grassland']],
    );
    const summary = getMapOwnershipSummary(world.map);

    // RNG always returns 0 → popDelta > 0 branch and rng.nextFloat() < 0.3 satisfied
    const rng: GameRNG = { nextFloat: () => 0, nextInt: () => 0, next: () => 0, shuffle: (a) => a };
    const events = phaseEcology(world, 2, rng, summary);
    expect(events.some(e => e.action === 'population_boom')).toBe(true);
  });
});
