// ─── Phase 3: Politics ────────────────────────────────────────────────────
// Ethics divergence, animosity accumulation, alliance formation.

import type { WorldState, GameEvent, StatDelta } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { computeEthicsDivergence } from '../../world/factions.ts';
import { emitEvent } from '../emitEvent.ts';
import { ALLIANCE_OPINION_MIN, pickMotivation } from '../constants.ts';
import { getRulerForFaction, hasTrait } from './succession.ts';

export function phasePolitics(
  world: WorldState,
  year: number,
  rng: SeededRNG,
  _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    const fA = world.factions.find(f => f.id === rel.factionA);
    const fB = world.factions.find(f => f.id === rel.factionB);
    if (!fA || !fB) continue;

    const rulerA = getRulerForFaction(world, fA.id);
    const rulerB = getRulerForFaction(world, fB.id);

    // Ethics divergence increases animosity
    const divergence = computeEthicsDivergence(fA.ethics, fB.ethics);
    if (divergence > 2) {
      rel.animosity = Math.min(200, rel.animosity + Math.round(divergence * 0.5));
    }

    if (hasTrait(rulerA, 'xenophobic') || hasTrait(rulerB, 'xenophobic')) {
      rel.animosity = Math.min(200, rel.animosity + 2);
    }

    if (hasTrait(rulerA, 'diplomatic') || hasTrait(rulerB, 'diplomatic')) {
      rel.opinion = Math.min(100, rel.opinion + 1);
    }

    // Alliance: high opinion + peace + both stable
    if (
      rel.state === 'peace' &&
      rel.opinion >= ALLIANCE_OPINION_MIN &&
      fA.stability >= 40 && fB.stability >= 40 &&
      rng.nextFloat() < 0.05
    ) {
      rel.state = 'alliance';
      const deltas: StatDelta[] = [
        { factionId: fA.id, stat: 'stability', delta: 5 },
        { factionId: fB.id, stat: 'stability', delta: 5 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: fA.id, action: 'alliance_formed', object: fB.id,
        causedBy: null, significance: 5, playerCaused: false,
        description: `${fA.name} and ${fB.name} forged a formal alliance`,
        motivation: pickMotivation('alliance_formed', rng),
        statDeltas: deltas,
      }), year);
    }
  }

  // Aggression decay/growth driven by ruler trait (once per faction, not per relationship)
  for (const faction of world.factions) {
    const ruler = getRulerForFaction(world, faction.id);
    if (hasTrait(ruler, 'diplomatic') && faction.aggression > 0) {
      faction.aggression = Math.max(0, faction.aggression - 1);
    }
    if (hasTrait(ruler, 'xenophobic') && faction.aggression < 100) {
      faction.aggression = Math.min(100, faction.aggression + 1);
    }
  }

  return events;
}
