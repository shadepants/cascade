// ─── Phase 2: Economics ───────────────────────────────────────────────────
// Wealth from territory, trade, and military upkeep.

import type { WorldState, GameEvent, StatDelta } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { BIOME_WEALTH_DELTA, pickMotivation } from '../constants.ts';
import type { MapOwnershipSummary } from '../helpers/spatial.ts';
import { getRulerForFaction, hasTrait } from './succession.ts';

export function phaseEconomics(
  world: WorldState,
  year: number,
  rng: SeededRNG,
  _priorEvents: GameEvent[],
  mapSummary: MapOwnershipSummary,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const stats = mapSummary[faction.id];
    if (!stats || stats.count === 0) continue;

    const biomes = stats.biomeCounts;
    const ruler = getRulerForFaction(world, faction.id);

    let wealthDeltaSum = 0;
    for (const b of Object.keys(biomes)) {
      wealthDeltaSum += (BIOME_WEALTH_DELTA[b] || 0) * biomes[b];
    }
    let wealthDelta = wealthDeltaSum / stats.count;
    if (hasTrait(ruler, 'industrious')) wealthDelta += 0.5;
    if (hasTrait(ruler, 'corrupt'))    wealthDelta += 0.3;

    const upkeep   = (faction.military / 100) * 2;
    const netWealth = wealthDelta - upkeep;

    if (netWealth > 1.5 && faction.wealth < 80 && rng.nextFloat() < 0.25) {
      const deltas: StatDelta[] = [{ factionId: faction.id, stat: 'wealth', delta: Math.round(netWealth * 3) }];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'trade_boom', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `Trade flourished in ${faction.name}'s territories`,
        motivation: pickMotivation('trade_boom', rng),
        statDeltas: deltas,
      }), year);
    } else if (netWealth < -1 && faction.wealth > 20 && rng.nextFloat() < 0.3) {
      const deltas: StatDelta[] = [{ factionId: faction.id, stat: 'wealth', delta: Math.round(netWealth * 2) }];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'economic_decline', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name}'s treasury strained under military costs`,
        motivation: 'as the cost of their armies outpaced what the land could yield',
        statDeltas: deltas,
      }), year);
    }

    // Resource node bonuses: iron → military, gold → wealth, relic → culture
    applyResourceNodeBonuses(world, faction, year);
  }

  return events;
}

/** Apply per-year stat bonuses from resource nodes controlled by the faction. */
function applyResourceNodeBonuses(
  world: WorldState,
  faction: import('../../types').Faction,
  year: number,
): void {
  const controlledNodes = world.resourceNodes.filter(node => {
    const tile = world.map.tiles[node.position.y]?.[node.position.x];
    return tile?.factionId === faction.id;
  });

  if (controlledNodes.length === 0) return;

  const deltas: StatDelta[] = [];
  for (const node of controlledNodes) {
    if (node.type === 'iron')  deltas.push({ factionId: faction.id, stat: 'military', delta: 3 });
    if (node.type === 'gold')  deltas.push({ factionId: faction.id, stat: 'wealth',   delta: 3 });
    if (node.type === 'relic') deltas.push({ factionId: faction.id, stat: 'culture',  delta: 2 });
  }

  // Collapse deltas by stat
  const collapsed = deltas.reduce<Partial<Record<string, number>>>((acc, d) => {
    acc[d.stat] = (acc[d.stat] ?? 0) + d.delta;
    return acc;
  }, {});

  const collapsedDeltas: StatDelta[] = (Object.entries(collapsed) as [string, number][]).map(
    ([stat, delta]) => ({ factionId: faction.id, stat: stat as import('../../types').FactionStatKey, delta }),
  );

  // Emit once per year per faction (significance=1 keeps it under storyteller gating)
  world.events.push(createEvent({
    tick: 0, year,
    subject: faction.id, action: 'resource_yield', object: faction.id,
    causedBy: null, significance: 1, playerCaused: false,
    description: `${faction.name} drew yield from ${controlledNodes.length} resource node(s)`,
    motivation: 'strategic control of natural wealth',
    statDeltas: collapsedDeltas,
  }));
}
