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
            biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true, modifiers: []
          }))
        ) 
      },
      factions: [],
      relationships: [],
      historicalFigures: [],
      settlements: [],
      ruins: [],
      resourceNodes: [],
      npcs: [
        {
          id: 'npc1',
          name: 'Elder',
          position: { x: 2, y: 2 },
          factionId: 'f1',
          personality: 'pragmatist',
          knowledge: [],
          dialogueKey: 'default',
          alive: true
        }
      ],
      items: [],
      tradeRoutes: [],
      religions: [
        { id: 'r1', name: 'The Light', color: '#ffffff', originSettlementId: 's1', tenets: ['peace'], founderId: null }
      ],
      holySites: [
        { id: 'hs1', name: 'Great Temple', position: { x: 1, y: 1 }, religionId: 'r1' }
      ],
      innovations: [],
      events: [],
      player: { id: 'p1', name: 'Traveler', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 100 },
      storyteller: defaultStorytellerState(),
      visuals: []
    };
  });

  it('correctly applies Omen to a Holy Site and doubles duration', () => {
    const echo: TemporalEcho = {
      type: 'omen',
      targetId: 'holy_0',
      cost: 40,
      position: { x: 1, y: 1 }
    };

    const nextWorld = executeEcho(world, echo);
    
    expect(nextWorld.player.insight).toBe(60);
    
    const tile = nextWorld.map.tiles[1][1];
    expect(tile.modifiers).toBeDefined();
    const omen = tile.modifiers?.find(m => m.type === 'omen');
    expect(omen).toBeDefined();
    expect(omen?.duration).toBe(40);
  });

  it('correctly applies Bloom to a tile', () => {
    const echo: TemporalEcho = {
      type: 'bloom',
      targetId: '3,3',
      cost: 30,
      position: { x: 3, y: 3 }
    };

    const nextWorld = executeEcho(world, echo);
    
    expect(nextWorld.player.insight).toBe(70);
    
    const tile = nextWorld.map.tiles[3][3];
    const bloom = tile.modifiers?.find(m => m.type === 'bloom');
    expect(bloom).toBeDefined();
    expect(bloom?.duration).toBe(20);
    
    // Check visuals
    const bloomVisual = nextWorld.visuals?.find(v => v.type === 'sparkle');
    expect(bloomVisual).toBeDefined();
    expect(bloomVisual?.color).toBe('#4ade80');
  });

  it('correctly applies Whisper to an NPC', () => {
    const echo: TemporalEcho = {
      type: 'whisper',
      targetId: 'npc1',
      topic: 'famine',
      cost: 15,
      position: { x: 2, y: 2 }
    };

    const nextWorld = executeEcho(world, echo);
    
    expect(nextWorld.player.insight).toBe(85);
    
    const npc = nextWorld.npcs.find(n => n.id === 'npc1');
    expect(npc?.knowledge.length).toBe(1);
    expect(npc?.knowledge[0].sourceId).toBe('player-echo');
    
    // Check event creation
    const event = nextWorld.events.find(e => e.action === 'whisper');
    expect(event).toBeDefined();
    expect(event?.object).toBe('famine');
    
    // Check visuals
    const ripple = nextWorld.visuals?.find(v => v.type === 'ripple');
    expect(ripple).toBeDefined();
    expect(ripple?.position).toEqual({ x: 2, y: 2 });
  });

  it('chronicle only grants eligible unknown past events and selection is deterministic', () => {
    world.player.knowledgeLog.push({
      eventId: 'known',
      source: 'Archive',
      factionPerspective: 'Historical Record',
      text: 'Already known event.',
      discoveredYear: 300,
    });

    world.events.push(
      {
        id: 'known',
        tick: 0,
        year: 100,
        secondsOffset: 0,
        subject: 'f1',
        action: 'founded',
        object: 's1',
        description: 'Already known event.',
        motivation: 'necessity',
        statDeltas: [],
        significance: 8,
        playerCaused: false,
        causedBy: null
      },
      {
        id: 'future',
        tick: 0,
        year: 700,
        secondsOffset: 0,
        subject: 'f1',
        action: 'alliance',
        object: 'f2',
        description: 'Future event.',
        motivation: 'necessity',
        statDeltas: [],
        significance: 9,
        playerCaused: false,
        causedBy: null
      },
      {
        id: 'low-significance',
        tick: 0,
        year: 120,
        secondsOffset: 0,
        subject: 'f1',
        action: 'trade_pact',
        object: 'f2',
        description: 'Low significance event.',
        motivation: 'necessity',
        statDeltas: [],
        significance: 5,
        playerCaused: false,
        causedBy: null
      },
      {
        id: 'eligible-a',
        tick: 0,
        year: 150,
        secondsOffset: 0,
        subject: 'f1',
        action: 'war_declared',
        object: 'f2',
        description: 'Eligible event A.',
        motivation: 'necessity',
        statDeltas: [],
        significance: 7,
        playerCaused: false,
        causedBy: null
      },
      {
        id: 'eligible-b',
        tick: 0,
        year: 200,
        secondsOffset: 0,
        subject: 'f2',
        action: 'founded',
        object: 's2',
        description: 'Eligible event B.',
        motivation: 'necessity',
        statDeltas: [],
        significance: 8,
        playerCaused: false,
        causedBy: null
      }
    );

    const echo: TemporalEcho = {
      type: 'chronicle',
      cost: 30,
      position: { x: 0, y: 0 }
    };

    const nextWorld = executeEcho(world, echo);
    const repeatWorld = executeEcho(world, echo);
    const thirdWorld = executeEcho(world, echo);

    // cost 30, grants 50 -> net +20
    expect(nextWorld.player.insight).toBe(120);

    // Check knowledge log: one prior known + one newly discovered eligible event
    expect(nextWorld.player.knowledgeLog.length).toBe(2);
    const grantedId = nextWorld.player.knowledgeLog[1].eventId;
    expect(['eligible-a', 'eligible-b']).toContain(grantedId);
    expect(['known', 'future', 'low-significance']).not.toContain(grantedId);
    expect(repeatWorld.player.knowledgeLog[1].eventId).toBe(grantedId);
    expect(thirdWorld.player.knowledgeLog[1].eventId).toBe(grantedId);
    expect(nextWorld.player.knowledgeLog[1].source).toBe('Ancient Chronicles');

    // Check visuals
    const chronicleVisual = nextWorld.visuals?.find(v => v.type === 'tech_spark');
    expect(chronicleVisual).toBeDefined();
  });

  it('throws error on insufficient insight', () => {
    const echo: TemporalEcho = {
      type: 'omen',
      targetId: '1,1',
      cost: 150,
      position: { x: 1, y: 1 }
    };

    expect(() => executeEcho(world, echo)).toThrow('Insufficient Insight');
  });
});
