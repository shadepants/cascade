// ─── Narrative Intelligence (Socratic Gate) ──────────────────────────────
// Assembles historical context and applies faction/personality biases
// to generate characterful dialogue via LLM or templates.

import type { WorldState, NPC, GameEvent, NPCKnowledge } from '../types';
import { 
  DIALOGUE, 
  fillTemplate, 
  EXPANDED_DIALOGUE, 
  EVENT_ACTION_VOCAB, 
  findKnowledgeChain, 
  generateEthicsComment,
  getAccuracyTier,
  type EventActionType
} from '../data/templates.ts';
import { SeededRNG } from '../utils/rng.ts';

/**
 * Assembly of context for the 'Socratic Gate' narrative layer.
 * Filters NPC knowledge for significance and builds a biased prompt.
 */
export interface NarrativeContext {
  npcName: string;
  personality: string;
  factionName: string;
  factionEthics: string;
  recentEvents: string[]; // Formatted summaries for the LLM
  innovations: string[];
}

/** 
 * Build the context needed for a biased historical account.
 */
export function assembleNarrativeContext(
  npc: NPC, 
  world: WorldState
): NarrativeContext {
  const faction = world.factions.find(f => f.id === npc.factionId);
  const factionName = faction?.name ?? 'Unknown';
  const settlement = world.settlements.find(s => s.npcs.includes(npc.id));

  // Identify top 3 most significant/accurate events the NPC knows
  const knownEvents = npc.knowledge
    .map(k => ({
      event: world.events.find(e => e.id === k.eventId),
      accuracy: k.accuracy
    }))
    .filter((k): k is { event: GameEvent; accuracy: number } => k.event != null)
    .sort((a, b) => (b.event.significance * b.accuracy) - (a.event.significance * a.accuracy))
    .slice(0, 3);

  const eventSummaries = knownEvents.map(k => {
    const e = k.event;
    const yearStr = `Year ${e.year}`;
    const desc = e.description;
    const accuracyStr = k.accuracy > 0.8 ? 'certain' : k.accuracy > 0.5 ? 'rumored' : 'vague legend';
    return `[${yearStr}, ${accuracyStr}] ${desc}`;
  });

  // Format ethics for the prompt
  const ethicsStr = faction ? 
    Object.entries(faction.ethics)
      .map(([key, val]) => `${key}:${val}`)
      .join(', ') 
    : 'neutral';

  return {
    npcName: npc.name,
    personality: npc.personality,
    factionName,
    factionEthics: ethicsStr,
    recentEvents: eventSummaries,
    innovations: settlement?.innovations.map(id => world.innovations.find(i => i.id === id)?.name).filter(Boolean) as string[],
  };
}

/**
 * Generate a prompt for the Socratic Gate (Deep Interrogation).
 * This focuses on philosophical/emotional depth rather than facts.
 */
export function buildInterrogationPrompt(ctx: NarrativeContext): string {
  const innovationStr = ctx.innovations.length > 0
    ? `\nYour settlement has mastered: ${ctx.innovations.join(', ')}.`
    : '';

  return `
You are ${ctx.npcName}, a ${ctx.personality} member of the ${ctx.factionName} faction.
Your faction's core ethics are: ${ctx.factionEthics}.${innovationStr}

Historical Context:
${ctx.recentEvents.join('\n')}

The stranger before you asks for deep insight. Speak from your soul. 
How do these events make you feel? What do you believe they mean for the future of your people?
Focus on philosophy, emotion, and the "why" rather than just repeating the facts. 
Be concise but profound.
  `.trim();
}

/**
 * Deterministically synthesize the NPC's known history into a characterful monologue.
 * This is the "Simulated Dialogue" used for instant responses.
 */
export function synthesizeHistoryMonologue(npc: NPC, world: WorldState): string {
  // Seed based on world and NPC to ensure consistency across re-renders but uniqueness per NPC/Year
  const seed = world.seed + world.currentYear + npc.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = new SeededRNG(seed);
  const pick = <T>(arr: T[]) => arr[rng.nextInt(arr.length)];

  const faction = world.factions.find(f => f.id === npc.factionId);
  const factionName = faction?.name ?? 'Unknown';
  const settlement = world.settlements.find(s => s.npcs.includes(npc.id));

  // 1. Greeting
  const greeting = fillTemplate(EXPANDED_DIALOGUE.greeting[npc.personality], {
    name: npc.name,
    faction: factionName,
  });

  // 1.5 Innovation mention (if any)
  let innovationMention = '';
  if (settlement && settlement.innovations.length > 0) {
    const techId = settlement.innovations[settlement.innovations.length - 1];
    const tech = world.innovations.find(i => i.id === techId);
    if (tech) {
      const templates = [
        `We have recently mastered ${tech.name}. It changes everything.`,
        `The scholars speak much of ${tech.name} these days.`,
        `${tech.name} has brought new life to ${settlement.name}.`,
        `I still don't quite understand ${tech.name}, but the rulers say it is our future.`
      ];
      innovationMention = `\n\n${pick(templates)}`;
    }
  }

  // 2. History Synthesis
  const chain = findKnowledgeChain(npc.knowledge, world.events);
  let history = '';

  if (chain && chain.length >= 2) {
    // Multi-event synthesis (The "Deep Thread")
    const event1 = chain[0];
    const event2 = chain[1];
    
    // Get voiced action descriptions
    const action1 = EVENT_ACTION_VOCAB[event1.action as EventActionType]?.[npc.personality] ?? event1.description;
    const action2 = EVENT_ACTION_VOCAB[event2.action as EventActionType]?.[npc.personality] ?? event2.description;

    const synthComment = faction ? generateEthicsComment(event2.action, faction.ethics, pick) : '';

    const subject1 = world.factions.find(f => f.id === event1.subject)?.name ?? event1.subject;
    const object1  = world.factions.find(f => f.id === event1.object)?.name  ?? event1.object;
    const subject2 = world.factions.find(f => f.id === event2.subject)?.name ?? event2.subject;
    const object2  = world.factions.find(f => f.id === event2.object)?.name  ?? event2.object;

    history = fillTemplate(EXPANDED_DIALOGUE.multiEventSynthesis[npc.personality], {
      name: npc.name,
      event1: fillTemplate(action1, { subject: subject1, object: object1 }),
      event2: fillTemplate(action2, { subject: subject2, object: object2 }),
      synthComment,
      faction: factionName,
    });
  } else {
    // Single significant event or general knowledge (The "Snapshot")
    const topKnowledge = npc.knowledge
      .map(k => ({ knowledge: k, event: world.events.find(e => e.id === k.eventId) }))
      .filter((k): k is { knowledge: NPCKnowledge, event: GameEvent } => k.event != null)
      .sort((a, b) => (b.event.significance * b.knowledge.accuracy) - (a.event.significance * a.knowledge.accuracy))[0];

    if (topKnowledge) {
      const event = topKnowledge.event;
      const accuracyTier = getAccuracyTier(topKnowledge.knowledge.accuracy);
      const template = EXPANDED_DIALOGUE.eventKnowledge[accuracyTier][npc.personality];
      
      const action = EVENT_ACTION_VOCAB[event.action as EventActionType]?.[npc.personality] ?? event.description;
      const ethicsComment = faction ? generateEthicsComment(event.action, faction.ethics, pick) : '';

      const subject = world.factions.find(f => f.id === event.subject)?.name ?? event.subject;
      const object  = world.factions.find(f => f.id === event.object)?.name  ?? event.object;

      history = fillTemplate(template, {
        name: npc.name,
        year: String(event.year),
        event: fillTemplate(action, { subject, object }),
        ethicsComment,
        faction: factionName,
      });
    } else {
      history = fillTemplate(EXPANDED_DIALOGUE.noKnowledge, { name: npc.name });
    }
  }

  return `${greeting}\n\n${history}`;
}

/**
 * Fallback to the template system if LLM is unavailable.
 */
export function getTemplateDialogue(npc: NPC, world: WorldState): string[] {
  const faction = world.factions.find(f => f.id === npc.factionId);
  const factionName = faction?.name ?? 'Unknown';
  
  const knownEvents = npc.knowledge
    .map(k => world.events.find(e => e.id === k.eventId))
    .filter((e): e is GameEvent => e != null);

  return knownEvents.map(event =>
    fillTemplate(DIALOGUE.eventKnowledge[npc.personality], {
      name: npc.name,
      faction: factionName,
      event: event.description,
      year: String(event.year),
    })
  );
}
