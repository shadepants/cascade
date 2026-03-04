// ─── Event Log & Causal Graph ───────────────────────────────────────────
// Manages the event history and builds causal chains for cascade scoring.
// Events are SAO triples (Subject-Action-Object) with caused_by pointers.
//
// DF insight: attribution is a query over the event log, not a stored field.
// Every event references actors by stable ID; narrative is reconstructed by
// filtering, not by pre-computing "because" relationships.

import type { GameEvent, CausalChain, CausalNode, StatDelta } from '../types.ts';

let nextEventId = 0;

// Sub-year offsets give narrative texture without simulating every day.
// Deterministic: same event always lands at same time-of-year.
function secondsOffset(id: number): number {
  return (id * 7919) % 12000; // prime scatter, 0-11999
}

/** Create a new event. Does NOT add to any store — caller does that. */
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
  motivation?: string;
  statDeltas?: StatDelta[];
}): GameEvent {
  const id = nextEventId++;
  return {
    id: `evt_${id}`,
    tick: params.tick,
    year: params.year,
    secondsOffset: secondsOffset(id),
    subject: params.subject,
    action: params.action,
    object: params.object,
    causedBy: params.causedBy,
    significance: params.significance,
    playerCaused: params.playerCaused,
    description: params.description,
    motivation: params.motivation ?? '',
    statDeltas: params.statDeltas ?? [],
  };
}

/** Build causal chains starting from all player-caused root events. */
export function buildCausalChains(events: GameEvent[]): CausalChain[] {
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

/** Reset the event ID counter (call at start of each new game). */
export function resetEventIds(): void {
  nextEventId = 0;
}
