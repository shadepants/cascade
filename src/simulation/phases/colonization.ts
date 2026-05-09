// ─── Phase 1b/1c: Colonization & Settlement ───────────────────────────────
// Colony founding, pioneer spawning, and settlement abandonment.

import type { WorldState, GameEvent, Faction, Settlement, NPC, Position } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { NPC_NAMES } from '../../data/names.ts';
import { PERSONALITIES } from '../constants.ts';
import { getTilesWithPosForFaction } from '../helpers/spatial.ts';

// ─── Settlement Abandonment ───────────────────────────────────────────────

export function phaseSettlementGrowth(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    if (faction.population < 150 && faction.settlements.length > 1 && rng.nextFloat() < 0.15) {
      const sId = faction.settlements[rng.nextInt(faction.settlements.length)];
      const settlement = world.settlements.find(s => s.id === sId);
      if (!settlement) continue;

      world.ruins.push({
        id:              `ruin_abandoned_${settlement.id}_${year}`,
        name:            `Abandoned ${settlement.name}`,
        position:        settlement.position,
        formerFactionId: faction.id,
        collapsedYear:   year,
      });

      for (const npcId of settlement.npcs) {
        const npc = world.npcs.find(n => n.id === npcId);
        if (npc) npc.alive = false;
      }

      world.settlements         = world.settlements.filter(s => s.id !== sId);
      faction.settlements       = faction.settlements.filter(id => id !== sId);

      // Sanitised tile-clearing (prototype-pollution guard from original code)
      const rawY = settlement.position.y as unknown;
      const rawX = settlement.position.x as unknown;
      const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);
      const y = typeof rawY === 'number' && Number.isInteger(rawY) ? rawY : -1;
      const x = typeof rawX === 'number' && Number.isInteger(rawX) ? rawX : -1;

      if (
        !(typeof rawY === 'string' && blockedKeys.has(rawY)) &&
        !(typeof rawX === 'string' && blockedKeys.has(rawX)) &&
        y >= 0 && y < world.map.tiles.length &&
        Array.isArray(world.map.tiles[y]) &&
        x >= 0 && x < world.map.tiles[y].length
      ) {
        const tile = world.map.tiles[y][x];
        if (tile && typeof tile === 'object') tile.settlementId = null;
      }

      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'abandonment', object: settlement.id,
        causedBy: null, significance: 4, playerCaused: false,
        description: `${faction.name} was forced to abandon ${settlement.name} as its people fled`,
        motivation: 'loss of population and structural decay',
      }), year);
    }
  }

  return events;
}

// ─── Colonization ─────────────────────────────────────────────────────────

function findColonizationSpot(world: WorldState, faction: Faction, rng: SeededRNG): Position | null {
  const tiles = getTilesWithPosForFaction(world.map, faction.id);
  if (tiles.length === 0) return null;

  const goodTiles = tiles.filter(t =>
    t.biome === 'grassland' || t.biome === 'forest' || t.biome === 'rainforest',
  );
  const pool = goodTiles.length > 0 ? goodTiles : tiles;
  const candidates = pool.filter(t => !world.map.tiles[t.y][t.x].settlementId);
  if (candidates.length === 0) return null;

  const validCandidates = candidates.filter(c =>
    !world.settlements.some(s =>
      Math.abs(s.position.x - c.x) + Math.abs(s.position.y - c.y) < 8,
    ),
  );
  if (validCandidates.length === 0) return null;
  return validCandidates[rng.nextInt(validCandidates.length)];
}

export function phaseColonization(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    if (faction.population > 600 && faction.wealth > 50 && faction.stability > 50 && rng.nextFloat() < 0.12) {
      const spot = findColonizationSpot(world, faction, rng);
      if (!spot) continue;

      const id = `settlement_${faction.id}_y${year}`;
      const newSettlement: Settlement = {
        id,
        name:      `${faction.name} Frontier`,
        position:  spot,
        factionId: faction.id,
        npcs:      [],
        items:     [],
        faith:     [],
        dominantReligionId: null,
      };

      world.settlements.push(newSettlement);
      faction.settlements.push(id);
      world.map.tiles[spot.y][spot.x].settlementId = id;

      const npc: NPC = {
        id:          `npc_pioneer_${id}`,
        name:        NPC_NAMES[rng.nextInt(NPC_NAMES.length)],
        position:    { ...spot },
        factionId:   faction.id,
        personality: PERSONALITIES[rng.nextInt(PERSONALITIES.length)],
        knowledge:   [],
        dialogueKey: 'default',
        alive:       true,
      };
      newSettlement.npcs.push(npc.id);
      world.npcs.push(npc);

      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'colonization', object: id,
        causedBy: null, significance: 5, playerCaused: false,
        description: `${faction.name} founded a new colony on the frontier`,
        motivation: 'population pressure and economic expansion',
        statDeltas: [
          { factionId: faction.id, stat: 'population', delta: -100 },
          { factionId: faction.id, stat: 'wealth',     delta: -20 },
        ],
      }), year);
    }
  }

  return events;
}
