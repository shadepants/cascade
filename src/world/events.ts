// ─── Event Log & Causal Graph ───────────────────────────────────────────
// Manages the event history and builds causal chains for cascade scoring.
// Events are SAO triples (Subject-Action-Object) with caused_by pointers.

import type { GameEvent, CausalChain, CausalNode } from '../types.ts';
import { SeededRNG } from '../utils/rng.ts';

let nextEventId = 0;

/** Create a new event and return it. Does NOT add to any store — caller does that. */
export function createEvent(params: {
  tick: number;
  year: number;
  subject: string;
  action: string;
  object: string;
  causedBy: string | null;
  significance: number;
  playerCaused: boolean;
  description: string;
}): GameEvent {
  return {
    id: `evt_${nextEventId++}`,
    ...params,
  };
}

/** Generate pre-history events (before the player arrives). */
export function generatePreHistory(
  factionIds: string[],
  years: number,
  seed: number,
): GameEvent[] {
  const rng = new SeededRNG(seed + 4000);
  const events: GameEvent[] = [];

  // Generate a handful of historical events per faction
  for (let year = 0; year < years; year += Math.floor(years / 10)) {
    const faction = factionIds[rng.nextInt(factionIds.length)];
    const target = factionIds[rng.nextInt(factionIds.length)];

    const templates = [
      { action: 'raided', desc: `${faction} raided ${target}'s border villages` },
      { action: 'allied_with', desc: `${faction} formed a temporary alliance with ${target}` },
      { action: 'discovered', desc: `${faction} discovered ancient ruins in the wilderness` },
      { action: 'built', desc: `${faction} built a new watchtower on the frontier` },
      { action: 'lost', desc: `${faction} lost a sacred relic to bandits` },
    ];

    const template = templates[rng.nextInt(templates.length)];

    events.push(createEvent({
      tick: year,
      year,
      subject: faction,
      action: template.action,
      object: target !== faction ? target : 'wilderness',
      causedBy: null,
      significance: 2 + rng.nextInt(5),
      playerCaused: false,
      description: template.desc,
    }));
  }

  return events;
}

/** Build causal chains starting from all player-caused root events. */
export function buildCausalChains(events: GameEvent[]): CausalChain[] {
  // Find player root actions (playerCaused && causedBy === null)
  const playerRoots = events.filter(e => e.playerCaused && e.causedBy === null);

  return playerRoots.map(root => buildChainFromRoot(root.id, events));
}

/** Build a single causal chain from a root event. */
function buildChainFromRoot(rootId: string, events: GameEvent[]): CausalChain {
  const nodes: CausalNode[] = [];
  const visited = new Set<string>();

  function walk(eventId: string, depth: number): void {
    if (visited.has(eventId)) return;
    visited.add(eventId);

    const children = events
      .filter(e => e.causedBy === eventId)
      .map(e => e.id);

    nodes.push({ eventId, depth, children });

    for (const childId of children) {
      walk(childId, depth + 1);
    }
  }

  walk(rootId, 0);

  const totalDepth = Math.max(0, ...nodes.map(n => n.depth));
  const score = nodes.reduce((sum, n) => {
    const event = events.find(e => e.id === n.eventId);
    return sum + n.depth * (event?.significance ?? 1);
  }, 0);

  return { rootEventId: rootId, nodes, totalDepth, score };
}

/** Reset the event ID counter (for new games). */
export function resetEventIds(): void {
  nextEventId = 0;
}
