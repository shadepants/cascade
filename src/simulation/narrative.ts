// ─── Narrative Intelligence (Socratic Gate) ──────────────────────────────
// Assembles historical context and applies faction/personality biases
// to generate characterful dialogue via LLM or templates.

import type { WorldState, NPC, GameEvent, NPCKnowledge } from '../types';
import { 
  DIALOGUE, 
  fillTemplate, 
  EXPANDED_DIALOGUE, 
  EVENT_ACTION_VOCAB,
  generateEthicsComment,
  getAccuracyTier,
  type EventActionType
} from '../data/templates.ts';
import { SeededRNG } from '../utils/rng.ts';

/**
 * Deterministically mutate an event if accuracy is low (Legend tier).
 * Swaps subjects/objects with other random factions.
 */
function mutateEvent(
  event: GameEvent, 
  accuracy: number, 
  world: WorldState, 
  rng: SeededRNG
): GameEvent {
  // Only legends (accuracy < 0.5) mutate
  if (accuracy >= 0.5) return event;

  const mutated = { ...event };
  
  // Lower accuracy = higher chance of subject/object swap
  // Deterministic seed ensures the "hallucination" stays consistent for this NPC
  if (rng.nextFloat() > accuracy + 0.2) {
    const others = world.factions.filter(f => f.id !== event.subject);
    if (others.length > 0) {
      mutated.subject = others[rng.nextInt(others.length)].id;
    }
  }

  if (rng.nextFloat() > accuracy + 0.3) {
    const others = world.factions.filter(f => f.id !== event.object && f.id !== mutated.subject);
    if (others.length > 0) {
      mutated.object = others[rng.nextInt(others.length)].id;
    }
  }

  return mutated;
}

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
    innovations: settlement?.innovations.map(id => world.innovations.find(i => i.id === id)?.name).filter(Boolean) as string[] ?? [],
  };
}

/**
 * Generate a procedural profound outlook for the Deep Insight feature.
 */
export function synthesizeFutureOutlook(npc: NPC, world: WorldState): string {
  const seed = world.seed + world.currentYear + npc.id.charCodeAt(0);
  const rng = new SeededRNG(seed);
  const pick = <T>(arr: T[]) => arr[rng.nextInt(arr.length)];

  const ctx = assembleNarrativeContext(npc, world);
  const faction = world.factions.find(f => f.id === npc.factionId);
  const stability = faction?.stability ?? 50;

  let tone = 'calm';
  if (stability < 40) tone = 'fearful';
  if (stability > 80) tone = 'confident';

  const intros = {
    calm: [
      "The winds of time blow steadily. ",
      "I look to the horizon and see paths yet untrodden. ",
    ],
    fearful: [
      "Dark clouds gather over us. ",
      "I fear for what tomorrow brings. Our foundations shake. ",
    ],
    confident: [
      "Our golden age dawns. ",
      "Nothing can stand in our way now. ",
    ]
  };

  const ethicsParts = [];
  if (ctx.factionEthics.includes('violence:embraced')) ethicsParts.push("Through strength and steel, we will carve our destiny.");
  if (ctx.factionEthics.includes('trade:embraced')) ethicsParts.push("The flow of wealth will bind the world to our vision.");
  if (ctx.factionEthics.includes('mercy:embraced')) ethicsParts.push("Compassion must guide us, lest we become monsters.");
  if (ctx.factionEthics.includes('tradition:embraced')) ethicsParts.push("The old ways will protect us from the storm.");
  if (ctx.factionEthics.includes('expansion:embraced')) ethicsParts.push("Our borders must grow, for stagnation is death.");

  const ethicsStr = ethicsParts.length > 0 ? pick(ethicsParts) : "We walk the middle path, avoiding extremes.";

  const innovationStr = ctx.innovations.length > 0
    ? ` With ${ctx.innovations.join(' and ')} in our hands, the impossible becomes mundane.`
    : '';

  return `${pick(intros[tone as keyof typeof intros])}${ethicsStr}${innovationStr} I believe the history we write today will echo forever.`;
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

  // 1. Greeting (Sentiment-Driven)
  const stability = faction?.stability ?? 50;
  let greetingTemplate = EXPANDED_DIALOGUE.greeting[npc.personality];
  
  // Optional: check for special state-based greetings
  if (stability < 40) {
    // Faction is stressed - modify greeting tone
    greetingTemplate = greetingTemplate.replace('Straightens up', 'Looks exhausted')
                                       .replace('Eyes you warily', 'Watches you with bloodshot eyes')
                                       .replace('Grabs your arm', 'Clutches your sleeve with a trembling hand')
                                       .replace('Nods', 'Sighs heavily');
  } else if (stability > 80) {
    // Faction is proud
    greetingTemplate = greetingTemplate.replace('straightens up', 'stands tall and proud')
                                       .replace('eyes you warily', 'looks at you with a confident smirk')
                                       .replace('grabs your arm', 'claps you on the shoulder')
                                       .replace('nods', 'beams at you');
  }

  const greeting = fillTemplate(greetingTemplate, {
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

  // 2. Spotlight Logic: Filter NPC knowledge for events the player hasn't logged yet
  const loggedEventIds = new Set(world.player.knowledgeLog.map(k => k.eventId));
  
  const unseenKnowledge = npc.knowledge
    .filter(k => !loggedEventIds.has(k.eventId))
    .map(k => ({ knowledge: k, event: world.events.find(e => e.id === k.eventId) }))
    .filter((k): k is { knowledge: NPCKnowledge, event: GameEvent } => k.event != null)
    .sort((a, b) => (b.event.significance * b.knowledge.accuracy) - (a.event.significance * a.knowledge.accuracy));

  const spotlight = unseenKnowledge[0];
  let history = '';

  if (spotlight) {
    // Apply mutation if it's a legend
    const displayEvent = mutateEvent(spotlight.event, spotlight.knowledge.accuracy, world, rng);
    
    const accuracyTier = getAccuracyTier(spotlight.knowledge.accuracy);
    const template = EXPANDED_DIALOGUE.eventKnowledge[accuracyTier][npc.personality];
    
    const action = EVENT_ACTION_VOCAB[displayEvent.action as EventActionType]?.[npc.personality] ?? displayEvent.description;
    const ethicsComment = faction ? generateEthicsComment(displayEvent.action, faction.ethics, pick) : '';

    const subject = world.factions.find(f => f.id === displayEvent.subject)?.name ?? displayEvent.subject;
    const object  = world.factions.find(f => f.id === displayEvent.object)?.name  ?? displayEvent.object;

    history = fillTemplate(template, {
      name: npc.name,
      year: String(displayEvent.year),
      event: fillTemplate(action, { subject, object }),
      ethicsComment,
      faction: factionName,
    });
  } else {
    // Fallback: If player knows EVERYTHING the NPC knows, tell one significant "old" thing
    const topKnowledge = npc.knowledge
      .map(k => ({ knowledge: k, event: world.events.find(e => e.id === k.eventId) }))
      .filter((k): k is { knowledge: NPCKnowledge, event: GameEvent } => k.event != null)
      .sort((a, b) => (b.event.significance * b.knowledge.accuracy) - (a.event.significance * a.knowledge.accuracy))[0];

    if (topKnowledge) {
      history = `You've heard it all before, haven't you? We remember ${topKnowledge.event.description} the most. Not much else to say.`;
    } else {
      history = fillTemplate(EXPANDED_DIALOGUE.noKnowledge, { name: npc.name });
    }
  }

  return `${greeting}${innovationMention}\n\n${history}`;
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
