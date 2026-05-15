import type { WorldState, TemporalEcho, TileModifier } from '../types/world';
import { createEvent } from '../world/events.ts';

/**
 * Validates and executes a Temporal Echo action.
 * Returns a new WorldState with the effect applied and insight spent.
 */
export function executeEcho(world: WorldState, echo: TemporalEcho): WorldState {
  // Trust the cost passed from UI (which already accounts for Holy Site doubling)
  // to avoid "double-doubling" if we re-calculate it here.
  const cost = echo.cost;

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
    case 'bloom':
      return applyBloom(newWorld, echo);
    case 'fortify':
      return applyFortify(newWorld, echo);
    case 'chronicle':
      return applyChronicle(newWorld, echo);
    case 'reinforce':
      return applyReinforce(newWorld, echo);
    default:
      return newWorld;
  }
}

function applyReinforce(world: WorldState, echo: TemporalEcho): WorldState {
  if (!echo.targetId) return world;
  const settlement = world.settlements.find(s => s.id === echo.targetId);
  if (!settlement) return world;

  return {
    ...world,
    factions: world.factions.map(f => f.id === settlement.factionId 
      ? { ...f, stability: Math.min(100, f.stability + 20) }
      : f
    ),
    visuals: [
      ...(world.visuals || []),
      {
        id: `reinforce-${crypto.randomUUID()}`,
        type: 'aura',
        position: settlement.position,
        startTime: 0,
        duration: 3,
        color: '#60a5fa' // Blue for engineering
      }
    ]
  };
}

function applyFortify(world: WorldState, echo: TemporalEcho): WorldState {
  if (!echo.targetId) return world;
  const settlement = world.settlements.find(s => s.id === echo.targetId);
  if (!settlement) return world;

  const tile = { ...world.map.tiles[settlement.position.y][settlement.position.x] };
  const modifiers = [...(tile.modifiers || [])];
  modifiers.push({ type: 'blessing', duration: 30 });
  tile.modifiers = modifiers;

  const newTiles = world.map.tiles.map((row, ri) => 
    ri === settlement.position.y ? row.map((t, ci) => ci === settlement.position.x ? tile : t) : row
  );

  return {
    ...world,
    map: { ...world.map, tiles: newTiles },
    factions: world.factions.map(f => f.id === settlement.factionId 
      ? { ...f, military: Math.min(100, f.military + 15), stability: Math.min(100, f.stability + 10) }
      : f
    ),
    visuals: [
      ...(world.visuals || []),
      {
        id: `fortify-${crypto.randomUUID()}`,
        type: 'aura',
        position: settlement.position,
        startTime: 0,
        duration: 5,
        color: '#facc15'
      }
    ]
  };
}

function applyChronicle(world: WorldState, _echo: TemporalEcho): WorldState {
  // Chronicle grants a large boost to insight and seeds knowledge of a significant past event

  return {
    ...world,
    player: {
      ...world.player,
      insight: world.player.insight + 50, // Paradox: spending insight to gain more? 
      // Maybe Chronicle should be free but requires Scholarship?
      // No, let's make it a 'Discovery' action that costs 0 but can only be used once per era.
    },
    visuals: [
      ...(world.visuals || []),
      {
        id: `chronicle-${crypto.randomUUID()}`,
        type: 'tech_spark',
        position: world.player.position,
        startTime: 0,
        duration: 4,
        color: '#ffffff'
      }
    ]
  };
}

function applyWhisper(world: WorldState, echo: TemporalEcho): WorldState {
  if (!echo.targetId || !echo.topic) return world;

  const npc = world.npcs.find(n => n.id === echo.targetId);

  const whisperEvent = createEvent({
    tick: 0,
    year: world.currentYear,
    subject: echo.targetId,
    action: 'whisper',
    object: echo.topic,
    description: `A mysterious whisper of ${echo.topic} reached ${npc?.name || 'the ears of many'}.`,
    motivation: 'as if spoken by the ghost of history itself',
    significance: 5,
    playerCaused: true,
    causedBy: null,
  });

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
              eventId: whisperEvent.id,
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
        id: `ripple-${echo.targetId}-${crypto.randomUUID()}`,
        type: 'ripple',
        position: npc?.position || echo.position || { x: 0, y: 0 },
        startTime: 0,
        duration: 2,
        color: '#ffcc00'
      }
    ]
  };
}

function applyBloom(world: WorldState, echo: TemporalEcho): WorldState {
  // Bloom targeting prefers explicit position, then parses targetId
  let x = echo.position?.x;
  let y = echo.position?.y;

  if (x === undefined || y === undefined) {
    if (!echo.targetId) return world;
    const [tx, ty] = echo.targetId.split(',').map(Number);
    x = tx; y = ty;
  }

  if (isNaN(x!) || isNaN(y!)) return world;

  const tile = { ...world.map.tiles[y!][x!] };
  const modifiers = [...(tile.modifiers || [])];

  modifiers.push({
    type: 'bloom',
    duration: 20
  });

  tile.modifiers = modifiers;

  const newTiles = world.map.tiles.map((row, ri) => 
    ri === y ? row.map((t, ci) => ci === x ? tile : t) : row
  );
  const newMap = { ...world.map, tiles: newTiles };

  return {
    ...world,
    map: newMap,
    visuals: [
      ...(world.visuals || []),
      {
        id: `bloom-${echo.targetId || `${x},${y}`}-${crypto.randomUUID()}`,
        type: 'sparkle',
        position: { x: x!, y: y! },
        startTime: 0,
        duration: 5,
        color: '#4ade80' // Greenish for bloom
      }
    ]
  };
}

function applyOmen(world: WorldState, echo: TemporalEcho): WorldState {
  // Omen targeting prefers explicit position, then parses targetId
  let x = echo.position?.x;
  let y = echo.position?.y;

  if (x === undefined || y === undefined) {
    if (!echo.targetId) return world;
    const [tx, ty] = echo.targetId.split(',').map(Number);
    x = tx; y = ty;
  }

  if (isNaN(x!) || isNaN(y!)) return world;
  
  const tile = { ...world.map.tiles[y!][x!] };
  const modifiers = [...(tile.modifiers || [])];

  const isHolySite = world.holySites.some(hs => hs.position.x === x && hs.position.y === y);
  const modifier: TileModifier = {
    type: 'omen',
    duration: isHolySite ? 40 : 10
  };

  modifiers.push(modifier);
  tile.modifiers = modifiers;

  const newTiles = world.map.tiles.map((row, ri) => 
    ri === y ? row.map((t, ci) => ci === x ? tile : t) : row
  );
  const newMap = { ...world.map, tiles: newTiles };

  return {
    ...world,
    map: newMap,
    visuals: [
      ...(world.visuals || []),
      {
        id: `sparkle-${echo.targetId || `${x},${y}`}-${crypto.randomUUID()}`,
        type: 'sparkle',
        position: { x: x!, y: y! },
        startTime: 0,
        duration: 5,
        color: '#00ccff'
      }
    ]
  };
}
