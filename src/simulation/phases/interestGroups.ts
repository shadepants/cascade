// ─── Phase 2.5: Interest Groups ───────────────────────────────────────────
// Internal power blocs that shift faction ethics and stability.

import type { WorldState, GameEvent, FactionEthics, EthicStance } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';

export function phaseInterestGroups(world: WorldState, year: number, rng: GameRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    if (!faction.interestGroups) faction.interestGroups = [];

    for (const ig of faction.interestGroups) {
      let powerDelta = 0;
      if (ig.type === 'military' && faction.military > 60)  powerDelta += 2;
      if (ig.type === 'military' && faction.stability < 40) powerDelta += 3; // martial law
      if (ig.type === 'merchant' && faction.wealth > 60)    powerDelta += 2;
      if (ig.type === 'religious' && faction.culture > 50)  powerDelta += 2;

      ig.power = Math.max(5, Math.min(100, ig.power + powerDelta - 1)); // −1 natural decay

      if (ig.power > 70 && rng.nextFloat() < 0.1) {
        const entry = Object.entries(ig.ethicsBias)[
          rng.nextInt(Object.keys(ig.ethicsBias).length)
        ] as [keyof FactionEthics, EthicStance];

        if (entry && faction.ethics[entry[0]] !== entry[1]) {
          faction.ethics[entry[0]] = entry[1];
          emitEvent(world, events, createEvent({
            tick: 0, year,
            subject: faction.id, action: 'ethics_shift', object: ig.id,
            causedBy: null, significance: 4, playerCaused: false,
            description: `The ${ig.name} shifted ${faction.name}'s stance on ${String(entry[0])} towards ${entry[1]}`,
            motivation: 'political lobbying and internal pressure',
          }), year);
        }
      }
    }
  }

  return events;
}
