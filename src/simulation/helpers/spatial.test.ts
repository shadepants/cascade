import { describe, it, expect } from 'vitest';
import {
  getMapOwnershipSummary,
  getTilesForFaction,
  getTilesWithPosForFaction,
  getBorderTilesOf,
  countSharedBorderTiles,
  getNeighboringFactions,
} from './spatial.ts';
import type { GameMap, WorldState, Faction } from '../../types';
import { defaultStorytellerState } from '../../types';

function makeMap(rows: (string | null)[][]): GameMap {
  const height = rows.length;
  const width = rows[0].length;
  return {
    width,
    height,
    tiles: rows.map(row =>
      row.map(factionId => ({
        biome: 'grassland' as const,
        elevation: 0,
        rainfall: 0,
        factionId,
        settlementId: null,
        walkable: true,
      })),
    ),
  };
}

function makeWorld(factions: Faction[], map: GameMap): WorldState {
  return {
    seed: 1,
    currentYear: 1,
    map,
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
    storyteller: defaultStorytellerState(),
    visuals: [],
  };
}

function makeFaction(id: string): Faction {
  return {
    id, name: id, color: '#000', aggression: 50, settlements: [],
    population: 100, stability: 50, wealth: 50, military: 50, culture: 50,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [],
  };
}

// ─── 3x3 map: A owns row 0, B owns row 1, nobody owns row 2
//   AAA
//   BBB
//   ???
const mapAB = makeMap([
  ['A', 'A', 'A'],
  ['B', 'B', 'B'],
  [null, null, null],
]);

describe('getMapOwnershipSummary', () => {
  it('counts tiles per faction', () => {
    const summary = getMapOwnershipSummary(mapAB);
    expect(summary['A'].count).toBe(3);
    expect(summary['B'].count).toBe(3);
    expect(summary['']).toBeUndefined();
  });

  it('records biome counts', () => {
    const summary = getMapOwnershipSummary(mapAB);
    expect(summary['A'].biomeCounts['grassland']).toBe(3);
  });

  it('returns empty summary for null-only map', () => {
    const map = makeMap([[null, null]]);
    expect(getMapOwnershipSummary(map)).toEqual({});
  });

  it('stores tile coordinates', () => {
    const summary = getMapOwnershipSummary(mapAB);
    const aTiles = summary['A'].tiles;
    expect(aTiles.some(t => t.x === 0 && t.y === 0)).toBe(true);
    expect(aTiles.some(t => t.x === 2 && t.y === 0)).toBe(true);
  });
});

describe('getTilesForFaction', () => {
  it('returns only tiles owned by the faction', () => {
    const tiles = getTilesForFaction(mapAB, 'A');
    expect(tiles).toHaveLength(3);
  });

  it('returns empty array when faction owns nothing', () => {
    expect(getTilesForFaction(mapAB, 'Z')).toHaveLength(0);
  });
});

describe('getTilesWithPosForFaction', () => {
  it('includes x/y coordinates', () => {
    const tiles = getTilesWithPosForFaction(mapAB, 'B');
    expect(tiles).toHaveLength(3);
    expect(tiles[0]).toMatchObject({ x: 0, y: 1 });
    expect(tiles[2]).toMatchObject({ x: 2, y: 1 });
  });
});

describe('getBorderTilesOf', () => {
  it('finds loser tiles adjacent to winner tiles', () => {
    // A (row 0) borders B (row 1) — all 3 B tiles border A
    const borders = getBorderTilesOf(mapAB, 'B', 'A');
    expect(borders).toHaveLength(3);
    borders.forEach(pos => expect(pos.y).toBe(1));
  });

  it('returns empty array when there is no shared border', () => {
    // A and the null row share no border
    const borders = getBorderTilesOf(mapAB, 'A', 'Z');
    expect(borders).toHaveLength(0);
  });
});

describe('countSharedBorderTiles', () => {
  it('counts tiles of factionA adjacent to factionB', () => {
    // 3 A tiles each touch a B tile
    expect(countSharedBorderTiles(mapAB, 'A', 'B')).toBe(3);
  });

  it('is not symmetric when territory sizes differ', () => {
    // Count from B side — also 3
    expect(countSharedBorderTiles(mapAB, 'B', 'A')).toBe(3);
  });

  it('returns 0 when factions share no border', () => {
    expect(countSharedBorderTiles(mapAB, 'A', 'Z')).toBe(0);
  });
});

describe('getNeighboringFactions', () => {
  it('returns factions that share a border with the given faction', () => {
    const world = makeWorld([makeFaction('A'), makeFaction('B')], mapAB);
    const neighbors = getNeighboringFactions(world, 'A');
    expect(neighbors.map(f => f.id)).toContain('B');
    expect(neighbors).toHaveLength(1);
  });

  it('returns empty array when no neighbors exist', () => {
    // A is alone (no B in map)
    const soloMap = makeMap([['A', 'A']]);
    const world = makeWorld([makeFaction('A'), makeFaction('B')], soloMap);
    expect(getNeighboringFactions(world, 'A')).toHaveLength(0);
  });
});
