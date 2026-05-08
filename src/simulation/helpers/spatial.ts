// ─── Spatial Helpers ─────────────────────────────────────────────────────
// Pure map-traversal utilities. No side effects, no event emission.

import type { GameMap, Position, WorldState, Faction } from '../../types';

export interface FactionMapStats {
  tiles: { x: number; y: number; biome: string }[];
  count: number;
  biomeCounts: Record<string, number>;
}

export type MapOwnershipSummary = Record<string, FactionMapStats>;

/** Build a summary of ownership across the entire map in a single pass. */
export function getMapOwnershipSummary(map: GameMap): MapOwnershipSummary {
  const summary: MapOwnershipSummary = {};
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      const fId = tile.factionId;
      if (!fId) continue;

      if (!summary[fId]) {
        summary[fId] = { tiles: [], count: 0, biomeCounts: {} };
      }
      const stats = summary[fId];
      stats.tiles.push({ x, y, biome: tile.biome });
      stats.count++;
      stats.biomeCounts[tile.biome] = (stats.biomeCounts[tile.biome] || 0) + 1;
    }
  }
  return summary;
}

/** Get all tiles owned by a faction (biome only). */
export function getTilesForFaction(map: GameMap, factionId: string): { biome: string }[] {
  const tiles: { biome: string }[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId === factionId) {
        tiles.push(map.tiles[y][x]);
      }
    }
  }
  return tiles;
}

/** Get all tiles owned by a faction with their coordinates. */
export function getTilesWithPosForFaction(map: GameMap, factionId: string): (Position & { biome: string })[] {
  const tiles: (Position & { biome: string })[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId === factionId) {
        tiles.push({ x, y, biome: map.tiles[y][x].biome });
      }
    }
  }
  return tiles;
}

/** Get border tiles of loserFactionId that are adjacent to winnerFactionId tiles. */
export function getBorderTilesOf(map: GameMap, loserFactionId: string, winnerFactionId: string): Position[] {
  const border: Position[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId !== loserFactionId) continue;
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      const adjacentToWinner = neighbors.some(n =>
        n.x >= 0 && n.y >= 0 && n.x < map.width && n.y < map.height &&
        map.tiles[n.y][n.x].factionId === winnerFactionId,
      );
      if (adjacentToWinner) border.push({ x, y });
    }
  }
  return border;
}

/** Count tiles where factions A and B share a border. */
export function countSharedBorderTiles(map: GameMap, factionAId: string, factionBId: string): number {
  let count = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId !== factionAId) continue;
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      if (neighbors.some(n =>
        n.x >= 0 && n.y >= 0 && n.x < map.width && n.y < map.height &&
        map.tiles[n.y][n.x].factionId === factionBId,
      )) count++;
    }
  }
  return count;
}

/** Get factions that share a border with the given faction. */
export function getNeighboringFactions(world: WorldState, factionId: string): Faction[] {
  const neighborIds = new Set<string>();
  for (let y = 0; y < world.map.height; y++) {
    for (let x = 0; x < world.map.width; x++) {
      if (world.map.tiles[y][x].factionId !== factionId) continue;
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      for (const n of neighbors) {
        if (n.x < 0 || n.y < 0 || n.x >= world.map.width || n.y >= world.map.height) continue;
        const nId = world.map.tiles[n.y][n.x].factionId;
        if (nId && nId !== factionId) neighborIds.add(nId);
      }
    }
  }
  return world.factions.filter(f => neighborIds.has(f.id));
}
