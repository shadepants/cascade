import { describe, it, expect } from 'vitest';
import { calculateCascade, formatChainAsTree, type CascadeTier } from './cascade.ts';
import type { CausalChain, GameEvent } from '../types';

function makeEvent(
  id: string,
  description: string,
  significance: number,
  causedBy: string | null,
  playerCaused = false,
): GameEvent {
  return {
    id,
    tick: 1,
    year: 1,
    secondsOffset: 0,
    subject: 'A',
    action: 'test',
    object: 'B',
    causedBy,
    significance,
    playerCaused,
    description,
    motivation: '',
    statDeltas: [],
  };
}

function makeLinearChain(maxDepth: number): GameEvent[] {
  const events: GameEvent[] = [makeEvent('root', 'Root', 1, null, true)];
  for (let depth = 1; depth <= maxDepth; depth++) {
    events.push(makeEvent(`n${depth}`, `Node ${depth}`, 1, depth === 1 ? 'root' : `n${depth - 1}`));
  }
  return events;
}

describe('calculateCascade', () => {
  it('computes chain totals, longest chain, and tier correctly', () => {
    const events: GameEvent[] = [
      makeEvent('r1', 'Root 1', 5, null, true),
      makeEvent('c1', 'Child 1', 3, 'r1'),
      makeEvent('g1', 'Grandchild 1', 2, 'c1'),
      makeEvent('r2', 'Root 2', 4, null, true),
    ];

    const result = calculateCascade(events);

    expect(result.totalScore).toBe(7);
    expect(result.totalEvents).toBe(4);
    expect(result.maxDepth).toBe(2);
    expect(result.tier).toBe('Ripple');
    expect(result.longestChain?.rootEventId).toBe('r1');
  });

  it.each<[number, CascadeTier]>([
    [0, 'Echo'],
    [1, 'Echo'],
    [3, 'Ripple'],
    [6, 'Wave'],
    [7, 'Tsunami'],
  ])('maps maxDepth=%i to tier %s', (maxDepth, expectedTier) => {
    const result = calculateCascade(makeLinearChain(maxDepth));
    expect(result.maxDepth).toBe(maxDepth);
    expect(result.tier).toBe(expectedTier);
  });
});

describe('formatChainAsTree', () => {
  it('renders indented chain text and ignores missing child events', () => {
    const events: GameEvent[] = [
      makeEvent('r1', 'Root event', 5, null, true),
      makeEvent('c1', 'Child event', 3, 'r1'),
      makeEvent('g1', 'Grandchild event', 2, 'c1'),
    ];
    const chain: CausalChain = {
      rootEventId: 'r1',
      totalDepth: 2,
      score: 7,
      nodes: [
        { eventId: 'r1', depth: 0, children: ['c1'] },
        { eventId: 'c1', depth: 1, children: ['g1', 'missing'] },
        { eventId: 'g1', depth: 2, children: [] },
      ],
    };

    expect(formatChainAsTree(chain, events)).toBe(
      [
        'Root event',
        '  → Child event (1 link)',
        '    → Grandchild event (2 links)',
      ].join('\n'),
    );
  });
});
