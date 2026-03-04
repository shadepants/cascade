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
} from '../types.ts';
import { createEvent } from '../world/events.ts';
import { computeEthicsDivergence } from '../world/factions.ts';
import { SeededRNG } from '../utils/rng.ts';

// ─── Thresholds ──────────────────────────────────────────────────────────

const WAR_ANIMOSITY_THRESHOLD = 80;    // animosity needed to declare war
const FAMINE_DESERT_THRESHOLD  = 0.55; // fraction of territory that's harsh
const FAMINE_POPULATION_MIN    = 300;  // must have enough people to suffer
const REBELLION_STABILITY_MIN  = 20;   // below this → rebellion risk
const ALLIANCE_OPINION_MIN     = 55;   // opinion needed to form alliance
const CASCADE_SIGNIFICANCE_MIN = 3;    // only propagate events above this

// ─── Biome pressure modifiers (applied per tile, normalized by territory) ─

const BIOME_POP_DELTA: Record<string, number> = {
  plains: 2, forest: 0.5, mountain: -1, desert: -2, tundra: -2, water: 0,
};
const BIOME_WEALTH_DELTA: Record<string, number> = {
  plains: 1, forest: 2, mountain: 0.5, desert: -1, tundra: -1, water: 0,
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

// ─── Main Entry Point ────────────────────────────────────────────────────

/** Run simulation for jumpYears. Mutates world in place. Returns new events. */
export function runSimulation(world: WorldState, jumpYears: number): GameEvent[] {
  const rng = new SeededRNG(world.seed + world.currentYear);
  const allNewEvents: GameEvent[] = [];

  console.log(`[SIM] Starting ${jumpYears}-year run from year ${world.currentYear}. Factions: ${world.factions.map(f => `${f.name}(mil:${f.military} stab:${f.stability})`).join(', ')}`);

  for (let i = 0; i < jumpYears; i++) {
    const year = world.currentYear + i + 1;

    const eco  = phaseEcology(world, year, rng);
    const econ = phaseEconomics(world, year, rng, eco);
    const pol  = phasePolitics(world, year, rng, [...eco, ...econ]);
    const con  = phaseConflict(world, year, rng, [...eco, ...econ, ...pol]);
    const stab = phaseStability(world, year, rng);
    const cas  = phaseCascade(world, [...eco, ...econ, ...pol, ...con, ...stab], year, rng);
    seedEventKnowledge(world, cas, year, rng);
    const gos  = phaseGossip(world, year, rng);

    const yearEvents = [...eco, ...econ, ...pol, ...con, ...stab, ...cas, ...gos];

    if (yearEvents.length > 0) {
      console.log(`[TICK y=${year}] eco:${eco.length} econ:${econ.length} pol:${pol.length} conflict:${con.length} stab:${stab.length} cascade:${cas.length}`);
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
  }

  world.currentYear += jumpYears;
  console.log(`[SIM] Done. Year=${world.currentYear}. New events: ${allNewEvents.length}. Total history: ${world.events.length}`);
  return allNewEvents;
}


// ─── Typed Stat Accessors ─────────────────────────────────────────────────
// Avoids unsafe Record<string,number> casts for dynamic stat access.

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
/** Apply a list of stat deltas to faction stats, clamped to valid ranges. */
function applyStatDeltas(world: WorldState, deltas: StatDelta[]): void {
  for (const delta of deltas) {
    const faction = world.factions.find(f => f.id === delta.factionId);
    if (!faction) continue;
    const ranges: Record<string, [number, number]> = {
      population: [0, 1000], stability: [0, 100],
      wealth: [0, 100], military: [0, 100], culture: [0, 100],
    };
    const [min, max] = ranges[delta.stat] ?? [0, 100];
    setFactionStat(faction, delta.stat, Math.max(min, Math.min(max, getFactionStat(faction, delta.stat) + delta.delta)));
  }
}

// ─── Phase 1: Ecology ────────────────────────────────────────────────────
// Biome composition of each faction's territory drives population change.
// Famine fires when too much territory is harsh AND population is high.

function phaseEcology(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    const tiles = getTilesForFaction(world.map, faction.id);
    if (tiles.length === 0) continue;

    // Compute biome pressure from territory composition
    let popDelta = 0;
    let wealthDelta = 0;
    let harshCount = 0;

    for (const tile of tiles) {
      popDelta    += (BIOME_POP_DELTA[tile.biome]    ?? 0) / tiles.length;
      wealthDelta += (BIOME_WEALTH_DELTA[tile.biome] ?? 0) / tiles.length;
      if (tile.biome === 'desert' || tile.biome === 'tundra') harshCount++;
    }

    const harshFraction = harshCount / tiles.length;

    // Population growth/decline (scaled by current population)
    const rawPopChange = Math.round(popDelta * (faction.population / 200));
    if (rawPopChange !== 0) {
      faction.population = Math.max(0, Math.min(1000, faction.population + rawPopChange));
    }

    // Famine: harsh territory + large population = food crisis
    if (harshFraction > FAMINE_DESERT_THRESHOLD &&
        faction.population > FAMINE_POPULATION_MIN &&
        rng.nextFloat() < 0.35) {

      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: -80 },
        { factionId: faction.id, stat: 'stability',  delta: -15 },
        { factionId: faction.id, stat: 'wealth',     delta: -10 },
      ];
      events.push(createEvent({
        tick: year, year,
        subject: faction.id,
        action:  'suffered_famine',
        object:  'wilderness',
        causedBy: null,
        significance: 5,
        playerCaused: false,
        description: `${faction.name} suffered a devastating famine`,
        motivation: pickMotivation('famine', rng),
        statDeltas: deltas,
      }));
    }

    // Population boom: good territory + low population (room to grow)
    if (popDelta > 1.2 && faction.population < 400 && rng.nextFloat() < 0.25) {
      const deltas: StatDelta[] = [
        { factionId: faction.id, stat: 'population', delta: 60 },
        { factionId: faction.id, stat: 'stability',  delta: 5 },
      ];
      events.push(createEvent({
        tick: year, year,
        subject: faction.id,
        action:  'population_growth',
        object:  'wilderness',
        causedBy: null,
        significance: 2,
        playerCaused: false,
        description: `${faction.name} experienced a period of population growth`,
        motivation: pickMotivation('population_boom', rng),
        statDeltas: deltas,
      }));
    }

    // Apply small annual wealth drift from biome (separate from events)
    const smallWealthChange = Math.round(wealthDelta * 2);
    if (smallWealthChange !== 0) {
      faction.wealth = Math.max(0, Math.min(100, faction.wealth + smallWealthChange));
    }
  }

  return events;
}

// ─── Phase 2: Economics ──────────────────────────────────────────────────
// Trade between peaceful neighbors. Military upkeep drains wealth.
// Cultural drift grows when stable and wealthy.

function phaseEconomics(
  world: WorldState, year: number, rng: SeededRNG, _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  // Military upkeep: maintaining armies costs wealth
  for (const faction of world.factions) {
    const upkeep = Math.round(faction.military * 0.08);
    faction.wealth = Math.max(0, faction.wealth - upkeep);

    // Culture grows slowly in stable, wealthy factions
    if (faction.stability > 60 && faction.wealth > 40) {
      faction.culture = Math.min(100, faction.culture + 1);
    }
  }

  // Trade between peaceful/allied factions with high opinion
  for (const rel of world.relationships) {
    if (rel.state !== 'peace' && rel.state !== 'alliance') continue;
    if (rel.opinion < 30) continue;
    if (rng.nextFloat() > 0.3) continue; // 30% chance per year

    const fA = world.factions.find(f => f.id === rel.factionA);
    const fB = world.factions.find(f => f.id === rel.factionB);
    if (!fA || !fB) continue;

    const tradeValue = Math.max(0, Math.round(
      (fA.ethics.trade === 'embraced' ? 8 : fA.ethics.trade === 'neutral' ? 4 : 1) +
      (fB.ethics.trade === 'embraced' ? 8 : fB.ethics.trade === 'neutral' ? 4 : 1),
    ) / 2);

    if (tradeValue < 2) continue;

    const deltas: StatDelta[] = [
      { factionId: fA.id, stat: 'wealth', delta: tradeValue },
      { factionId: fB.id, stat: 'wealth', delta: tradeValue },
    ];
    events.push(createEvent({
      tick: year, year,
      subject: fA.id,
      action:  'trade_agreement',
      object:  fB.id,
      causedBy: null,
      significance: 2,
      playerCaused: false,
      description: `${fA.name} and ${fB.name} engaged in prosperous trade`,
      motivation: pickMotivation('trade_boom', rng),
      statDeltas: deltas,
    }));

    rel.opinion = Math.min(100, rel.opinion + 3);
  }

  return events;
}

// ─── Phase 3: Politics ───────────────────────────────────────────────────
// Structural animosity: border pressure + ethics divergence.
// Alliance formation when opinion is high and mutual interest exists.
// War-state decay (wars eventually exhaust both sides).

function phasePolitics(
  world: WorldState, year: number, rng: SeededRNG, _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    const fA = world.factions.find(f => f.id === rel.factionA);
    const fB = world.factions.find(f => f.id === rel.factionB);
    if (!fA || !fB) continue;

    // ── Animosity accumulation ───────────────────────────────────────────
    // Border pressure: factions sharing territory naturally build tension
    const sharedBorderTiles = countSharedBorderTiles(world.map, fA.id, fB.id);
    const borderPressure = sharedBorderTiles * 0.2;

    // Ethics divergence: structural incompatibility
    const ethicsDelta = computeEthicsDivergence(fA.ethics, fB.ethics) * 0.5;

    // Population pressure: large populations push outward
    const popPressureA = fA.population > 600 ? 1.5 : fA.population > 400 ? 0.5 : 0;
    const popPressureB = fB.population > 600 ? 1.5 : fB.population > 400 ? 0.5 : 0;

    if (rel.state !== 'war') {
      rel.animosity = Math.max(0, Math.min(200,
        rel.animosity + borderPressure + ethicsDelta + popPressureA + popPressureB,
      ));
    }

    // Opinion drift toward center (forgetting)
    rel.opinion = Math.round(rel.opinion * 0.96);

    // ── Alliance formation ────────────────────────────────────────────────
    if (rel.state === 'peace' &&
        rel.opinion >= ALLIANCE_OPINION_MIN &&
        rel.animosity < 30 &&
        rng.nextFloat() < 0.2) {
      rel.state = 'alliance';
      rel.opinion = Math.min(100, rel.opinion + 10);
      rel.animosity = Math.max(0, rel.animosity - 15);

      events.push(createEvent({
        tick: year, year,
        subject: fA.id,
        action:  'alliance_formed',
        object:  fB.id,
        causedBy: null,
        significance: 4,
        playerCaused: false,
        description: `${fA.name} and ${fB.name} formed a formal alliance`,
        motivation: pickMotivation('alliance_formed', rng),
        statDeltas: [
          { factionId: fA.id, stat: 'stability', delta: 5 },
          { factionId: fB.id, stat: 'stability', delta: 5 },
        ],
      }));
    }

    // ── War exhaustion → peace ────────────────────────────────────────────
    if (rel.state === 'war') {
      rel.animosity = Math.max(0, rel.animosity - 8); // war burns animosity
      rel.opinion -= 3; // but deepens hatred

      const warExhausted = fA.military < 15 || fB.military < 15 ||
        (fA.stability < 25 && fB.stability < 25);
      const peaceProbability = warExhausted ? 0.5 : 0.12;

      if (rng.nextFloat() < peaceProbability) {
        const tributePaid = (fA.military < fB.military * 0.5) ||
                            (fB.military < fA.military * 0.5);
        rel.state = tributePaid ? 'tribute' : 'peace';
        rel.animosity = Math.max(0, rel.animosity - 20);

        const [loser, winner] = fA.military < fB.military ? [fA, fB] : [fB, fA];

        if (tributePaid) {
          events.push(createEvent({
            tick: year, year,
            subject: winner.id,
            action:  'peace_tribute',
            object:  loser.id,
            causedBy: null,
            significance: 4,
            playerCaused: false,
            description: `${loser.name} submitted to ${winner.name} and agreed to pay tribute`,
            motivation: pickMotivation('peace_tribute', rng),
            statDeltas: [
              { factionId: loser.id,   stat: 'stability', delta: -10 },
              { factionId: winner.id,  stat: 'wealth',    delta: 10 },
            ],
          }));
        } else {
          events.push(createEvent({
            tick: year, year,
            subject: fA.id,
            action:  'peace_treaty',
            object:  fB.id,
            causedBy: null,
            significance: 3,
            playerCaused: false,
            description: `${fA.name} and ${fB.name} negotiated an uneasy peace`,
            motivation: pickMotivation('peace_treaty', rng),
            statDeltas: [],
          }));
        }
      }
    }
  }

  return events;
}

// ─── Phase 4: Conflict ───────────────────────────────────────────────────
// War declaration: animosity × aggression × ruler ambition vs threshold.
// Territory transfer is geographic (border tiles), not random.

function phaseConflict(
  world: WorldState, year: number, rng: SeededRNG, _priorEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const rel of world.relationships) {
    if (rel.state === 'war') continue; // already at war

    const fA = world.factions.find(f => f.id === rel.factionA);
    const fB = world.factions.find(f => f.id === rel.factionB);
    if (!fA || !fB) continue;

    // ── War declaration check ─────────────────────────────────────────────
    // Leader ambition modifies the effective threshold
    const leaderA = world.historicalFigures.find(hf => hf.id === fA.leaderId);
    const leaderB = world.historicalFigures.find(hf => hf.id === fB.leaderId);
    const ambiA = leaderA?.values.ambition ?? 0;
    const ambiB = leaderB?.values.ambition ?? 0;

    // High aggression + high animosity + ambitious leader → lower threshold
    const warScoreA = rel.animosity * (1 + fA.aggression / 100) * (1 + ambiA / 100);
    const warScoreB = rel.animosity * (1 + fB.aggression / 100) * (1 + ambiB / 100);
    const warScore  = Math.max(warScoreA, warScoreB);

    // Ethics check: expansion-embracing factions more likely to start wars
    const expansionMultiplier =
      (fA.ethics.expansion === 'embraced' || fB.ethics.expansion === 'embraced') ? 1.3 : 1.0;

    if (warScore * expansionMultiplier < WAR_ANIMOSITY_THRESHOLD) continue;
    if (rng.nextFloat() > 0.25) continue; // 25% chance even when threshold met

    // ── War declaration ───────────────────────────────────────────────────
    const attacker = warScoreA >= warScoreB ? fA : fB;
    const defender = attacker === fA ? fB : fA;

    rel.state = 'war';
    rel.opinion = Math.min(rel.opinion, -40);

    events.push(createEvent({
      tick: year, year,
      subject: attacker.id,
      action:  'declared_war',
      object:  defender.id,
      causedBy: null,
      significance: 6,
      playerCaused: false,
      description: `${attacker.name} declared war on ${defender.name}`,
      motivation: pickMotivation('war_declared', rng),
      statDeltas: [],
    }));

    // ── Battle resolution ─────────────────────────────────────────────────
    const atkStrength = attacker.military + rng.nextInt(25);
    const defStrength = defender.military + rng.nextInt(25) + 10; // defender bonus
    const attackerWins = atkStrength > defStrength;

    const winner = attackerWins ? attacker : defender;
    const loser  = attackerWins ? defender : attacker;

    // Territory transfer: geographic border tiles
    const borderTiles = getBorderTilesOf(world.map, loser.id, winner.id);
    const transferCount = Math.max(1, Math.floor(borderTiles.length * 0.3));
    const transferred = borderTiles.slice(0, transferCount);

    for (const pos of transferred) {
      world.map.tiles[pos.y][pos.x].factionId = winner.id;
    }

    // Both sides pay military cost; loser pays more
    const winnerMilDelta  = -Math.round(winner.military * 0.15);
    const loserMilDelta   = -Math.round(loser.military  * 0.30);
    const loserPopDelta   = -Math.round(loser.population * 0.08);
    const loserStabDelta  = -20;
    const winnerWealthDelta = Math.round(loser.wealth * 0.15);

    const deltas: StatDelta[] = [
      { factionId: winner.id, stat: 'military',   delta: winnerMilDelta },
      { factionId: winner.id, stat: 'wealth',     delta: winnerWealthDelta },
      { factionId: loser.id,  stat: 'military',   delta: loserMilDelta },
      { factionId: loser.id,  stat: 'population', delta: loserPopDelta },
      { factionId: loser.id,  stat: 'stability',  delta: loserStabDelta },
    ];

    events.push(createEvent({
      tick: year, year,
      subject: winner.id,
      action:  'conquered',
      object:  loser.id,
      causedBy: null,
      significance: 7,
      playerCaused: false,
      description: `${winner.name} defeated ${loser.name} in battle and seized border territory`,
      motivation: pickMotivation('conquered', rng),
      statDeltas: deltas,
    }));
  }

  return events;
}

// ─── Phase 6: Stability ──────────────────────────────────────────────────
// Imperial overstretch: factions controlling too much territory suffer
// stability penalties, potentially leading to fragmentation or rebellion.

function phaseStability(world: WorldState, year: number, rng: SeededRNG): GameEvent[] {
  const events: GameEvent[] = [];
  const totalTiles = world.map.width * world.map.height;

  // We copy the factions list because fractureFaction will add new ones
  const currentFactions = [...world.factions];

  for (const faction of currentFactions) {
    const tiles = getTilesForFaction(world.map, faction.id);
    const controlFraction = tiles.length / totalTiles;

    // 1. Overstretch penalty starts at 40% control
    if (controlFraction > 0.4) {
      const severity = Math.floor((controlFraction - 0.4) * 100);
      const stabilityDelta = -Math.max(5, severity);

      events.push(createEvent({
        tick: year, year,
        subject: faction.id,
        action:  'imperial_overstretch',
        object:  faction.id,
        causedBy: null,
        significance: 4,
        playerCaused: false,
        description: `${faction.name} struggled with the weight of its vast borders`,
        motivation: 'as the central authority failed to keep pace with the empire\'s expansion',
        statDeltas: [
          { factionId: faction.id, stat: 'stability', delta: stabilityDelta },
        ],
      }));
    }

    // 2. Fracture Trigger: Critical instability shatters the empire
    if (faction.stability < REBELLION_STABILITY_MIN && tiles.length > 10) {
      const fracture = fractureFaction(world, faction, year, rng);
      if (fracture) events.push(fracture);
    }

    // 3. Spontaneous recovery for stable factions
    if (faction.stability < 40 && faction.wealth > 70 && rng.nextFloat() < 0.1) {
      events.push(createEvent({
        tick: year, year,
        subject: faction.id,
        action:  'administrative_reform',
        object:  faction.id,
        causedBy: null,
        significance: 2,
        playerCaused: false,
        description: `${faction.name} implemented sweeping administrative reforms`,
        motivation: 'using its vast wealth to stabilize the restless provinces',
        statDeltas: [
          { factionId: faction.id, stat: 'stability', delta: 15 },
          { factionId: faction.id, stat: 'wealth',    delta: -20 },
        ],
      }));
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
    tick: year, year,
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
      if (npcA.knowledge.length > 0 && rng.nextFloat() < 0.3) {
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
    if (rng.nextFloat() > 0.4) continue; // 40% chance per year per qualifying event

    // Derive consequences from the state changes this event caused
    for (const delta of trigger.statDeltas) {
      const faction = world.factions.find(f => f.id === delta.factionId);
      if (!faction) continue;

      const consequence = deriveConsequence(faction, delta, trigger, world, year, rng);
      if (consequence) cascadeEvents.push(consequence);
    }
  }

  // Also check for threshold crossings independent of specific deltas
  for (const faction of world.factions) {
    const spontaneous = checkThresholdEvents(faction, year, rng, playerEvents);
    cascadeEvents.push(...spontaneous);
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
      tick: year, year,
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
      tick: year, year,
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

    rel.animosity = Math.min(200, rel.animosity + 20);

    return createEvent({
      tick: year, year,
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
  faction: Faction,
  year: number,
  rng: SeededRNG,
  playerEvents: GameEvent[],
): GameEvent[] {
  const events: GameEvent[] = [];

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
      events.push(createEvent({
        tick: year, year,
        subject: faction.id,
        action:  'internal_rebellion',
        object:  faction.id,
        causedBy: precursor.id,
        significance: 5,
        playerCaused: true,
        description: `${faction.name} tore itself apart in civil strife`,
        motivation: pickMotivation('rebellion', rng),
        statDeltas: deltas,
      }));
    }
  }

  return events;
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
