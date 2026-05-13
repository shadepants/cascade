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

describe('phaseConflict — war resolution settlement transfers', () => {
  it('transfers border settlements from loser to winner without duplicates', () => {
    const winner = makeFaction('A', { settlements: ['sA'] });
    const loser = makeFaction('B', { settlements: ['sB'] });
    const rel: FactionRelationship = { factionA: 'A', factionB: 'B', opinion: -80, animosity: 100, state: 'war' };
    const world = makeWorld([winner, loser], [rel], [['A', 'B'], ['A', 'B']]);
    world.settlements = [
      {
        id: 'sA', name: 'Alpha', position: { x: 0, y: 0 },
        factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
      },
      {
        id: 'sB', name: 'Borderhold', position: { x: 1, y: 0 },
        factionId: 'B', npcs: [], items: [], faith: [], dominantReligionId: null,
      },
    ];
    world.map.tiles[0][1].settlementId = 'sB';

    expect(loser.settlements).toContain('sB');
    expect(winner.settlements).not.toContain('sB');

    // nextFloat rolls for resolveWar: [war-ends check, winner selection].
    const rollSequence = [0, 0];
    const rng: GameRNG = {
      nextFloat: () => rollSequence.shift() ?? 0,
      nextInt: () => 0,
      next: () => 0,
      shuffle: (a) => a,
    };

    phaseConflict(world, 2, rng, []);

    expect(world.map.tiles[0][1].factionId).toBe('A');
    expect(world.settlements.find(s => s.id === 'sB')?.factionId).toBe('A');
    expect(loser.settlements).not.toContain('sB');
    expect(winner.settlements.filter(id => id === 'sB')).toHaveLength(1);
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
  it('moves captured settlements to the rebel faction and updates original list once', () => {
    const faction = makeFaction('A', { settlements: ['s1', 's2', 's3'] });
    const rows: (string | null)[][] = Array(4).fill(null).map(() => Array(4).fill('A'));
    const world = makeWorld([faction], [], rows);
    world.settlements = [
      {
        id: 's1', name: 'Capital', position: { x: 0, y: 0 },
        factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
      },
      {
        id: 's2', name: 'Frontier East', position: { x: 3, y: 3 },
        factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
      },
      {
        id: 's3', name: 'Frontier South', position: { x: 2, y: 3 },
        factionId: 'A', npcs: [], items: [], faith: [], dominantReligionId: null,
      },
    ];
    world.map.tiles[3][3].settlementId = 's2';
    world.map.tiles[3][2].settlementId = 's3';

    expect(faction.settlements).toEqual(expect.arrayContaining(['s2', 's3']));

    const event = fractureFaction(world, faction, 100, new SeededRNG(1));
    const rebelId = `faction_rebel_A_100`;
    const rebelFaction = world.factions.find(f => f.id === rebelId);
    const rebelSettlements = rebelFaction?.settlements ?? [];

    expect(event).not.toBeNull();
    expect(rebelFaction).toBeDefined();
    expect(world.settlements.find(s => s.id === 's2')?.factionId).toBe(rebelId);
    expect(world.settlements.find(s => s.id === 's3')?.factionId).toBe(rebelId);
    expect(rebelSettlements).toEqual(expect.arrayContaining(['s2', 's3']));
    expect(new Set(rebelSettlements).size).toBe(rebelSettlements.length);
    expect(faction.settlements).toEqual(['s1']);
    expect(new Set(faction.settlements).size).toBe(faction.settlements.length);
  });
});
