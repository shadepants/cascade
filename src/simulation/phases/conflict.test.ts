import { describe, it, expect } from 'vitest';
import { phaseConflict, fractureFaction } from './conflict.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction, type FactionRelationship } from '../../types';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 60, settlements: [],
    population: 500, stability: 60, wealth: 50, military: 60, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [], ...overrides,
  };
}

function makeMap(rows: (string | null)[][]) {
  const height = rows.length;
  const width = rows[0].length;
  return {
    width, height,
    tiles: rows.map(row =>
      row.map(factionId => ({
        biome: 'grassland' as const,
        elevation: 0, rainfall: 0,
        factionId, settlementId: null, walkable: true,
      })),
    ),
  };
}

function makeWorld(
  factions: Faction[],
  relationships: FactionRelationship[],
  mapRows?: (string | null)[][],
): WorldState {
  const map = mapRows
    ? makeMap(mapRows)
    : { width: 1, height: 1, tiles: [[{ biome: 'grassland' as const, elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] };
  return {
    seed: 1, currentYear: 1,
    map,
    factions, relationships,
    historicalFigures: [], settlements: [],
    ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes: [], religions: [], holySites: [], events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

// ─── phaseConflict ────────────────────────────────────────────────────────────

describe('phaseConflict — war declaration', () => {
  it('declares war when animosity >= threshold and border exists', () => {
    // WAR_ANIMOSITY_THRESHOLD = 80
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: -80, animosity: 100, state: 'peace' };
    // Give them a shared border: A top row, B bottom row
    const world = makeWorld([fA, fB], [rel], [['A', 'A'], ['B', 'B']]);

    // Force RNG past 0.4 skip (nextFloat called first for war check)
    const calls: number[] = [];
    const rng: GameRNG = {
      nextFloat: () => { const v = calls.length === 0 ? 0.01 : 0.5; calls.push(v); return v; },
      nextInt: () => 0,
      next: () => 0,
      shuffle: (a) => a,
    };
    const events = phaseConflict(world, 2, rng, []);
    expect(rel.state).toBe('war');
    expect(events.some(e => e.action === 'war_declared')).toBe(true);
  });

  it('does not declare war when animosity is below threshold', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: -20, animosity: 50, state: 'peace' };
    const world = makeWorld([fA, fB], [rel], [['A', 'A'], ['B', 'B']]);
    phaseConflict(world, 2, new SeededRNG(1), []);
    expect(rel.state).toBe('peace');
  });

  it('does not declare war when factions share no border', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: -80, animosity: 200, state: 'peace' };
    // A and B have tiles but don't share a border
    const world = makeWorld([fA, fB], [rel], [['A', null, 'B']]);
    phaseConflict(world, 2, new SeededRNG(1), []);
    expect(rel.state).toBe('peace');
  });
});

// ─── fractureFaction ──────────────────────────────────────────────────────────

describe('fractureFaction', () => {
  it('returns null when faction has fewer than 10 tiles', () => {
    const faction = makeFaction('A', { settlements: ['s1'] });
    const world = makeWorld([faction], [], [['A', 'A', 'A']]);
    world.settlements = [{
      id: 's1', name: 'Capital', position: { x: 0, y: 0 },
      factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
    }];
    const result = fractureFaction(world, faction, 100, new SeededRNG(1));
    expect(result).toBeNull();
  });

  it('returns null when faction has no capital settlement', () => {
    const faction = makeFaction('A', { settlements: [] });
    // Give it 12 tiles but no settlement
    const row = Array(12).fill('A');
    const world = makeWorld([faction], [], [row]);
    const result = fractureFaction(world, faction, 100, new SeededRNG(1));
    expect(result).toBeNull();
  });

  it('creates a new rebel faction and civil_war_fracture event', () => {
    const faction = makeFaction('A', { settlements: ['s1'] });
    // 4x4 = 16 tiles → enough for fracture
    const rows: (string | null)[][] = Array(4).fill(null).map(() => Array(4).fill('A'));
    const world = makeWorld([faction], [], rows);
    world.settlements = [{
      id: 's1', name: 'Capital', position: { x: 0, y: 0 },
      factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
    }];

    const event = fractureFaction(world, faction, 100, new SeededRNG(1));
    expect(event).not.toBeNull();
    expect(event?.action).toBe('civil_war_fracture');
    // A new rebel faction should have been added
    expect(world.factions.length).toBe(2);
    // A war relationship between original and rebel
    expect(world.relationships.some(r => r.state === 'war')).toBe(true);
  });
});
