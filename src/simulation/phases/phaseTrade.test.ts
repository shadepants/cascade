import { describe, it, expect } from 'vitest';
import { phaseTrade } from './phaseTrade.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction, type TradeRoute } from '../../types';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [id + '_s'],
    population: 200, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [], ...overrides,
  };
}

function makeWorld(
  factions: Faction[],
  tradeRoutes: TradeRoute[] = [],
  overrides: Partial<WorldState> = {},
): WorldState {
  return {
    seed: 1, currentYear: 1,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions, relationships: [],
    historicalFigures: [],
    settlements: [],
    ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes,
    religions: [], holySites: [], events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
    ...overrides,
  };
}

function makeSettlement(id: string, factionId: string, x = 0, y = 0) {
  return { id, name: id, position: { x, y }, factionId, npcs: [], items: [], faith: [], dominantReligionId: null as null };
}

describe('phaseTrade', () => {
  it('increases route volume when factions are at peace', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A', 0, 0);
    const sB = makeSettlement('sB', 'B', 1, 0);
    const route: TradeRoute = {
      id: 'r1', startSettlementId: 'sA', endSettlementId: 'sB',
      active: true, volume: 50, commodity: 'grain',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    };
    const world = makeWorld([fA, fB], [route], { settlements: [sA, sB] });
    phaseTrade(world, 2, new SeededRNG(1));
    expect(world.tradeRoutes[0].volume).toBe(55); // +5
  });

  it('decreases route volume when factions are at war', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A');
    const sB = makeSettlement('sB', 'B', 1, 0);
    const route: TradeRoute = {
      id: 'r1', startSettlementId: 'sA', endSettlementId: 'sB',
      active: true, volume: 50, commodity: 'grain',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    };
    const world = makeWorld([fA, fB], [route], {
      settlements: [sA, sB],
      relationships: [{ factionA: 'A', factionB: 'B', opinion: -80, animosity: 150, state: 'war' }],
    });
    phaseTrade(world, 2, new SeededRNG(1));
    expect(world.tradeRoutes[0].volume).toBe(35); // -15
  });

  it('deactivates route when volume reaches 0', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A');
    const sB = makeSettlement('sB', 'B', 1, 0);
    const route: TradeRoute = {
      id: 'r1', startSettlementId: 'sA', endSettlementId: 'sB',
      active: true, volume: 10, commodity: 'grain',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    };
    const world = makeWorld([fA, fB], [route], {
      settlements: [sA, sB],
      relationships: [{ factionA: 'A', factionB: 'B', opinion: -80, animosity: 150, state: 'war' }],
    });
    phaseTrade(world, 2, new SeededRNG(1));
    expect(world.tradeRoutes[0].active).toBe(false);
  });

  it('grants player insight when a route has volume >= 80', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A');
    const sB = makeSettlement('sB', 'B', 1, 0);
    const route: TradeRoute = {
      id: 'r1', startSettlementId: 'sA', endSettlementId: 'sB',
      active: true, volume: 80, commodity: 'luxury',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    };
    const world = makeWorld([fA, fB], [route], { settlements: [sA, sB] });
    const prevInsight = world.player.insight;
    phaseTrade(world, 2, new SeededRNG(1));
    expect(world.player.insight).toBeGreaterThan(prevInsight);
  });

  it('spawns a new trade route when settlements are close enough and below cap', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A', 0, 0);
    const sB = makeSettlement('sB', 'B', 5, 0); // distance 5 < 25
    const world = makeWorld([fA, fB], [], { settlements: [sA, sB] });

    // Alternate: first nextInt(2) → 0 (sA), second nextInt(2) → 1 (sB)
    let intCalls = 0;
    const rng: GameRNG = {
      nextFloat: () => 0,
      nextInt: (max: number) => { const v = intCalls++ % 2 === 0 ? 0 : Math.min(1, max - 1); return v; },
      next: () => 0,
      shuffle: (a) => a,
    };
    phaseTrade(world, 2, rng);
    expect(world.tradeRoutes.length).toBeGreaterThan(0);
  });

  it('emits a trade_collapse event when volume drops below 20', () => {
    const fA = makeFaction('A');
    const fB = makeFaction('B');
    const sA = makeSettlement('sA', 'A');
    const sB = makeSettlement('sB', 'B', 1, 0);
    const route: TradeRoute = {
      id: 'r1', startSettlementId: 'sA', endSettlementId: 'sB',
      active: true, volume: 25, commodity: 'grain',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    };
    const world = makeWorld([fA, fB], [route], {
      settlements: [sA, sB],
      relationships: [{ factionA: 'A', factionB: 'B', opinion: -80, animosity: 150, state: 'war' }],
    });
    const events = phaseTrade(world, 2, new SeededRNG(1));
    expect(events.some(e => e.action === 'trade_collapse')).toBe(true);
  });
});
