import { describe, expect, it, beforeEach } from 'vitest';
import { phaseReligion } from './phaseReligion.ts';
import { SeededRNG } from '../../utils/rng.ts';
import type { WorldState } from '../../types/world';
import { defaultStorytellerState } from '../../types';

describe('phaseReligion', () => {
  let world: WorldState;
  let rng: SeededRNG;

  beforeEach(() => {
    rng = new SeededRNG(12345);
    world = {
      seed: 12345,
      currentYear: 500,
      map: { 
        width: 50, 
        height: 50, 
        tiles: Array(50).fill(null).map(() => 
          Array(50).fill(null).map(() => ({ 
            biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true 
          }))
        ) 
      },
      factions: [
        { 
          id: 'f1', 
          name: 'Faction 1', 
          color: '#ff0000', 
          military: 20, 
          stability: 50, 
          wealth: 50, 
          culture: 20, 
          aggression: 50,
          settlements: ['s1', 's2'],
          population: 150,
          ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' }, 
          leaderId: null,
          interestGroups: [
            { id: 'ig1', name: 'Religious Council', type: 'religious', power: 10, ethicsBias: { mercy: 'embraced' } }
          ]
        },
      ],
      relationships: [],
      historicalFigures: [],
      settlements: [
        { 
          id: 's1', 
          name: 'Holy City', 
          position: { x: 1, y: 1 }, 
          factionId: 'f1', 
          faith: [{ religionId: 'r1', pressure: 100 }],
          dominantReligionId: 'r1',
          npcs: [],
          items: []
        },
        { 
          id: 's2', 
          name: 'Neighbor Town', 
          position: { x: 2, y: 1 }, 
          factionId: 'f1', 
          faith: [],
          dominantReligionId: null,
          npcs: [],
          items: []
        }
      ],
      ruins: [],
      resourceNodes: [],
      npcs: [],
      items: [],
      tradeRoutes: [],
      religions: [
        { id: 'r1', name: 'The Light', color: '#ffffff', originSettlementId: 's1', tenets: ['peace'], founderId: null }
      ],
      holySites: [
        { id: 'hs1', name: 'Great Temple', position: { x: 1, y: 1 }, religionId: 'r1' }
      ],
      events: [],
      player: { id: 'p1', name: 'Traveler', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 100 },
      storyteller: defaultStorytellerState(),
      visuals: []
    };
  });

  it('spreads faith from holy sites to local settlements', () => {
    // Holy site hs1 is at s1 (1,1). It should apply pressure to s1 and s2 (nearby).
    phaseReligion(world, 501, rng);
    
    const s1 = world.settlements.find(s => s.id === 's1')!;
    const s2 = world.settlements.find(s => s.id === 's2')!;
    
    const s1r1 = s1.faith.find(f => f.religionId === 'r1');
    const s2r1 = s2.faith.find(f => f.religionId === 'r1');
    
    expect(s1r1!.pressure).toBeGreaterThan(0);
    expect(s2r1!.pressure).toBeGreaterThan(0);
  });

  it('converts a settlement when pressure exceeds 40%', () => {
    const s2 = world.settlements.find(s => s.id === 's2')!;
    s2.faith = [{ religionId: 'r1', pressure: 39 }];
    s2.dominantReligionId = null;

    const events = phaseReligion(world, 501, rng);
    
    expect(s2.dominantReligionId).toBe('r1');
    expect(events.some(e => e.action === 'religious_conversion')).toBe(true);
  });

  it('shifts faction ethics on conversion', () => {
    const s1 = world.settlements.find(s => s.id === 's1')!;
    s1.dominantReligionId = null; // Reset for test
    s1.faith = [{ religionId: 'r1', pressure: 45 }];
    
    const f1 = world.factions.find(f => f.id === 'f1')!;
    f1.ethics = { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' };

    phaseReligion(world, 501, rng);
    
    // r1 tenets are ['peace'], should push toward 'Mercy' or 'Tradition'
    expect(f1.ethics.mercy).toBe('embraced');
    expect(f1.ethics.tradition).toBe('embraced');
  });

  it('spreads faith along trade routes', () => {
    const s2 = world.settlements.find(s => s.id === 's2')!;
    s2.faith = [];
    
    // Increase distance so proximity doesn't trigger, but route does
    s2.position = { x: 30, y: 30 }; 
    
    // Add a trade route from s1 to s2
    world.tradeRoutes = [
      {
        id: 'tr1',
        startSettlementId: 's1',
        endSettlementId: 's2',
        active: true,
        volume: 80,
        commodity: 'luxury',
        path: [{ x: 1, y: 1 }, { x: 30, y: 30 }]
      }
    ];

    phaseReligion(world, 501, rng);
    
    const s2r1 = s2.faith.find(f => f.religionId === 'r1');
    expect(s2r1!.pressure).toBeGreaterThan(0);
  });

  it('doubles holy site pressure when a Sacred Omen is active', () => {
    const s1 = world.settlements.find(s => s.id === 's1')!;
    s1.faith = []; // Start fresh
    
    world.map.tiles[1][1].modifiers = [{ type: 'omen', duration: 5 }];

    phaseReligion(world, 501, rng);
    
    const s1r1 = s1.faith.find(f => f.religionId === 'r1')!;
    // Base is 25, doubled should be 50
    expect(s1r1.pressure).toBe(50);
  });
});
