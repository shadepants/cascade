// ─── Keyboard Input Handler ─────────────────────────────────────────────
// Maps keyboard events to game actions. Stateless — returns what happened,
// doesn't mutate game state directly.

import type { Position, GamePhase } from '../types.ts';

export type GameAction =
  | { type: 'MOVE'; direction: Position }
  | { type: 'INTERACT' }         // Enter/Space — talk to NPC or use item
  | { type: 'CLOSE_PANEL' }      // Escape — close dialogue/action menu
  | { type: 'JUMP' }             // J — initiate time jump
  | { type: 'NONE' };

/** Direction vectors for movement keys. */
const MOVE_KEYS: Record<string, Position> = {
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
  w:          { x:  0, y: -1 },
  s:          { x:  0, y:  1 },
  a:          { x: -1, y:  0 },
  d:          { x:  1, y:  0 },
};

/** Map a keyboard event to a game action based on current phase. */
export function mapKeyToAction(key: string, phase: GamePhase): GameAction {
  if (phase === 'exploring') {
    const dir = MOVE_KEYS[key];
    if (dir) return { type: 'MOVE', direction: dir };
    if (key === 'Enter' || key === ' ') return { type: 'INTERACT' };
    if (key === 'j' || key === 'J') return { type: 'JUMP' };
  }

  if (phase === 'dialogue' || phase === 'action') {
    if (key === 'Escape') return { type: 'CLOSE_PANEL' };
  }

  return { type: 'NONE' };
}
