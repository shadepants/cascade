// ─── Simulation Tick Orchestrator ─────────────────────────────────────────
// Advances world state by N years. Each year runs phases in order:
//
//   colonization → settlementGrowth → ecology → economics → interestGroups
//   → politics → conflict → stability → succession
//   → cascade → knowledge pipeline
//
// DF design principles:
//   - Events derived from state changes, not random template selection
//   - Every event carries statDeltas (what actually changed)
//   - Attribution is a forward-causal chain: root → children
//   - War requires geographic adjacency; territory transfer follows borders
//   - Post-hoc motivation rationalization: event fires, then reason attached
//
// External contract (frozen): runSimulation(world, jumpYears) → GameEvent[]

import type { WorldState, GameEvent } from '../types';
import { defaultStorytellerState } from '../types';
import { SeededRNG } from '../utils/rng.ts';
import { applyStatDeltas } from './helpers/stats.ts';
import { phaseCascade, cascadeTesting } from './phases/cascade.ts';
import { runKnowledgePipeline } from './phases/knowledge.ts';
import { phaseEcology } from './phases/ecology.ts';
import { phaseEconomics } from './phases/economics.ts';
import { phaseInterestGroups } from './phases/interestGroups.ts';
import { phasePolitics } from './phases/politics.ts';
import { phaseConflict } from './phases/conflict.ts';
import { phaseStability } from './phases/stability.ts';
import { phaseSuccession } from './phases/succession.ts';
import { phaseColonization, phaseSettlementGrowth } from './phases/colonization.ts';
import { phaseReligion } from './phases/phaseReligion.ts';
import { phaseTrade } from './phases/phaseTrade.ts';
import { phaseTech } from './phases/phaseTech.ts';
import { getMapOwnershipSummary } from './helpers/spatial.ts';
import {
  computeTension, decayTension, pruneCooldowns,
  accumulateDebt, fireDebtIntervention, applyIntervention,
} from './storyteller.ts';
import {
  SCHISM_PROBABILITY_BASE,
  TECH_DIFFUSION_RATE,
  TRADE_ROUTE_DECAY_RATE,
  TRADE_ROUTE_GROWTH_RATE,
} from './constants.ts';

/** Main simulation loop — runs multiple year-ticks. */
export function runSimulation(world: WorldState, jumpYears: number, headless: boolean = false): GameEvent[] {
  const rng = new SeededRNG(world.seed + world.currentYear);
  const allNewEvents: GameEvent[] = [];

  // Save-compatibility guard: old saves lack world.storyteller
  if (!world.storyteller) {
    world.storyteller = defaultStorytellerState();
  }

  // Save-compatibility guard: old saves lack world.simConfig
  if (!world.simConfig) {
    world.simConfig = {
      schismProbability: SCHISM_PROBABILITY_BASE,
      techDiffusionRate: TECH_DIFFUSION_RATE,
      tradeDecayRate:    TRADE_ROUTE_DECAY_RATE,
      tradeGrowthRate:   TRADE_ROUTE_GROWTH_RATE,
    };
  }

  if (!headless) {
    console.log(
      `[SIM] Starting ${jumpYears}-year run from year ${world.currentYear}. ` +
      `Factions: ${world.factions.map(f => `${f.name}(mil:${f.military} stab:${f.stability})`).join(', ')}`,
    );
  }

  for (let i = 0; i < jumpYears; i++) {
    const year = world.currentYear + 1;

    // Storyteller Director — per-year hooks
    pruneCooldowns(world.storyteller, year);
    world.storyteller.highSigEventsThisYear = 0;
    world.storyteller.tension = computeTension(world.storyteller, world);

    const mapSummary = getMapOwnershipSummary(world.map);

    const col  = phaseColonization(world, year, rng);
    const gro  = phaseSettlementGrowth(world, year, rng);
    const eco  = phaseEcology(world, year, rng, mapSummary);
    const econ = phaseEconomics(world, year, rng, eco, mapSummary);
    const trd  = phaseTrade(world, year, rng);
    const rel  = phaseReligion(world, year, rng);
    const tch  = phaseTech(world, year, rng);
    const ig   = phaseInterestGroups(world, year, rng);
    const pol  = phasePolitics(world, year, rng);
    const con  = phaseConflict(world, year, rng);
    const stab = phaseStability(world, year, rng, mapSummary);
    const succ = phaseSuccession(world, year, rng);

    const priorEvents = [...col, ...gro, ...eco, ...econ, ...trd, ...rel, ...tch, ...ig, ...pol, ...con, ...stab, ...succ];
    const cas  = phaseCascade(world, priorEvents, year, rng);
    const allYearEvents = [...priorEvents, ...cas];
    const gos  = runKnowledgePipeline(world, allYearEvents, year, rng);

    const yearEvents = [...allYearEvents, ...gos];

    if (!headless && yearEvents.length > 0) {
      console.log(
        `[TICK y=${year}] col:${col.length} gro:${gro.length} eco:${eco.length} ` +
        `econ:${econ.length} trd:${trd.length} rel:${rel.length} tech:${tch.length} ig:${ig.length} pol:${pol.length} ` +
        `conflict:${con.length} stab:${stab.length} succ:${succ.length} cascade:${cas.length}`,
      );
      for (const e of con) {
        console.log(`  [CONFLICT] ${e.action}: ${e.subject} → ${e.object} — "${e.description}"`);
      }
      for (const e of cas) {
        console.log(`  [CASCADE] ${e.action} on ${e.object} causedBy=${e.causedBy ?? 'none'} — "${e.description}"`);
      }
    }

    for (const event of yearEvents) {
      applyStatDeltas(world, event.statDeltas);
    }

    world.events.push(...yearEvents);
    allNewEvents.push(...yearEvents);

    // Storyteller Director — year-end hooks
    decayTension(world.storyteller);
    accumulateDebt(world.storyteller, world, year);
    const intervention = fireDebtIntervention(world.storyteller, world);
    if (intervention) applyIntervention(intervention, world, rng, year);

    world.currentYear = year;

    // Decay tile modifiers (Echo System)
    for (let y = 0; y < world.map.height; y++) {
      for (let x = 0; x < world.map.width; x++) {
        const tile = world.map.tiles[y][x];
        if (tile.modifiers) {
          tile.modifiers = tile.modifiers
            .map(m => ({ ...m, duration: m.duration - 1 }))
            .filter(m => m.duration > 0);
          if (tile.modifiers.length === 0) {
            delete tile.modifiers;
          }
        }
      }
    }

    // Decay visual effects
    if (world.visuals) {
      world.visuals = world.visuals
        .map(v => ({ ...v, duration: v.duration - 1 }))
        .filter(v => v.duration > 0);
    }
  }

  return allNewEvents;
}

// ─── Test-only exports (tree-shaken in production builds) ──────────────────
export const _forTesting = {
  deriveConsequence: cascadeTesting.deriveConsequence,
  phaseCascade:      cascadeTesting.phaseCascade,
  phaseSettlementGrowth,
} as const;
