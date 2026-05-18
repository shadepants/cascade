// ─── Storyteller Director ────────────────────────────────────────────────
// Pacing layer inspired by RimWorld's Cassandra storyteller.
// Does NOT invent events — biases simulation probability rolls and routes
// cascade consequences to NPCs the player will actually encounter.
//
// Modes:
//   clio  — slow burn historian, long memory, rare dramatic events
//   ares  — aggressive escalation, fast pacing, military bias
//   tyche — chaos, no cooldowns, unpredictable chain reactions

import type { WorldState, StorytellerState, StorytellerMode, GameEvent, NPC } from '../types';
import type { GameRNG } from '../utils/rng.ts';

// ─── Tension ─────────────────────────────────────────────────────────────

const MODE_TENSION_MULTIPLIER: Record<StorytellerMode, number> = {
  clio:  0.7,
  ares:  1.3,
  tyche: 1.0,
};

/**
 * Recompute tension from world state.
 * Three components: player action recency, cascade depth, faction instability.
 */
export function computeTension(state: StorytellerState, world: WorldState): number {
  const eventMap = new Map<string, GameEvent>();
  let recentActionCount = 0;
  const thresholdYear = world.currentYear - 20;

  // Single pass O(N) to build the map and count recent actions
  for (let i = 0, len = world.events.length; i < len; i++) {
    const e = world.events[i];
    eventMap.set(e.id, e);
    if (e.playerCaused && e.causedBy === null && e.year > thresholdYear) {
      recentActionCount++;
    }
  }
  const actionPressure = Math.min(45, recentActionCount * 15);

  // Longest active causedBy chain - memoized O(N)
  let maxDepth = 0;
  const depthCache = new Map<string, number>();
  function chainDepth(eventId: string): number {
    const cached = depthCache.get(eventId);
    if (cached !== undefined) return cached;

    const event = eventMap.get(eventId);
    if (!event?.causedBy) {
      depthCache.set(eventId, 0);
      return 0;
    }
    const d = 1 + chainDepth(event.causedBy);
    depthCache.set(eventId, d);
    return d;
  }

  for (let i = 0, len = world.events.length; i < len; i++) {
    const e = world.events[i];
    if (e.playerCaused) {
      const d = chainDepth(e.id);
      if (d > maxDepth) maxDepth = d;
    }
  }
  const depthPressure = Math.min(25, maxDepth * 5);

  // Average instability across factions
  const avgInstability = world.factions.length > 0
    ? world.factions.reduce((s, f) => s + (100 - f.stability), 0) / world.factions.length
    : 0;
  const instabilityPressure = Math.min(30, avgInstability * 0.3);

  const raw = actionPressure + depthPressure + instabilityPressure;
  return Math.min(100, Math.max(0, Math.round(raw * MODE_TENSION_MULTIPLIER[state.mode])));
}

/** Apply per-year tension decay. Called at end of each simulated year. */
export function decayTension(state: StorytellerState): void {
  state.tension = Math.max(
    state.tensionFloor,
    state.tension - state.tensionDecayRate,
  );
}

// ─── Cooldowns ────────────────────────────────────────────────────────────

/** Remove expired cooldown entries. Called at start of each simulated year. */
export function pruneCooldowns(state: StorytellerState, currentYear: number): void {
  state.cooldowns = state.cooldowns.filter(
    cd => currentYear < cd.startYear + cd.durationYears,
  );
  // Clear the per-faction fracture guard (handled in tick.ts directly)
}

/** Returns true when a new event of this significance should be suppressed. */
export function shouldSuppressEvent(
  state: StorytellerState,
  currentYear: number,
  significance: number,
): boolean {
  if (significance < 5) return false; // only gate high-significance events

  // Budget check
  if (state.highSigEventsThisYear >= state.maxEventsPerYear) return true;

  // Cooldown check — any active cooldown with >= significance blocks it
  return state.cooldowns.some(
    cd => cd.triggerSignificance >= significance && currentYear < cd.startYear + cd.durationYears,
  );
}

/** Register a high-sig event that just fired (adds cooldown, increments budget). */
export function registerHighSigEvent(
  state: StorytellerState,
  event: GameEvent,
  currentYear: number,
): void {
  if (event.significance < 5) return;
  state.highSigEventsThisYear++;

  const modeMultiplier: Record<StorytellerMode, number> = {
    clio:  1.5,
    ares:  0.6,
    tyche: 0.0,  // no cooldowns in chaos mode
  };
  const duration = Math.round(
    Math.max(0, (event.significance - 4) * 2) * modeMultiplier[state.mode],
  );
  if (duration > 0) {
    state.cooldowns.push({
      triggerEventId:        event.id,
      triggerSignificance:   event.significance,
      startYear:             currentYear,
      durationYears:         duration,
    });
  }
}

// ─── Spotlight ────────────────────────────────────────────────────────────

/**
 * Set the spotlight to the faction the player just interacted with.
 * Called from ActionMenu when player gives an item.
 */
export function setSpotlight(
  state: StorytellerState,
  factionId: string,
  currentYear: number,
): void {
  state.spotlightFactionId = factionId;
  state.spotlightSetYear = currentYear;
  state.playerActionCount++;
}

/**
 * Get the cascade propagation threshold for this faction.
 * Lower = more likely to cascade (default 0.4, spotlight peak 0.25).
 */
export function getCascadeThreshold(
  state: StorytellerState,
  factionId: string,
  currentYear: number,
): number {
  const BASE = 0.4;
  if (!state.spotlightFactionId || state.spotlightFactionId !== factionId) return BASE;

  const elapsed  = currentYear - state.spotlightSetYear;
  if (elapsed >= state.spotlightDecayYears) return BASE;

  // Linear decay: full bonus (0.15) at year 0, zero bonus at spotlightDecayYears
  const decayFraction = elapsed / state.spotlightDecayYears;
  const bonus = 0.15 * (1 - decayFraction);
  return BASE - bonus;  // 0.25 at peak
}

/**
 * Get the gossip propagation boost for events involving this faction.
 * Returns a probability (default 0.3, spotlight 0.5).
 */
export function getGossipBoost(
  state: StorytellerState,
  factionId: string,
  currentYear: number,
): number {
  const BASE = 0.3;
  if (!state.spotlightFactionId || state.spotlightFactionId !== factionId) return BASE;

  const elapsed = currentYear - state.spotlightSetYear;
  if (elapsed >= state.spotlightDecayYears) return BASE;

  return 0.5;  // flat boost while spotlight is active
}

// ─── Narrative Debt ───────────────────────────────────────────────────────

/**
 * Accumulate narrative debt. Increments yearsSincePlayerDiscovery each year.
 * Resets to 0 if the player learned any playerCaused event this year.
 */
export function accumulateDebt(
  state: StorytellerState,
  world: WorldState,
  currentYear: number,
): void {
  // No debt when player has taken no actions
  if (state.playerActionCount === 0) return;

  state.yearsSincePlayerDiscovery++;

  let discoveredThisYear = false;
  // Optimization: check if we have entries to check this year without full filter
  let hasEntriesThisYear = false;
  for (let i = 0, len = world.player.knowledgeLog.length; i < len; i++) {
    if (world.player.knowledgeLog[i].discoveredYear === currentYear) {
      hasEntriesThisYear = true;
      break;
    }
  }

  if (hasEntriesThisYear) {
    const eventMap = new Map<string, GameEvent>();
    for (let i = 0, len = world.events.length; i < len; i++) {
      const e = world.events[i];
      eventMap.set(e.id, e);
    }

    for (let i = 0, len = world.player.knowledgeLog.length; i < len; i++) {
      const entry = world.player.knowledgeLog[i];
      if (entry.discoveredYear === currentYear) {
        const event = eventMap.get(entry.eventId);
        if (event?.playerCaused === true) {
          discoveredThisYear = true;
          break;
        }
      }
    }
  }

  if (discoveredThisYear) {
    state.yearsSincePlayerDiscovery = 0;
  } else {
    state.consecutiveQuietYears++;
  }
}

export type StorytellerIntervention =
  | { type: 'SEED_KNOWLEDGE'; eventId: string }
  | { type: 'PLACE_WITNESS'; eventId: string; secondaryEventIds: string[] }
  | { type: 'FORCE_NOTIFICATION'; eventId: string };

/**
 * Check debt thresholds and return the appropriate intervention (if any).
 * Diminishing returns: each type fires at most 3 times per run.
 */
export function fireDebtIntervention(
  state: StorytellerState,
  world: WorldState
): StorytellerIntervention | null {
  const debt = state.yearsSincePlayerDiscovery;
  if (debt < 30) return null;

  // Find undiscovered playerCaused events, ranked by significance
  const knownIds = new Set<string>();
  for (let i = 0, len = world.player.knowledgeLog.length; i < len; i++) {
    knownIds.add(world.player.knowledgeLog[i].eventId);
  }

  let target: GameEvent | null = null;
  let second: GameEvent | null = null;
  let third: GameEvent | null = null;

  for (let i = 0, len = world.events.length; i < len; i++) {
    const e = world.events[i];
    if (e.playerCaused && !knownIds.has(e.id)) {
      if (!target || e.significance > target.significance) {
        third = second;
        second = target;
        target = e;
      } else if (!second || e.significance > second.significance) {
        third = second;
        second = e;
      } else if (!third || e.significance > third.significance) {
        third = e;
      }
    }
  }

  if (!target) {
    state.yearsSincePlayerDiscovery = 0;  // nothing left to discover
    return null;
  }
  const MAX_PER_TYPE = 3;

  if (debt >= 70 && state.debtInterventionsFired < MAX_PER_TYPE * 3) {
    state.debtInterventionsFired++;
    return { type: 'FORCE_NOTIFICATION', eventId: target.id };
  }
  if (debt >= 50 && state.debtInterventionsFired < MAX_PER_TYPE * 2) {
    state.debtInterventionsFired++;
    const secondaryEventIds: string[] = [];
    if (second) secondaryEventIds.push(second.id);
    if (third) secondaryEventIds.push(third.id);
    return {
      type:               'PLACE_WITNESS',
      eventId:            target.id,
      secondaryEventIds,
    };
  }
  if (debt >= 30 && state.debtInterventionsFired < MAX_PER_TYPE) {
    state.debtInterventionsFired++;
    return { type: 'SEED_KNOWLEDGE', eventId: target.id };
  }

  return null;
}

/**
 * Apply a storyteller intervention to the world.
 * Mutates world in place (same pattern as tick phases).
 */
export function applyIntervention(
  intervention: StorytellerIntervention,
  world: WorldState,
  rng: GameRNG,
  currentYear: number,
): void {
  const eventMap = new Map<string, GameEvent>();
  for (const e of world.events) eventMap.set(e.id, e);

  const event = eventMap.get(intervention.eventId);
  if (!event) return;

  switch (intervention.type) {
    case 'SEED_KNOWLEDGE': {
      // Seed this event into an NPC near the player
      const playerPos = world.player.position;
      let target: NPC | null = null;
      let minDistance = Infinity;

      for (let i = 0, len = world.npcs.length; i < len; i++) {
        const n = world.npcs[i];
        if (n.alive) {
          let alreadyKnown = false;
          for (let j = 0, klen = n.knowledge.length; j < klen; j++) {
            if (n.knowledge[j].eventId === event.id) {
              alreadyKnown = true;
              break;
            }
          }

          if (!alreadyKnown) {
            const distance = Math.abs(n.position.x - playerPos.x) + Math.abs(n.position.y - playerPos.y);
            if (distance < minDistance) {
              minDistance = distance;
              target = n;
            }
          }
        }
      }
      if (target) {
        target.knowledge.push({
          eventId:        event.id,
          discoveredYear: currentYear,
          accuracy:       0.95,
          sourceId:       'direct',
        });
        console.log(`[STORYTELLER] SEED_KNOWLEDGE — seeded "${event.description}" into ${target.name}`);
      }
      break;
    }

    case 'PLACE_WITNESS': {
      // Find player's current settlement and spawn a Wandering Chronicler
      const playerSettlement = world.settlements.find(s => {
        const dx = s.position.x - world.player.position.x;
        const dy = s.position.y - world.player.position.y;
        return Math.sqrt(dx * dx + dy * dy) < 3;
      }) ?? world.settlements[0];

      if (!playerSettlement) break;

      const witnessId = `witness_${currentYear}_${rng.nextInt(9999)}`;
      const witness: NPC = {
        id:          witnessId,
        name:        'Wandering Chronicler',
        position:    playerSettlement.position,
        factionId:   playerSettlement.factionId,
        personality: 'pragmatist',
        dialogueKey: 'default',
        alive:       true,
        knowledge:   [],
      };

      // Give them the target event and up to 2 secondary events
      const eventIds = [
        intervention.eventId,
        ...intervention.secondaryEventIds,
      ];
      for (const eid of eventIds) {
        const e = eventMap.get(eid);
        if (e) {
          witness.knowledge.push({
            eventId:        e.id,
            discoveredYear: currentYear,
            accuracy:       0.7,
            sourceId:       'direct',
          });
        }
      }

      world.npcs.push(witness);
      playerSettlement.npcs.push(witnessId);
      console.log(`[STORYTELLER] PLACE_WITNESS — Wandering Chronicler placed at ${playerSettlement.name}`);
      break;
    }

    case 'FORCE_NOTIFICATION': {
      // Store on storyteller so App.tsx can surface it after the jump completes.
      console.log(`[STORYTELLER] FORCE_NOTIFICATION — "${event.description}" (sig:${event.significance})`);
      world.storyteller.pendingNotification =
        `Rumors reach you of upheaval — your past choices echo: "${event.description}"`;
      break;
    }
  }
}
