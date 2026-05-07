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
  StatDelta, GameMap, Position,
  HistoricalFigure, RulerTrait, Settlement, NPC,
  FactionEthics, EthicStance,
} from '../types.ts';
import { defaultStorytellerState } from '../types.ts';
import { createEvent } from '../world/events.ts';
import { computeEthicsDivergence } from '../world/factions.ts';
import { SeededRNG } from '../utils/rng.ts';
import { NPC_NAMES } from '../data/names.ts';
import {
  WAR_ANIMOSITY_THRESHOLD,
  FAMINE_DESERT_THRESHOLD,
  FAMINE_POPULATION_MIN,
  REBELLION_STABILITY_MIN,
  ALLIANCE_OPINION_MIN,
  BIOME_POP_DELTA,
  BIOME_WEALTH_DELTA,
  PERSONALITIES,
  pickMotivation,
} from './constants.ts';
import { applyStatDeltas } from './helpers/stats.ts';
import { phaseCascade, cascadeTesting } from './phases/cascade.ts';
import { runKnowledgePipeline } from './phases/knowledge.ts';
import {
  computeTension, decayTension, pruneCooldowns,
  shouldSuppressEvent, registerHighSigEvent,
  accumulateDebt, fireDebtIntervention, applyIntervention,
} from './storyteller.ts';

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
        const rawY = settlement.position.y as unknown;
        const rawX = settlement.position.x as unknown;
        const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);
        const y = typeof rawY === 'number' && Number.isInteger(rawY) ? rawY : -1;
        const x = typeof rawX === 'number' && Number.isInteger(rawX) ? rawX : -1;

        if (
          !(typeof rawY === 'string' && blockedKeys.has(rawY)) &&
          !(typeof rawX === 'string' && blockedKeys.has(rawX)) &&
          y >= 0 &&
          y < world.map.tiles.length &&
          Array.isArray(world.map.tiles[y]) &&
          x >= 0 &&
          x < world.map.tiles[y].length
        ) {
          const tile = world.map.tiles[y][x];
          if (tile && typeof tile === 'object') {
            tile.settlementId = null;
          }
        }

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
    const gos  = runKnowledgePipeline(world, cas, year, rng);

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
  deriveConsequence: cascadeTesting.deriveConsequence,
  phaseCascade: cascadeTesting.phaseCascade,
} as const;
