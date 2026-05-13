import type { WorldState, GameEvent, Settlement, StatDelta } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { applyStatDeltas } from '../helpers/stats.ts';

/**
 * Phase Religion: Manages the spread of faiths and religious conversion.
 * Faith spreads from Holy Sites, between nearby settlements, and along trade routes.
 */
export function phaseReligion(
  world: WorldState,
  year: number,
  rng: GameRNG
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
      
      // Conversion adds significant tension
      if (world.storyteller) {
        world.storyteller.tension = Math.min(100, world.storyteller.tension + (hasOmen ? 8 : 4));
      }

      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: settlement.id, action: 'religious_conversion', object: settlement.dominantReligionId || 'unknown',
        causedBy: null, playerCaused: !!hasOmen,
        description: `${settlement.name} has converted to ${religion?.name || 'a new faith'}${hasOmen ? ' as prophesied by a Sacred Omen' : ''}.`,
        significance: 4
      }), year);

      // Mechanical Impact: religion tenets shift faction stats + ethics
      const faction = world.factions.find(f => f.id === settlement.factionId);
      if (faction && religion) {
        if (faction.interestGroups) {
          const ig = faction.interestGroups.find(g => g.type === 'religious');
          if (ig) ig.power = Math.min(100, ig.power + 6);
        }

        // Tenet-driven stat effects applied via the canonical helper (clamps included)
        const tenetDeltas: StatDelta[] = [];
        for (const tenet of religion.tenets) {
          if (tenet === 'peace')     tenetDeltas.push({ factionId: faction.id, stat: 'stability', delta: 2 });
          if (tenet === 'war')       tenetDeltas.push({ factionId: faction.id, stat: 'military',  delta: 2 });
          if (tenet === 'charity')   tenetDeltas.push({ factionId: faction.id, stat: 'population', delta: 5 });
          if (tenet === 'knowledge') tenetDeltas.push({ factionId: faction.id, stat: 'culture',   delta: 3 });
          if (tenet === 'wealth')    tenetDeltas.push({ factionId: faction.id, stat: 'wealth',    delta: 2 });
        }
        if (tenetDeltas.length > 0) applyStatDeltas(world, tenetDeltas);

        // Tenet-based ethics shifts (peace/charity → mercy/tradition; war → violence)
        if (faction.ethics) {
          if (religion.tenets.includes('peace') || religion.tenets.includes('charity')) {
            faction.ethics.mercy     = shiftTowardEmbraced(faction.ethics.mercy);
            faction.ethics.tradition = shiftTowardEmbraced(faction.ethics.tradition);
          }
          if (religion.tenets.includes('war')) {
            faction.ethics.violence  = shiftTowardEmbraced(faction.ethics.violence);
          }
        }
      }
    }

    // Schism: two faiths competing above pressure threshold
    checkSchism(world, settlement, year, rng, events);

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

/** Fire a religious schism event when two faiths compete above the dominance threshold. */
function checkSchism(
  world: WorldState,
  settlement: Settlement,
  year: number,
  rng: GameRNG,
  events: GameEvent[],
): void {
  const contested = settlement.faith.filter(f => f.pressure > 40);
  if (contested.length < 2) return;
  if (rng.nextFloat() > 0.2) return; // 20% chance per year per settlement

  const hasOmen = world.map.tiles[settlement.position.y]?.[settlement.position.x]?.modifiers?.some(m => m.type === 'omen');
  const faction = world.factions.find(f => f.id === settlement.factionId);
  const [faithA, faithB] = contested;
  const relA = world.religions.find(r => r.id === faithA.religionId);
  const relB = world.religions.find(r => r.id === faithB.religionId);

  // Schism adds tension
  if (world.storyteller) {
    world.storyteller.tension = Math.min(100, world.storyteller.tension + (hasOmen ? 12 : 6));
  }

  emitEvent(world, events, createEvent({
    tick: 0, year,
    subject: settlement.id, action: 'religious_schism', object: settlement.factionId,
    causedBy: null, playerCaused: !!hasOmen,
    description: `A schism erupted in ${settlement.name} between followers of ${relA?.name ?? 'an old faith'} and ${relB?.name ?? 'a new faith'}.`,
    significance: 5,
    statDeltas: faction
      ? [{ factionId: faction.id, stat: 'stability', delta: -8 }]
      : [],
  }), year);

  // Boost military interest group from religious conflict
  if (faction?.interestGroups) {
    const milIG = faction.interestGroups.find(g => g.type === 'military');
    if (milIG) milIG.power = Math.min(100, milIG.power + 5);
  }
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

