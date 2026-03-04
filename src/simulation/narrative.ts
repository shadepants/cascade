// ─── Narrative Intelligence (Socratic Gate) ──────────────────────────────
// Assembles historical context and applies faction/personality biases
// to generate characterful dialogue via LLM or templates.

import type { WorldState, NPC, GameEvent } from '../types.ts';
import { DIALOGUE, fillTemplate } from '../data/templates.ts';

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
  };
}

/**
 * Generate a prompt for the Socratic Gate.
 * This can be sent to a proxy (Anthropic/OpenAI) or used to drive templates.
 */
export function buildSocraticPrompt(ctx: NarrativeContext): string {
  return `
You are ${ctx.npcName}, a ${ctx.personality} member of the ${ctx.factionName} faction.
Your faction's core ethics are: ${ctx.factionEthics}.

Below is your knowledge of recent history. Speak about these events with the heavy bias 
of your personality and faction. If your accuracy is low, be hesitant or prone to 
superstitious exaggeration. If an event was caused by "The Traveler", react with 
appropriate awe, fear, or skepticism.

Historical Knowledge:
${ctx.recentEvents.join('\n')}

Greeting: Describe your current mood and how you view the stranger before you.
History: Synthesize the events above into a short, biased narrative.
  `.trim();
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
