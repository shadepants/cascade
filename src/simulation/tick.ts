// ─── 5-Phase Simulation Tick ─────────────────────────────────────────────
// Advances world state by N years. Each year runs 5 phases:
//
//   1. ECOLOGY   — biome-driven population growth, famine
//   2. ECONOMICS — wealth from territory, trade, military upkeep
//   3. POLITICS  — structural animosity accumulation, alliances
//   4. CONFLICT  — ethics divergence → war → geographic territory transfer
//   5. CASCADE   — player-caused state changes → derived consequences
//
// DF design principles applied:
//   - Events are derived from state changes, not random template selection
//   - Every event carries statDeltas (what actually changed)
//   - Attribution is a forward-causal chain: root → children
//   - War requires geographic adjacency; territory transfer follows borders
//   - Post-hoc motivation rationalization: event fires, then reason attached
//
// External contract (unchanged): runSimulation(world, jumpYears) → GameEvent[]

import type {
  WorldState, GameEvent, Faction,
  StatDelta, FactionStatKey, GameMap, Position,
  NPCPersonality, HistoricalFigure, RulerTrait, Settlement, NPC,
  FactionEthics, EthicStance,
} from '../types.ts';
import { defaultStorytellerState } from '../types.ts';
import { createEvent } from '../world/events.ts';
import { computeEthicsDivergence } from '../world/factions.ts';
import { SeededRNG } from '../utils/rng.ts';
import { NPC_NAMES } from '../data/names.ts';
import {
  computeTension, decayTension, pruneCooldowns,
  getCascadeThreshold, getGossipBoost,
  shouldSuppressEvent, registerHighSigEvent,
  accumulateDebt, fireDebtIntervention, applyIntervention,
} from './storyteller.ts';

// ─── Thresholds ──────────────────────────────────────────────────────────

const WAR_ANIMOSITY_THRESHOLD = 80;    // animosity needed to declare war
const FAMINE_DESERT_THRESHOLD  = 0.55; // fraction of territory that's harsh
const FAMINE_POPULATION_MIN    = 300;  // must have enough people to suffer
const REBELLION_STABILITY_MIN  = 20;   // below this → rebellion risk
const ALLIANCE_OPINION_MIN     = 55;   // opinion needed to form alliance
const CASCADE_SIGNIFICANCE_MIN = 3;    // only propagate events above this

const PERSONALITIES: NPCPersonality[] = ['loyal', 'skeptic', 'zealot', 'pragmatist'];

// ─── Biome pressure modifiers (applied per tile, normalized by territory) ─

const BIOME_POP_DELTA: Record<string, number> = {
  grassland: 2, forest: 0.5, rainforest: 0.2, mountain: -1, desert: -2, tundra: -2, ocean: 0, coast: 0.5, arid: -0.5,
};
const BIOME_WEALTH_DELTA: Record<string, number> = {
  grassland: 1, forest: 2, rainforest: 1.5, mountain: 0.5, desert: -1, tundra: -1, ocean: 0.5, coast: 1, arid: 0,
};

// ─── Post-hoc motivation library ─────────────────────────────────────────
// Caves of Qud pattern: generate event from state, then attach best-matching
// reason. Text system is separate from simulation logic.

const MOTIVATIONS: Record<string, string[]> = {
  famine:           ['as drought consumed their lands', 'as harvests failed for the third season', 'as their territory could no longer sustain the growing populace'],
  trade_boom:       ['as merchants found new routes through the borderlands', 'as peacetime opened old trading paths', 'as their surplus drew buyers from afar'],
  alliance_formed:  ['bound by mutual fear of a common enemy', 'as shared hardship forged unexpected bonds', 'as their leaders found more to gain together than apart'],
  war_declared:     ['driven by long-festering territorial grievances', 'as their ruler\'s ambition outweighed caution', 'responding to cultural insults that could no longer be ignored', 'as border skirmishes finally ignited into open war'],
  conquered:        ['breaking the defenders\' resistance at the frontier', 'exploiting a moment of political weakness', 'as superior numbers overwhelmed the garrison'],
  peace_tribute:    ['as the defeated had nothing left to offer but compliance', 'as the victor demanded recompense for the costs of war'],
  peace_treaty:     ['as both sides counted their dead and found the price too high', 'exhausted and depleted, they sought terms'],
  rebellion:        ['as the people could no longer bear the weight of instability', 'as neglected grievances turned to open defiance', 'sparked by a moment of weakness at the center of power'],
  cultural_spread:  ['as their way of life proved attractive to neighboring peoples', 'carried by traders, travelers, and refugees into foreign lands'],
  population_boom:  ['as peaceful years and fertile land bore fruit', 'as prosperity drew settlers from distant regions'],
};

function pickMotivation(key: string, rng: SeededRNG): string {
  const pool = MOTIVATIONS[key] ?? ['for reasons lost to history'];
  return pool[rng.nextInt(pool.length)];
}

/** Helper to conditionally emit events based on storyteller suppression/pacing. */
function emitEvent(world: WorldState, pool: GameEvent[], event: GameEvent, year: number): void {
  if (shouldSuppressEvent(world.storyteller, year, event.significance)) return;
  pool.push(event);
  registerHighSigEvent(world.storyteller, event, year);
}

// ─── Phase 5c: Succession ────────────────────────────────────────────────

function phaseSuccession(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const ruler = getRulerForFaction(world, faction.id);
    if (!ruler) continue;

    const age = year - ruler.bornYear;
    const deathChance = Math.max(0, (age - 50) * 0.012);
    
    if (rng.nextFloat() < deathChance) {
      ruler.diedYear = year;
      
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: ruler.id, action: 'death', object: faction.id,
        causedBy: null,
        significance: 6, playerCaused: false,
        description: `${ruler.name}, ruler of ${faction.name}, has died at age ${age}`,
        motivation: 'natural causes and the passage of time',
      }), year);

      if (ruler.legitimacy < 45 && rng.nextFloat() < 0.4) {
        const fractureEvent = fractureFaction(world, faction, year, rng);
        if (fractureEvent) {
          fractureEvent.description = `A succession crisis following ${ruler.name}'s death shattered ${faction.name}`;
          emitEvent(world, events, fractureEvent, year);
        }
      } else {
        const newRuler = spawnNewRuler(world, faction, year, rng);
        world.historicalFigures.push(newRuler);
        faction.leaderId = newRuler.id;
        
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: newRuler.id, action: 'ascension', object: faction.id,
          causedBy: null,
          significance: 5, playerCaused: false,
          description: `${newRuler.name} has ascended to the throne of ${faction.name}`,
          motivation: 'orderly dynastic succession',
        }), year);
      }
    }
  }

  return events;
}

// ─── Phase 1c: Settlement Growth/Abandonment ──────────────────────────────

function phaseSettlementGrowth(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    // Abandonment: low pop + multiple settlements
    if (faction.population < 150 && faction.settlements.length > 1 && rng.nextFloat() < 0.15) {
      const sId = faction.settlements[rng.nextInt(faction.settlements.length)];
      const settlement = world.settlements.find(s => s.id === sId);
      if (settlement) {
        world.ruins.push({
          id:             `ruin_abandoned_${settlement.id}_${year}`,
          name:           `Abandoned ${settlement.name}`,
          position:       settlement.position,
          formerFactionId: faction.id,
          collapsedYear:  year,
        });

        for (const npcId of settlement.npcs) {
          const npc = world.npcs.find(n => n.id === npcId);
          if (npc) npc.alive = false;
        }

        world.settlements = world.settlements.filter(s => s.id !== sId);
        faction.settlements = faction.settlements.filter(id => id !== sId);
        world.map.tiles[settlement.position.y][settlement.position.x].settlementId = null;

        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: faction.id, action: 'abandonment', object: settlement.id,
          causedBy: null,
          significance: 4, playerCaused: false,
          description: `${faction.name} was forced to abandon ${settlement.name} as its people fled`,
          motivation: 'loss of population and structural decay',
        }), year);
      }
    }
  }

  return events;
}

/** Main simulation loop — runs multiple year-ticks. */
export function runSimulation(world: WorldState, jumpYears: number, headless: boolean = false): GameEvent[] {
  const rng = new SeededRNG(world.seed + world.currentYear);
  const allNewEvents: GameEvent[] = [];

  // Save-compatibility guard: old saves lack world.storyteller
  if (!world.storyteller) {
    world.storyteller = defaultStorytellerState();
  }

  if (!headless) {
    console.log(`[SIM] Starting ${jumpYears}-year run from year ${world.currentYear}. Factions: ${world.factions.map(f => `${f.name}(mil:${f.military} stab:${f.stability})`).join(', ')}`);
  }

  for (let i = 0; i < jumpYears; i++) {
    const year = world.currentYear + i + 1;

    // Storyteller Director — per-year hooks
    pruneCooldowns(world.storyteller, year);
    world.storyteller.highSigEventsThisYear = 0;
    world.storyteller.tension = computeTension(world.storyteller, world);

    const col  = phaseColonization(world, year, rng);
    const gro  = phaseSettlementGrowth(world, year, rng);
    const eco  = phaseEcology(world, year, rng);
    const econ = phaseEconomics(world, year, rng, eco);
    const ig   = phaseInterestGroups(world, year, rng);
    const pol  = phasePolitics(world, year, rng, [...eco, ...econ, ...ig]);
    const con  = phaseConflict(world, year, rng, [...eco, ...econ, ...pol]);
    const stab = phaseStability(world, year, rng);
    const succ = phaseSuccession(world, year, rng);
    const cas  = phaseCascade(world, [...col, ...gro, ...eco, ...econ, ...ig, ...pol, ...con, ...stab, ...succ], year, rng);
    seedEventKnowledge(world, cas, year, rng);
    const gos  = phaseGossip(world, year, rng);

    const yearEvents = [...col, ...gro, ...eco, ...econ, ...ig, ...pol, ...con, ...stab, ...succ, ...cas, ...gos];

    if (!headless && yearEvents.length > 0) {
      console.log(`[TICK y=${year}] col:${col.length} gro:${gro.length} eco:${eco.length} econ:${econ.length} ig:${ig.length} pol:${pol.length} conflict:${con.length} stab:${stab.length} succ:${succ.length} cascade:${cas.length}`);
      for (const e of con) {
        console.log(`  [CONFLICT] ${e.action}: ${e.subject} → ${e.object} — "${e.description}"`);
      }
      for (const e of cas) {
        console.log(`  [CASCADE] ${e.action} on ${e.object} causedBy=${e.causedBy ?? 'none'} — "${e.description}"`);
      }
    }

    // Apply stat deltas from all events this year
    for (const event of yearEvents) {
      applyStatDeltas(world, event.statDeltas);
    }

    world.events.push(...yearEvents);
    allNewEvents.push(...yearEvents);

    // Storyteller Director — year-end hooks
    decayTension(world.storyteller);
    accumulateDebt(world.storyteller, world, year);
    const intervention = fireDebtIntervention(world.storyteller, world, rng);
    if (intervention) applyIntervention(intervention, world, rng, year);

    world.currentYear = year;
  }

  return allNewEvents;
}

// ─── Stat Application ────────────────────────────────────────────────────

function getFactionStat(faction: Faction, stat: FactionStatKey): number {
  switch (stat) {
    case 'population': return faction.population;
    case 'stability':  return faction.stability;
    case 'wealth':     return faction.wealth;
    case 'military':   return faction.military;
    case 'culture':    return faction.culture;
  }
}

function setFactionStat(faction: Faction, stat: FactionStatKey, value: number): void {
  switch (stat) {
    case 'population': faction.population = value; break;
    case 'stability':  faction.stability  = value; break;
    case 'wealth':     faction.wealth     = value; break;
    case 'military':   faction.military   = value; break;
    case 'culture':    faction.culture    = value; break;
  }
}

function applyStatDeltas(world: WorldState, deltas: StatDelta[]): void {
  for (const delta of deltas) {
    const faction = world.factions.find(f => f.id === delta.factionId);
    if (!faction) continue;

    const current = getFactionStat(faction, delta.stat);
    let newVal = current + delta.delta;

    // Clamp to reasonable ranges
    if (delta.stat === 'population') {
      newVal = Math.max(0, Math.min(2000, newVal));
    } else {
      newVal = Math.max(0, Math.min(100, newVal));
    }

    setFactionStat(faction, delta.stat, newVal);
  }
}

// ─── Phase 1: Ecology ────────────────────────────────────────────────────

function getRulerForFaction(world: WorldState, factionId: string): HistoricalFigure | null {
  const faction = world.factions.find(f => f.id === factionId);
  if (!faction || !faction.leaderId) return null;
  return world.historicalFigures.find(hf => hf.id === faction.leaderId) || null;
}

function hasTrait(hf: HistoricalFigure | null, trait: RulerTrait): boolean {
  if (!hf || !hf.traits) return false;
  return hf.traits.includes(trait);
}

function spawnNewRuler(_world: WorldState, faction: Faction, year: number, rng: SeededRNG): HistoricalFigure {
  const traitPool: RulerTrait[] = ['bloodthirsty', 'industrious', 'xenophobic', 'diplomatic', 'pious', 'corrupt'];
  const name = NPC_NAMES[rng.nextInt(NPC_NAMES.length)];
  
  return {
    id:        `ruler_${faction.id}_${year}`,
    name:      `${name} of ${faction.name}`,
    factionId: faction.id,
    role:      'ruler',
    values: {
      ambition:   rng.nextInt(101) - 50,
      loyalty:    rng.nextInt(101) - 50,
      compassion: rng.nextInt(101) - 50,
      cunning:    rng.nextInt(101) - 50,
    },
    traits: [traitPool[rng.nextInt(traitPool.length)]],
    bornYear: year - (rng.nextInt(30) + 20),
    diedYear: null,
    legitimacy: 70 + rng.nextInt(30),
  };
}

// ─── Phase 1b: Colonization ──────────────────────────────────────────────

function findColonizationSpot(world: WorldState, faction: Faction, rng: SeededRNG): Position | null {
  const tiles = getTilesWithPosForFaction(world.map, faction.id);
  if (tiles.length === 0) return null;

  // Prefer fertile biomes for colonies
  const goodTiles = tiles.filter(t => 
    t.biome === 'grassland' || t.biome === 'forest' || t.biome === 'rainforest'
  );
  
  const pool = goodTiles.length > 0 ? goodTiles : tiles;
  
  // Ensure no existing settlement on the tile
  const candidates = pool.filter(t => !world.map.tiles[t.y][t.x].settlementId);
  if (candidates.length === 0) return null;

  // Don't found a colony too close to another settlement (Manhattan distance)
  const validCandidates = candidates.filter(c => {
    return !world.settlements.some(s => 
      Math.abs(s.position.x - c.x) + Math.abs(s.position.y - c.y) < 8
    );
  });

  if (validCandidates.length === 0) return null;
  return validCandidates[rng.nextInt(validCandidates.length)];
}

function phaseColonization(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    // Colonization: high pop + wealth + stable
    if (faction.population > 600 && faction.wealth > 50 && faction.stability > 50 && rng.nextFloat() < 0.12) {
      const spot = findColonizationSpot(world, faction, rng);
      if (spot) {
        const id = `settlement_${faction.id}_y${year}`;
        const newSettlement: Settlement = {
          id,
          name: `${faction.name} Frontier`,
          position: spot,
          factionId: faction.id,
          npcs: [],
          items: [],
        };

        world.settlements.push(newSettlement);
        faction.settlements.push(id);
        world.map.tiles[spot.y][spot.x].settlementId = id;

        // Spawn a pioneer NPC
        const npc: NPC = {
          id: `npc_pioneer_${id}`,
          name: NPC_NAMES[rng.nextInt(NPC_NAMES.length)],
          position: { ...spot },
          factionId: faction.id,
          personality: PERSONALITIES[rng.nextInt(PERSONALITIES.length)],
          knowledge: [],
          dialogueKey: 'default',
          alive: true,
        };
        newSettlement.npcs.push(npc.id);
        world.npcs.push(npc);

        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: faction.id, action: 'colonization', object: id,
          causedBy: null,
          significance: 5, playerCaused: false,
          description: `${faction.name} founded a new colony on the frontier`,
          motivation: 'population pressure and economic expansion',
          statDeltas: [
            { factionId: faction.id, stat: 'population', delta: -100 },
            { factionId: faction.id, stat: 'wealth', delta: -20 },
          ],
        }), year);
      }
    }
  }

  return events;
}

function phaseEcology(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const tiles = getTilesForFaction(world.map, faction.id);
    if (tiles.length === 0) continue;

    // Compute biome pressure
    const popDelta  = tiles.reduce((sum, t) => sum + (BIOME_POP_DELTA[t.biome]  ?? 0), 0) / tiles.length;
    const harsness  = tiles.filter(t => t.biome === 'desert' || t.biome === 'tundra').length / tiles.length;
    const isFamine  = harsness > FAMINE_DESERT_THRESHOLD && faction.population > FAMINE_POPULATION_MIN;

    if (isFamine && rng.nextFloat() < 0.4) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: -Math.round(faction.population * 0.1) },
        { factionId: faction.id, stat: 'stability',  delta: -5 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'famine', object: faction.id,
        causedBy: null, significance: 4, playerCaused: false,
        description: `Famine struck ${faction.name} as the harsh terrain could not support its people`,
        motivation: pickMotivation('famine', rng),
        statDeltas: deltas,
      }), year);
    } else if (popDelta > 0 && rng.nextFloat() < 0.3) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: Math.round(faction.population * 0.05) },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'population_boom', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name}'s population grew in the fertile lands`,
        motivation: pickMotivation('population_boom', rng),
        statDeltas: deltas,
      }), year);
    }
  }

  return events;
}

// ─── Economics Phase ─────────────────────────────────────────────────────

function phaseEconomics(
  world: WorldState,
  year: number,
  rng: SeededRNG,
  _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const tiles = getTilesForFaction(world.map, faction.id);
    if (tiles.length === 0) continue;

    const ruler = getRulerForFaction(world, faction.id);

    // Wealth from territory
    let wealthDelta = tiles.reduce((sum, t) => sum + (BIOME_WEALTH_DELTA[t.biome] ?? 0), 0) / tiles.length;
    
    // Trait: industrious
    if (hasTrait(ruler, 'industrious')) wealthDelta += 0.5;
    // Trait: corrupt
    if (hasTrait(ruler, 'corrupt')) wealthDelta += 0.3;

    // Military upkeep cost (drains wealth)
    const upkeep = (faction.military / 100) * 2;
    const netWealth = wealthDelta - upkeep;

    if (netWealth > 1.5 && faction.wealth < 80 && rng.nextFloat() < 0.25) {
      const deltas: StatDelta[] = [{ factionId: faction.id, stat: 'wealth', delta: Math.round(netWealth * 3) }];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'trade_boom', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `Trade flourished in ${faction.name}'s territories`,
        motivation: pickMotivation('trade_boom', rng),
        statDeltas: deltas,
      }), year);
    } else if (netWealth < -1 && faction.wealth > 20 && rng.nextFloat() < 0.3) {
      const deltas: StatDelta[] = [{ factionId: faction.id, stat: 'wealth', delta: Math.round(netWealth * 2) }];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'economic_decline', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name}'s treasury strained under military costs`,
        motivation: 'as the cost of their armies outpaced what the land could yield',
        statDeltas: deltas,
      }), year);
    }
  }

  return events;
}

// ─── Phase 2.5: Internal Politics (Interest Groups) ──────────────────────

function phaseInterestGroups(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    if (!faction.interestGroups) faction.interestGroups = [];
    
    for (const ig of faction.interestGroups) {
      // Power shifts based on world state
      let powerDelta = 0;
      if (ig.type === 'military' && faction.military > 60) powerDelta += 2;
      if (ig.type === 'military' && faction.stability < 40) powerDelta += 3; // Martial law
      if (ig.type === 'merchant' && faction.wealth > 60) powerDelta += 2;
      if (ig.type === 'religious' && faction.culture > 50) powerDelta += 2;
      
      ig.power = Math.max(5, Math.min(100, ig.power + powerDelta - 1)); // -1 natural decay

      // High power groups can shift faction ethics
      if (ig.power > 70 && rng.nextFloat() < 0.1) {
        const entry = Object.entries(ig.ethicsBias)[rng.nextInt(Object.keys(ig.ethicsBias).length)] as [keyof FactionEthics, EthicStance];
        if (entry && faction.ethics[entry[0]] !== entry[1]) {
          (faction.ethics as any)[entry[0]] = entry[1];
          emitEvent(world, events, createEvent({
            tick: 0, year,
            subject: faction.id, action: 'ethics_shift', object: ig.id,
            causedBy: null,
            significance: 4, playerCaused: false,
            description: `The ${ig.name} shifted ${faction.name}'s stance on ${String(entry[0])} towards ${entry[1]}`,
            motivation: 'political lobbying and internal pressure',
          }), year);
        }
      }
    }
  }

  return events;
}

// ─── Phase 3: Politics ───────────────────────────────────────────────────

function phasePolitics(
  world: WorldState,
  year: number,
  rng: SeededRNG,
  _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    const fA = world.factions.find(f => f.id === rel.factionA);
    const fB = world.factions.find(f => f.id === rel.factionB);
    if (!fA || !fB) continue;

    const rulerA = getRulerForFaction(world, fA.id);
    const rulerB = getRulerForFaction(world, fB.id);

    // Ethics divergence increases animosity
    const divergence = computeEthicsDivergence(fA.ethics, fB.ethics);
    if (divergence > 2) {
      rel.animosity = Math.min(200, rel.animosity + Math.round(divergence * 0.5));
    }

    // Trait: xenophobic (increases animosity faster)
    if (hasTrait(rulerA, 'xenophobic') || hasTrait(rulerB, 'xenophobic')) {
      rel.animosity = Math.min(200, rel.animosity + 2);
    }

    // Trait: diplomatic (passive opinion gain)
    if (hasTrait(rulerA, 'diplomatic') || hasTrait(rulerB, 'diplomatic')) {
      rel.opinion = Math.min(100, rel.opinion + 1);
    }

    // Alliance: high opinion + peace + stable → alliance event
    if (rel.state === 'peace' && rel.opinion >= ALLIANCE_OPINION_MIN &&
        fA.stability >= 40 && fB.stability >= 40 && rng.nextFloat() < 0.05) {
      rel.state = 'alliance';
      const deltas: StatDelta[] = [
        { factionId: fA.id, stat: 'stability', delta: 5 },
        { factionId: fB.id, stat: 'stability', delta: 5 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: fA.id, action: 'alliance_formed', object: fB.id,
        causedBy: null, significance: 5, playerCaused: false,
        description: `${fA.name} and ${fB.name} forged a formal alliance`,
        motivation: pickMotivation('alliance_formed', rng),
        statDeltas: deltas,
      }), year);
    }
  }

  return events;
}

// ─── Phase 4: Conflict ───────────────────────────────────────────────────

function phaseConflict(
  world: WorldState,
  year: number,
  rng: SeededRNG,
  _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    if (rel.state === 'war') {
      // Ongoing war — resolve combat
      const winner = resolveWar(world, rel, year, rng, events);
      if (winner) {
        // Peace or tribute after resolution
        const deltas: StatDelta[] = [
          { factionId: rel.factionA, stat: 'stability', delta: -10 },
          { factionId: rel.factionB, stat: 'stability', delta: -10 },
        ];
        const peaceType = rng.nextFloat() < 0.4 ? 'peace_tribute' : 'peace_treaty';
        rel.state = 'peace';
        rel.animosity = Math.max(0, rel.animosity - 30);
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: winner, action: peaceType, object: rel.factionA === winner ? rel.factionB : rel.factionA,
          causedBy: null, significance: 5, playerCaused: false,
          description: `The war between ${world.factions.find(f => f.id === rel.factionA)?.name} and ${world.factions.find(f => f.id === rel.factionB)?.name} ended`,
          motivation: pickMotivation(peaceType, rng),
          statDeltas: deltas,
        }), year);
      }
      continue;
    }

    // Check war declaration
    if (rel.animosity >= WAR_ANIMOSITY_THRESHOLD && rel.state !== 'alliance') {
      const fA = world.factions.find(f => f.id === rel.factionA);
      const fB = world.factions.find(f => f.id === rel.factionB);
      if (!fA || !fB) continue;

      const borderTiles = countSharedBorderTiles(world.map, fA.id, fB.id);
      if (borderTiles === 0) continue;  // No border → no war

      // Aggression + animosity determines war probability
      const warProb = Math.min(0.8, (rel.animosity / 200) * 0.6 + (fA.aggression / 100) * 0.2);
      if (rng.nextFloat() < warProb) {
        rel.state = 'war';
        const deltas: StatDelta[] = [
          { factionId: fA.id, stat: 'stability', delta: -8 },
          { factionId: fB.id, stat: 'stability', delta: -8 },
        ];
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: fA.id, action: 'war_declared', object: fB.id,
          causedBy: null, significance: 6, playerCaused: false,
          description: `${fA.name} declared war on ${fB.name}`,
          motivation: pickMotivation('war_declared', rng),
          statDeltas: deltas,
        }), year);
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
  rng: SeededRNG,
  events: GameEvent[],
): string | null {
  const fA = world.factions.find(f => f.id === rel.factionA);
  const fB = world.factions.find(f => f.id === rel.factionB);
  if (!fA || !fB) return null;

  // Military strength + stability determines combat outcome
  const strA = fA.military * (fA.stability / 100);
  const strB = fB.military * (fB.stability / 100);
  const total = strA + strB;
  if (total === 0) return null;

  // Only 40% chance of resolution per year (wars drag on)
  if (rng.nextFloat() > 0.4) return null;

  const fAWins = rng.nextFloat() < strA / total;
  const winner = fAWins ? fA : fB;
  const loser  = fAWins ? fB : fA;

  // Transfer border tiles
  const borderTiles = getBorderTilesOf(world.map, loser.id, winner.id);
  const tilesToTransfer = Math.min(borderTiles.length, Math.max(1, Math.floor(borderTiles.length * 0.3)));
  for (let i = 0; i < tilesToTransfer; i++) {
    const pos = borderTiles[i];
    const tile = world.map.tiles[pos.y][pos.x];
    // Transfer settlement ownership too
    if (tile.settlementId) {
      const s = world.settlements.find(set => set.id === tile.settlementId);
      if (s) {
        s.factionId = winner.id;
        loser.settlements  = loser.settlements.filter(id => id !== s.id);
        winner.settlements = [...winner.settlements, s.id];
      }
    }
    tile.factionId = winner.id;
  }

  const deltas: StatDelta[] = [
    { factionId: winner.id, stat: 'military',  delta: -10 },
    { factionId: winner.id, stat: 'wealth',    delta: 15 },
    { factionId: loser.id,  stat: 'military',  delta: -20 },
    { factionId: loser.id,  stat: 'stability', delta: -15 },
    { factionId: loser.id,  stat: 'population', delta: -50 },
  ];
  emitEvent(world, events, createEvent({
    tick: 0, year,
    subject: winner.id, action: 'conquered', object: loser.id,
    causedBy: null, significance: 7, playerCaused: false,
    description: `${winner.name} pushed back ${loser.name}'s forces and seized territory`,
    motivation: pickMotivation('conquered', rng),
    statDeltas: deltas,
  }), year);

  // Check for civil war fracture (loser may shatter)
  if (loser.stability < 20 && rng.nextFloat() < 0.3) {
    const fractureEvent = fractureFaction(world, loser, year, rng);
    if (fractureEvent) emitEvent(world, events, fractureEvent, year);
  }

  return winner.id;
}

// ─── Phase 5b: Stability ──────────────────────────────────────────────────
// Structural stability events that fire independent of player actions.

function phaseStability(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  // Faction collapse check
  const currentFactions = [...world.factions];
  for (const faction of currentFactions) {
    const tiles = getTilesForFaction(world.map, faction.id);
    if (tiles.length === 0) {
      // Faction collapsed — destroy its settlements and NPCs, leave Ruins
      const affectedSettlements = world.settlements.filter(s => s.factionId === faction.id);
      for (const s of affectedSettlements) {
        world.ruins.push({
          id:             `ruin_${s.id}_${year}`,
          name:           `Ruins of ${s.name}`,
          position:       s.position,
          formerFactionId: faction.id,
          collapsedYear:  year,
        });
        for (const npcId of s.npcs) {
          const npc = world.npcs.find(n => n.id === npcId);
          if (npc) npc.alive = false;
        }
      }
      world.settlements = world.settlements.filter(s => s.factionId !== faction.id);
      world.factions = world.factions.filter(f => f.id !== faction.id);
      
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'collapse', object: 'history',
        causedBy: null, significance: 8, playerCaused: false,
        description: `${faction.name} has collapsed into history, leaving only ruins.`,
        motivation: 'imperial overstretch and loss of territory',
      }), year);
      continue;
    }

    // Rebellion: low stability + high population pressure
    if (faction.stability < REBELLION_STABILITY_MIN && faction.population > 100 && rng.nextFloat() < 0.25) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'stability',  delta: -10 },
        { factionId: faction.id, stat: 'military',   delta: -5 },
        { factionId: faction.id, stat: 'population', delta: -20 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'internal_rebellion', object: faction.id,
        causedBy: null, significance: 5, playerCaused: false,
        description: `Unrest tore through ${faction.name} as stability collapsed`,
        motivation: pickMotivation('rebellion', rng),
        statDeltas: deltas,
      }), year);
    }

    // Cultural spread (organic): high culture → pressure on neighbors
    if (faction.culture > 75 && rng.nextFloat() < 0.15) {
      const neighbors = getNeighboringFactions(world, faction.id);
      if (neighbors.length > 0) {
        const target = neighbors[rng.nextInt(neighbors.length)];
        const deltas: StatDelta[] = [
          { factionId: faction.id, stat: 'culture',   delta: 3 },
          { factionId: target.id,  stat: 'stability', delta: -3 },
        ];
        emitEvent(world, events, createEvent({
          tick: 0, year,
          subject: faction.id, action: 'cultural_spread', object: target.id,
          causedBy: null, significance: 3, playerCaused: false,
          description: `${faction.name}'s cultural influence spread into ${target.name}`,
          motivation: pickMotivation('cultural_spread', rng),
          statDeltas: deltas,
        }), year);
      }
    }

    // War exhaustion recovery
    const atWar = world.relationships.some(
      r => (r.factionA === faction.id || r.factionB === faction.id) && r.state === 'war',
    );
    if (!atWar && faction.stability < 60 && rng.nextFloat() < 0.3) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'stability_recovery', object: faction.id,
        causedBy: null, significance: 1, playerCaused: false,
        description: `${faction.name} began recovering from recent turmoil`,
        motivation: 'as peacetime allowed wounds to heal and order to be restored',
        statDeltas: [{ factionId: faction.id, stat: 'stability', delta: 15 }],
      }), year);
    }

    // Wealth-driven military buildup (organic)
    if (faction.wealth > 70 && faction.military < 60 && rng.nextFloat() < 0.2) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'military_expansion', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `${faction.name} invested wealth into expanding their armies`,
        motivation: 'as prosperity gave their rulers the means to project power',
        statDeltas: [
          { factionId: faction.id, stat: 'military', delta: 10 },
          { factionId: faction.id, stat: 'wealth',   delta: -8 },
        ],
      }), year);
    }

    // Stability recovery from high wealth
    if (faction.wealth > 60 && faction.stability < 70 && rng.nextFloat() < 0.2) {
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id, action: 'prosperity_stability', object: faction.id,
        causedBy: null, significance: 2, playerCaused: false,
        description: `Prosperity in ${faction.name} brought social calm`,
        motivation: 'as full granaries and busy markets eased old grievances',
        statDeltas: [
          { factionId: faction.id, stat: 'stability', delta: 15 },
          { factionId: faction.id, stat: 'wealth',    delta: -20 },
        ],
      }), year);
    }
  }

  return events;
}

/** 
 * Shatter a faction into two. A new rival faction takes ~30% of the territory.
 * BFS starts from the tile furthest from the capital (first settlement).
 */
function fractureFaction(
  world: WorldState, 
  original: Faction, 
  year: number, 
  rng: SeededRNG
): GameEvent | null {
  const tiles = getTilesWithPosForFaction(world.map, original.id);
  if (tiles.length < 10) return null;

  // Find tile furthest from the first settlement (capital)
  const capital = world.settlements.find(s => s.id === original.settlements[0]);
  if (!capital) return null;

  let furthest: Position = tiles[0];
  let maxDist = -1;
  for (const t of tiles) {
    const d = Math.abs(t.x - capital.position.x) + Math.abs(t.y - capital.position.y);
    if (d > maxDist) {
      maxDist = d;
      furthest = t;
    }
  }

  // BFS to claim 30% of territory
  const newFactionId = `faction_rebel_${original.id}_${year}`;
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
      { x: curr.x, y: curr.y - 1 }, { x: curr.x, y: curr.y + 1 }
    ];
    for (const n of neighbors) {
      if (n.x >= 0 && n.y >= 0 && n.x < world.map.width && n.y < world.map.height &&
          world.map.tiles[n.y][n.x].factionId === original.id) {
        queue.push(n);
      }
    }
  }

  // Create the Rebel Faction
  const newFaction: Faction = {
    ...original,
    id: newFactionId,
    name: `${original.name} Remnant`,
    color: `#${Math.floor(rng.nextFloat()*16777215).toString(16)}`,
    stability: 50,
    military: Math.round(original.military * 0.4),
    wealth: Math.round(original.wealth * 0.3),
    settlements: [], // will be updated if a settlement was in the stolen tiles
  };

  // Transfer tiles
  for (const pos of newTiles) {
    const tile = world.map.tiles[pos.y][pos.x];
    tile.factionId = newFactionId;
    if (tile.settlementId) {
      const s = world.settlements.find(set => set.id === tile.settlementId);
      if (s) {
        s.factionId = newFactionId;
        newFaction.settlements.push(s.id);
        original.settlements = original.settlements.filter(id => id !== s.id);
      }
    }
  }

  world.factions.push(newFaction);

  // Set to War immediately
  world.relationships.push({
    factionA: original.id,
    factionB: newFactionId,
    opinion: -100,
    animosity: 150,
    state: 'war'
  });

  return createEvent({
    tick: 0, year,
    subject: original.id,
    action:  'civil_war_fracture',
    object:  newFactionId,
    causedBy: null,
    significance: 8,
    playerCaused: false,
    description: `A civil war shattered ${original.name}, as the ${newFaction.name} seized the frontier`,
    motivation: 'sparked by the collapse of central authority and long-held regional grievances',
    statDeltas: [
      { factionId: original.id, stat: 'stability', delta: -30 },
      { factionId: original.id, stat: 'military',  delta: -20 },
    ],
  });
}

/** Helper to get tiles with their coordinates. */
function getTilesWithPosForFaction(map: GameMap, factionId: string): (Position & { biome: string })[] {
  const tiles: (Position & { biome: string })[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId === factionId) {
        tiles.push({ x, y, biome: map.tiles[y][x].biome });
      }
    }
  }
  return tiles;
}

// ─── Phase 7: Gossip ─────────────────────────────────────────────────────
// NPCs in the same settlement trade knowledge. Accuracy degrades with 
// each transfer. This creates the 'Telephone Game' effect across history.

function phaseGossip(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const settlement of world.settlements) {
    const settlementNpcs = world.npcs.filter(n => settlement.npcs.includes(n.id) && n.alive);
    if (settlementNpcs.length < 2) continue;

    for (let i = 0; i < settlementNpcs.length; i++) {
      const npcA = settlementNpcs[i];
      const npcB = settlementNpcs[(i + 1) % settlementNpcs.length];

      // NPC A tells NPC B something they know
      const gossipProb = getGossipBoost(world.storyteller, npcA.factionId, year);
      if (npcA.knowledge.length > 0 && rng.nextFloat() < gossipProb) {
        const knowledgeToShare = npcA.knowledge[rng.nextInt(npcA.knowledge.length)];
        
        // Check if NPC B already knows this
        if (!npcB.knowledge.some(k => k.eventId === knowledgeToShare.eventId)) {
          npcB.knowledge.push({
            eventId:        knowledgeToShare.eventId,
            discoveredYear: year,
            accuracy:       knowledgeToShare.accuracy * 0.9, // accuracy degrades
            sourceId:       npcA.id,
          });
        }
      }
    }
  }

  return events;
}

// ─── Knowledge Seeding ───────────────────────────────────────────────────
// Cascade events are routed into the knowledge of NPCs who belong to the
// affected faction. Without this, phaseGossip has nothing to spread —
// NPC knowledge arrays stay empty and dialogue never references cascade events.

function seedEventKnowledge(
  world: WorldState,
  events: GameEvent[],
  year: number,
  rng: SeededRNG,
): void {
  for (const event of events) {
    const affectedFactionId = event.subject;
    const witnessNpcs = world.npcs.filter(
      n => n.alive && n.factionId === affectedFactionId,
    );
    for (const npc of witnessNpcs) {
      if (npc.knowledge.some(k => k.eventId === event.id)) continue;
      // Faction members who witnessed the event have high accuracy.
      // Add a small random spread (0.75–1.0) so tiers vary in dialogue.
      const accuracy = 0.75 + rng.nextFloat() * 0.25;
      npc.knowledge.push({
        eventId:        event.id,
        discoveredYear: year,
        accuracy,
        sourceId:       'direct',
      });
    }
  }
}

// ─── Phase 5: Cascade ────────────────────────────────────────────────────
// Player-caused events mutate faction stats via statDeltas.
// Downstream consequences are DERIVED from actual state crossings,
// not picked from a random template list.

function phaseCascade(
  world: WorldState,
  recentEvents: GameEvent[],
  year: number,
  rng: SeededRNG,
): GameEvent[] {
  const cascadeEvents: GameEvent[] = [];

  // Look at all player-caused events (historical + this jump)
  const playerEvents = [...world.events, ...recentEvents].filter(
    e => e.playerCaused && e.significance >= CASCADE_SIGNIFICANCE_MIN,
  );

  for (const trigger of playerEvents) {
    if (rng.nextFloat() > getCascadeThreshold(world.storyteller, trigger.subject, year)) continue;

    // Derive consequences from the state changes this event caused
    for (const delta of trigger.statDeltas) {
      const faction = world.factions.find(f => f.id === delta.factionId);
      if (!faction) continue;

      const consequence = deriveConsequence(faction, delta, trigger, world, year, rng);
      if (consequence && !shouldSuppressEvent(world.storyteller, year, consequence.significance)) {
        cascadeEvents.push(consequence);
        registerHighSigEvent(world.storyteller, consequence, year);
        // Apply deferred animosity mutation for military_buildup (moved from deriveConsequence
        // so it only fires when the event is not suppressed).
        if (consequence.action === 'military_buildup') {
          const rel = world.relationships.find(r =>
            (r.factionA === consequence.subject || r.factionB === consequence.subject) &&
            (r.factionA === consequence.object  || r.factionB === consequence.object),
          );
          if (rel) rel.animosity = Math.min(200, rel.animosity + 20);
        }
      }
    }
  }

  // Also check for threshold crossings independent of specific deltas
  for (const faction of world.factions) {
    checkThresholdEvents(world, faction, year, rng, playerEvents, cascadeEvents);
  }

  return cascadeEvents;
}

/** Derive a consequence from a stat change crossing a meaningful threshold. */
function deriveConsequence(
  faction: Faction,
  delta: StatDelta,
  parentEvent: GameEvent,
  world: WorldState,
  year: number,
  rng: SeededRNG,
): GameEvent | null {

  const stat = delta.stat;
  const newValue = getFactionStat(faction, stat);

  // Stability crossed below rebellion threshold
  if (stat === 'stability' && delta.delta < 0 && newValue < REBELLION_STABILITY_MIN) {
    const deltas: StatDelta[] = [
      { factionId: faction.id, stat: 'stability',  delta: -10 },
      { factionId: faction.id, stat: 'military',   delta: -8 },
      { factionId: faction.id, stat: 'population', delta: -30 },
    ];
    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action:  'internal_rebellion',
      object:  faction.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `Instability within ${faction.name} erupted into open rebellion`,
      motivation: pickMotivation('rebellion', rng),
      statDeltas: deltas,
    });
  }

  // Culture crossed a spread threshold
  if (stat === 'culture' && delta.delta > 0 && newValue > 65 && rng.nextFloat() < 0.4) {
    // Find a neighboring faction to receive cultural pressure
    const neighbors = getNeighboringFactions(world, faction.id);
    if (neighbors.length === 0) return null;
    const target = neighbors[rng.nextInt(neighbors.length)];

    const deltas: StatDelta[] = [
      { factionId: faction.id, stat: 'culture',   delta: 5 },
      { factionId: target.id,  stat: 'stability', delta: -5 }, // cultural disruption
    ];
    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action:  'cultural_spread',
      object:  target.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `The influence of ${faction.name} spread into ${target.name}'s territory`,
      motivation: pickMotivation('cultural_spread', rng),
      statDeltas: deltas,
    });
  }

  // Military buildup crossing expansion threshold
  if (stat === 'military' && delta.delta > 0 && newValue > 70) {
    const rel = world.relationships.find(r =>
      (r.factionA === faction.id || r.factionB === faction.id) &&
      r.state !== 'war' && r.opinion < -20,
    );
    if (!rel) return null;

    const targetId = rel.factionA === faction.id ? rel.factionB : rel.factionA;
    const target = world.factions.find(f => f.id === targetId);
    if (!target) return null;

    return createEvent({
      tick: 0, year,
      subject: faction.id,
      action:  'military_buildup',
      object:  target.id,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `${faction.name}'s military buildup alarmed ${target.name}`,
      motivation: 'as their growing armies cast long shadows over neighboring lands',
      statDeltas: [{ factionId: target.id, stat: 'stability', delta: -5 }],
    });
  }

  return null;
}

/** Check for threshold-crossing events that emerge independently of specific deltas. */
function checkThresholdEvents(
  world: WorldState,
  faction: Faction,
  year: number,
  rng: SeededRNG,
  playerEvents: GameEvent[],
  events: GameEvent[],
): void {
  // Spontaneous rebellion if stability critically low AND there was a player-caused precursor
  if (faction.stability < REBELLION_STABILITY_MIN &&
      rng.nextFloat() < 0.35) {
    const precursor = playerEvents.find(e =>
      e.statDeltas.some(d => d.factionId === faction.id && d.stat === 'stability'),
    );
    if (precursor) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'stability',  delta: -8 },
        { factionId: faction.id, stat: 'population', delta: -20 },
      ];
      emitEvent(world, events, createEvent({
        tick: 0, year,
        subject: faction.id,
        action:  'internal_rebellion',
        object:  faction.id,
        causedBy: precursor.id,
        significance: 5,
        playerCaused: true,
        description: `${faction.name} tore itself apart in civil strife`,
        motivation: pickMotivation('rebellion', rng),
        statDeltas: deltas,
      }), year);
    }
  }
}

// ─── Spatial Helpers ─────────────────────────────────────────────────────

/** Get all tiles owned by a faction. */
function getTilesForFaction(map: GameMap, factionId: string): { biome: string }[] {
  const tiles: { biome: string }[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId === factionId) {
        tiles.push(map.tiles[y][x]);
      }
    }
  }
  return tiles;
}

/** Get border tiles of loserFactionId that are adjacent to winnerFactionId tiles. */
function getBorderTilesOf(map: GameMap, loserFactionId: string, winnerFactionId: string): Position[] {
  const border: Position[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId !== loserFactionId) continue;

      // Check if any orthogonal neighbor belongs to winner
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      const adjacentToWinner = neighbors.some(n =>
        n.x >= 0 && n.y >= 0 && n.x < map.width && n.y < map.height &&
        map.tiles[n.y][n.x].factionId === winnerFactionId,
      );
      if (adjacentToWinner) border.push({ x, y });
    }
  }
  return border;
}

/** Count tiles where factions A and B share a border. */
function countSharedBorderTiles(map: GameMap, factionAId: string, factionBId: string): number {
  let count = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].factionId !== factionAId) continue;
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      if (neighbors.some(n =>
        n.x >= 0 && n.y >= 0 && n.x < map.width && n.y < map.height &&
        map.tiles[n.y][n.x].factionId === factionBId,
      )) count++;
    }
  }
  return count;
}

/** Get factions that share a border with the given faction. */
function getNeighboringFactions(world: WorldState, factionId: string): Faction[] {
  const neighborIds = new Set<string>();
  for (let y = 0; y < world.map.height; y++) {
    for (let x = 0; x < world.map.width; x++) {
      if (world.map.tiles[y][x].factionId !== factionId) continue;
      const neighbors = [
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ];
      for (const n of neighbors) {
        if (n.x < 0 || n.y < 0 || n.x >= world.map.width || n.y >= world.map.height) continue;
        const nId = world.map.tiles[n.y][n.x].factionId;
        if (nId && nId !== factionId) neighborIds.add(nId);
      }
    }
  }
  return world.factions.filter(f => neighborIds.has(f.id));
}

// ─── Test-only exports (tree-shaken in production builds) ─────────────────
export const _forTesting = {
  deriveConsequence,
  phaseCascade,
} as const;
