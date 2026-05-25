import { describe, it, expect, beforeEach } from 'vitest';
import { phaseTech } from './phaseTech';
import type { WorldState, Innovation, Faction, Settlement, GameEvent } from '../../types';
import { defaultStorytellerState } from '../../types';
import { SeededRNG, type GameRNG } from '../../utils/rng';

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 'f1',
    name: 'Faction 1',
    color: '#fff',
    aggression: 50,
    settlements: ['s1'],
    population: 500,
    stability: 80,
    wealth: 100,
    military: 50,
    culture: 100,
    techLevel: 1,
    ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
    leaderId: null,
    interestGroups: [],
    innovations: [],
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement>): Settlement {
  return {
    id: 's1',
    name: 'Settlement 1',
    factionId: 'f1',
    innovations: [],
    position: { x: 0, y: 0 },
    npcs: [],
    items: [],
    faith: [],
    dominantReligionId: null,
    ...overrides,
  };
}

function makeWhisperEvent(id: string, year: number): GameEvent {
  return {
    id,
    tick: 0,
    year,
    secondsOffset: 0,
    subject: 'player',
    action: 'whisper',
    object: 'navigation',
    causedBy: null,
    playerCaused: true,
    description: '',
    significance: 1,
    motivation: '',
    statDeltas: [],
  };
}

describe('phaseTech', () => {
  let world: WorldState;
  let rng: SeededRNG;

  beforeEach(() => {
    rng = new SeededRNG(12345);
    world = {
      seed: 12345,
      currentYear: 100,
      storyteller: defaultStorytellerState('clio'),
      factions: [makeFaction()],
      relationships: [],
      historicalFigures: [],
      settlements: [
        makeSettlement({ id: 's1', name: 'Settlement 1', factionId: 'f1', position: { x: 0, y: 0 } }),
        makeSettlement({ id: 's2', name: 'Settlement 2', factionId: 'f1', position: { x: 5, y: 5 } }),
      ],
      ruins: [],
      resourceNodes: [],
      npcs: [],
      items: [],
      innovations: [],
      tradeRoutes: [],
      religions: [],
      holySites: [],
      events: [],
      map: {
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () =>
          Array.from({ length: 10 }, () => ({
            biome: 'grassland' as const,
            elevation: 0,
            rainfall: 0,
            factionId: null,
            settlementId: null,
            walkable: true,
          })),
        ),
      },
      player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
      visuals: [],
    };
  });

  it('should occasionally spark an innovation in high culture settlements', () => {
    world.factions[0].culture = 5000;
    world.factions[0].wealth = 5000;

    const events = phaseTech(world, 101, rng);

    expect(world.innovations.length).toBeGreaterThan(0);
    expect(events.some(e => e.action === 'tech_discovery')).toBe(true);
  });

  it('should spread known innovations to nearby settlements', () => {
    const tech: Innovation = {
      id: 'tech_agriculture_100',
      name: 'Irrigation',
      type: 'agriculture',
      description: '',
      originYear: 100,
      originSettlementId: 's1',
    };

    world.innovations.push(tech);
    world.settlements[0].innovations.push(tech.id);
    world.factions[0].innovations.push(tech.id);

    for (let i = 0; i < 50; i++) {
      phaseTech(world, 101 + i, rng);
      if (world.settlements[1].innovations.includes(tech.id)) break;
    }

    expect(world.settlements[1].innovations).toContain(tech.id);
  });

  it('should apply passive bonuses to factions', () => {
    const tech: Innovation = {
      id: 'tech_metallurgy_100',
      name: 'Blast Furnaces',
      type: 'metallurgy',
      description: '',
      originYear: 100,
      originSettlementId: 's1',
    };

    world.innovations.push(tech);
    world.factions[0].innovations.push(tech.id);
    world.factions[0].military = 50;

    phaseTech(world, 101, rng);

    expect(world.factions[0].military).toBeGreaterThan(50);
  });

  // ─── Parametric tech diffusion rate tests ────────────────────────────

  it('never spreads tech when techDiffusionRate is 0', () => {
    const tech: Innovation = { id: 'tech_agriculture_100', name: 'Irrigation', type: 'agriculture', description: '', originYear: 100, originSettlementId: 's1' };
    world.innovations.push(tech);
    world.settlements[0].innovations.push(tech.id);
    world.factions[0].innovations.push(tech.id);
    world.simConfig = { schismProbability: 0.2, techDiffusionRate: 0, tradeDecayRate: 15, tradeGrowthRate: 5 };

    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]) => a, reseed: () => {} };
    for (let i = 0; i < 20; i++) {
      phaseTech(world, 101 + i, alwaysLow);
    }
    expect(world.settlements[1].innovations).not.toContain(tech.id);
  });

  it('always spreads tech immediately when techDiffusionRate is very high', () => {
    const tech: Innovation = { id: 'tech_navigation_100', name: 'Lateen Sails', type: 'navigation', description: '', originYear: 100, originSettlementId: 's1' };
    world.innovations.push(tech);
    world.settlements[0].innovations.push(tech.id);
    world.factions[0].innovations.push(tech.id);
    world.simConfig = { schismProbability: 0.2, techDiffusionRate: 1.0, tradeDecayRate: 15, tradeGrowthRate: 5 };

    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]) => a, reseed: () => {} };
    phaseTech(world, 101, alwaysLow);
    expect(world.settlements[1].innovations).toContain(tech.id);
  });

  it('treats only whispers within 5 years as player-caused and boosts spread chance', () => {
    const baseWorld = structuredClone(world);
    baseWorld.factions.push(makeFaction({
      id: 'f2',
      name: 'Faction 2',
      culture: 30,
      wealth: 30,
      settlements: ['s2'],
      military: 20,
    }));
    baseWorld.settlements[1].factionId = 'f2';
    baseWorld.simConfig = { schismProbability: 0.2, techDiffusionRate: 0.1, tradeDecayRate: 15, tradeGrowthRate: 5 };

    const tech: Innovation = {
      id: 'tech_navigation_100',
      name: 'Lateen Sails',
      type: 'navigation',
      description: '',
      originYear: 100,
      originSettlementId: 's1'
    };
    baseWorld.innovations.push(tech);
    baseWorld.settlements[0].innovations.push(tech.id);
    baseWorld.factions[0].innovations.push(tech.id);

    const deterministicRng: GameRNG = { nextFloat: () => 0.1, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]) => a, reseed: () => {} };

    const withRecentWhisper = structuredClone(baseWorld);
    withRecentWhisper.events.push(makeWhisperEvent('e_recent', 98));
    const recentEvents = phaseTech(withRecentWhisper, 101, deterministicRng);
    const recentAdoption = recentEvents.find(e => e.action === 'tech_adoption' && e.subject === 's2');
    expect(withRecentWhisper.settlements[1].innovations).toContain(tech.id);
    expect(recentAdoption?.playerCaused).toBe(true);

    const withOldWhisper = structuredClone(baseWorld);
    withOldWhisper.events.push(makeWhisperEvent('e_old', 95));
    const oldEvents = phaseTech(withOldWhisper, 101, deterministicRng);
    const oldAdoption = oldEvents.find(e => e.action === 'tech_adoption' && e.subject === 's2');
    expect(withOldWhisper.settlements[1].innovations).not.toContain(tech.id);
    expect(oldAdoption).toBeUndefined();
  });
});
