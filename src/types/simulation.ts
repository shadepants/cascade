import type { StatDelta } from './world.ts';

export interface GameEvent {
  id: string;
  tick: number;
  year: number;
  secondsOffset: number;
  subject: string;
  action: string;
  object: string;
  causedBy: string | null;
  significance: number;
  playerCaused: boolean;
  description: string;
  motivation: string;
  statDeltas: StatDelta[];
}

export interface CausalChain {
  rootEventId: string;
  nodes: CausalNode[];
  totalDepth: number;
  score: number;
}

export interface CausalNode {
  eventId: string;
  depth: number;
  children: string[];
}
