import type { GamePhase, WorldConfig, WorldState, NPC, Item } from './index';

export type TestAction =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'OPEN_DIALOGUE'; npc: NPC }
  | { type: 'CLOSE_DIALOGUE' }
  | { type: 'OPEN_ACTION'; item: Item }
  | { type: 'CLOSE_ACTION' }
  | { type: 'SET_WORLD'; world: WorldState }
  | { type: 'SET_CONFIG'; config: WorldConfig }
  | { type: 'GAIN_INSIGHT'; amount: number };
