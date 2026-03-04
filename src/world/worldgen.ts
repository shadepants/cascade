// ─── World Generation Orchestrator ──────────────────────────────────────
// Pulls together terrain, factions, entities, and pre-history into a
// complete WorldState. This is the single entry point for "make me a world."

import type { WorldState, WorldConfig, Position } from '../types.ts';
import { generateTerrain } from './terrain.ts';
import { generateFactions } from './factions.ts';
import { generateNPCs, createPlayer, generateItems } from './entities.ts';
import { generatePreHistory, resetEventIds } from './events.ts';

/** Generate a complete world from a config. Pure function (stateless). */
export function generateWorld(config: WorldConfig): WorldState {
  const seed = config.seed || Date.now();

  resetEventIds();

  // Step 1: Terrain
  const map = generateTerrain(seed, config.mapSize);

  // Step 2: Factions + territory + settlements
  const { factions, relationships, settlements } =
    generateFactions(map, config.numFactions, seed);

  // Step 3: NPCs
  const npcs = generateNPCs(
    settlements,
    factions,
    config.npcsPerSettlement,
    map,
    seed,
  );

  // Step 4: Items — avoid placing on NPC tiles
  const npcPositions = npcs.map(n => n.position);
  const items = generateItems(settlements, map, npcPositions, seed);

  // Step 5: Pre-history events
  const factionIds = factions.map(f => f.id);
  const events = generatePreHistory(factionIds, config.pregenYears, seed);

  // Assign known events to NPCs (each NPC knows 2-3 random events)
  assignKnowledgeToNPCs(npcs, events, seed);

  // Step 6: Player — start at center of map, find nearest walkable tile
  const startPos = findPlayerStart(map, config.mapSize);
  const player = createPlayer(startPos);

  return {
    seed,
    currentYear: config.pregenYears,
    map,
    factions,
    relationships,
    settlements,
    npcs,
    items,
    events,
    player,
  };
}

/** Find a walkable starting position near the center of the map. */
function findPlayerStart(map: { width: number; height: number; tiles: { walkable: boolean }[][] }, mapSize: number): Position {
  const center = Math.floor(mapSize / 2);

  // Spiral out from center to find walkable tile
  for (let radius = 0; radius < mapSize; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = center + dx;
        const y = center + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (map.tiles[y][x].walkable) return { x, y };
      }
    }
  }

  return { x: center, y: center }; // fallback
}

/** Give each NPC knowledge of 2-3 random historical events. */
function assignKnowledgeToNPCs(
  npcs: { knownEvents: string[] }[],
  events: { id: string }[],
  _seed: number,
): void {
  // Simple deterministic assignment — not using SeededRNG to avoid circular import complexity
  for (let i = 0; i < npcs.length; i++) {
    const count = 2 + (i % 2); // alternating 2 and 3
    for (let j = 0; j < count && j < events.length; j++) {
      const eventIndex = (i * 3 + j) % events.length;
      npcs[i].knownEvents.push(events[eventIndex].id);
    }
  }
}
