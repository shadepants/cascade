import type { WorldState, GameEvent, TradeRoute, Position } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { TRADE_ROUTE_DECAY_RATE, TRADE_ROUTE_GROWTH_RATE } from '../constants.ts';

/**
 * Phase Trade: Manages the emergence and decay of trade routes between settlements.
 * Trade routes transfer wealth and generate 'Insight' for the player.
 */
export function phaseTrade(
  world: WorldState,
  year: number,
  rng: GameRNG
): GameEvent[] {
  const events: GameEvent[] = [];
  const settlements = world.settlements;
  const newRoutes: TradeRoute[] = [...(world.tradeRoutes || [])];
  let insightGained = 0;

  // Precompute lookups to optimize the trade route loop (O(N) to O(1))
  const settlementMap = new Map(settlements.map(s => [s.id, s]));
  const factionMap = new Map(world.factions.map(f => [f.id, f]));
  const relMap = new Map(world.relationships.map(r => {
    const key = r.factionA < r.factionB ? `${r.factionA}:${r.factionB}` : `${r.factionB}:${r.factionA}`;
    return [key, r];
  }));

  // 1. Update and process existing routes
  for (let i = 0; i < newRoutes.length; i++) {
    const route = { ...newRoutes[i] };
    const start = settlementMap.get(route.startSettlementId);
    const end = settlementMap.get(route.endSettlementId);

    if (!start || !end || !route.active) {
      route.active = false;
      newRoutes[i] = route;
      continue;
    }

    const relKey = start.factionId < end.factionId ? `${start.factionId}:${end.factionId}` : `${end.factionId}:${start.factionId}`;
    const rel = relMap.get(relKey);

    const oldVolume = route.volume;
    if (rel?.state === 'war') {
      const decayRate = world.simConfig?.tradeDecayRate ?? TRADE_ROUTE_DECAY_RATE;
      route.volume = Math.max(0, route.volume - decayRate);
    } else {
      const growthRate = world.simConfig?.tradeGrowthRate ?? TRADE_ROUTE_GROWTH_RATE;
      route.volume = Math.min(100, route.volume + growthRate);
    }

    // Significant volume shift event
    if (oldVolume >= 20 && route.volume < 20 && route.active) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: start.factionId, action: 'trade_collapse', object: end.factionId,
        causedBy: null, playerCaused: false,
        description: `The trade route between ${start.name} and ${end.name} has withered due to instability.`,
        significance: 2
      }), year);
    }

    // Wealth transfer
    if (route.volume > 0) {
      const wealthDelta = Math.floor(route.volume / 20);
      if (wealthDelta > 0) {
        // Apply deltas directly — no event needed; trade_transfer was significance=1 noise
        for (const factionId of [start.factionId, end.factionId]) {
          const faction = factionMap.get(factionId);
          if (faction) faction.wealth = Math.min(100, faction.wealth + wealthDelta);
        }
      }
    }

    if (route.volume <= 0) route.active = false;
    
    // Insight Hook: High-volume trade routes grant the player insight (global awareness)
    if (route.active && route.volume >= 80) {
      world.player.insight += 1;
      insightGained += 1;
    }

    newRoutes[i] = route;
  }

  // 2. Spawn new routes
  // Max routes proportional to settlement count
  const activeCount = newRoutes.filter(r => r.active).length;
  if (settlements.length >= 2 && activeCount < settlements.length * 0.75) {
    const s1 = settlements[rng.nextInt(settlements.length)];
    const s2 = settlements[rng.nextInt(settlements.length)];

    if (s1.id !== s2.id && !newRoutes.some(r => 
      r.active && 
      ((r.startSettlementId === s1.id && r.endSettlementId === s2.id) ||
       (r.startSettlementId === s2.id && r.endSettlementId === s1.id))
    )) {
      const dx = s1.position.x - s2.position.x;
      const dy = s1.position.y - s2.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Only trade if within reasonable distance (e.g. 25 tiles)
      if (dist < 25) {
        const path = generateSimplePath(s1.position, s2.position);
        const commodity = (['grain', 'luxury', 'arms', 'textiles'] as const)[rng.nextInt(4)];
        
        const newRoute: TradeRoute = {
          id: `route-${s1.id}-${s2.id}-${year}`,
          startSettlementId: s1.id,
          endSettlementId: s2.id,
          path,
          volume: 20,
          commodity,
          active: true
        };
        newRoutes.push(newRoute);

        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: s1.id, action: 'trade_route_established', object: s2.id,
          causedBy: null, playerCaused: false,
          description: `A new trade route in ${commodity} established between ${s1.name} and ${s2.name}.`,
          significance: 3
        }), year);
      }
    }
  }

  world.tradeRoutes = newRoutes;

  // Emit a single trade_prosperity event if insight was earned this year
  if (insightGained > 0) {
    emitEvent(world, events, createEvent({
      tick: 0, year,
      subject: 'player', action: 'trade_prosperity', object: 'world',
      causedBy: null, playerCaused: false,
      description: `Flourishing trade routes granted the Traveler ${insightGained} insight into the world's currents.`,
      significance: 2,
    }), year);
  }

  return events;
}

function generateSimplePath(start: Position, end: Position): Position[] {
  const path: Position[] = [];
  let cx = start.x;
  let cy = start.y;
  path.push({ x: cx, y: cy });

  while (cx !== end.x || cy !== end.y) {
    if (cx < end.x) cx++; else if (cx > end.x) cx--;
    if (cy < end.y) cy++; else if (cy > end.y) cy--;
    path.push({ x: cx, y: cy });
  }
  return path;
}
