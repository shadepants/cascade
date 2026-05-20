import { describe, it, expect, beforeEach } from 'vitest';
import { phaseTech } from './phaseTech';
import type { WorldState, Innovation } from '../../types';
import type { GameRNG } from '../../utils/rng';
import { defaultStorytellerState } from '../../types';
import { SeededRNG } from '../../utils/rng';

describe('phaseTech', () => {
  let world: WorldState;
  let rng: SeededRNG;

  beforeEach(() => {
    rng = new SeededRNG(12345);
    world = {
      seed: 12345,
      currentYear: 100,
      storyteller: defaultStorytellerState(),
      factions: [
        {
          id: 'f1',
          name: 'Faction 1',
          culture: 100,
          wealth: 100,
          innovations: [],
          settlements: ['s1'],
          techLevel: 1,
          military: 50
        } as any
      ],
      settlements: [
        {
          id: 's1',
          name: 'Settlement 1',
          factionId: 'f1',
          innovations: [],
          position: { x: 0, y: 0 },
          faith: []
        } as any,
        {
          id: 's2',
          name: 'Settlement 2',
          factionId: 'f1',
          innovations: [],
          position: { x: 5, y: 5 },
          faith: []
        } as any
      ],
      innovations: [],
      tradeRoutes: [],
      events: [],
      map: { width: 10, height: 10, tiles: [] } as any
    } as any;
  });

  it('should occasionally spark an innovation in high culture settlements', () => {
    // Force discovery by providing a "lucky" seed or mocking RNG if needed.
    // Here we just run it and check if something can happen.
    // For testing discovery, we might need to boost chance.
    world.factions[0].culture = 5000;
    world.factions[0].wealth = 5000;
    
    const events = phaseTech(world, 101, rng);
    
    expect(world.innovations.length).toBeGreaterThan(0);
    expect(events.some(e => e.action === 'tech_discovery')).toBe(true);
  });

  it('should spread known innovations to nearby settlements', () => {
    const tech = {
      id: 'tech_agriculture_100',
      name: 'Irrigation',
      type: 'agriculture',
      originYear: 100,
      originSettlementId: 's1'
    } as any;
    
    world.innovations.push(tech);
    world.settlements[0].innovations.push(tech.id);
    world.factions[0].innovations.push(tech.id);

    // Run multiple times to allow for spread chance
    for (let i = 0; i < 50; i++) {
      phaseTech(world, 101 + i, rng);
      if (world.settlements[1].innovations.includes(tech.id)) break;
    }

    expect(world.settlements[1].innovations).toContain(tech.id);
  });

  it('should apply passive bonuses to factions', () => {
    const tech = {
      id: 'tech_metallurgy_100',
      name: 'Blast Furnaces',
      type: 'metallurgy',
      originYear: 100,
      originSettlementId: 's1'
    } as any;
    
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

    // Run many years — spread should never happen
    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]): T[] => a, reseed: () => {} };
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

    // With rate 1.0 and distance within range, should spread on first tick
    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]): T[] => a, reseed: () => {} };
    phaseTech(world, 101, alwaysLow);
    expect(world.settlements[1].innovations).toContain(tech.id);
  });
});
