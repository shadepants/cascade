// ─── Entity Creation ────────────────────────────────────────────────────
// Creates NPCs, the player, and interactable items.
// POC: plain TypeScript objects, no ECS.

import type {
  NPC, Player, Item, Settlement, Faction, NPCPersonality, Position, GameMap, Ruin,
} from '../types.ts';
import { NPC_NAMES, ITEM_TEMPLATES } from '../data/names.ts';
import { SeededRNG } from '../utils/rng.ts';

const PERSONALITIES: NPCPersonality[] = ['loyal', 'skeptic', 'zealot', 'pragmatist'];

/** Create NPCs for each settlement. */
export function generateNPCs(
  settlements: Settlement[],
  factions: Faction[],
  npcsPerSettlement: number,
  map: GameMap,
  seed: number,
): NPC[] {
  const rng = new SeededRNG(seed + 2000);
  const npcs: NPC[] = [];

  for (const settlement of settlements) {
    const faction = factions.find(f => f.id === settlement.factionId);
    if (!faction) continue;

    for (let i = 0; i < npcsPerSettlement; i++) {
      const nameIndex = rng.nextInt(NPC_NAMES.length);
      const position = findNearbyWalkableTile(map, settlement.position, rng);

      const npc: NPC = {
        id: `npc_${settlement.id}_${i}`,
        name: NPC_NAMES[nameIndex],
        position,
        factionId: faction.id,
        personality: PERSONALITIES[rng.nextInt(PERSONALITIES.length)],
        knowledge: [],     // populated after worldgen events
        dialogueKey: 'default',
        alive: true,
      };

      settlement.npcs.push(npc.id);
      npcs.push(npc);
    }
  }

  return npcs;
}

/** Create the player entity at a starting position. */
export function createPlayer(startPosition: Position): Player {
  return {
    id: 'player',
    name: 'Traveler',
    position: { ...startPosition },
    inventory: [],
    knowledgeLog: [],
    actionsThisEra: [],
  };
}

/** Create interactable items placed at settlements and ruins. */
export function generateItems(
  settlements: Settlement[],
  ruins: Ruin[],
  map: GameMap,
  npcPositions: Position[],
  seed: number,
): Item[] {
  const rng = new SeededRNG(seed + 3000);
  const items: Item[] = [];

  // 1. Place items at settlements
  for (const settlement of settlements) {
    if (rng.nextFloat() < 0.6) { // 60% chance per settlement
      const template = ITEM_TEMPLATES[rng.nextInt(ITEM_TEMPLATES.length)];
      const position = findItemPosition(map, settlement.position, npcPositions, rng);

      const item: Item = {
        id: `item_s_${settlement.id}_${items.length}`,
        name: template.name,
        description: template.description,
        type: template.type as any,
        significance: template.significance,
        position,
        history: [],
      };

      settlement.items.push(item.id);
      items.push(item);
    }
  }

  // 2. Place high-significance items at ruins (Legendary Artifacts)
  for (const ruin of ruins) {
    if (rng.nextFloat() < 0.8) { // 80% chance per ruin
      // Filter for high-sig templates
      const highSigTemplates = ITEM_TEMPLATES.filter(t => t.significance >= 6);
      const template = highSigTemplates[rng.nextInt(highSigTemplates.length)];
      
      const position = findItemPosition(map, ruin.position, npcPositions, rng);

      const item: Item = {
        id: `item_r_${ruin.id}_${items.length}`,
        name: template.name,
        description: template.description,
        type: template.type as any,
        significance: template.significance + 1, // extra significance for being ancient
        position,
        history: [{ year: ruin.collapsedYear, ownerName: `The Fallen of ${ruin.formerFactionId}` }],
      };

      items.push(item);
    }
  }

  return items;
}

/** Find a walkable tile near the settlement not occupied by any NPC. */
function findItemPosition(
  map: GameMap,
  base: Position,
  occupied: Position[],
  rng: SeededRNG,
): Position {
  for (let radius = 1; radius < 6; radius++) {
    const candidates: Position[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = base.x + dx;
        const y = base.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (!map.tiles[y][x].walkable) continue;
        if (occupied.some(p => p.x === x && p.y === y)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length > 0) return candidates[rng.nextInt(candidates.length)];
  }
  return base;
}

/** Find a walkable tile at or near a base position. */
function findNearbyWalkableTile(map: GameMap, base: Position, rng: SeededRNG): Position {
  // Spiral outwards from the base position
  for (let radius = 0; radius < 5; radius++) {
    const positions: Position[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Only check the perimeter of the spiral ring
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

        const x = base.x + dx;
        const y = base.y + dy;

        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (map.tiles[y][x].walkable) {
          positions.push({ x, y });
        }
      }
    }
    if (positions.length > 0) {
      return positions[rng.nextInt(positions.length)];
    }
  }
  return base; // Fallback to base position if nothing found
}
