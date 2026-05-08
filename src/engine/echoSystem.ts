import type { WorldState, TemporalEcho, TileModifier } from '../types/world';

/**
 * Validates and executes a Temporal Echo action.
 * Returns a new WorldState with the effect applied and insight spent.
 */
export function executeEcho(world: WorldState, echo: TemporalEcho): WorldState {
  if (world.player.insight < echo.cost) {
    throw new Error('Insufficient Insight');
  }

  const newWorld = {
    ...world,
    player: {
      ...world.player,
      insight: world.player.insight - echo.cost
    }
  };

  switch (echo.type) {
    case 'whisper':
      return applyWhisper(newWorld, echo);
    case 'omen':
      return applyOmen(newWorld, echo);
    default:
      return newWorld;
  }
}

function applyWhisper(world: WorldState, echo: TemporalEcho): WorldState {
  if (!echo.targetId || !echo.topic) return world;

  const npc = world.npcs.find(n => n.id === echo.targetId);

  // Find the NPC and add the topic to their next gossip
  // For now, we simulate this by adding a specific 'whispered' knowledge entry
  return {
    ...world,
    npcs: world.npcs.map(npc => {
      if (npc.id === echo.targetId) {
        return {
          ...npc,
          knowledge: [
            ...npc.knowledge,
            {
              eventId: `whisper-${echo.topic}-${world.currentYear}`,
              discoveredYear: world.currentYear,
              accuracy: 1.0,
              sourceId: 'player-echo'
            }
          ]
        };
      }
      return npc;
    }),
    visuals: [
      ...(world.visuals || []),
      {
        id: `ripple-${echo.targetId}-${Date.now()}`,
        type: 'ripple',
        position: npc?.position || { x: 0, y: 0 },
        startTime: 0, // current tick in simulation terms, but for visuals we might need real time or tick
        duration: 2, // 2 years or frames
        color: '#ffcc00'
      }
    ]
  };
}

function applyOmen(world: WorldState, echo: TemporalEcho): WorldState {
  if (!echo.targetId) return world;

  // targetId for omen is expected to be "x,y"
  const [x, y] = echo.targetId.split(',').map(Number);
  if (isNaN(x) || isNaN(y)) return world;

  const newMap = { ...world.map };
  const tile = { ...newMap.tiles[y][x] };
  const modifiers = [...(tile.modifiers || [])];

  const modifier: TileModifier = {
    type: 'omen',
    duration: 10 // Lasts 10 years
  };

  modifiers.push(modifier);
  tile.modifiers = modifiers;
  newMap.tiles[y][x] = tile;

  return {
    ...world,
    map: newMap,
    visuals: [
      ...(world.visuals || []),
      {
        id: `sparkle-${echo.targetId}-${Date.now()}`,
        type: 'sparkle',
        position: { x, y },
        startTime: 0,
        duration: 5,
        color: '#00ccff'
      }
    ]
  };
}
