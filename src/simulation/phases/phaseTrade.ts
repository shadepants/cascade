import type { WorldState, GameEvent, StatDelta, TradeRoute, Position } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';

/**
 * Phase Trade: Manages the emergence and decay of trade routes between settlements.
 * Trade routes transfer wealth and generate 'Insight' for the player.
 */
export function phaseTrade(
  world: WorldState,
  year: number,
  rng: SeededRNG
): GameEvent[] {
  const events: GameEvent[] = [];
  const settlements = world.settlements;
  const newRoutes: TradeRoute[] = [...(world.tradeRoutes || [])];

  // 1. Update and process existing routes
  for (let i = 0; i < newRoutes.length; i++) {
    const route = { ...newRoutes[i] };
    const start = settlements.find(s => s.id === route.startSettlementId);
    const end = settlements.find(s => s.id === route.endSettlementId);

    if (!start || !end || !route.active) {
      route.active = false;
      newRoutes[i] = route;
      continue;
    }

    const rel = world.relationships.find(r => 
      (r.factionA === start.factionId && r.factionB === end.factionId) ||
      (r.factionA === end.factionId && r.factionB === start.factionId)
    );

    const oldVolume = route.volume;
    if (rel?.state === 'war') {
      route.volume = Math.max(0, route.volume - 15);
    } else {
      route.volume = Math.min(100, route.volume + 5);
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
        const deltas: StatDelta[] = [
          { factionId: start.factionId, stat: 'wealth', delta: wealthDelta },
          { factionId: end.factionId, stat: 'wealth', delta: wealthDelta }
        ];
        
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: route.id, action: 'trade_transfer', object: route.commodity,
          causedBy: null, playerCaused: false,
          statDeltas: deltas,
          significance: 1,
          description: `Trade in ${route.commodity} generated wealth for ${start.name} and ${end.name}.`
        }), year);
      }
    }

    if (route.volume <= 0) route.active = false;
    
    // Insight Hook: High-volume trade routes grant the player insight (global awareness)
    if (route.active && route.volume >= 80) {
      world.player.insight += 1;
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
