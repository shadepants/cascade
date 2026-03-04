// ─── World barrel export ────────────────────────────────────────────────

export { generateWorld } from './worldgen.ts';
export { generateTerrain } from './terrain.ts';
export { generateFactions } from './factions.ts';
export { generateNPCs, createPlayer, generateItems } from './entities.ts';
export {
  createEvent,
  buildCausalChains,
  resetEventIds,
} from './events.ts';
