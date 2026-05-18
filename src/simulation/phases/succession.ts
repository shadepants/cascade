// ─── Phase 5c: Succession ─────────────────────────────────────────────────
// Ruler death, dynastic succession, and succession crises.
// Also exports ruler utilities used by economics.ts and politics.ts.

import type {
  WorldState, GameEvent, Faction, HistoricalFigure, RulerTrait,
} from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { NPC_NAMES } from '../../data/names.ts';
import { fractureFaction } from './conflict.ts';
import { shouldSuppressEvent } from '../storyteller.ts';

// ─── Ruler Utilities (shared by economics.ts and politics.ts) ─────────────

export function getRulerForFaction(world: WorldState, factionId: string): HistoricalFigure | null {
  const faction = world.factions.find(f => f.id === factionId);
  if (!faction || !faction.leaderId) return null;
  return world.historicalFigures.find(hf => hf.id === faction.leaderId) ?? null;
}

export function hasTrait(hf: HistoricalFigure | null, trait: RulerTrait): boolean {
  if (!hf || !hf.traits) return false;
  return hf.traits.includes(trait);
}

function spawnNewRuler(_world: WorldState, faction: Faction, year: number, rng: GameRNG): HistoricalFigure {
  const traitPool: RulerTrait[] = ['bloodthirsty', 'industrious', 'xenophobic', 'diplomatic', 'pious', 'corrupt'];
  const name = NPC_NAMES[rng.nextInt(NPC_NAMES.length)];

  return {
    id:        `ruler_${faction.id}_${year}`,
    name:      `${name} of ${faction.name}`,
    factionId: faction.id,
    role:      'ruler',
    values: {
      ambition:   rng.nextInt(101) - 50,
      loyalty:    rng.nextInt(101) - 50,
      compassion: rng.nextInt(101) - 50,
      cunning:    rng.nextInt(101) - 50,
    },
    traits:     [traitPool[rng.nextInt(traitPool.length)]],
    bornYear:   year - (rng.nextInt(30) + 20),
    diedYear:   null,
    legitimacy: 70 + rng.nextInt(30),
  };
}

// ─── Phase Runner ──────────────────────────────────────────────────────────

export function phaseSuccession(world: WorldState, year: number, rng: GameRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const ruler = getRulerForFaction(world, faction.id);
    if (!ruler) continue;

    const age = year - ruler.bornYear;
    const deathChance = Math.max(0, (age - 50) * 0.012);

    if (rng.nextFloat() < deathChance) {
      const deathEvent = createEvent({
        tick: 0, year,
        subject: ruler.id, action: 'death', object: faction.id,
        causedBy: null, significance: 6, playerCaused: false,
        description: `${ruler.name}, ruler of ${faction.name}, has died at age ${age}`,
        motivation: 'natural causes and the passage of time',
      });

      if (!shouldSuppressEvent(world.storyteller, year, deathEvent.significance)) {
        ruler.diedYear = year;
        emitEvent(world, events, deathEvent, year);

        if (ruler.legitimacy < 45 && rng.nextFloat() < 0.4) {
          const fractureEvent = fractureFaction(world, faction, year, rng);
          if (fractureEvent) {
            fractureEvent.description = `A succession crisis following ${ruler.name}'s death shattered ${faction.name}`;
            emitEvent(world, events, fractureEvent, year);
          }
        } else {
          const newRuler = spawnNewRuler(world, faction, year, rng);

          const ascensionEvent = createEvent({
            tick: 0, year,
            subject: newRuler.id, action: 'ascension', object: faction.id,
            causedBy: null, significance: 5, playerCaused: false,
            description: `${newRuler.name} has ascended to the throne of ${faction.name}`,
            motivation: 'orderly dynastic succession',
          });

          if (!shouldSuppressEvent(world.storyteller, year, ascensionEvent.significance)) {
            world.historicalFigures.push(newRuler);
            faction.leaderId = newRuler.id;
            emitEvent(world, events, ascensionEvent, year);
          }
        }
      }
    }
  }

  return events;
}
