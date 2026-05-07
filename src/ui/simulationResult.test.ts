import { describe, expect, it } from 'vitest';
import { defaultStorytellerState, type GameEvent, type WorldState } from '../types.ts';
import { processSimulationResult } from './simulationResult.ts';

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
    npcs: [],
    items: [],
    events: [],
    player: { id: 'player', name: 'Traveler', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: ['a1'] },
    storyteller: defaultStorytellerState('clio'),
  };
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
});
