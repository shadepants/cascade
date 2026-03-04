// ─── Faction Generation & Territory ─────────────────────────────────────
// Creates factions, assigns territory via Voronoi-like nearest-seed, and
// places settlements on walkable tiles near faction centers.
//
// DF insight: ethics divergence between faction pairs drives animosity
// accumulation. Each faction gets a distinct ethics profile at generation
// time; the simulation engine computes divergence each year-tick.

import type {
  Faction, FactionRelationship, FactionEthics, EthicStance,
  Settlement, GameMap, Position,
} from '../types.ts';
import { FACTION_TEMPLATES } from '../data/names.ts';
import { SeededRNG } from '../utils/rng.ts';

const ETHIC_STANCES: EthicStance[] = ['shunned', 'neutral', 'embraced'];

/** Generate a faction ethics profile. Factions are not random — each has a
 *  personality archetype that tilts their ethics in coherent directions. */
function generateEthics(archetype: 'militant' | 'mercantile' | 'traditional' | 'expansionist', rng: SeededRNG): FactionEthics {
  // Base tendencies per archetype, then add some randomness
  const base: Record<string, number> = (() => {
    switch (archetype) {
      case 'militant':    return { violence: 2, expansion: 2, trade: 0, tradition: 1, mercy: 0 };
      case 'mercantile':  return { violence: 0, expansion: 1, trade: 2, tradition: 0, mercy: 1 };
      case 'traditional': return { violence: 1, expansion: 0, trade: 1, tradition: 2, mercy: 1 };
      case 'expansionist':return { violence: 1, expansion: 2, trade: 1, tradition: 0, mercy: 0 };
    }
  })();

  const pick = (baseVal: number): EthicStance => {
    const jitter = rng.nextInt(3) - 1; // -1, 0, or +1
    return ETHIC_STANCES[Math.max(0, Math.min(2, baseVal + jitter))];
  };

  return {
    violence:  pick(base.violence),
    expansion: pick(base.expansion),
    trade:     pick(base.trade),
    tradition: pick(base.tradition),
    mercy:     pick(base.mercy),
  };
}

/** Generate factions and assign territory on the map. Mutates map tiles. */
export function generateFactions(
  map: GameMap,
  numFactions: number,
  seed: number,
): { factions: Faction[]; relationships: FactionRelationship[]; settlements: Settlement[] } {
  const rng = new SeededRNG(seed + 1000);

  const archetypes: Array<'militant' | 'mercantile' | 'traditional' | 'expansionist'> =
    ['militant', 'mercantile', 'traditional', 'expansionist'];

  const centers = pickFactionCenters(map, numFactions, rng);

  const factions: Faction[] = centers.map((_pos, i) => {
    const template = FACTION_TEMPLATES[i % FACTION_TEMPLATES.length];
    const archetype = archetypes[i % archetypes.length];
    return {
      id: `faction_${i}`,
      name: template.name,
      color: template.color,
      aggression: 30 + rng.nextInt(40),   // 30-70, war-proneness

      // Simulation stats — all factions start equal-ish, diverge through play
      population: 200 + rng.nextInt(200), // 200-400
      stability:  60 + rng.nextInt(20),   // 60-80
      wealth:     30 + rng.nextInt(30),   // 30-60
      military:   20 + rng.nextInt(30),   // 20-50
      culture:    10 + rng.nextInt(30),   // 10-40

      ethics:   generateEthics(archetype, rng),
      leaderId: null, // set by worldgen after HistoricalFigures are created
      settlements: [],
    };
  });

  assignTerritory(map, centers, factions);
  const settlements = placeSettlements(map, factions, centers, rng);
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
  return center;
}

/** Generate pairwise faction relationships with initial animosity from ethics. */
export function generateRelationships(factions: Faction[], rng: SeededRNG): FactionRelationship[] {
  const relationships: FactionRelationship[] = [];

  for (let i = 0; i < factions.length; i++) {
    for (let j = i + 1; j < factions.length; j++) {
      const a = factions[i];
      const b = factions[j];
      // Seed animosity from ethics divergence at world gen
      const initialAnimosity = computeEthicsDivergence(a.ethics, b.ethics) * 5;
      relationships.push({
        factionA: a.id,
        factionB: b.id,
        opinion:   -10 + rng.nextInt(20) - 10, // -20 to +10
        animosity: initialAnimosity,
        state:     'peace',
      });
    }
  }

  return relationships;
}

/** Compute ethics divergence score between two factions (0-10). */
export function computeEthicsDivergence(a: FactionEthics, b: FactionEthics): number {
  const stanceValue = (s: EthicStance) => s === 'embraced' ? 2 : s === 'neutral' ? 1 : 0;
  const keys = ['violence', 'expansion', 'trade', 'tradition', 'mercy'] as const;
  const totalDivergence = keys.reduce((sum, key) => {
    return sum + Math.abs(stanceValue(a[key]) - stanceValue(b[key]));
  }, 0);
  // Max divergence = 5 categories × 2 = 10; normalize to 0-10
  return totalDivergence;
}
