import { describe, expect, it } from 'vitest';
import { defaultStorytellerState, type GameEvent, type WorldState } from '../types';
import { formatNotificationValue, processSimulationResult } from './simulationResult.ts';

function makeWorld(): WorldState {
  return {
    seed: 1,
    currentYear: 20,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0.5, rainfall: 0.5, factionId: null, settlementId: null, walkable: true }]] },
    factions: [],
    relationships: [],
    historicalFigures: [],
    settlements: [],
    ruins: [],
    resourceNodes: [],
    religions: [],
    holySites: [],
    npcs: [],
    items: [],
    tradeRoutes: [],
    events: [],
    player: { id: 'player', name: 'Traveler', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: ['a1'], insight: 0 },
    storyteller: defaultStorytellerState('clio'),
    visuals: [],
  };
}

function cloneWorld(world: WorldState): WorldState {
  return structuredClone(world);
}

describe('processSimulationResult', () => {
  it('clears pending notification and supports JSON payload formatting', () => {
    const newWorld = makeWorld();
    const sourceWorld = makeWorld();
    newWorld.storyteller.pendingNotification = '{"message":"Echo arrived"}';

    const result = processSimulationResult(newWorld, [] as GameEvent[], sourceWorld);

    expect(result.notification).toBe('Echo arrived');
    expect(newWorld.storyteller.pendingNotification).toBeUndefined();
  });

  it('resets per-era action budget after jump result', () => {
    const newWorld = makeWorld();
    const sourceWorld = makeWorld();

    processSimulationResult(newWorld, [], sourceWorld);

    expect(newWorld.player.actionsThisEra).toEqual([]);
  });

  it('distributes cascade knowledge deterministically for same world seed/year', () => {
    const baseWorld = makeWorld();
    baseWorld.npcs = [
      { id: 'n1', name: 'A', position: { x: 0, y: 0 }, factionId: 'f1', personality: 'loyal', knowledge: [], dialogueKey: 'k', alive: true },
      { id: 'n2', name: 'B', position: { x: 0, y: 0 }, factionId: 'f1', personality: 'skeptic', knowledge: [], dialogueKey: 'k', alive: true },
    ];
    const events: GameEvent[] = [
      { id: 'e1', tick: 0, year: 20, secondsOffset: 0, subject: 'f1', action: 'x', object: 'f2', causedBy: null, significance: 4, playerCaused: true, description: 'd', motivation: 'm', statDeltas: [] },
      { id: 'e2', tick: 0, year: 20, secondsOffset: 0, subject: 'f1', action: 'x', object: 'f2', causedBy: null, significance: 4, playerCaused: true, description: 'd', motivation: 'm', statDeltas: [] },
    ];

    const worldA = cloneWorld(baseWorld);
    const worldB = cloneWorld(baseWorld);
    const source = makeWorld();

    processSimulationResult(worldA, events, source);
    processSimulationResult(worldB, events, source);

    const aKnowledge = worldA.npcs.map(n => n.knowledge.map(k => k.eventId));
    const bKnowledge = worldB.npcs.map(n => n.knowledge.map(k => k.eventId));
    expect(aKnowledge).toEqual(bKnowledge);
  });
});

describe('formatNotificationValue', () => {
  it('returns null for null or undefined', () => {
    expect(formatNotificationValue(null)).toBeNull();
    expect(formatNotificationValue(undefined)).toBeNull();
  });

  it('returns null for empty or whitespace strings', () => {
    expect(formatNotificationValue('')).toBeNull();
    expect(formatNotificationValue('   ')).toBeNull();
  });

  it('returns trimmed plain strings', () => {
    expect(formatNotificationValue('hello')).toBe('hello');
    expect(formatNotificationValue('  world  ')).toBe('world');
  });

  it('unwraps valid JSON strings with message, text, or description keys', () => {
    expect(formatNotificationValue('{"message": "foo"}')).toBe('foo');
    expect(formatNotificationValue('{"text": "bar"}')).toBe('bar');
    expect(formatNotificationValue('{"description": "baz"}')).toBe('baz');
  });

  it('returns trimmed original string for valid JSON without expected keys', () => {
    expect(formatNotificationValue('{"other": "val"}')).toBe('{"other": "val"}');
  });

  it('returns trimmed original string for invalid JSON starting with { or [', () => {
    expect(formatNotificationValue('{invalid json')).toBe('{invalid json');
  });

  it('unwraps objects with message, text, or description keys', () => {
    expect(formatNotificationValue({ message: 'obj-foo' })).toBe('obj-foo');
    expect(formatNotificationValue({ text: 'obj-bar' })).toBe('obj-bar');
    expect(formatNotificationValue({ description: 'obj-baz' })).toBe('obj-baz');
  });

  it('returns JSON.stringify result for objects without expected keys', () => {
    expect(formatNotificationValue({ other: 'obj-val' })).toBe('{"other":"obj-val"}');
  });

  it('returns String() representation for circular objects that fail stringification', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatNotificationValue(circular)).toBe('[object Object]');
  });

  it('returns String() representation for other primitives', () => {
    expect(formatNotificationValue(123)).toBe('123');
    expect(formatNotificationValue(true)).toBe('true');
  });
});
