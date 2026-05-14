import type { GameEvent, WorldState, NPC } from '../../types';
import { getGossipBoost } from '../storyteller.ts';
import type { GameRNG } from '../../utils/rng.ts';

export function seedEventKnowledge(
  world: WorldState,
  events: GameEvent[],
  year: number,
  rng: GameRNG,
): void {
  // Group alive NPCs by factionId once: O(N)
  const npcsByFaction = new Map<string, NPC[]>();
  for (const npc of world.npcs) {
    if (!npc.alive) continue;
    const list = npcsByFaction.get(npc.factionId) || [];
    list.push(npc);
    npcsByFaction.set(npc.factionId, list);
  }

  // Process events: O(E * NPCs_in_faction)
  for (const event of events) {
    const witnessNpcs = npcsByFaction.get(event.subject) || [];
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
  const npcMap = new Map(world.npcs.map(n => [n.id, n]));

  for (const settlement of world.settlements) {
    // Efficiently get alive NPCs in this settlement: O(NPCs_in_settlement)
    const settlementNpcs = settlement.npcs
      .map(id => npcMap.get(id))
      .filter((n): n is NPC => !!n && n.alive);
      
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

export function phaseDiffusion(world: WorldState, year: number, rng: GameRNG): void {
  const npcMap = new Map(world.npcs.map(n => [n.id, n]));
  // Pre-filter alive NPCs with knowledge once: O(N)
  const potentialSourceNpcs = world.npcs.filter(n => n.alive && n.knowledge.length > 0);

  // 5% chance per settlement to receive a piece of news from a distant land
  for (const settlement of world.settlements) {
    if (rng.nextFloat() < 0.05) {
      // Pick a random NPC in this settlement to receive the news
      const localNpcs = settlement.npcs
        .map(id => npcMap.get(id))
        .filter((n): n is NPC => !!n && n.alive);
        
      if (localNpcs.length === 0) continue;
      const targetNpc = localNpcs[rng.nextInt(localNpcs.length)];

      // Pick a random other NPC in the world who knows something (and isn't in this settlement)
      const settlementNpcIds = new Set(settlement.npcs);
      const sourceNpcs = potentialSourceNpcs.filter(n => !settlementNpcIds.has(n.id));
      
      if (sourceNpcs.length === 0) continue;
      const sourceNpc = sourceNpcs[rng.nextInt(sourceNpcs.length)];
      
      const knowledgeToShare = sourceNpc.knowledge[rng.nextInt(sourceNpc.knowledge.length)];
      
      // If target doesn't know it, share it with a heavy accuracy penalty (it traveled a long way)
      if (!targetNpc.knowledge.some(k => k.eventId === knowledgeToShare.eventId)) {
        targetNpc.knowledge.push({
          eventId: knowledgeToShare.eventId,
          discoveredYear: year,
          accuracy: knowledgeToShare.accuracy * 0.7, // Heavy decay for long distance
          sourceId: `traveler_from_${sourceNpc.id}`,
        });
      }
    }
  }
}

export function runKnowledgePipeline(
  world: WorldState,
  allYearEvents: GameEvent[],
  year: number,
  rng: GameRNG,
): GameEvent[] {
  // Seed knowledge from all events this year so NPCs witness wars, famines, alliances, etc.
  seedEventKnowledge(world, allYearEvents, year, rng);
  phaseGossip(world, year, rng);
  phaseDiffusion(world, year, rng);
  return []; // phases now mutate world state directly via npcs array
}

