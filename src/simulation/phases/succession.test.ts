import { describe, it, expect } from 'vitest';
import { phaseSuccession, getRulerForFaction, hasTrait } from './succession.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction, type HistoricalFigure } from '../../types';

function makeFaction(id: string, leaderId: string | null = null, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [],
    population: 200, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId, interestGroups: [],
    techLevel: 1, innovations: [],
    ...overrides,
  };
}

function makeRuler(id: string, factionId: string, bornYear: number, legitimacy = 80): HistoricalFigure {
  return {
    id, name: `Ruler ${id}`, factionId, role: 'ruler',
    values: { ambition: 10, loyalty: 10, compassion: 10, cunning: 10 },
    traits: ['industrious'],
    bornYear, diedYear: null, legitimacy,
  };
}

function makeWorld(factions: Faction[], figures: HistoricalFigure[] = []): WorldState {
  return {
    seed: 1, currentYear: 100,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions, relationships: [],
    historicalFigures: figures,
    settlements: [], ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes: [], religions: [], holySites: [], events: [],
    innovations: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

describe('getRulerForFaction', () => {
  it('returns the ruler when leaderId matches a historical figure', () => {
    const ruler = makeRuler('r1', 'A', 50);
    const world = makeWorld([makeFaction('A', 'r1')], [ruler]);
    expect(getRulerForFaction(world, 'A')).toBe(ruler);
  });

  it('returns null when faction has no leader', () => {
    const world = makeWorld([makeFaction('A', null)]);
    expect(getRulerForFaction(world, 'A')).toBeNull();
  });

  it('returns null for unknown faction id', () => {
    const world = makeWorld([]);
    expect(getRulerForFaction(world, 'unknown')).toBeNull();
  });
});

describe('hasTrait', () => {
  it('returns true when figure has the trait', () => {
    const ruler = makeRuler('r1', 'A', 50);
    ruler.traits = ['diplomatic', 'pious'];
    expect(hasTrait(ruler, 'diplomatic')).toBe(true);
  });

  it('returns false when figure lacks the trait', () => {
    const ruler = makeRuler('r1', 'A', 50);
    expect(hasTrait(ruler, 'corrupt')).toBe(false);
  });

  it('returns false for null figure', () => {
    expect(hasTrait(null, 'bloodthirsty')).toBe(false);
  });
});

describe('phaseSuccession', () => {
  it('emits death and ascension events when ruler dies from old age', () => {
    // bornYear 10, currentYear 100 → age 90 → high death chance
    const ruler = makeRuler('r1', 'A', 10);
    const faction = makeFaction('A', 'r1');
    const world = makeWorld([faction], [ruler]);
    // Use tyche mode so the death cooldown doesn't suppress the subsequent ascension event
    world.storyteller.mode = 'tyche';

    // Force RNG to trigger death
    const rng: GameRNG = { nextFloat: () => 0, nextInt: (max: number) => max - 1, next: () => 0, shuffle: (a) => a, reseed: () => {} };
    const events = phaseSuccession(world, 100, rng);

    expect(ruler.diedYear).toBe(100);
    expect(events.some(e => e.action === 'death')).toBe(true);
    expect(events.some(e => e.action === 'ascension')).toBe(true);
  });

  it('sets a new leaderId on the faction after succession', () => {
    const ruler = makeRuler('r1', 'A', 10);
    const faction = makeFaction('A', 'r1');
    const world = makeWorld([faction], [ruler]);

    const rng: GameRNG = { nextFloat: () => 0, nextInt: (max: number) => max - 1, next: () => 0, shuffle: (a) => a, reseed: () => {} };
    phaseSuccession(world, 100, rng);

    expect(faction.leaderId).not.toBe('r1'); // new ruler assigned
    expect(faction.leaderId).not.toBeNull();
  });

  it('produces no events when ruler is young (low death chance)', () => {
    // bornYear 90, currentYear 100 → age 10 → deathChance < 0 → clamped to 0
    const ruler = makeRuler('r1', 'A', 90);
    const faction = makeFaction('A', 'r1');
    const world = makeWorld([faction], [ruler]);

    const events = phaseSuccession(world, 100, new SeededRNG(1));
    expect(events).toHaveLength(0);
  });

  it('produces no events when faction has no leader', () => {
    const faction = makeFaction('A', null);
    const world = makeWorld([faction]);
    const events = phaseSuccession(world, 100, new SeededRNG(1));
    expect(events).toHaveLength(0);
  });
});
