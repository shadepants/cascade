import { describe, it, expect } from 'vitest';
import { generateWorld } from './worldgen.ts';
import type { WorldConfig } from '../types';

describe('worldgen', () => {
  const config: WorldConfig = {
    seed: 12345,
    mapSize: 32,
    numFactions: 3,
    numSettlementsPerFaction: 2,
    npcsPerSettlement: 2,
    pregenYears: 50,
    ticksPerYear: 1,
    storytellerMode: 'clio',
  };

  it('generates a world with religions and holy sites', () => {
    const world = generateWorld(config);

    expect(world.religions.length).toBeGreaterThan(0);
    expect(world.holySites.length).toBe(world.religions.length);

    // Verify each holy site is associated with a religion
    world.holySites.forEach(site => {
      const religion = world.religions.find(r => r.id === site.religionId);
      expect(religion).toBeDefined();
      
      // Verify position is within map bounds
      expect(site.position.x).toBeGreaterThanOrEqual(0);
      expect(site.position.x).toBeLessThan(world.map.width);
      expect(site.position.y).toBeGreaterThanOrEqual(0);
      expect(site.position.y).toBeLessThan(world.map.height);
    });
  });

  it('initializes dominant religion in origin settlements', () => {
    const world = generateWorld(config);

    world.religions.forEach(rel => {
      const originSettlement = world.settlements.find(s => s.id === rel.originSettlementId);
      expect(originSettlement).toBeDefined();
      expect(originSettlement?.dominantReligionId).toBe(rel.id);
      expect(originSettlement?.faith.find(f => f.religionId === rel.id)?.pressure).toBe(100);
    });
  });
});
