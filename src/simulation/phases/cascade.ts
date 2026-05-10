import type { Faction, GameEvent, StatDelta, WorldState } from '../../types';
import { createEvent } from '../../world/events.ts';
import type { SeededRNG } from '../../utils/rng.ts';
import { CASCADE_SIGNIFICANCE_MIN, CASCADE_LOOKBACK_YEARS, REBELLION_STABILITY_MIN, pickMotivation } from '../constants.ts';
import { getCascadeThreshold, registerHighSigEvent, shouldSuppressEvent } from '../storyteller.ts';
import { getFactionStat } from '../helpers/stats.ts';
import { getNeighboringFactions } from '../helpers/spatial.ts';

function emitEvent(world: WorldState, pool: GameEvent[], event: GameEvent, year: number): void {
  if (shouldSuppressEvent(world.storyteller, year, event.significance)) return;
  pool.push(event);
  registerHighSigEvent(world.storyteller, event, year);
}

export function phaseCascade(
  world: WorldState,
  recentEvents: GameEvent[],
  year: number,
  rng: SeededRNG,
): GameEvent[] {
  const cascadeEvents: GameEvent[] = [];
  // Track which factions already got a cascade-triggered rebellion this tick
  // to prevent triple-stacking from deriveConsequence + checkThresholdEvents.
  const rebelled = new Set<string>();

  const lookbackYear = year - CASCADE_LOOKBACK_YEARS;
  const playerEvents = [...world.events.filter(e => e.year > lookbackYear), ...recentEvents].filter(
    e => e.playerCaused && e.significance >= CASCADE_SIGNIFICANCE_MIN,
  );

  for (const trigger of playerEvents) {
    if (rng.nextFloat() > getCascadeThreshold(world.storyteller, trigger.subject, year)) continue;

    for (const delta of trigger.statDeltas) {
      const faction = world.factions.find(f => f.id === delta.factionId);
      if (!faction) continue;
      if (rebelled.has(faction.id)) continue;

      const consequence = deriveConsequence(faction, delta, trigger, world, year, rng);
      if (consequence && !shouldSuppressEvent(world.storyteller, year, consequence.significance)) {
        cascadeEvents.push(consequence);
        registerHighSigEvent(world.storyteller, consequence, year);
        if (consequence.action === 'internal_rebellion') {
          rebelled.add(faction.id);
        }
        if (consequence.action === 'military_buildup') {
          const rel = world.relationships.find(r =>
            (r.factionA === consequence.subject || r.factionB === consequence.subject) &&
            (r.factionA === consequence.object || r.factionB === consequence.object),
          );
          if (rel) rel.animosity = Math.min(200, rel.animosity + 20);
        }
      }
    }
  }

  for (const faction of world.factions) {
    if (rebelled.has(faction.id)) continue;
    checkThresholdEvents(world, faction, year, rng, playerEvents, cascadeEvents, rebelled);
  }

  return cascadeEvents;
}

export function deriveConsequence(
  faction: Faction,
  delta: StatDelta,
  parentEvent: GameEvent,
  world: WorldState,
  year: number,
  rng: SeededRNG,
): GameEvent | null {
  const stat = delta.stat;
  const newValue = getFactionStat(faction, stat);

  if (stat === 'stability' && delta.delta < 0 && newValue < REBELLION_STABILITY_MIN) {
    const deltas: StatDelta[] = [
      { factionId: faction.id, stat: 'stability', delta: -10 },
      { factionId: faction.id, stat: 'military', delta: -8 },
      { factionId: faction.id, stat: 'population', delta: -30 },
    ];
    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action: 'internal_rebellion',
      object: faction.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `Instability within ${faction.name} erupted into open rebellion`,
      motivation: pickMotivation('rebellion', rng),
      statDeltas: deltas,
    });
  }

  if (stat === 'culture' && delta.delta > 0 && newValue > 40 && rng.nextFloat() < 0.4) {
    const neighbors = getNeighboringFactions(world, faction.id);
    if (neighbors.length === 0) return null;
    const target = neighbors[rng.nextInt(neighbors.length)];

    const deltas: StatDelta[] = [
      { factionId: faction.id, stat: 'culture', delta: 5 },
      { factionId: target.id, stat: 'stability', delta: -5 },
    ];
    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action: 'cultural_spread',
      object: target.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `The influence of ${faction.name} spread into ${target.name}'s territory`,
      motivation: pickMotivation('cultural_spread', rng),
      statDeltas: deltas,
    });
  }

  if (stat === 'military' && delta.delta > 0 && newValue > 50) {
    const rel = world.relationships.find(r =>
      (r.factionA === faction.id || r.factionB === faction.id) &&
      r.state !== 'war' && r.opinion < -20,
    );
    if (!rel) return null;

    const targetId = rel.factionA === faction.id ? rel.factionB : rel.factionA;
    const target = world.factions.find(f => f.id === targetId);
    if (!target) return null;

    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action: 'military_buildup',
      object: target.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `${faction.name}'s military buildup alarmed ${target.name}`,
      motivation: 'as their growing armies cast long shadows over neighboring lands',
      statDeltas: [{ factionId: target.id, stat: 'stability', delta: -5 }],
    });
  }

  return null;
}

function checkThresholdEvents(
  world: WorldState,
  faction: Faction,
  year: number,
  rng: SeededRNG,
  playerEvents: GameEvent[],
  events: GameEvent[],
  rebelled: Set<string>,
): void {
  if (faction.stability < REBELLION_STABILITY_MIN && rng.nextFloat() < 0.35) {
    const precursor = playerEvents.find(e =>
      e.statDeltas.some(d => d.factionId === faction.id && d.stat === 'stability'),
    );
    if (precursor && !rebelled.has(faction.id)) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'stability', delta: -8 },
        { factionId: faction.id, stat: 'population', delta: -20 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id,
        action: 'internal_rebellion',
        object: faction.id,
        causedBy: precursor.id,
        significance: 5,
        playerCaused: true,
        description: `${faction.name} tore itself apart in civil strife`,
        motivation: pickMotivation('rebellion', rng),
        statDeltas: deltas,
      }), year);
      rebelled.add(faction.id);
    }
  }
}

export const cascadeTesting = {
  deriveConsequence,
  phaseCascade,
} as const;
