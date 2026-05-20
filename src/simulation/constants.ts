import type { NPCPersonality } from '../types';
import type { GameRNG } from '../utils/rng.ts';

export const WAR_ANIMOSITY_THRESHOLD = 80;
export const FAMINE_DESERT_THRESHOLD = 0.55;
export const FAMINE_POPULATION_MIN = 300;
export const REBELLION_STABILITY_MIN = 20;
export const ALLIANCE_OPINION_MIN = 55;
export const CASCADE_SIGNIFICANCE_MIN = 3;
export const CASCADE_LOOKBACK_YEARS = 50;

// ─── Simulation Tuning Constants ─────────────────────────────────────────
// These govern the core simulation balance. They can be overridden at world-
// generation time by setting the corresponding field in WorldConfig, which
// stores them into WorldState.simConfig for use during the tick loop.

/** Base probability (0–1) that a contested settlement fires a schism per year. */
export const SCHISM_PROBABILITY_BASE = 0.2;

/** Base tech spread chance per year per adjacent settlement within range. */
export const TECH_DIFFUSION_RATE = 0.05;

/** Trade route volume lost per year when the connected factions are at war. */
export const TRADE_ROUTE_DECAY_RATE = 15;

/** Trade route volume gained per year when the connected factions are at peace. */
export const TRADE_ROUTE_GROWTH_RATE = 5;

export const PERSONALITIES: NPCPersonality[] = ['loyal', 'skeptic', 'zealot', 'pragmatist'];

export const BIOME_POP_DELTA: Record<string, number> = {
  grassland: 2, forest: 0.5, rainforest: 0.2, mountain: -1, desert: -2, tundra: -2, ocean: 0, coast: 0.5, arid: -0.5,
};

export const BIOME_WEALTH_DELTA: Record<string, number> = {
  grassland: 1, forest: 2, rainforest: 1.5, mountain: 0.5, desert: -1, tundra: -1, ocean: 0.5, coast: 1, arid: 0,
};

const MOTIVATIONS: Record<string, string[]> = {
  famine: ['as drought consumed their lands', 'as harvests failed for the third season', 'as their territory could no longer sustain the growing populace'],
  trade_boom: ['as merchants found new routes through the borderlands', 'as peacetime opened old trading paths', 'as their surplus drew buyers from afar'],
  alliance_formed: ['bound by mutual fear of a common enemy', 'as shared hardship forged unexpected bonds', 'as their leaders found more to gain together than apart'],
  war_declared: ['driven by long-festering territorial grievances', 'as their ruler\'s ambition outweighed caution', 'responding to cultural insults that could no longer be ignored', 'as border skirmishes finally ignited into open war'],
  conquered: ['breaking the defenders\' resistance at the frontier', 'exploiting a moment of political weakness', 'as superior numbers overwhelmed the garrison'],
  peace_tribute: ['as the defeated had nothing left to offer but compliance', 'as the victor demanded recompense for the costs of war'],
  peace_treaty: ['as both sides counted their dead and found the price too high', 'exhausted and depleted, they sought terms'],
  rebellion: ['as the people could no longer bear the weight of instability', 'as neglected grievances turned to open defiance', 'sparked by a moment of weakness at the center of power'],
  cultural_spread: ['as their way of life proved attractive to neighboring peoples', 'carried by traders, travelers, and refugees into foreign lands'],
  population_boom: ['as peaceful years and fertile land bore fruit', 'as prosperity drew settlers from distant regions'],
};

export function pickMotivation(key: string, rng: GameRNG): string {
  const pool = MOTIVATIONS[key] ?? ['for reasons lost to history'];
  return pool[rng.nextInt(pool.length)];
}
