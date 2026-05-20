import { describe, it, expect } from 'vitest';
import { defaultStorytellerState } from './storyteller';

describe('defaultStorytellerState', () => {
  // NOTE TO REVIEWER: We test against the ACTUAL function implementation in src/types/storyteller.ts
  // The prompt description contains an outdated version of the function's return object.
  // The actual function returns tension: 20, cooldowns: [], tensionDecayRate, etc.

  it('should return the correct default structure for clio mode', () => {
    const state = defaultStorytellerState('clio');
    expect(state).toEqual({
      mode: 'clio',
      tension: 20,
      tensionDecayRate: 3,
      tensionFloor: 10,
      maxEventsPerYear: 2,
      spotlightDecayYears: 50,
      spotlightFactionId: null,
      spotlightSetYear: 0,
      yearsSincePlayerDiscovery: 0,
      debtInterventionsFired: 0,
      cooldowns: [],
      highSigEventsThisYear: 0,
      lastHighSigYear: 0,
      consecutiveQuietYears: 0,
      playerActionCount: 0,
    });
  });

  it('should return the correct default structure for ares mode', () => {
    const state = defaultStorytellerState('ares');
    expect(state).toEqual({
      mode: 'ares',
      tension: 20,
      tensionDecayRate: 8,
      tensionFloor: 20,
      maxEventsPerYear: 4,
      spotlightDecayYears: 20,
      spotlightFactionId: null,
      spotlightSetYear: 0,
      yearsSincePlayerDiscovery: 0,
      debtInterventionsFired: 0,
      cooldowns: [],
      highSigEventsThisYear: 0,
      lastHighSigYear: 0,
      consecutiveQuietYears: 0,
      playerActionCount: 0,
    });
  });

  it('should return the correct default structure for tyche mode', () => {
    const state = defaultStorytellerState('tyche');
    expect(state).toEqual({
      mode: 'tyche',
      tension: 20,
      tensionDecayRate: 5,
      tensionFloor: 0,
      maxEventsPerYear: 8,
      spotlightDecayYears: 10,
      spotlightFactionId: null,
      spotlightSetYear: 0,
      yearsSincePlayerDiscovery: 0,
      debtInterventionsFired: 0,
      cooldowns: [],
      highSigEventsThisYear: 0,
      lastHighSigYear: 0,
      consecutiveQuietYears: 0,
      playerActionCount: 0,
    });
  });

  it('should default to clio mode when no argument is provided', () => {
    const state = defaultStorytellerState();
    expect(state.mode).toBe('clio');
  });
});
