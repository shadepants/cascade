// ─── Phase 1: Ecology ─────────────────────────────────────────────────────
// Biome-driven population growth and famine events.

import type { WorldState, GameEvent, StatDelta } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { BIOME_POP_DELTA, FAMINE_DESERT_THRESHOLD, FAMINE_POPULATION_MIN, pickMotivation } from '../constants.ts';
import type { MapOwnershipSummary } from '../helpers/spatial.ts';

export function phaseEcology(world: WorldState, year: number, rng: GameRNG, mapSummary: MapOwnershipSummary): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const stats = mapSummary[faction.id];
    if (!stats || stats.count === 0) continue;

    const biomes = stats.biomeCounts;
    const biomeTypes = Object.keys(biomes);
    
    let popDeltaSum = 0;
    for (const b of biomeTypes) {
      popDeltaSum += (BIOME_POP_DELTA[b] || 0) * biomes[b];
    }
    const popDelta = popDeltaSum / stats.count;

    const harshTiles = (biomes['desert'] || 0) + (biomes['tundra'] || 0);
    const harshness = harshTiles / stats.count;
    const isFamine = harshness > FAMINE_DESERT_THRESHOLD && faction.population > FAMINE_POPULATION_MIN;

    if (isFamine && rng.nextFloat() < 0.4) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: -Math.round(faction.population * 0.1) },
        { factionId: faction.id, stat: 'stability',  delta: -5 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'famine', object: faction.id,
        causedBy: null, significance: 4, playerCaused: false,
        description: `Famine struck ${faction.name} as the harsh terrain could not support its people`,
        motivation: pickMotivation('famine', rng),
        statDeltas: deltas,
      }), year);
    } else if (popDelta > 0 && rng.nextFloat() < 0.3) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: Math.round(faction.population * 0.05) },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'population_boom', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name}'s population grew in the fertile lands`,
        motivation: pickMotivation('population_boom', rng),
        statDeltas: deltas,
      }), year);
    }
  }

  return events;
}
