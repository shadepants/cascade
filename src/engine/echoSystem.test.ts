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
    expect(event?.id).toBe('whisper-famine-500-0');
    expect(npc?.knowledge[0].eventId).toBe(event?.id);

    const secondWorld = executeEcho(nextWorld, echo);
    const secondWhisperEvent = secondWorld.events.at(-1);
    expect(secondWhisperEvent?.id).toBe('whisper-famine-500-1');
    
    // Check visuals
    const ripple = nextWorld.visuals?.find(v => v.type === 'ripple');
    expect(ripple).toBeDefined();
    expect(ripple?.position).toEqual({ x: 2, y: 2 });
  });

  it('correctly applies Chronicle and grants only eligible unknown events', () => {
    // Eligible event (significant + past + unknown)
    world.events.push({
      id: 'e1',
      tick: 0,
      year: 100,
      secondsOffset: 0,
      subject: 'f1',
      action: 'founded',
      object: 's1',
      description: 'The foundation of the capital.',
      motivation: 'necessity',
      statDeltas: [],
      significance: 8,
      playerCaused: false,
      causedBy: null
    });

    // Ineligible: already known
    world.events.push({
      id: 'e2',
      tick: 0,
      year: 200,
      secondsOffset: 0,
      subject: 'f1',
      action: 'discovered',
      object: 'r1',
      description: 'A known record.',
      motivation: 'curiosity',
      statDeltas: [],
      significance: 8,
      playerCaused: false,
      causedBy: null
    });

    // Ineligible: future year
    world.events.push({
      id: 'e3',
      tick: 0,
      year: world.currentYear + 1,
      secondsOffset: 0,
      subject: 'f1',
      action: 'declared',
      object: 'future',
      description: 'A future event.',
      motivation: 'fate',
      statDeltas: [],
      significance: 9,
      playerCaused: false,
      causedBy: null
    });

    // Ineligible: low significance
    world.events.push({
      id: 'e4',
      tick: 0,
      year: 300,
      secondsOffset: 0,
      subject: 'f1',
      action: 'note',
      object: 'minor',
      description: 'A minor event.',
      motivation: 'routine',
      statDeltas: [],
      significance: 5,
      playerCaused: false,
      causedBy: null
    });

    // Eligible event (significant + past + unknown)
    world.events.push({
      id: 'e5',
      tick: 0,
      year: 320,
      secondsOffset: 0,
      subject: 'f1',
      action: 'allied',
      object: 'f2',
      description: 'A major alliance.',
      motivation: 'survival',
      statDeltas: [],
      significance: 7,
      playerCaused: false,
      causedBy: null
    });

    world.player.knowledgeLog.push({
      eventId: 'e2',
      source: 'Rumor',
      factionPerspective: 'Local',
      text: 'Already known',
      discoveredYear: 450
    });

    const echo: TemporalEcho = {
      type: 'chronicle',
      cost: 30,
      position: { x: 0, y: 0 }
    };

    const nextWorld = executeEcho(world, echo);

    // cost 30, grants 50 -> net +20
    expect(nextWorld.player.insight).toBe(120);

    // Existing known entry + one new eligible discovery
    expect(nextWorld.player.knowledgeLog.length).toBe(2);
    const granted = nextWorld.player.knowledgeLog.find(k => k.source === 'Ancient Chronicles');
    expect(['e1', 'e5']).toContain(granted?.eventId);
    expect(granted?.eventId).not.toBe('e2');
    expect(granted?.eventId).not.toBe('e3');
    expect(granted?.eventId).not.toBe('e4');

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
