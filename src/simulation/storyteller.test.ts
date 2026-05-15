import { describe, it, expect } from 'vitest';
import {
  computeTension,
  decayTension,
  pruneCooldowns,
  shouldSuppressEvent,
  registerHighSigEvent,
  setSpotlight,
  getCascadeThreshold,
  getGossipBoost,
  accumulateDebt,
  fireDebtIntervention,
  applyIntervention,
} from './storyteller.ts';
import { defaultStorytellerState, type WorldState, type GameEvent, type StorytellerState } from '../types';
import { SeededRNG } from '../utils/rng.ts';

function makeState(overrides: Partial<StorytellerState> = {}): StorytellerState {
  return { ...defaultStorytellerState('clio'), ...overrides };
}

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    seed: 1,
    currentYear: 100,
    map: { width: 1, height: 1, tiles: [[{ biome: 'grassland', elevation: 0, rainfall: 0, factionId: null, settlementId: null, walkable: true }]] },
    factions: [],
    relationships: [],
    historicalFigures: [],
    settlements: [],
    ruins: [],
    resourceNodes: [],
    npcs: [],
    items: [],
    tradeRoutes: [],
    religions: [],
    holySites: [],
    events: [],
    innovations: [],
    player: { id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [], knowledgeLog: [], actionsThisEra: [], insight: 0 },
    storyteller: makeState(),
    visuals: [],
    ...overrides,
  };
}

function makeEvent(id: string, significance: number, playerCaused = true, causedBy: string | null = null, year = 100): GameEvent {
  return {
    id, tick: 0, year, secondsOffset: 0,
    subject: 'A', action: 'test', object: 'B',
    causedBy, significance, playerCaused,
    description: 'test', motivation: '',
    statDeltas: [],
  };
}

// ─── computeTension ───────────────────────────────────────────────────────────

describe('computeTension', () => {
  it('returns 0 for an empty world with no events or factions', () => {
    const state = makeState();
    const world = makeWorld();
    expect(computeTension(state, world)).toBe(0);
  });

  it('increases with recent player actions', () => {
    const state = makeState();
    const world = makeWorld({
      currentYear: 100,
      events: [
        makeEvent('e1', 3, true, null, 90),
        makeEvent('e2', 3, true, null, 95),
      ],
    });
    expect(computeTension(state, world)).toBeGreaterThan(0);
  });

  it('applies mode multiplier — ares is higher than clio', () => {
    const world = makeWorld({
      events: [makeEvent('e1', 3, true, null, 90)],
    });
    const clio = computeTension(makeState({ mode: 'clio' }), world);
    const ares = computeTension(makeState({ mode: 'ares' }), world);
    expect(ares).toBeGreaterThan(clio);
  });

  it('includes faction instability in tension', () => {
    const state = makeState();
    const world = makeWorld({
      factions: [{
        id: 'f1', name: 'F1', color: '#fff', aggression: 50,
        settlements: [], population: 100, stability: 10, // unstable
        wealth: 50, military: 50, culture: 50,
        ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
        leaderId: null, interestGroups: [],
        techLevel: 1, innovations: [],
      }],
    });
    expect(computeTension(state, world)).toBeGreaterThan(0);
  });
});

// ─── decayTension ─────────────────────────────────────────────────────────────

describe('decayTension', () => {
  it('reduces tension by the decay rate', () => {
    const state = makeState({ tension: 50, tensionDecayRate: 5 });
    decayTension(state);
    expect(state.tension).toBe(45);
  });

  it('does not drop below tensionFloor', () => {
    const state = makeState({ tension: 12, tensionDecayRate: 5, tensionFloor: 10 });
    decayTension(state);
    expect(state.tension).toBe(10);
  });
});

// ─── pruneCooldowns ───────────────────────────────────────────────────────────

describe('pruneCooldowns', () => {
  it('removes expired cooldowns', () => {
    const state = makeState({
      cooldowns: [
        { triggerEventId: 'e1', triggerSignificance: 5, startYear: 10, durationYears: 5 }, // expired at year 15
        { triggerEventId: 'e2', triggerSignificance: 5, startYear: 20, durationYears: 10 }, // expires at year 30
      ],
    });
    pruneCooldowns(state, 20);
    expect(state.cooldowns).toHaveLength(1);
    expect(state.cooldowns[0].triggerEventId).toBe('e2');
  });

  it('keeps all cooldowns when none are expired', () => {
    const state = makeState({
      cooldowns: [
        { triggerEventId: 'e1', triggerSignificance: 5, startYear: 15, durationYears: 10 },
      ],
    });
    pruneCooldowns(state, 20);
    expect(state.cooldowns).toHaveLength(1);
  });
});

// ─── shouldSuppressEvent ──────────────────────────────────────────────────────

describe('shouldSuppressEvent', () => {
  it('never suppresses low-significance events (< 5)', () => {
    const state = makeState({ highSigEventsThisYear: 999, maxEventsPerYear: 0 });
    expect(shouldSuppressEvent(state, 100, 4)).toBe(false);
    expect(shouldSuppressEvent(state, 100, 4.9)).toBe(false);
  });

  it('checks boundary significance of 5', () => {
    const state = makeState({ highSigEventsThisYear: 2, maxEventsPerYear: 2 });
    expect(shouldSuppressEvent(state, 100, 5)).toBe(true);
  });

  it('suppresses when budget is exactly exhausted', () => {
    const state = makeState({ highSigEventsThisYear: 2, maxEventsPerYear: 2 });
    expect(shouldSuppressEvent(state, 100, 5)).toBe(true);
  });

  it('does not suppress when budget is one below limit', () => {
    const state = makeState({ highSigEventsThisYear: 1, maxEventsPerYear: 2 });
    expect(shouldSuppressEvent(state, 100, 5)).toBe(false);
  });

  describe('cooldown checks', () => {
    it('suppresses when currentYear is one before expiration', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [{ triggerEventId: 'e1', triggerSignificance: 6, startYear: 95, durationYears: 5 }],
      });
      // Expires at 95 + 5 = 100. Year 99 should be suppressed.
      expect(shouldSuppressEvent(state, 99, 6)).toBe(true);
    });

    it('does not suppress when currentYear is exactly the expiration year', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [{ triggerEventId: 'e1', triggerSignificance: 6, startYear: 95, durationYears: 5 }],
      });
      // Expires at 95 + 5 = 100. Year 100 should NOT be suppressed.
      expect(shouldSuppressEvent(state, 100, 6)).toBe(false);
    });

    it('suppresses when triggerSignificance is greater than event significance', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [{ triggerEventId: 'e1', triggerSignificance: 10, startYear: 95, durationYears: 10 }],
      });
      expect(shouldSuppressEvent(state, 100, 6)).toBe(true);
    });

    it('suppresses when triggerSignificance is equal to event significance', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [{ triggerEventId: 'e1', triggerSignificance: 6, startYear: 95, durationYears: 10 }],
      });
      expect(shouldSuppressEvent(state, 100, 6)).toBe(true);
    });

    it('does not suppress when triggerSignificance is less than event significance', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [{ triggerEventId: 'e1', triggerSignificance: 5, startYear: 95, durationYears: 10 }],
      });
      expect(shouldSuppressEvent(state, 100, 6)).toBe(false);
    });

    it('handles multiple cooldowns (one active blocks, even if another is expired)', () => {
      const state = makeState({
        highSigEventsThisYear: 0,
        maxEventsPerYear: 10,
        cooldowns: [
          { triggerEventId: 'e1', triggerSignificance: 6, startYear: 80, durationYears: 5 }, // expired
          { triggerEventId: 'e2', triggerSignificance: 6, startYear: 98, durationYears: 5 }, // active
        ],
      });
      expect(shouldSuppressEvent(state, 100, 6)).toBe(true);
    });
  });
});

// ─── registerHighSigEvent ─────────────────────────────────────────────────────

describe('registerHighSigEvent', () => {
  it('increments highSigEventsThisYear for sig >= 5', () => {
    const state = makeState({ highSigEventsThisYear: 0 });
    registerHighSigEvent(state, makeEvent('e1', 5), 100);
    expect(state.highSigEventsThisYear).toBe(1);
  });

  it('does not increment for sig < 5', () => {
    const state = makeState({ highSigEventsThisYear: 0 });
    registerHighSigEvent(state, makeEvent('e1', 4.9), 100);
    expect(state.highSigEventsThisYear).toBe(0);
  });

  it('increments budget even if in Tyche mode (where no cooldown is added)', () => {
    const state = makeState({ mode: 'tyche', highSigEventsThisYear: 0 });
    registerHighSigEvent(state, makeEvent('e1', 5), 100);
    expect(state.highSigEventsThisYear).toBe(1);
    expect(state.cooldowns).toHaveLength(0);
  });

  it('calculates duration correctly for Clio mode (1.5x multiplier)', () => {
    const state = makeState({ mode: 'clio', cooldowns: [] });
    // (5 - 4) * 2 * 1.5 = 3
    registerHighSigEvent(state, makeEvent('e1', 5), 100);
    expect(state.cooldowns[0].durationYears).toBe(3);
    expect(state.cooldowns[0].startYear).toBe(100);
  });

  it('calculates duration correctly for Ares mode (0.6x multiplier)', () => {
    const state = makeState({ mode: 'ares', cooldowns: [] });
    // (5 - 4) * 2 * 0.6 = 1.2 -> rounds to 1
    registerHighSigEvent(state, makeEvent('e1', 5), 100);
    expect(state.cooldowns[0].durationYears).toBe(1);
  });

  it('adds NO cooldown if duration rounds to 0', () => {
    const state = makeState({ mode: 'ares', cooldowns: [] });
    // (4.2 - 4) * 2 * 0.6 = 0.4 -> rounds to 0
    registerHighSigEvent(state, makeEvent('e1', 4.2), 100);
    expect(state.cooldowns).toHaveLength(0);
    // But still increments budget since sig >= 5 check is separate?
    // Wait, let's re-read the code.
    // registerHighSigEvent: if (event.significance < 5) return;
    // Oh, if sig is 4.2 it returns early.
  });

  it('adds NO cooldown if duration rounds to 0 (case with sig >= 5)', () => {
    // We need a case where sig >= 5 but duration is 0.
    // Clio: (sig - 4) * 2 * 1.5. If sig=5, dur=3.
    // Ares: (sig - 4) * 2 * 0.6. If sig=5, dur=1.2 -> 1.
    // Tyche: multiplier is 0.0, so dur is always 0.
    const state = makeState({ mode: 'tyche', cooldowns: [] });
    registerHighSigEvent(state, makeEvent('e1', 10), 100);
    expect(state.cooldowns).toHaveLength(0);
    expect(state.highSigEventsThisYear).toBe(1);
  });
});

// ─── setSpotlight ─────────────────────────────────────────────────────────────

describe('setSpotlight', () => {
  it('sets spotlightFactionId, spotlightSetYear, increments playerActionCount', () => {
    const state = makeState({ playerActionCount: 0 });
    setSpotlight(state, 'f1', 200);
    expect(state.spotlightFactionId).toBe('f1');
    expect(state.spotlightSetYear).toBe(200);
    expect(state.playerActionCount).toBe(1);
  });
});

// ─── getCascadeThreshold ──────────────────────────────────────────────────────

describe('getCascadeThreshold', () => {
  it('returns BASE (0.4) when no spotlight is set', () => {
    const state = makeState({ spotlightFactionId: null });
    expect(getCascadeThreshold(state, 'f1', 100)).toBe(0.4);
  });

  it('returns BASE for a different faction than spotlight', () => {
    const state = makeState({ spotlightFactionId: 'f2', spotlightSetYear: 100, spotlightDecayYears: 50 });
    expect(getCascadeThreshold(state, 'f1', 100)).toBe(0.4);
  });

  it('returns lower threshold for spotlight faction at year 0', () => {
    const state = makeState({ spotlightFactionId: 'f1', spotlightSetYear: 100, spotlightDecayYears: 50 });
    const threshold = getCascadeThreshold(state, 'f1', 100);
    expect(threshold).toBeLessThan(0.4);
    expect(threshold).toBeCloseTo(0.25, 5);
  });

  it('returns BASE after spotlight expires', () => {
    const state = makeState({ spotlightFactionId: 'f1', spotlightSetYear: 50, spotlightDecayYears: 50 });
    expect(getCascadeThreshold(state, 'f1', 100)).toBe(0.4);
  });
});

// ─── getGossipBoost ───────────────────────────────────────────────────────────

describe('getGossipBoost', () => {
  it('returns BASE (0.3) when no spotlight set', () => {
    const state = makeState({ spotlightFactionId: null });
    expect(getGossipBoost(state, 'f1', 100)).toBe(0.3);
  });

  it('returns 0.5 for spotlight faction within window', () => {
    const state = makeState({ spotlightFactionId: 'f1', spotlightSetYear: 100, spotlightDecayYears: 50 });
    expect(getGossipBoost(state, 'f1', 100)).toBe(0.5);
  });

  it('returns BASE after spotlight expires', () => {
    const state = makeState({ spotlightFactionId: 'f1', spotlightSetYear: 50, spotlightDecayYears: 50 });
    expect(getGossipBoost(state, 'f1', 100)).toBe(0.3);
  });
});

// ─── accumulateDebt ───────────────────────────────────────────────────────────

describe('accumulateDebt', () => {
  it('does not increment when playerActionCount is 0', () => {
    const state = makeState({ yearsSincePlayerDiscovery: 0, playerActionCount: 0 });
    const world = makeWorld({ storyteller: state });
    accumulateDebt(state, world, 100);
    expect(state.yearsSincePlayerDiscovery).toBe(0);
  });

  it('increments yearsSincePlayerDiscovery each year when no discovery', () => {
    const state = makeState({ yearsSincePlayerDiscovery: 5, playerActionCount: 1 });
    const world = makeWorld({ storyteller: state });
    accumulateDebt(state, world, 100);
    expect(state.yearsSincePlayerDiscovery).toBe(6);
  });

  it('resets to 0 when player discovered a playerCaused event this year', () => {
    const event = makeEvent('e1', 4, true);
    const state = makeState({ yearsSincePlayerDiscovery: 50, playerActionCount: 1 });
    const world = makeWorld({
      storyteller: state,
      events: [event],
      player: {
        id: 'p', name: 'P', position: { x: 0, y: 0 }, inventory: [],
        knowledgeLog: [{ eventId: 'e1', discoveredYear: 100, source: 'direct', factionPerspective: '', text: '' }],
        actionsThisEra: [], insight: 0,
      },
    });
    accumulateDebt(state, world, 100);
    expect(state.yearsSincePlayerDiscovery).toBe(0);
  });
});

// ─── fireDebtIntervention ────────────────────────────────────────────────────

describe('fireDebtIntervention', () => {


  it('returns null when debt < 30', () => {
    const state = makeState({ yearsSincePlayerDiscovery: 20 });
    const world = makeWorld({ storyteller: state });
    expect(fireDebtIntervention(state, world)).toBeNull();
  });

  it('returns SEED_KNOWLEDGE at debt >= 30', () => {
    const event = makeEvent('e1', 5, true);
    const state = makeState({ yearsSincePlayerDiscovery: 30, debtInterventionsFired: 0 });
    const world = makeWorld({ storyteller: state, events: [event] });
    const result = fireDebtIntervention(state, world);
    expect(result?.type).toBe('SEED_KNOWLEDGE');
    expect(result?.eventId).toBe('e1');
  });

  it('returns PLACE_WITNESS at debt >= 50', () => {
    const events = [makeEvent('e1', 5, true), makeEvent('e2', 4, true)];
    const state = makeState({ yearsSincePlayerDiscovery: 55, debtInterventionsFired: 3 });
    const world = makeWorld({ storyteller: state, events });
    const result = fireDebtIntervention(state, world);
    expect(result?.type).toBe('PLACE_WITNESS');
  });

  it('returns FORCE_NOTIFICATION at debt >= 70', () => {
    const events = [makeEvent('e1', 6, true)];
    const state = makeState({ yearsSincePlayerDiscovery: 75, debtInterventionsFired: 6 });
    const world = makeWorld({ storyteller: state, events });
    const result = fireDebtIntervention(state, world);
    expect(result?.type).toBe('FORCE_NOTIFICATION');
  });

  it('resets debt and returns null when no undiscovered events remain', () => {
    const state = makeState({ yearsSincePlayerDiscovery: 50 });
    const world = makeWorld({ storyteller: state, events: [] });
    const result = fireDebtIntervention(state, world);
    expect(result).toBeNull();
    expect(state.yearsSincePlayerDiscovery).toBe(0);
  });
});

// ─── applyIntervention ────────────────────────────────────────────────────────

describe('applyIntervention — SEED_KNOWLEDGE', () => {
  it('seeds the event into the nearest alive NPC who lacks it', () => {
    const event = makeEvent('e1', 5);
    const world = makeWorld({
      events: [event],
      npcs: [
        { id: 'n1', name: 'N1', position: { x: 1, y: 1 }, factionId: 'f1', personality: 'loyal', knowledge: [], dialogueKey: 'k', alive: true },
      ],
    });
    applyIntervention({ type: 'SEED_KNOWLEDGE', eventId: 'e1' }, world, new SeededRNG(1), 100);
    expect(world.npcs[0].knowledge.some(k => k.eventId === 'e1')).toBe(true);
  });

  it('does nothing when event does not exist', () => {
    const world = makeWorld({
      npcs: [{ id: 'n1', name: 'N1', position: { x: 0, y: 0 }, factionId: 'f1', personality: 'loyal', knowledge: [], dialogueKey: 'k', alive: true }],
    });
    // No error thrown — graceful no-op
    expect(() =>
      applyIntervention({ type: 'SEED_KNOWLEDGE', eventId: 'missing' }, world, new SeededRNG(1), 100),
    ).not.toThrow();
  });
});

describe('applyIntervention — PLACE_WITNESS', () => {
  it('spawns a Wandering Chronicler NPC at the nearest settlement', () => {
    const event = makeEvent('e1', 5);
    const world = makeWorld({
      events: [event],
      settlements: [{
        id: 's1', name: 'Town', position: { x: 0, y: 0 },
        factionId: 'f1', npcs: [], items: [], faith: [], dominantReligionId: null,
        innovations: [],
      }],
    });
    applyIntervention(
      { type: 'PLACE_WITNESS', eventId: 'e1', secondaryEventIds: [] },
      world, new SeededRNG(1), 100,
    );
    const chronicler = world.npcs.find(n => n.name === 'Wandering Chronicler');
    expect(chronicler).toBeDefined();
    expect(chronicler?.knowledge.some(k => k.eventId === 'e1')).toBe(true);
  });
});

describe('applyIntervention — FORCE_NOTIFICATION', () => {
  it('sets pendingNotification on the storyteller', () => {
    const event = makeEvent('e1', 6);
    const world = makeWorld({ events: [event] });
    applyIntervention({ type: 'FORCE_NOTIFICATION', eventId: 'e1' }, world, new SeededRNG(1), 100);
    expect(world.storyteller.pendingNotification).toBeDefined();
    expect(world.storyteller.pendingNotification).toContain(event.description);
  });
});
