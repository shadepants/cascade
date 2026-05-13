import { describe, it, expect } from 'vitest';
import { phaseInterestGroups } from './interestGroups.ts';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState, type WorldState, type Faction } from '../../types';

function makeFaction(id: string, overrides: Partial<Faction> = {}): Faction {
  return {
    id, name: id, color: '#fff', aggression: 50, settlements: [],
    population: 200, stability: 60, wealth: 50, military: 40, culture: 30,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null, interestGroups: [], ...overrides,
  };
}

function makeWorld(factions: Faction[]): WorldState {
  return {
    seed: 1, currentYear: 1,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions, relationships: [],
    historicalFigures: [], settlements: [],
    ruins: [], resourceNodes: [], npcs: [], items: [],
    tradeRoutes: [], religions: [], holySites: [], events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

describe('phaseInterestGroups', () => {
  it('applies natural decay (−1) to power each tick', () => {
    const faction = makeFaction('A', {
      interestGroups: [
        { id: 'ig1', name: 'Merchants', type: 'merchant', power: 50, ethicsBias: {} },
      ],
    });
    const world = makeWorld([faction]);
    phaseInterestGroups(world, 2, new SeededRNG(1));
    expect(faction.interestGroups[0].power).toBe(49);
  });

  it('grows military IG power when military > 60', () => {
    const faction = makeFaction('A', {
      military: 70, // > 60 → +2
      interestGroups: [
        { id: 'ig1', name: 'War Council', type: 'military', power: 50, ethicsBias: {} },
      ],
    });
    const world = makeWorld([faction]);
    phaseInterestGroups(world, 2, new SeededRNG(1));
    // +2 (military > 60) - 1 (decay) = +1
    expect(faction.interestGroups[0].power).toBe(51);
  });

  it('grows military IG power further when stability < 40 (martial law)', () => {
    const faction = makeFaction('A', {
      military: 70, stability: 30, // +2 (military) + 3 (martial law) - 1 (decay) = +4
      interestGroups: [
        { id: 'ig1', name: 'War Council', type: 'military', power: 50, ethicsBias: {} },
      ],
    });
    const world = makeWorld([faction]);
    phaseInterestGroups(world, 2, new SeededRNG(1));
    expect(faction.interestGroups[0].power).toBe(54);
  });

  it('shifts faction ethics when IG power > 70 and RNG fires', () => {
    const faction = makeFaction('A', {
      ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
      interestGroups: [
        { id: 'ig1', name: 'Religious Council', type: 'religious', power: 80, ethicsBias: { mercy: 'embraced' } },
      ],
    });
    const world = makeWorld([faction]);

    // Force RNG to trigger ethics shift
    const rng: GameRNG = { nextFloat: () => 0.05, nextInt: () => 0, next: () => 0, shuffle: (a) => a, reseed: () => {} };
    const events = phaseInterestGroups(world, 2, rng);
    expect(faction.ethics.mercy).toBe('embraced');
    expect(events.some(e => e.action === 'ethics_shift')).toBe(true);
  });

  it('does not shift ethics when IG power <= 70', () => {
    const faction = makeFaction('A', {
      interestGroups: [
        { id: 'ig1', name: 'Guild', type: 'merchant', power: 65, ethicsBias: { trade: 'embraced' } },
      ],
    });
    const world = makeWorld([faction]);
    const events = phaseInterestGroups(world, 2, new SeededRNG(1));
    expect(faction.ethics.trade).toBe('neutral');
    expect(events).toHaveLength(0);
  });

  it('clamps power at minimum 5', () => {
    const faction = makeFaction('A', {
      interestGroups: [
        { id: 'ig1', name: 'Fringe', type: 'labor', power: 5, ethicsBias: {} },
      ],
    });
    const world = makeWorld([faction]);
    phaseInterestGroups(world, 2, new SeededRNG(1));
    expect(faction.interestGroups[0].power).toBe(5); // min clamp
  });
});
