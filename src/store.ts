// ─── Game State Store ───────────────────────────────────────────────────
// Simple React context-based store for POC. No Zustand — just useReducer.
// Upgrade path: swap this file for a Zustand store when state gets complex.

import { createContext, useContext } from 'react';
import type {
  GameStore, GamePhase, WorldState, NPC, Item, Camera,
} from './types.ts';
import { DEFAULT_CONFIG, VIEWPORT_TILES } from './types.ts';

// ─── Initial State ──────────────────────────────────────────────────────

export const initialState: GameStore = {
  phase: 'title',
  world: null,
  config: DEFAULT_CONFIG,
  activeNpc: null,
  activeItem: null,
  notification: null,
  camera: {
    x: 0,
    y: 0,
    viewportWidth: VIEWPORT_TILES,
    viewportHeight: VIEWPORT_TILES,
  },
};

// ─── Actions ────────────────────────────────────────────────────────────

export type GameStoreAction =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_WORLD'; world: WorldState }
  | { type: 'SET_CAMERA'; camera: Camera }
  | { type: 'OPEN_DIALOGUE'; npc: NPC }
  | { type: 'CLOSE_DIALOGUE' }
  | { type: 'OPEN_ACTION'; item: Item }
  | { type: 'CLOSE_ACTION' }
  | { type: 'SHOW_NOTIFICATION'; text: string }
  | { type: 'CLEAR_NOTIFICATION' }
  | { type: 'UPDATE_WORLD'; updater: (world: WorldState) => WorldState }
  | { type: 'RESET' };

// ─── Reducer ────────────────────────────────────────────────────────────

export function gameReducer(state: GameStore, action: GameStoreAction): GameStore {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_WORLD':
      return { ...state, world: action.world, phase: 'exploring' };

    case 'SET_CAMERA':
      return { ...state, camera: action.camera };

    case 'OPEN_DIALOGUE':
      return { ...state, activeNpc: action.npc, phase: 'dialogue' };

    case 'CLOSE_DIALOGUE':
      return { ...state, activeNpc: null, phase: 'exploring' };

    case 'OPEN_ACTION':
      return { ...state, activeItem: action.item, phase: 'action' };

    case 'CLOSE_ACTION':
      return { ...state, activeItem: null, phase: 'exploring' };

    case 'SHOW_NOTIFICATION':
      return { ...state, notification: action.text };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };

    case 'UPDATE_WORLD':
      if (!state.world) return state;
      return { ...state, world: action.updater(state.world) };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────

export interface GameContextValue {
  state: GameStore;
  dispatch: React.Dispatch<GameStoreAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

/** Hook to access game state. Throws if used outside provider. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
