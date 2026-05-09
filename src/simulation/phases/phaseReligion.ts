import type { WorldState, GameEvent, Settlement } from '../../types';
import { SeededRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';

/**
 * Phase Religion: Manages the spread of faiths and religious conversion.
 * Faith spreads from Holy Sites, between nearby settlements, and along trade routes.
 */
export function phaseReligion(
  world: WorldState,
  year: number,
  _rng: SeededRNG
): GameEvent[] {
  const events: GameEvent[] = [];
  const settlements = world.settlements;
  const holySites = world.holySites;

  // 1. Spread from Holy Sites to their parent settlements
  for (const site of holySites) {
    const settlement = settlements.find(s => 
      s.position.x === site.position.x && s.position.y === site.position.y
    );
    if (settlement) {
      let pressure = 25; // Base pressure from Holy Site
      
      // Sacred Omen check: doubling pressure if player has intervened
      const tile = world.map.tiles[site.position.y][site.position.x];
      if (tile.modifiers?.some(m => m.type === 'omen')) {
        pressure *= 2;
      }
      
      applyPressure(settlement, site.religionId, pressure);
    }
  }

  // 2. Proximity-based diffusion
  for (let i = 0; i < settlements.length; i++) {
    for (let j = i + 1; j < settlements.length; j++) {
      const s1 = settlements[i];
      const s2 = settlements[j];
      const dx = s1.position.x - s2.position.x;
      const dy = s1.position.y - s2.position.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < 625) { // Within 25 tiles
        const basePressure = Math.max(1, 8 - Math.floor(Math.sqrt(distSq) / 3));
        shareFaith(s1, s2, basePressure);
      }
    }
  }

  // 3. Trade Route diffusion (Missionaries / Merchants)
  if (world.tradeRoutes) {
    for (const route of world.tradeRoutes) {
      if (!route.active || route.volume < 30) continue;
      const s1 = settlements.find(s => s.id === route.startSettlementId);
      const s2 = settlements.find(s => s.id === route.endSettlementId);
      if (s1 && s2) {
        const pressure = Math.floor(route.volume / 8);
        shareFaith(s1, s2, pressure);
      }
    }
  }

  // 4. Update dominance and process effects
  for (const settlement of settlements) {
    const oldDominant = settlement.dominantReligionId;
    updateSettlementDominance(settlement);
    
    if (settlement.dominantReligionId && settlement.dominantReligionId !== oldDominant) {
      const religion = world.religions.find(r => r.id === settlement.dominantReligionId);
      const hasOmen = world.map.tiles[settlement.position.y][settlement.position.x].modifiers?.some(m => m.type === 'omen');
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: settlement.id, action: 'religious_conversion', object: settlement.dominantReligionId || 'unknown',
        causedBy: null, playerCaused: !!hasOmen,
        description: `${settlement.name} has converted to ${religion?.name || 'a new faith'}${hasOmen ? ' as prophesied by a Sacred Omen' : ''}.`,
        significance: 4
      }), year);

      // Mechanical Impact: Religions tilt faction ethics toward Tradition/Mercy
      const faction = world.factions.find(f => f.id === settlement.factionId);
      if (faction) {
        if (faction.interestGroups) {
          const ig = faction.interestGroups.find(g => g.type === 'religious');
          if (ig) ig.power = Math.min(100, ig.power + 6);
        }
        
        if (faction.ethics) {
          faction.ethics.mercy = shiftTowardEmbraced(faction.ethics.mercy);
          faction.ethics.tradition = shiftTowardEmbraced(faction.ethics.tradition);
        }
      }
    }

    // Natural decay of minority faiths
    for (const f of settlement.faith) {
      if (f.religionId !== settlement.dominantReligionId) {
        f.pressure = Math.max(0, f.pressure - 3);
      }
    }
    settlement.faith = settlement.faith.filter(f => f.pressure > 0);
  }

  return events;
}

function applyPressure(settlement: Settlement, religionId: string, amount: number) {
  const existing = settlement.faith.find(f => f.religionId === religionId);
  if (existing) {
    existing.pressure = Math.min(100, existing.pressure + amount);
  } else {
    settlement.faith.push({ religionId, pressure: amount });
  }
}

function shareFaith(s1: Settlement, s2: Settlement, amount: number) {
  // S1 -> S2
  for (const f1 of s1.faith) {
    if (f1.pressure > 15) {
      applyPressure(s2, f1.religionId, Math.floor(amount * (f1.pressure / 100)));
    }
  }
  // S2 -> S1
  for (const f2 of s2.faith) {
    if (f2.pressure > 15) {
      applyPressure(s1, f2.religionId, Math.floor(amount * (f2.pressure / 100)));
    }
  }
}

function updateSettlementDominance(settlement: Settlement) {
  if (settlement.faith.length === 0) {
    settlement.dominantReligionId = null;
    return;
  }
  
  const best = [...settlement.faith].sort((a, b) => b.pressure - a.pressure)[0];
  // Threshold to become dominant
  if (best.pressure > 40) {
    settlement.dominantReligionId = best.religionId;
  }
}

function shiftTowardEmbraced(current: 'shunned' | 'neutral' | 'embraced'): 'shunned' | 'neutral' | 'embraced' {
  if (current === 'shunned') return 'neutral';
  if (current === 'neutral') return 'embraced';
  return 'embraced';
}
