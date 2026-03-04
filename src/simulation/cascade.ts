// ─── Cascade Scoring ────────────────────────────────────────────────────
// Calculates the player's cascade score at end of run.
// Score = sum(depth × significance) for all player-caused events.

import type { GameEvent, CausalChain } from '../types.ts';
import { buildCausalChains } from '../world/events.ts';

export interface CascadeResult {
  chains: CausalChain[];
  totalScore: number;
  totalEvents: number;
  maxDepth: number;
  tier: CascadeTier;
}

export type CascadeTier = 'Echo' | 'Ripple' | 'Wave' | 'Tsunami';

/** Calculate the full cascade result for end-of-run display. */
export function calculateCascade(events: GameEvent[]): CascadeResult {
  const chains = buildCausalChains(events);

  const totalScore = chains.reduce((sum, c) => sum + c.score, 0);
  const totalEvents = chains.reduce((sum, c) => sum + c.nodes.length, 0);
  const maxDepth = Math.max(0, ...chains.map(c => c.totalDepth));
  const tier = scoreTier(maxDepth);

  return { chains, totalScore, totalEvents, maxDepth, tier };
}

/** Map max depth to a cascade tier. */
function scoreTier(maxDepth: number): CascadeTier {
  if (maxDepth <= 1) return 'Echo';
  if (maxDepth <= 3) return 'Ripple';
  if (maxDepth <= 6) return 'Wave';
  return 'Tsunami';
}

/** Format a causal chain as an indented text tree for display. */
export function formatChainAsTree(
  chain: CausalChain,
  events: GameEvent[],
): string {
  const lines: string[] = [];

  function walk(eventId: string, depth: number): void {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const indent = '  '.repeat(depth);
    const arrow = depth > 0 ? '→ ' : '';
    const depthLabel = depth > 0 ? ` (${depth} link${depth > 1 ? 's' : ''})` : '';
    lines.push(`${indent}${arrow}${event.description}${depthLabel}`);

    const node = chain.nodes.find(n => n.eventId === eventId);
    if (node) {
      for (const childId of node.children) {
        walk(childId, depth + 1);
      }
    }
  }

  walk(chain.rootEventId, 0);
  return lines.join('\n');
}
