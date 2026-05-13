import { describe, expect, it, beforeEach } from 'vitest';
import { executeEcho } from './echoSystem.ts';
import type { WorldState, TemporalEcho } from '../types/world';
import { defaultStorytellerState } from '../types';

describe('echoSystem', () => {
  let world: WorldState;

  beforeEach(() => {
    world = {
      seed: 12345,
      currentYear: 500,
      map: { 
        width: 10, 
        height: 10, 
        tiles: Array(10).fill(null).map(() => 
          Array(10).fill(null).map(() => ({ 
            biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true 
          }))
        ) 
      },
      factions: [],
      relationships: [],
      historicalFigures: [],
      settlements: [],
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

  it('correctly applies Omen to a Holy Site and doubles duration', () => {
    const echo: TemporalEcho = {
      type: 'omen',
      targetId: 'holy_0', // This is what UI currently sends
      cost: 40,           // This is what UI currently sends
      position: { x: 1, y: 1 }
    };

    const nextWorld = executeEcho(world, echo);
    
    expect(nextWorld.player.insight).toBe(60); // 100 - 40
    
    const tile = nextWorld.map.tiles[1][1];
    expect(tile.modifiers).toBeDefined();
    const omen = tile.modifiers?.find(m => m.type === 'omen');
    expect(omen).toBeDefined();
    // Holy Site should have 40 years duration
    expect(omen?.duration).toBe(40);
  });

  it('correctly applies Omen to a regular tile', () => {
    const echo: TemporalEcho = {
      type: 'omen',
      targetId: '5,5',
      cost: 20,
      position: { x: 5, y: 5 }
    };

    const nextWorld = executeEcho(world, echo);
    
    expect(nextWorld.player.insight).toBe(80);
    
    const tile = nextWorld.map.tiles[5][5];
    const omen = tile.modifiers?.find(m => m.type === 'omen');
    expect(omen?.duration).toBe(10);
  });
});
