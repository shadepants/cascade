// ─── Phase 4: Conflict ────────────────────────────────────────────────────
// War declaration, combat resolution, territorial transfer, and faction fracture.

import type {
  WorldState, GameEvent, Faction, StatDelta, Position,
} from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import {
  WAR_ANIMOSITY_THRESHOLD,
  pickMotivation,
} from '../constants.ts';
import { shouldSuppressEvent } from '../storyteller.ts';
import {
  getTilesWithPosForFaction,
  getBorderTilesOf,
  countSharedBorderTiles,
} from '../helpers/spatial.ts';

export function phaseConflict(
  world: WorldState,
  year: number,
  rng: GameRNG,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    if (rel.state === 'war') {
      const winner = resolveWar(world, rel, year, rng, events);
      if (winner) {
        const peaceType = rng.nextFloat() < 0.4 ? 'peace_tribute' : 'peace_treaty';
        const peaceEvent = createEvent({
          tick: 0, year,
          subject: winner, action: peaceType,
          object: rel.factionA === winner ? rel.factionB : rel.factionA,
          causedBy: null, significance: 5, playerCaused: false,
          description: `The war between ${world.factions.find(f => f.id === rel.factionA)?.name} and ${world.factions.find(f => f.id === rel.factionB)?.name} ended`,
          motivation: pickMotivation(peaceType, rng),
          statDeltas: [
            { factionId: rel.factionA, stat: 'stability', delta: -10 },
            { factionId: rel.factionB, stat: 'stability', delta: -10 },
          ],
        });

        if (!shouldSuppressEvent(world.storyteller, year, peaceEvent.significance)) {
          rel.state = 'peace';
          rel.animosity = Math.max(0, rel.animosity - 30);
          emitEvent(world, events, peaceEvent, year);
        }
      }
      continue;
    }

    if (rel.animosity >= WAR_ANIMOSITY_THRESHOLD && rel.state !== 'alliance') {
      const fA = world.factions.find(f => f.id === rel.factionA);
      const fB = world.factions.find(f => f.id === rel.factionB);
      if (!fA || !fB) continue;

      const borderTiles = countSharedBorderTiles(world.map, fA.id, fB.id);
      if (borderTiles === 0) continue;

      const maxAggression = Math.max(fA.aggression, fB.aggression);
      const warProb = Math.min(0.8, (rel.animosity / 200) * 0.6 + (maxAggression / 100) * 0.2);

      if (rng.nextFloat() < warProb) {
        const warEvent = createEvent({
          tick: 0, year,
          subject: fA.id, action: 'war_declared', object: fB.id,
          causedBy: null, significance: 6, playerCaused: false,
          description: `${fA.name} declared war on ${fB.name}`,
          motivation: pickMotivation('war_declared', rng),
          statDeltas: [
            { factionId: fA.id, stat: 'stability', delta: -8 },
            { factionId: fB.id, stat: 'stability', delta: -8 },
          ],
        });

        const suppressed = world.storyteller.cooldowns.some(
          cd => cd.triggerSignificance >= warEvent.significance && year < cd.startYear + cd.durationYears
        );

        if (!suppressed) {
          rel.state = 'war';
          emitEvent(world, events, warEvent, year);
        }
      }
    }
  }

  return events;
}

/** Resolve an ongoing war — returns winner ID if war ends, null if continues. */
function resolveWar(
  world: WorldState,
  rel: typeof world.relationships[0],
  year: number,
  rng: GameRNG,
  events: GameEvent[],
): string | null {
  const fA = world.factions.find(f => f.id === rel.factionA);
  const fB = world.factions.find(f => f.id === rel.factionB);
  if (!fA || !fB) return null;

  const strA = fA.military * (fA.stability / 100);
  const strB = fB.military * (fB.stability / 100);
  const total = strA + strB;
  if (total === 0) return null;

  if (rng.nextFloat() > 0.4) return null;

  const fAWins = rng.nextFloat() < strA / total;
  const winner = fAWins ? fA : fB;
  const loser  = fAWins ? fB : fA;

  const borderTiles = getBorderTilesOf(world.map, loser.id, winner.id);
  const tilesToTransfer = Math.min(borderTiles.length, Math.max(1, Math.floor(borderTiles.length * 0.3)));

  const loserSettlementsSet = new Set(loser.settlements);
  const winnerSettlementsSet = new Set(winner.settlements);

  for (let i = 0; i < tilesToTransfer; i++) {
    const pos = borderTiles[i];
    const tile = world.map.tiles[pos.y][pos.x];

    if (tile.settlementId) {
      const s = world.settlements.find(set => set.id === tile.settlementId);
      if (s && s.factionId !== winner.id) {
        s.factionId = winner.id;
        loserSettlementsSet.delete(s.id);
        winnerSettlementsSet.add(s.id);

        // Ensure all tiles belonging to this settlement are transferred
        for (let ty = 0; ty < world.map.height; ty++) {
          for (let tx = 0; tx < world.map.width; tx++) {
            if (world.map.tiles[ty][tx].settlementId === s.id) {
              world.map.tiles[ty][tx].factionId = winner.id;
            }
          }
        }
      }
    } else {
      tile.factionId = winner.id;
    }
  }

  loser.settlements = Array.from(loserSettlementsSet);
  winner.settlements = Array.from(winnerSettlementsSet);

  const deltas: StatDelta[] = [
    { factionId: winner.id, stat: 'military',   delta: -10 },
    { factionId: winner.id, stat: 'wealth',      delta: 15 },
    { factionId: loser.id,  stat: 'military',    delta: -20 },
    { factionId: loser.id,  stat: 'stability',   delta: -15 },
    { factionId: loser.id,  stat: 'population',  delta: -50 },
  ];
  emitEvent(world, events, createEvent({
    tick: 0, year,
    subject: winner.id, action: 'conquered', object: loser.id,
    causedBy: null, significance: 7, playerCaused: false,
    description: `${winner.name} pushed back ${loser.name}'s forces and seized territory`,
    motivation: pickMotivation('conquered', rng),
    statDeltas: deltas,
  }), year);

  if (loser.stability < 20 && rng.nextFloat() < 0.3) {
    const fractureEvent = fractureFaction(world, loser, year, rng);
    if (fractureEvent) emitEvent(world, events, fractureEvent, year);
  }

  return winner.id;
}

/**
 * Shatter a faction into two. A new rival faction takes ~30% of the territory.
 * BFS starts from the tile furthest from the capital (first settlement).
 * Exported for use by succession.ts and stability.ts.
 */
export function fractureFaction(
  world: WorldState,
  original: Faction,
  year: number,
  rng: GameRNG,
): GameEvent | null {
  const tiles = getTilesWithPosForFaction(world.map, original.id);
  if (tiles.length < 10) return null;

  const capital = world.settlements.find(s => s.id === original.settlements[0]);
  if (!capital) return null;

  let furthest: Position = tiles[0];
  let maxDist = -1;
  for (const t of tiles) {
    const d = Math.abs(t.x - capital.position.x) + Math.abs(t.y - capital.position.y);
    if (d > maxDist) { maxDist = d; furthest = t; }
  }

  const newFactionId = `faction_rebel_${original.id}_${year}_${Math.floor(rng.nextFloat() * 1000)}`;
  const targetCount = Math.floor(tiles.length * 0.3);
  const queue: Position[] = [furthest];
  const claimed = new Set<string>();
  const newTiles: Position[] = [];

  while (queue.length > 0 && newTiles.length < targetCount) {
    const curr = queue.shift()!;
    const key = `${curr.x},${curr.y}`;
    if (claimed.has(key)) continue;
    claimed.add(key);
    newTiles.push(curr);

    const neighbors = [
      { x: curr.x - 1, y: curr.y }, { x: curr.x + 1, y: curr.y },
      { x: curr.x, y: curr.y - 1 }, { x: curr.x, y: curr.y + 1 },
    ];
    for (const n of neighbors) {
      if (n.x >= 0 && n.y >= 0 && n.x < world.map.width && n.y < world.map.height &&
          world.map.tiles[n.y][n.x].factionId === original.id) {
        queue.push(n);
      }
    }
  }

  const newFaction: Faction = {
    ...original,
    id: newFactionId,
    name: `${original.name} Remnant`,
    color: `#${Math.floor(rng.nextFloat() * 16777215).toString(16)}`,
    stability: 50,
    military: Math.round(original.military * 0.4),
    wealth: Math.round(original.wealth * 0.3),
    settlements: [],
    leaderId: null, // rebel faction starts without an inherited ruler
  };

  const originalSettlementsSet = new Set(original.settlements);

  for (const pos of newTiles) {
    const tile = world.map.tiles[pos.y][pos.x];

    if (tile.settlementId) {
      const s = world.settlements.find(set => set.id === tile.settlementId);
      if (s && s.factionId !== newFactionId) {
        s.factionId = newFactionId;
        if (!newFaction.settlements.includes(s.id)) {
          newFaction.settlements.push(s.id);
        }
        originalSettlementsSet.delete(s.id);

        // Ensure all tiles belonging to this settlement are transferred
        for (let ty = 0; ty < world.map.height; ty++) {
          for (let tx = 0; tx < world.map.width; tx++) {
            if (world.map.tiles[ty][tx].settlementId === s.id) {
              world.map.tiles[ty][tx].factionId = newFactionId;
            }
          }
        }
      }
    } else {
      tile.factionId = newFactionId;
    }
  }

  original.settlements = Array.from(originalSettlementsSet);

  world.factions.push(newFaction);
  world.relationships.push({
    factionA: original.id,
    factionB: newFactionId,
    opinion: -100,
    animosity: 150,
    state: 'war',
  });

  return createEvent({
    tick: 0, year,
    subject: original.id, action: 'civil_war_fracture', object: newFactionId,
    causedBy: null, significance: 8, playerCaused: false,
    description: `A civil war shattered ${original.name}, as the ${newFaction.name} seized the frontier`,
    motivation: 'sparked by the collapse of central authority and long-held regional grievances',
    statDeltas: [
      { factionId: original.id, stat: 'stability', delta: -30 },
      { factionId: original.id, stat: 'military',  delta: -20 },
    ],
  });
}
