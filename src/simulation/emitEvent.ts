// ─── emitEvent ────────────────────────────────────────────────────────────
// Shared storyteller-gated event emitter. Used by all phase modules.

import type { WorldState, GameEvent } from '../types';
import { shouldSuppressEvent, registerHighSigEvent } from './storyteller.ts';

/** Conditionally emit an event based on storyteller suppression/pacing. */
export function emitEvent(world: WorldState, pool: GameEvent[], event: GameEvent, year: number): void {
  if (shouldSuppressEvent(world.storyteller, year, event.significance)) return;
  pool.push(event);
  registerHighSigEvent(world.storyteller, event, year);
}
