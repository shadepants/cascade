import type { 
  GamePhase, WorldState, WorldConfig, NPC, Item, Camera 
} from '../types';

export interface WorldSlice {
  world: WorldState | null;
  previousWorld: WorldState | null;
  setWorld: (world: WorldState) => void;
  setPreviousWorld: (world: WorldState) => void;
  updateWorld: (updater: (world: WorldState) => WorldState) => void;
  gainInsight: (amount: number) => void;
}

export interface CameraSlice {
  camera: Camera;
  setCamera: (camera: Camera) => void;
  updateCamera: (updater: (camera: Camera) => Camera) => void;
}

export interface UISlice {
  phase: GamePhase;
  activeNpc: NPC | null;
  activeItem: Item | null;
  activeTile: { x: number, y: number } | null;
  notification: string | null;
  setPhase: (phase: GamePhase) => void;
  openDialogue: (npc: NPC) => void;
  closeDialogue: () => void;
  openAction: (item: Item) => void;
  closeAction: () => void;
  openIntervention: (pos: { x: number, y: number }) => void;
  closeIntervention: () => void;
  showNotification: (text: string) => void;
  clearNotification: () => void;
}

export interface ConfigSlice {
  config: WorldConfig;
  setConfig: (config: WorldConfig) => void;
}

export type GameStore = WorldSlice & CameraSlice & UISlice & ConfigSlice & {
  reset: () => void;
};
