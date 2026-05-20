import type { WorldState, GameEvent, Settlement, StatDelta, HistoricalFigure, Faction, Religion } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { applyStatDeltas } from '../helpers/stats.ts';
import { shouldSuppressEvent } from '../storyteller.ts';
import { SCHISM_PROBABILITY_BASE } from '../constants.ts';

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

  // 1. Spread from Holy Sites to nearby settlements
  for (const site of holySites) {
    // Find settlements within range (e.g., 10 tiles)
    for (const settlement of settlements) {
      const dx = site.position.x - settlement.position.x;
      const dy = site.position.y - settlement.position.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < 100) { // Within 10 tiles
        let pressure = Math.max(1, 25 - Math.floor(Math.sqrt(distSq) * 1.5));
        
        // Sacred Omen check: doubling pressure if player has intervened
        const tile = world.map.tiles[site.position.y][site.position.x];
        if (tile.modifiers?.some(m => m.type === 'omen')) {
          pressure *= 4; // Holy Site + Omen = 4x impact
        }
        
        applyPressure(world, settlement, site.religionId, pressure);
      }
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
        shareFaith(world, s1, s2, basePressure);
      }
    }
  }

  // 3. Trade Route diffusion (Missionaries / Merchants)
  if (world.tradeRoutes) {
    const settlementMap = new Map<string, Settlement>();
    for (const s of settlements) settlementMap.set(s.id, s);

    for (const route of world.tradeRoutes) {
      if (!route.active || route.volume < 30) continue;
      const s1 = settlementMap.get(route.startSettlementId);
      const s2 = settlementMap.get(route.endSettlementId);
      if (s1 && s2) {
        const pressure = Math.floor(route.volume / 8);
        shareFaith(world, s1, s2, pressure);
      }
    }
  }

  // 4. Martyrdom Effect: Check for pious ruler deaths in previous year
  checkMartyrdom(world, year, events);

  // 5. Update dominance and process effects
  for (const settlement of settlements) {
    const oldDominant = settlement.dominantReligionId;
    updateSettlementDominance(settlement);
    
    if (settlement.dominantReligionId && settlement.dominantReligionId !== oldDominant) {
      const religion = world.religions.find(r => r.id === settlement.dominantReligionId);
      const hasOmen = world.map.tiles[settlement.position.y][settlement.position.x].modifiers?.some(m => m.type === 'omen');
      
      const conversionEvent = createEvent({
        tick: 0, year,
        subject: settlement.id, action: 'religious_conversion', object: settlement.dominantReligionId || 'unknown',
        causedBy: null, playerCaused: !!hasOmen,
        description: `${settlement.name} has converted to ${religion?.name || 'a new faith'}${hasOmen ? ' as prophesied by a Sacred Omen' : ''}.`,
        significance: 4
      });

      if (!shouldSuppressEvent(world.storyteller, year, conversionEvent.significance)) {
        // Conversion adds significant tension
        if (world.storyteller) {
          world.storyteller.tension = Math.min(100, world.storyteller.tension + (hasOmen ? 8 : 4));
        }

        emitEvent(world, events, conversionEvent, year);

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
      } else {
        // Suppression: revert dominance change to maintain sync
        settlement.dominantReligionId = oldDominant;
      }
    }

    // Schism: two faiths competing above pressure threshold
    checkSchism(world, settlement, year, rng, events);

    // 6. Natural decay and Religious Persecution
    const dominantFaith = settlement.faith.find(f => f.religionId === settlement.dominantReligionId);
    const dominantPressure = dominantFaith?.pressure || 0;

    for (const f of settlement.faith) {
      if (f.religionId !== settlement.dominantReligionId) {
        // Base decay + persecution from dominant faith (up to 5 extra per year)
        const persecution = Math.floor(dominantPressure / 20);
        f.pressure = Math.max(0, f.pressure - (3 + persecution));
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
  const schismProb = world.simConfig?.schismProbability ?? SCHISM_PROBABILITY_BASE;
  if (rng.nextFloat() >= schismProb) return; // fire with probability schismProb

  const hasOmen = world.map.tiles[settlement.position.y]?.[settlement.position.x]?.modifiers?.some(m => m.type === 'omen');
  const faction = world.factions.find(f => f.id === settlement.factionId);
  const [faithA, faithB] = contested;
  const relA = world.religions.find(r => r.id === faithA.religionId);
  const relB = world.religions.find(r => r.id === faithB.religionId);

  // Schism adds tension
  if (world.storyteller) {
    world.storyteller.tension = Math.min(100, world.storyteller.tension + (hasOmen ? 12 : 6));
  }

  const schismEvent = createEvent({
    tick: 0, year,
    subject: settlement.id, action: 'religious_schism', object: settlement.factionId,
    causedBy: null, playerCaused: !!hasOmen,
    description: `A schism erupted in ${settlement.name} between followers of ${relA?.name ?? 'an old faith'} and ${relB?.name ?? 'a new faith'}.`,
    significance: 5,
    statDeltas: faction ? [{ factionId: faction.id, stat: 'stability', delta: -8 }] : [],
  });

  if (!shouldSuppressEvent(world.storyteller, year, schismEvent.significance)) {
    // Schism adds tension
    if (world.storyteller) {
      world.storyteller.tension = Math.min(100, world.storyteller.tension + (hasOmen ? 12 : 6));
    }

    emitEvent(world, events, schismEvent, year);
    if (schismEvent.statDeltas.length > 0) applyStatDeltas(world, schismEvent.statDeltas);

    // Boost military interest group from religious conflict
    if (faction?.interestGroups) {
      const milIG = faction.interestGroups.find(g => g.type === 'military');
      if (milIG) milIG.power = Math.min(100, milIG.power + 5);
    }
  }
}

/** Check for "Martyrdom" events (deaths of pious rulers) to boost faith. */
function checkMartyrdom(world: WorldState, year: number, events: GameEvent[]) {
  // Look at events from the previous year
  const recentDeaths = world.events.filter(e => 
    e.year === year - 1 && e.action === 'death'
  );

  if (recentDeaths.length === 0) return;

  const hfMap = new Map<string, HistoricalFigure>();
  for (const hf of world.historicalFigures) {
    hfMap.set(hf.id, hf);
  }

  const factionMap = new Map<string, Faction>();
  for (const f of world.factions) {
    factionMap.set(f.id, f);
  }

  const religionMap = new Map<string, Religion>();
  for (const r of world.religions) {
    religionMap.set(r.id, r);
  }

  // Also precompute settlements to avoid O(S) inside the loop
  const settlementMap = new Map<string, Settlement>();
  for (const s of world.settlements) {
    settlementMap.set(s.id, s);
  }

  for (const death of recentDeaths) {
    const figure = hfMap.get(death.subject);
    if (figure && figure.traits.includes('pious')) {
      const faction = factionMap.get(figure.factionId);
      const primaryReligion = religionMap.get(`rel_${figure.factionId}`);
      
      if (faction && primaryReligion) {
        const martyrdomEvent = createEvent({
          tick: 0, year,
          subject: figure.id, action: 'martyrdom', object: primaryReligion.id,
          causedBy: death.id, playerCaused: false,
          description: `The passing of the pious ${figure.name} has sparked a wave of religious fervor for ${primaryReligion.name}.`,
          significance: 5
        });

        if (!shouldSuppressEvent(world.storyteller, year, martyrdomEvent.significance)) {
          // Boost faith in all settlements of this faction
          for (const sId of faction.settlements) {
            const settlement = settlementMap.get(sId);
            if (settlement) {
              applyPressure(world, settlement, primaryReligion.id, 15);
            }
          }
          emitEvent(world, events, martyrdomEvent, year);
        }
      }
    }
  }
}

function applyPressure(world: WorldState, settlement: Settlement, religionId: string, amount: number) {
  const faction = world.factions.find(f => f.id === settlement.factionId);
  let effectiveAmount = amount;
  
  if (faction) {
    // Stability acts as a buffer against conversion. 
    // 100 stability = 50% resistance.
    const resistance = faction.stability / 200;
    effectiveAmount = Math.max(1, Math.floor(amount * (1 - resistance)));
  }

  const existing = settlement.faith.find(f => f.religionId === religionId);
  if (existing) {
    existing.pressure = Math.min(100, existing.pressure + effectiveAmount);
  } else {
    settlement.faith.push({ religionId, pressure: effectiveAmount });
  }
}

function shareFaith(world: WorldState, s1: Settlement, s2: Settlement, amount: number) {
  // S1 -> S2
  for (const f1 of s1.faith) {
    if (f1.pressure > 15) {
      applyPressure(world, s2, f1.religionId, Math.floor(amount * (f1.pressure / 100)));
    }
  }
  // S2 -> S1
  for (const f2 of s2.faith) {
    if (f2.pressure > 15) {
      applyPressure(world, s1, f2.religionId, Math.floor(amount * (f2.pressure / 100)));
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
  } else {
    settlement.dominantReligionId = null;
  }
}

function shiftTowardEmbraced(current: 'shunned' | 'neutral' | 'embraced'): 'shunned' | 'neutral' | 'embraced' {
  if (current === 'shunned') return 'neutral';
  if (current === 'neutral') return 'embraced';
  return 'embraced';
}
