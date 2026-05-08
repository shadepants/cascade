// ─── Phase 5b: Stability ──────────────────────────────────────────────────
// Faction collapse, rebellion, cultural spread, war exhaustion recovery,
// military buildup, and prosperity-driven stability gains.

import type { WorldState, GameEvent, StatDelta } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { REBELLION_STABILITY_MIN, pickMotivation } from '../constants.ts';
import { getNeighboringFactions, type MapOwnershipSummary } from '../helpers/spatial.ts';
import { fractureFaction } from './conflict.ts';

export function phaseStability(world: WorldState, year: number, rng: SeededRNG, mapSummary: MapOwnershipSummary): GameEvent[] {
  const events: GameEvent[] = [];

  const currentFactions = [...world.factions];
  for (const faction of currentFactions) {
    const stats = mapSummary[faction.id];

    // Faction collapse — no territory left
    if (!stats || stats.count === 0) {
      const affectedSettlements = world.settlements.filter(s => s.factionId === faction.id);
      for (const s of affectedSettlements) {
        world.ruins.push({
          id:              `ruin_${s.id}_${year}`,
          name:            `Ruins of ${s.name}`,
          position:        s.position,
          formerFactionId: faction.id,
          collapsedYear:   year,
        });
        for (const npcId of s.npcs) {
          const npc = world.npcs.find(n => n.id === npcId);
          if (npc) npc.alive = false;
        }
      }
      world.settlements = world.settlements.filter(s => s.factionId !== faction.id);
      world.factions    = world.factions.filter(f => f.id !== faction.id);

      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'collapse', object: 'history',
        causedBy: null, significance: 8, playerCaused: false,
        description: `${faction.name} has collapsed into history, leaving only ruins.`,
        motivation: 'imperial overstretch and loss of territory',
      }), year);
      continue;
    }

    // Rebellion: low stability + population pressure
    if (faction.stability < REBELLION_STABILITY_MIN && faction.population > 100 && rng.nextFloat() < 0.25) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'stability',  delta: -10 },
        { factionId: faction.id, stat: 'military',   delta: -5 },
        { factionId: faction.id, stat: 'population', delta: -20 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'internal_rebellion', object: faction.id,
        causedBy: null, significance: 5, playerCaused: false,
        description: `Unrest tore through ${faction.name} as stability collapsed`,
        motivation: pickMotivation('rebellion', rng),
        statDeltas: deltas,
      }), year);
    }

    // Cultural spread (organic): high culture → pressure on neighbors
    if (faction.culture > 75 && rng.nextFloat() < 0.15) {
      const neighbors = getNeighboringFactions(world, faction.id);
      if (neighbors.length > 0) {
        const target = neighbors[rng.nextInt(neighbors.length)];
        const deltas: StatDelta[] = [
          { factionId: faction.id, stat: 'culture',   delta: 3 },
          { factionId: target.id,  stat: 'stability', delta: -3 },
        ];
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: faction.id, action: 'cultural_spread', object: target.id,
          causedBy: null, significance: 3, playerCaused: false,
          description: `${faction.name}'s cultural influence spread into ${target.name}`,
          motivation: pickMotivation('cultural_spread', rng),
          statDeltas: deltas,
        }), year);
      }
    }

    // War exhaustion recovery
    const atWar = world.relationships.some(
      r => (r.factionA === faction.id || r.factionB === faction.id) && r.state === 'war',
    );
    if (!atWar && faction.stability < 60 && rng.nextFloat() < 0.3) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'stability_recovery', object: faction.id,
        causedBy: null, significance: 1, playerCaused: false,
        description: `${faction.name} began recovering from recent turmoil`,
        motivation: 'as peacetime allowed wounds to heal and order to be restored',
        statDeltas: [{ factionId: faction.id, stat: 'stability', delta: 15 }],
      }), year);
    }

    // Wealth-driven military buildup (organic)
    if (faction.wealth > 70 && faction.military < 60 && rng.nextFloat() < 0.2) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'military_expansion', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name} invested wealth into expanding their armies`,
        motivation: 'as prosperity gave their rulers the means to project power',
        statDeltas: [
          { factionId: faction.id, stat: 'military', delta: 10 },
          { factionId: faction.id, stat: 'wealth',   delta: -8 },
        ],
      }), year);
    }

    // Prosperity-driven stability recovery
    if (faction.wealth > 60 && faction.stability < 70 && rng.nextFloat() < 0.2) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'prosperity_stability', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `Prosperity in ${faction.name} brought social calm`,
        motivation: 'as full granaries and busy markets eased old grievances',
        statDeltas: [
          { factionId: faction.id, stat: 'stability', delta: 15 },
          { factionId: faction.id, stat: 'wealth',    delta: -20 },
        ],
      }), year);
    }

    // Civil war fracture under extreme instability (not triggered by succession/conflict)
    if (faction.stability < 10 && rng.nextFloat() < 0.15) {
      const fractureEvent = fractureFaction(world, faction, year, rng);
      if (fractureEvent) emitEvent(world, events, fractureEvent, year);
    }
  }

  return events;
}
