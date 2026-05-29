import type { Item, NPC, WorldConfig, WorldState } from './world.ts';
import type { StorytellerMode } from './storyteller.ts';

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 0,
  mapSize: 128,
  numFactions: 6,
  numSettlementsPerFaction: 2,
  npcsPerSettlement: 3,
  pregenYears: (typeof navigator !== 'undefined' && navigator.webdriver) ? 20 : 500,
  ticksPerYear: 1,
  storytellerMode: 'clio' as StorytellerMode,
};

export type GamePhase =
  | 'title'
  | 'worldgen'
  | 'exploring'
  | 'dialogue'
  | 'action'
  | 'jumping'
  | 'intervention'
  | 'score';

export interface Camera {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
}

export interface GameStore {
  phase: GamePhase;
  world: WorldState | null;
  previousWorld: WorldState | null;
  config: WorldConfig;
  activeNpc: NPC | null;
  activeItem: Item | null;
  notification: string | null;
  camera: Camera;
}

export const TILE_SIZE = 24;
export const VIEWPORT_TILES = 32;
export const MAX_ACTIONS_PER_ERA = 6;
