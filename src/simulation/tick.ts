// ─── Simplified Tick Loop (3-Phase) ─────────────────────────────────────
// Runs the time-jump simulation. Takes the current world state and advances
// it by N years. Mutates the world state in place for POC simplicity.
//
// Three phases per tick:
//   1. Diplomacy — faction relationships shift based on events
//   2. Conflict  — if aggression > threshold, war breaks out
//   3. Events    — cascade player actions forward, generate new events

import type {
  WorldState, GameEvent,
} from '../types.ts';
import { createEvent } from '../world/events.ts';
import { SeededRNG } from '../utils/rng.ts';

const WAR_THRESHOLD = 60;    // aggression + negative opinion triggers conflict
const CASCADE_MIN_SIGNIFICANCE = 3; // only propagate events above this

/** Run the time-jump simulation. Returns new events generated. */
export function runSimulation(
  world: WorldState,
  jumpYears: number,
): GameEvent[] {
  const rng = new SeededRNG(world.seed + world.currentYear);
  const newEvents: GameEvent[] = [];

  for (let year = 0; year < jumpYears; year++) {
    const currentYear = world.currentYear + year + 1;
    const tick = currentYear;

    // Phase 1: Diplomacy
    const diplomacyEvents = phaseDiplomacy(world, tick, currentYear, rng);
    newEvents.push(...diplomacyEvents);

    // Phase 2: Conflict
    const conflictEvents = phaseConflict(world, tick, currentYear, rng);
    newEvents.push(...conflictEvents);

    // Phase 3: Cascade propagation
    const cascadeEvents = phaseCascade(world, newEvents, tick, currentYear, rng);
    newEvents.push(...cascadeEvents);
  }

  // Add all new events to world
  world.events.push(...newEvents);
  world.currentYear += jumpYears;

  return newEvents;
}

/** Phase 1: Shift faction relationships based on proximity and events. */
function phaseDiplomacy(
  world: WorldState,
  tick: number,
  year: number,
  rng: SeededRNG,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    // Random drift
    const drift = rng.nextInt(11) - 5; // -5 to +5
    rel.opinion = Math.max(-100, Math.min(100, rel.opinion + drift));

    // Significant shift generates an event
    if (Math.abs(drift) >= 4) {
      events.push(createEvent({
        tick,
        year,
        subject: rel.factionA,
        action: drift > 0 ? 'improved_relations' : 'worsened_relations',
        object: rel.factionB,
        causedBy: null,
        significance: 2,
        playerCaused: false,
        description: `Relations between ${rel.factionA} and ${rel.factionB} ${drift > 0 ? 'improved' : 'deteriorated'}`,
      }));
    }
  }

  return events;
}

/** Phase 2: Check for war when aggression + negative opinion exceed threshold. */
function phaseConflict(
  world: WorldState,
  tick: number,
  year: number,
  rng: SeededRNG,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    const factionA = world.factions.find(f => f.id === rel.factionA);
    const factionB = world.factions.find(f => f.id === rel.factionB);
    if (!factionA || !factionB) continue;

    const warScore = Math.max(factionA.aggression, factionB.aggression) + Math.abs(Math.min(0, rel.opinion));

    if (warScore > WAR_THRESHOLD && rng.nextFloat() < 0.15) {
      // War! Determine winner by aggression + randomness
      const aStrength = factionA.aggression + rng.nextInt(30);
      const bStrength = factionB.aggression + rng.nextInt(30);
      const winner = aStrength >= bStrength ? factionA : factionB;
      const loser = winner === factionA ? factionB : factionA;

      events.push(createEvent({
        tick,
        year,
        subject: winner.id,
        action: 'conquered',
        object: loser.id,
        causedBy: null,
        significance: 7,
        playerCaused: false,
        description: `${winner.name} conquered territory from ${loser.name}`,
      }));

      // Shift territory (simplified: reduce loser aggression)
      loser.aggression = Math.max(10, loser.aggression - 15);
      rel.opinion = -80; // deep hostility after war

      // Actually transfer territory on the map
      const TILES_TO_TRANSFER_PERCENT = 0.2; // 20% of territory
      const loserTiles: {x: number, y: number}[] = [];
      for (let y = 0; y < world.map.height; y++) {
        for (let x = 0; x < world.map.width; x++) {
          if (world.map.tiles[y][x].factionId === loser.id) {
            loserTiles.push({x, y});
          }
        }
      }

      const tilesToTransferCount = Math.floor(loserTiles.length * TILES_TO_TRANSFER_PERCENT);
      for (let i = 0; i < tilesToTransferCount; i++) {
        if (loserTiles.length === 0) break;
        const tileIndex = rng.nextInt(loserTiles.length);
        const tileCoords = loserTiles[tileIndex];
        world.map.tiles[tileCoords.y][tileCoords.x].factionId = winner.id;
        loserTiles.splice(tileIndex, 1);
      }
    }
  }

  return events;
}

/** Phase 3: Propagate player-caused events forward via cascade rules. */
function phaseCascade(
  world: WorldState,
  recentEvents: GameEvent[],
  tick: number,
  year: number,
  rng: SeededRNG,
): GameEvent[] {
  const cascadeEvents: GameEvent[] = [];

  // Find significant player-caused events that haven't been cascaded yet
  const playerEvents = [...world.events, ...recentEvents].filter(
    e => e.playerCaused && e.significance >= CASCADE_MIN_SIGNIFICANCE,
  );

  for (const event of playerEvents) {
    // Each significant event has a chance to spawn a consequence
    if (rng.nextFloat() > 0.3) continue; // 30% chance per year

    const consequence = generateConsequence(event, world, tick, year, rng);
    if (consequence) {
      cascadeEvents.push(consequence);
    }
  }

  return cascadeEvents;
}

/** Generate a downstream consequence of a player-caused event. */
function generateConsequence(
  parentEvent: GameEvent,
  world: WorldState,
  tick: number,
  year: number,
  rng: SeededRNG,
): GameEvent | null {
  const templates = [
    { action: 'sparked_rebellion', desc: 'sparked a rebellion' },
    { action: 'caused_migration', desc: 'caused a wave of refugees' },
    { action: 'inspired_alliance', desc: 'inspired an unexpected alliance' },
    { action: 'triggered_famine', desc: 'triggered economic collapse and famine' },
    { action: 'elevated_leader', desc: 'elevated a new faction leader' },
  ];

  const template = templates[rng.nextInt(templates.length)];
  const targetFaction = world.factions[rng.nextInt(world.factions.length)];

  return createEvent({
    tick,
    year,
    subject: parentEvent.object,
    action: template.action,
    object: targetFaction.id,
    causedBy: parentEvent.id,
    significance: Math.max(1, parentEvent.significance - 1),
    playerCaused: true, // downstream of player action
    description: `The aftermath of "${parentEvent.description}" ${template.desc} in ${targetFaction.name}`,
  });
}
