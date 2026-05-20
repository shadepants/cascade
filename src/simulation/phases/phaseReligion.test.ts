import { describe, expect, it, beforeEach } from 'vitest';
import { phaseReligion } from './phaseReligion.ts';
import type { WorldState, Settlement, Religion, Faction } from '../../types';
import { SeededRNG, type GameRNG } from '../../utils/rng.ts';
import { defaultStorytellerState } from '../../types';

describe('phaseReligion', () => {
  let world: WorldState;
  const rng = new SeededRNG(12345);

  beforeEach(() => {
    const religion: Religion = {
      id: 'rel_light',
      name: 'The Light',
      color: '#ffffff',
      originSettlementId: 's1',
      tenets: ['peace'],
      founderId: null
    };

    const faction: Faction = {
      id: 'f1',
      name: 'Kingdom',
      color: '#ff0000',
      aggression: 50,
      stability: 0,
      culture: 10,
      wealth: 10,
      military: 10,
      population: 100,
      settlements: ['s1'],
      ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
      interestGroups: [
        { id: 'ig1', name: 'Faithful', type: 'religious', power: 10, ethicsBias: {} }
      ],
      techLevel: 1, innovations: [],
      leaderId: 'r1'
    };

    const settlement: Settlement = {
      id: 's1',
      name: 'Holy City',
      factionId: 'f1',
      position: { x: 1, y: 1 },
      npcs: [],
      items: [],
      faith: [],
      dominantReligionId: null,
      innovations: [],
    };

    world = {
      seed: 12345,
      currentYear: 100,
      map: { 
        width: 10, height: 10, 
        tiles: Array(10).fill(null).map(() => Array(10).fill(null).map(() => ({ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true, modifiers: [] })))
      },
      factions: [faction],
      relationships: [],
      historicalFigures: [],
      settlements: [settlement],
      ruins: [],
      resourceNodes: [],
      npcs: [],
      items: [],
      tradeRoutes: [],
      religions: [religion],
      holySites: [
        { id: 'hs1', name: 'Great Temple', position: { x: 1, y: 1 }, religionId: 'rel_light' }
      ],
      events: [],
      innovations: [],
      player: { id: 'p1', name: 'Traveler', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 100 },
      storyteller: defaultStorytellerState(),
      visuals: []
    };
  });

  it('spreads faith from Holy Site to parent settlement', () => {
    phaseReligion(world, 101, rng);
    
    const s1 = world.settlements[0];
    const lightFaith = s1.faith.find(f => f.religionId === 'rel_light');
    expect(lightFaith).toBeDefined();
    expect(lightFaith?.pressure).toBeGreaterThan(0);
  });

  it('doubles Holy Site pressure if Sacred Omen is present', () => {
    // Add Omen to the Holy Site tile
    world.map.tiles[1][1].modifiers = [{ type: 'omen', duration: 10 }];
    
    phaseReligion(world, 101, rng);
    
    const s1 = world.settlements[0];
    const lightFaith = s1.faith.find(f => f.religionId === 'rel_light');
    // Base is 25, 0 stabilityKingdom = 25 pressure. 4x multiplier for Holy Site + Omen = 100.
    expect(lightFaith?.pressure).toBe(100);
  });

  it('converts settlement when pressure exceeds 40', () => {
    const s1 = world.settlements[0];
    s1.faith = [{ religionId: 'rel_light', pressure: 45 }];
    
    const events = phaseReligion(world, 101, rng);
    
    expect(s1.dominantReligionId).toBe('rel_light');
    expect(events.some(e => e.action === 'religious_conversion')).toBe(true);
    
    // Check stat impact (peace tenet -> stability +2)
    const faction = world.factions[0];
    expect(faction.stability).toBe(2);
    
    // Check ethics shift (peace -> mercy embraced)
    // Initial was neutral, shiftTowardEmbraced(neutral) -> embraced
    expect(faction.ethics.mercy).toBe('embraced');
  });

  it('applies stability resistance to faith spread', () => {
    const faction = world.factions[0];
    faction.stability = 100; // 50% resistance
    
    phaseReligion(world, 101, rng);
    
    const s1 = world.settlements[0];
    const lightFaith = s1.faith.find(f => f.religionId === 'rel_light');
    // Base 25, 50% resistance = 12.5 -> floor(12)
    // Decay Step 6: 12 - 3 = 9
    expect(lightFaith?.pressure).toBe(9);
  });

  it('triggers a schism when two faiths are both strong', () => {
    const s1 = world.settlements[0];
    world.religions.push({ id: 'rel_dark', name: 'The Dark', color: '#000000', originSettlementId: 's1', tenets: ['war'], founderId: null });
    
    s1.faith = [
      { religionId: 'rel_light', pressure: 45 },
      { religionId: 'rel_dark', pressure: 45 }
    ];
    
    // We need to force the RNG to trigger the schism (20% chance)
    const forcedRng: GameRNG = { 
      nextFloat: () => 0.1,
      nextInt: () => 0,
      next: () => 0,
      shuffle: <T>(arr: T[]) => arr,
      reseed: () => {}
    };
    
    const events = phaseReligion(world, 101, forcedRng);
    
    expect(events.some(e => e.action === 'religious_schism')).toBe(true);
    
    // Faction stability hit: conversion +2, then schism -8 = -6 -> clamped to 0
    const faction = world.factions[0];
    expect(faction.stability).toBe(0);
  });

  // ─── Parametric schism probability tests ─────────────────────────────

  it('suppresses schism when simConfig.schismProbability is 0 (never)', () => {
    const settlement = world.settlements[0];
    settlement.faith = [
      { religionId: 'rel_light', pressure: 60 },
      { religionId: 'rel_dark', pressure: 55 },
    ];
    world.religions.push({
      id: 'rel_dark', name: 'The Dark', color: '#000000',
      originSettlementId: 's1', tenets: ['war'], founderId: null,
    });
    world.simConfig = {
      schismProbability: 0,
      techDiffusionRate: 0.05,
      tradeDecayRate: 15,
      tradeGrowthRate: 5,
    };
    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]) => a, reseed: () => {} };
    const events = phaseReligion(world, 101, alwaysLow);
    expect(events.some(e => e.action === 'religious_schism')).toBe(false);
  });

  it('always fires schism when simConfig.schismProbability is 1 (certain)', () => {
    const settlement = world.settlements[0];
    settlement.faith = [
      { religionId: 'rel_light', pressure: 60 },
      { religionId: 'rel_dark', pressure: 55 },
    ];
    if (!world.religions.find(r => r.id === 'rel_dark')) {
      world.religions.push({
        id: 'rel_dark', name: 'The Dark', color: '#000000',
        originSettlementId: 's1', tenets: ['war'], founderId: null,
      });
    }
    world.simConfig = {
      schismProbability: 1,
      techDiffusionRate: 0.05,
      tradeDecayRate: 15,
      tradeGrowthRate: 5,
    };
    const alwaysLow: GameRNG = { nextFloat: () => 0.0, nextInt: () => 0, next: () => 0, shuffle: <T>(a: T[]) => a, reseed: () => {} };
    const events = phaseReligion(world, 101, alwaysLow);
    expect(events.some(e => e.action === 'religious_schism')).toBe(true);
  });

  // ─── Martyrdom path test ──────────────────────────────────────────────
  
  it('emits a martyrdom event and applies pressure when a pious ruler dies in the previous year', () => {
    // Add a pious historical figure who died in the previous year (year 100)
    world.historicalFigures.push({
      id: 'hf_martyr',
      name: 'Saint John',
      factionId: 'f1',
      traits: ['pious'],
      birthYear: 50,
      deathYear: 100,
      titles: []
    });

    // We need a religion tied to faction 'f1' via the `rel_f1` format
    world.religions.push({
      id: 'rel_f1',
      name: 'The True Faith',
      color: '#ffffff',
      originSettlementId: 's1',
      tenets: ['peace'],
      founderId: null
    });

    world.events.push({
      id: 'evt_death_john',
      tick: 0,
      year: 100,
      subject: 'hf_martyr',
      action: 'death',
      object: 'old age',
      causedBy: null,
      playerCaused: false,
      description: 'Saint John has died.',
      significance: 3,
      statDeltas: []
    });

    const events = phaseReligion(world, 101, rng);
    
    // Check that the martyrdom event was emitted
    expect(events.some(e => e.action === 'martyrdom' && e.subject === 'hf_martyr')).toBe(true);

    // Check that pressure was applied to the faction's settlement
    const s1 = world.settlements[0];
    const trueFaith = s1.faith.find(f => f.religionId === 'rel_f1');
    expect(trueFaith).toBeDefined();
    // Base amount is 15. Stability is 0, so 15 pressure should be applied.
    // It will then decay by 3 at the end of the phase (if it is not dominant or if we just check the amount).
    // Actually, check if the pressure is greater than 0.
    expect(trueFaith?.pressure).toBeGreaterThan(0);
  });
});
