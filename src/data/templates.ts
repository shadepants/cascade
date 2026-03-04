// ─── Dialogue Templates ─────────────────────────────────────────────────
// Template strings for NPC dialogue. POC uses string interpolation,
// not LLM calls. Each template has faction-biased variants.
//
// Placeholders: {name}, {faction}, {event}, {year}

import type { NPCPersonality } from '../types.ts';

export interface DialogueTemplate {
  /** What the NPC says about a historical event. */
  eventKnowledge: Record<NPCPersonality, string>;

  /** NPC's greeting when the player first interacts. */
  greeting: Record<NPCPersonality, string>;

  /** NPC's reaction when they don't know about an event. */
  noKnowledge: string;
}

export const DIALOGUE: DialogueTemplate = {
  greeting: {
    loyal:
      '{name} straightens up. "You\'re not from around here. What do you want with {faction}?"',
    skeptic:
      '{name} eyes you warily. "Another traveler. I suppose you want something."',
    zealot:
      '{name} grabs your arm. "A stranger! Have you heard the truth about {faction}?"',
    pragmatist:
      '{name} nods. "Traveler. Information costs, but I\'m willing to trade."',
  },

  eventKnowledge: {
    loyal:
      '{name} leans in. "In the year {year}, {event}. {faction} was right to act — we had no choice."',
    skeptic:
      '{name} shrugs. "They say in {year}, {event}. But who knows what really happened? Everyone has their version."',
    zealot:
      '{name}\'s eyes blaze. "Year {year}! {event}! It was destiny — {faction}\'s divine right!"',
    pragmatist:
      '{name} counts on their fingers. "Year {year}. {event}. The real question is who profited."',
  },

  noKnowledge:
    '{name} shakes their head. "I don\'t know anything about that. Try asking someone else."',
};

/** Fill in template placeholders. */
export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
