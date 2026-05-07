import { describe, expect, it } from 'vitest';
import { defaultStorytellerState, type GameEvent, type WorldState } from '../../types.ts';
import { runKnowledgePipeline, phaseGossip } from './knowledge.ts';

function makeWorld(): WorldState {
  return {
    seed: 1,
    currentYear: 10,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0.5, rainfall: 0.5, factionId: null, settlementId: null, walkable: true }]] },
    factions: [
      { id: 'A', name: 'Alpha', color: '#fff', aggression: 50, settlements: ['S1'], population: 500, stability: 80, wealth: 50, military: 40, culture: 30, ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' }, leaderId: null, interestGroups: [] },
      { id: 'B', name: 'Beta', color: '#000', aggression: 50, settlements: ['S1'], population: 500, stability: 80, wealth: 50, military: 40, culture: 30, ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' }, leaderId: null, interestGroups: [] },
    ],
    relationships: [],
    historicalFigures: [],
    settlements: [{ id: 'S1', name: 'Town', position: { x: 0, y: 0 }, factionId: 'A', npcs: ['n1', 'n2'], items: [] }],
    ruins: [],
    resourceNodes: [],
    npcs: [
      { id: 'n1', name: 'N1', position: { x: 0, y: 0 }, factionId: 'A', personality: 'loyal', knowledge: [], dialogueKey: 'default', alive: true },
      { id: 'n2', name: 'N2', position: { x: 0, y: 0 }, factionId: 'B', personality: 'skeptic', knowledge: [], dialogueKey: 'default', alive: true },
    ],
    items: [],
    events: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [] },
    storyteller: defaultStorytellerState('clio'),
  };
}

const fakeRng = {
  nextFloat: () => 0,
  nextInt: () => 0,
};

describe('knowledge pipeline', () => {
  it('seeds cascade knowledge before gossip spreads it', () => {
    const world = makeWorld();
    const cascadeEvent: GameEvent = {
      id: 'e1', tick: 1, year: 10, secondsOffset: 0,
      subject: 'A', action: 'event', object: 'B', causedBy: 'root',
      significance: 5, playerCaused: true,
      description: 'Cascade event', motivation: 'test', statDeltas: [],
    };

    runKnowledgePipeline(world, [cascadeEvent], 11, fakeRng as never);

    const n1 = world.npcs.find(n => n.id === 'n1');
    const n2 = world.npcs.find(n => n.id === 'n2');
    expect(n1?.knowledge.some(k => k.eventId === 'e1')).toBe(true);
    expect(n2?.knowledge.some(k => k.eventId === 'e1')).toBe(true);
  });

  it('degrades accuracy by 10% per gossip transfer', () => {
    const world = makeWorld();
    world.npcs[0].knowledge.push({ eventId: 'e2', discoveredYear: 10, accuracy: 1, sourceId: 'direct' });

    phaseGossip(world, 11, fakeRng as never);

    const shared = world.npcs[1].knowledge.find(k => k.eventId === 'e2');
    expect(shared?.accuracy).toBe(0.9);
  });
});
