import type { GameEvent, WorldState } from '../../types';
import { getGossipBoost } from '../storyteller.ts';
import type { GameRNG } from '../../utils/rng.ts';

export function seedEventKnowledge(
  world: WorldState,
  events: GameEvent[],
  year: number,
  rng: GameRNG,
): void {
  for (const event of events) {
    const affectedFactionId = event.subject;
    const witnessNpcs = world.npcs.filter(
      n => n.alive && n.factionId === affectedFactionId,
    );
    for (const npc of witnessNpcs) {
      if (npc.knowledge.some(k => k.eventId === event.id)) continue;
      const accuracy = 0.75 + rng.nextFloat() * 0.25;
      npc.knowledge.push({
        eventId: event.id,
        discoveredYear: year,
        accuracy,
        sourceId: 'direct',
      });
    }
  }
}

export function phaseGossip(world: WorldState, year: number, rng: GameRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const settlement of world.settlements) {
    const settlementNpcs = world.npcs.filter(n => settlement.npcs.includes(n.id) && n.alive);
    if (settlementNpcs.length < 2) continue;

    for (let i = 0; i < settlementNpcs.length; i++) {
      const npcA = settlementNpcs[i];
      const npcB = settlementNpcs[(i + 1) % settlementNpcs.length];

      const gossipProb = getGossipBoost(world.storyteller, npcA.factionId, year);
      if (npcA.knowledge.length > 0 && rng.nextFloat() < gossipProb) {
        const knowledgeToShare = npcA.knowledge[rng.nextInt(npcA.knowledge.length)];

        if (!npcB.knowledge.some(k => k.eventId === knowledgeToShare.eventId)) {
          npcB.knowledge.push({
            eventId: knowledgeToShare.eventId,
            discoveredYear: year,
            accuracy: knowledgeToShare.accuracy * 0.9,
            sourceId: npcA.id,
          });
        }
      }
    }
  }

  return events;
}

export function runKnowledgePipeline(
  world: WorldState,
  allYearEvents: GameEvent[],
  year: number,
  rng: GameRNG,
): GameEvent[] {
  // Seed knowledge from all events this year so NPCs witness wars, famines, alliances, etc.
  seedEventKnowledge(world, allYearEvents, year, rng);
  return phaseGossip(world, year, rng);
}
