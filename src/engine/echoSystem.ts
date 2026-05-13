import type { WorldState, TemporalEcho, TileModifier } from '../types/world';

/**
 * Validates and executes a Temporal Echo action.
 * Returns a new WorldState with the effect applied and insight spent.
 */
export function executeEcho(world: WorldState, echo: TemporalEcho): WorldState {
  let cost = echo.cost;

  // Holy Site Intervention Cost: 2x
  if (echo.type === 'omen' && echo.targetId) {
    const [tx, ty] = echo.targetId.split(',').map(Number);
    if (world.holySites.some(hs => hs.position.x === tx && hs.position.y === ty)) {
      cost *= 2;
    }
  }

  if (world.player.insight < cost) {
    throw new Error('Insufficient Insight');
  }

  const newWorld = {
    ...world,
    player: {
      ...world.player,
      insight: world.player.insight - cost
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
  const eventId = `whisper-${echo.topic}-${world.currentYear}-${Math.floor(Math.random() * 1000)}`;

  const whisperEvent = {
    id: eventId,
    tick: 0,
    year: world.currentYear,
    secondsOffset: 0,
    subject: echo.targetId,
    action: 'whisper',
    object: echo.topic,
    description: `A mysterious whisper of ${echo.topic} reached ${npc?.name || 'the ears of many'}.`,
    motivation: 'as if spoken by the ghost of history itself',
    statDeltas: [],
    playerCaused: true,
    causedBy: null,
  };

  return {
    ...world,
    events: [...world.events, whisperEvent],
    npcs: world.npcs.map(npc => {
      if (npc.id === echo.targetId) {
        return {
          ...npc,
          knowledge: [
            ...npc.knowledge,
            {
              eventId: eventId,
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
        startTime: 0,
        duration: 2,
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

  const isHolySite = world.holySites.some(hs => hs.position.x === x && hs.position.y === y);

  const modifier: TileModifier = {
    type: 'omen',
    duration: isHolySite ? 40 : 10 // 4x impact duration on Holy Sites
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
