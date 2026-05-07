export type StorytellerMode = 'clio' | 'ares' | 'tyche';

export interface CooldownEntry {
  triggerEventId: string;
  triggerSignificance: number;
  startYear: number;
  durationYears: number;
}

export interface StorytellerState {
  mode: StorytellerMode;
  tension: number;
  tensionDecayRate: number;
  tensionFloor: number;
  spotlightFactionId: string | null;
  spotlightSetYear: number;
  spotlightDecayYears: number;
  yearsSincePlayerDiscovery: number;
  debtInterventionsFired: number;
  cooldowns: CooldownEntry[];
  maxEventsPerYear: number;
  highSigEventsThisYear: number;
  lastHighSigYear: number;
  consecutiveQuietYears: number;
  playerActionCount: number;
  pendingNotification?: string;
}

export function defaultStorytellerState(mode: StorytellerMode = 'clio'): StorytellerState {
  const modeDefaults: Record<StorytellerMode, { tensionDecayRate: number; tensionFloor: number; maxEventsPerYear: number; spotlightDecayYears: number }> = {
    clio: { tensionDecayRate: 3, tensionFloor: 10, maxEventsPerYear: 2, spotlightDecayYears: 50 },
    ares: { tensionDecayRate: 8, tensionFloor: 20, maxEventsPerYear: 4, spotlightDecayYears: 20 },
    tyche: { tensionDecayRate: 5, tensionFloor: 0, maxEventsPerYear: 8, spotlightDecayYears: 10 },
  };

  return {
    mode,
    tension: 20,
    ...modeDefaults[mode],
    spotlightFactionId: null,
    spotlightSetYear: 0,
    yearsSincePlayerDiscovery: 0,
    debtInterventionsFired: 0,
    cooldowns: [],
    highSigEventsThisYear: 0,
    lastHighSigYear: 0,
    consecutiveQuietYears: 0,
    playerActionCount: 0,
  };
}
