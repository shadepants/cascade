// ─── Faction Generation & Territory ─────────────────────────────────────
// Creates factions, assigns territory via Voronoi-like nearest-seed, and
// places settlements on walkable tiles near faction centers.

import type {
  Faction, FactionRelationship, Settlement, GameMap, Position,
} from '../types.ts';
import { FACTION_TEMPLATES } from '../data/names.ts';
import { SeededRNG } from '../utils/rng.ts';

/** Generate factions and assign territory on the map. Mutates map tiles. */
export function generateFactions(
  map: GameMap,
  numFactions: number,
  seed: number,
): { factions: Faction[]; relationships: FactionRelationship[]; settlements: Settlement[] } {
  const rng = new SeededRNG(seed + 1000);

  // Pick faction seeds (center points) on walkable tiles
  const centers = pickFactionCenters(map, numFactions, rng);

  // Create faction objects
  const factions: Faction[] = centers.map((_pos, i) => {
    const template = FACTION_TEMPLATES[i % FACTION_TEMPLATES.length];
    return {
      id: `faction_${i}`,
      name: template.name,
      color: template.color,
      aggression: 30 + rng.nextInt(40), // 30-70
      settlements: [],
    };
  });

  // Assign territory: each walkable tile belongs to nearest faction center
  assignTerritory(map, centers, factions);

  // Place settlements near faction centers
  const settlements = placeSettlements(map, factions, centers, rng);

  // Generate starting relationships (slightly negative — tension)
  const relationships = generateRelationships(factions, rng);

  return { factions, relationships, settlements };
}

/** Pick N well-spaced positions on walkable tiles. */
function pickFactionCenters(map: GameMap, n: number, rng: SeededRNG): Position[] {
  const centers: Position[] = [];
  const minDist = Math.floor(map.width / (n + 1));

  let attempts = 0;
  while (centers.length < n && attempts < 500) {
    const x = rng.nextInt(map.width);
    const y = rng.nextInt(map.height);
    attempts++;

    if (!map.tiles[y][x].walkable) continue;

    const tooClose = centers.some(
      c => Math.abs(c.x - x) + Math.abs(c.y - y) < minDist,
    );
    if (tooClose) continue;

    centers.push({ x, y });
  }

  return centers;
}

/** Assign each walkable tile to the nearest faction (Manhattan distance). */
function assignTerritory(map: GameMap, centers: Position[], factions: Faction[]): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      if (!tile.walkable) continue;

      let bestDist = Infinity;
      let bestFaction: string | null = null;

      for (let i = 0; i < centers.length; i++) {
        const dist = Math.abs(centers[i].x - x) + Math.abs(centers[i].y - y);
        if (dist < bestDist) {
          bestDist = dist;
          bestFaction = factions[i].id;
        }
      }

      tile.factionId = bestFaction;
    }
  }
}

/** Place one settlement per faction near its center. */
function placeSettlements(
  map: GameMap,
  factions: Faction[],
  centers: Position[],
  rng: SeededRNG,
): Settlement[] {
  const settlements: Settlement[] = [];

  for (let i = 0; i < factions.length; i++) {
    const center = centers[i];
    // Search nearby for a walkable tile
    const pos = findNearbyWalkable(map, center, rng);

    const settlement: Settlement = {
      id: `settlement_${i}`,
      name: `${factions[i].name} Hold`,
      position: pos,
      factionId: factions[i].id,
      npcs: [],
      items: [],
    };

    map.tiles[pos.y][pos.x].settlementId = settlement.id;
    factions[i].settlements.push(settlement.id);
    settlements.push(settlement);
  }

  return settlements;
}

/** Find a walkable tile near a given position. */
function findNearbyWalkable(map: GameMap, center: Position, _rng: SeededRNG): Position {
  // Spiral outward from center
  for (let radius = 0; radius < 5; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = center.x + dx;
        const y = center.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (map.tiles[y][x].walkable) return { x, y };
      }
    }
  }
  // Fallback: just use center
  return center;
}

/** Generate pairwise faction relationships. */
function generateRelationships(factions: Faction[], rng: SeededRNG): FactionRelationship[] {
  const relationships: FactionRelationship[] = [];

  for (let i = 0; i < factions.length; i++) {
    for (let j = i + 1; j < factions.length; j++) {
      relationships.push({
        factionA: factions[i].id,
        factionB: factions[j].id,
        opinion: -10 + rng.nextInt(40) - 20, // -30 to +10 (slightly tense)
      });
    }
  }

  return relationships;
}
