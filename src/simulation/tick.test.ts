import { describe, it, expect, vi, afterEach } from 'vitest';
import { _forTesting } from './tick.ts';
import {
  type Faction,
  type FactionRelationship,
  type Settlement,
  type WorldState,
  type GameEvent,
  type StatDelta,
  type StorytellerState,
  defaultStorytellerState,
} from '../types';
import { SeededRNG } from '../utils/rng.ts';

const { deriveConsequence, phaseCascade, phaseSettlementGrowth } = _forTesting;

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Test world builders ──────────────────────────────────────────────────────

function makeFaction(id: string, name: string, military = 50): Faction {
  return {
    id, name,
    color: '#aaaaaa',
    aggression: 50,
    settlements: [],
    population: 500,
    stability: 80,
    wealth: 50,
    military,
    culture: 50,
    ethics: {
      violence: 'neutral',
      expansion: 'neutral',
      trade: 'neutral',
      tradition: 'neutral',
      mercy: 'neutral',
    },
    leaderId: null,
    interestGroups: [],
  };
}

function makeRelationship(
  factionA: string,
  factionB: string,
  opinion = -50,
  animosity = 50,
): FactionRelationship {
  return { factionA, factionB, opinion, animosity, state: 'peace' };
}

function makeWorld(
  factions: Faction[],
  relationships: FactionRelationship[],
  storytellerOverrides?: Partial<StorytellerState>,
): WorldState {
  return {
    seed: 1,
    currentYear: 1,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0.5, rainfall: 0.5, factionId: null, settlementId: null, walkable: true }]] },
    factions,
    relationships,
    historicalFigures: [],
    settlements: [],
    ruins: [],
    resourceNodes: [],
    npcs: [],
    items: [],
    tradeRoutes: [],
    events: [],
    player: { id: 'player', name: 'Player', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: { ...defaultStorytellerState('clio'), ...storytellerOverrides },
    visuals: [],
  };
}

function makeEvent(id: string, significance: number, statDeltas: StatDelta[] = []): GameEvent {
  return {
    id, tick: 1, year: 1, secondsOffset: 0,
    subject: 'A', action: 'test_action', object: 'B',
    causedBy: null, significance,
    playerCaused: true,
    description: 'test event', motivation: '',
    statDeltas,
  };
}

// ─── deriveConsequence — military_buildup regression ─────────────────────────

describe('deriveConsequence — military_buildup regression', () => {
  const militaryDelta: StatDelta = { factionId: 'A', stat: 'military', delta: 20 };

  it('returns a military_buildup event when military > 70 and a hostile rel exists', () => {
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [makeRelationship('A', 'B')],
    );
    const result = deriveConsequence(
      world.factions[0], militaryDelta, makeEvent('p1', 4), world, 1, new SeededRNG(1),
    );
    expect(result).not.toBeNull();
    expect(result?.action).toBe('military_buildup');
  });

  it('does NOT mutate rel.animosity — regression guard for pre-fix mutation bug', () => {
    // Before the fix, deriveConsequence mutated rel.animosity directly.
    // After the fix, mutation was moved to phaseCascade (inside the !suppressed gate).
    const rel = makeRelationship('A', 'B');
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [rel],
    );
    deriveConsequence(
      world.factions[0], militaryDelta, makeEvent('p2', 4), world, 1, new SeededRNG(1),
    );
    expect(rel.animosity).toBe(50); // must be unchanged
  });

  it('statDeltas contains only stability — no animosity field in event data', () => {
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [makeRelationship('A', 'B')],
    );
    const result = deriveConsequence(
      world.factions[0], militaryDelta, makeEvent('p3', 4), world, 1, new SeededRNG(1),
    );
    expect(result?.statDeltas).toHaveLength(1);
    expect(result?.statDeltas[0].stat).toBe('stability');
  });

  it('returns null when no hostile relationship exists', () => {
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [makeRelationship('A', 'B', 30)], // opinion=30, not hostile
    );
    const result = deriveConsequence(
      world.factions[0], militaryDelta, makeEvent('p4', 4), world, 1, new SeededRNG(1),
    );
    expect(result).toBeNull();
  });
});

// ─── phaseCascade — animosity gated on suppression check ─────────────────────
//
// Cascade fires with probability ~40% per trigger. Using 50 triggers ensures
// P(at least one fires) = 1 - 0.6^50 ≈ 99.9999% — effectively deterministic.

describe('phaseCascade — animosity gated on suppression check', () => {
  function make50Triggers(significance: number): GameEvent[] {
    return Array.from({ length: 50 }, (_, i) =>
      makeEvent(`trig${i}`, significance, [{ factionId: 'A', stat: 'military', delta: 20 }]),
    );
  }

  it('does NOT increment animosity when consequence is suppressed (budget exhausted)', () => {
    // trigger sig=6 → consequence sig=max(1,6-1)=5 → suppressed when budget full
    const rel = makeRelationship('A', 'B');
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [rel],
      { highSigEventsThisYear: 999, maxEventsPerYear: 2 }, // budget exhausted
    );
    phaseCascade(world, make50Triggers(6), 1, new SeededRNG(42));
    expect(rel.animosity).toBe(50); // suppression must block mutation
  });

  it('DOES increment animosity when consequence is not suppressed (sig < 5)', () => {
    // trigger sig=4 → consequence sig=max(1,4-1)=3 → shouldSuppressEvent skips sig<5
    const rel = makeRelationship('A', 'B');
    const world = makeWorld(
      [makeFaction('A', 'Alpha', 80), makeFaction('B', 'Beta')],
      [rel],
    );
    phaseCascade(world, make50Triggers(4), 1, new SeededRNG(42));
    expect(rel.animosity).toBeGreaterThan(50); // at least one cascade must fire
  });
});

describe('phaseSettlementGrowth — settlement tile clearing guards', () => {
  function makeTestSettlement(id: string, x: number, y: number): Settlement {
    return {
      id,
      name: id,
      position: { x, y },
      factionId: 'A',
      npcs: [],
      items: [],
    };
  }

  function makeSettlementGrowthTestState(settlements: Settlement[]): { world: WorldState; rng: SeededRNG } {
    const faction = makeFaction('A', 'Alpha');
    faction.population = 100;
    faction.settlements = settlements.map(s => s.id);

    const world = makeWorld([faction], []);
    const baseTile = { ...world.map.tiles[0][0] };
    world.map.tiles = [
      [{ ...baseTile }, { ...baseTile }],
      [{ ...baseTile }, { ...baseTile, settlementId: 's1' }],
    ];
    world.settlements = settlements;

    const rng = new SeededRNG(1);
    vi.spyOn(rng, 'nextFloat').mockReturnValue(0);
    vi.spyOn(rng, 'nextInt').mockReturnValue(0);

    return { world, rng };
  }

  it('clears tile settlementId when settlement position indices are valid', () => {
    const { world, rng } = makeSettlementGrowthTestState([
      makeTestSettlement('s1', 1, 1),
      makeTestSettlement('s2', 0, 0),
    ]);

    phaseSettlementGrowth(world, 2, rng);

    expect(world.map.tiles[1][1].settlementId).toBeNull();
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects malicious settlement index key %s without prototype pollution',
    (blockedKey) => {
      const { world, rng } = makeSettlementGrowthTestState([
        {
          id: 's1',
          name: 's1',
          // Intentionally bypass static typing to simulate hostile runtime input.
          position: { x: blockedKey as unknown as number, y: 0 },
          factionId: 'A',
          npcs: [],
          items: [],
        },
        makeTestSettlement('s2', 0, 0),
      ]);

      const hadArrayProto = Object.prototype.hasOwnProperty.call(Array.prototype, 'settlementId');
      const prevArrayProto = (Array.prototype as { settlementId?: unknown }).settlementId;
      const hadObjectProto = Object.prototype.hasOwnProperty.call(Object.prototype, 'settlementId');
      const prevObjectProto = (Object.prototype as { settlementId?: unknown }).settlementId;

      phaseSettlementGrowth(world, 2, rng);

      expect(Object.prototype.hasOwnProperty.call(Array.prototype, 'settlementId')).toBe(hadArrayProto);
      expect((Array.prototype as { settlementId?: unknown }).settlementId).toBe(prevArrayProto);
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'settlementId')).toBe(hadObjectProto);
      expect((Object.prototype as { settlementId?: unknown }).settlementId).toBe(prevObjectProto);
    },
  );
});
