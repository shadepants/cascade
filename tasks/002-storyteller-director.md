# Task 002 — Storyteller Director

**Status:** Pending  
**Priority:** 2 (implement after Task 001)  
**Estimated scope:** ~300 lines across 4 files  
**Inspiration:** RimWorld's Cassandra/Randy storytellers — pacing control over WHEN and TO WHOM events surface

---

## Goal

Add a `StorytellerState` to `WorldState` that modulates event pacing, routes cascade
consequences to NPCs the player will encounter, and surfaces narrative debt interventions
when the player goes too long without discovering a cascade they caused.

Three named modes: **Clio** (historian, low tension), **Ares** (war, high tension), **Tyche** (chaos).

---

## Current Problem

The simulation generates correct cascade events. The player may never discover them because:
1. Cascade events aren't routed to NPCs the player visits  
2. There's no pacing mechanism — 30 cascade events or 0, purely probabilistic  
3. The player has no feedback loop that their actions had consequences at all

---

## StorytellerState Interface

Add to `src/types.ts`:

```typescript
export type StorytellerMode = 'clio' | 'ares' | 'tyche';

export interface StorytellerState {
  mode:                  StorytellerMode;

  // Tension: 0–100 scale. Drives event frequency and cascade depth.
  tension:               number;
  tensionDecayRate:      number;    // per simulated year (mode-dependent)
  tensionFloor:          number;    // never drops below this

  // Spotlight: which faction the director is currently foregrounding
  spotlightFactionId:    string | null;
  spotlightYearsRemaining: number;
  spotlightDecayYears:   number;    // linear decay window

  // Narrative debt: eras since player discovered a playerCaused cascade event
  narrativeDebt:         number;    // increments each era
  debtThresholds: {
    seedKnowledge:   number;   // default 3 — seed a witness NPC knowledge entry
    placeWitness:    number;   // default 5 — spawn a Wandering Chronicler NPC
    forceIntervention: number; // default 7 — guaranteed dialogue at next action
  };

  // Cooldowns: prevent event type spam
  eventCooldowns:        Record<string, number>;  // eventType → years remaining
  cooldownFormula:       'standard';              // see formula below

  // Pacing budget: max cascade events per simulated year
  maxEventsPerYear:      number;

  // Tracking
  consecutiveQuietYears: number;
  lastCascadeDepth:      number;    // max causedBy chain length seen this jump
}
```

### Default values by mode

| Field | Clio | Ares | Tyche |
|-------|------|------|-------|
| tensionDecayRate | 3/yr | 8/yr | 5/yr |
| tensionFloor | 5 | 20 | 10 |
| maxEventsPerYear | 2 | 5 | 4 |
| aggression multiplier | 0.7 | 1.3 | 1.0 |
| cascade depth multiplier | 0.8 | 1.5 | 1.2 |
| gossip spread multiplier | 1.2 | 0.8 | 1.0 |
| military event weight | 0.5 | 2.0 | 1.5 |

---

## Tension Formula

```typescript
function computeTension(world: WorldState, year: number): number {
  const st = world.storyteller;
  const playerActions = world.player.actionsThisEra.length;
  const avgInstability = world.factions.reduce((s, f) => s + (100 - f.stability), 0)
                         / world.factions.length;
  const erasElapsed = (world.currentYear - world.startYear) / 20; // rough era count

  const raw = (playerActions * 1.5)
            + (st.lastCascadeDepth * 2.0)
            + (avgInstability * 0.5)
            - (erasElapsed * 0.5);

  const clamped = Math.max(st.tensionFloor, Math.min(100, raw));
  // Apply decay
  return Math.max(st.tensionFloor, clamped - st.tensionDecayRate);
}
```

### Tension gating table

| Tension | Cascade chance per event | Max cascade depth | Gossip multiplier |
|---------|--------------------------|-------------------|-------------------|
| 0–20    | 10%                      | 1                 | 1.0x              |
| 21–40   | 25%                      | 2                 | 1.1x              |
| 41–60   | 40%                      | 3                 | 1.2x              |
| 61–80   | 60%                      | 4                 | 1.4x              |
| 81–100  | 80%                      | 5                 | 1.8x              |

---

## Cooldown Formula

```typescript
function getCooldownYears(event: GameEvent, mode: StorytellerMode): number {
  const modeMultiplier = mode === 'clio' ? 1.5 : mode === 'ares' ? 0.7 : 1.0;
  return Math.max(0, (event.significance - 4) * 2) * modeMultiplier;
}
```

---

## Spotlight System

The director picks one faction to foreground. While spotlighted:
- Cascade events involving this faction get 1.5× weight in the cascade phase  
- Gossip NPCs 30% more likely to know spotlight faction events  
- 10% of non-spotlight NPCs carry breadcrumbs pointing toward spotlight events  
- Spotlight decays linearly over `spotlightDecayYears` (default 3 eras = 60 years)

**Spotlight selection criteria (pick highest score):**
1. Player has gifted artifact to this faction in this era  
2. Faction has highest recent cascade depth  
3. Faction has lowest stability (imminent crisis)

---

## Narrative Debt Interventions

Narrative debt increments every era the player discovers zero `playerCaused` cascade events.

| Debt | Intervention |
|------|-------------|
| ≥ debtThresholds.seedKnowledge | Seed a guaranteed cascade event into 1 NPC in player's current settlement |
| ≥ debtThresholds.placeWitness | Spawn a "Wandering Chronicler" NPC (personality: scholarly, accuracy: 0.95) carrying the oldest undiscovered player-caused event |
| ≥ debtThresholds.forceIntervention | Guarantee dialogue trigger at the player's next action (NPC approaches player) |

Debt resets to 0 when the player discovers any playerCaused event.

---

## NPC Routing

After cascade events are generated, route them to NPCs so the player can discover them:

```
1. 1 guaranteed NPC in player's current settlement gets highest-significance cascade event
2. 30% of NPCs within 2 settlements of player get cascade breadcrumbs
   (reduced accuracy 0.4–0.6 — rumor tier)
3. 10% of all living NPCs get a low-accuracy echo (legend tier, accuracy < 0.3)
   — weighted toward spotlight faction NPCs
```

---

## Implementation Steps

### Step 1 — Add StorytellerState to types.ts

Add the interface (above) and extend `WorldState`:
```typescript
// In WorldState interface:
storyteller: StorytellerState;
```

Add factory function:
```typescript
export function defaultStorytellerState(mode: StorytellerMode = 'clio'): StorytellerState {
  const modeDefaults = {
    clio:  { tensionDecayRate: 3,  tensionFloor: 5,  maxEventsPerYear: 2 },
    ares:  { tensionDecayRate: 8,  tensionFloor: 20, maxEventsPerYear: 5 },
    tyche: { tensionDecayRate: 5,  tensionFloor: 10, maxEventsPerYear: 4 },
  }[mode];
  return {
    mode,
    tension: 20,
    ...modeDefaults,
    spotlightFactionId: null,
    spotlightYearsRemaining: 0,
    spotlightDecayYears: 60,
    narrativeDebt: 0,
    debtThresholds: { seedKnowledge: 3, placeWitness: 5, forceIntervention: 7 },
    eventCooldowns: {},
    cooldownFormula: 'standard',
    consecutiveQuietYears: 0,
    lastCascadeDepth: 0,
  };
}
```

### Step 2 — Create `src/simulation/storyteller.ts`

New file with all storyteller logic:
- `updateStorytellerTension(world, year)` — recompute tension
- `updateSpotlight(world)` — select/decay spotlight faction
- `applyNarrativeDebt(world, year, rng)` — run debt interventions
- `routeCascadeToPlayer(world, cascadeEvents, year, rng)` — NPC routing
- `getModeCascadeChance(storyteller)` — tension-gated chance
- `getModeCooldown(event, mode)` — cooldown duration

### Step 3 — Wire into `src/simulation/tick.ts`

Four injection points in the year loop:

```typescript
// 1. TOP of year loop — update tension and spotlight
updateStorytellerTension(world, year);
updateSpotlight(world);

// 2. BEFORE cascade phase — gate cascade chance by tension
const cascadeChance = getModeCascadeChance(world.storyteller);
// (pass to phaseCascade or use internally in phaseCascade to override the hardcoded 0.4)

// 3. AFTER cascade phase — route events and apply debt
routeCascadeToPlayer(world, cas, year, rng);
applyNarrativeDebt(world, year, rng);

// 4. AFTER year loop — tick down cooldowns
for (const key of Object.keys(world.storyteller.eventCooldowns)) {
  world.storyteller.eventCooldowns[key] = Math.max(0, world.storyteller.eventCooldowns[key] - 1);
}
```

### Step 4 — Mode Selector on TitleScreen

In `src/ui/TitleScreen.tsx`, add a mode picker (3 buttons: Clio / Ares / Tyche) with
a one-line description. Pass selected mode into world generation so `defaultStorytellerState(mode)`
is called with the right value.

### Step 5 — Update store.ts

Add `storyteller: defaultStorytellerState()` to `initialState`.

---

## Files to Modify / Create

| File | Change |
|------|--------|
| `src/types.ts` | Add StorytellerMode, StorytellerState, defaultStorytellerState, extend WorldState |
| `src/simulation/storyteller.ts` | **NEW** — all storyteller logic |
| `src/simulation/tick.ts` | 4 injection points (import + call storyteller functions) |
| `src/ui/TitleScreen.tsx` | Mode selector UI |
| `src/store.ts` | Add storyteller to initialState |

---

## Acceptance Criteria

- [ ] `world.storyteller` exists on WorldState and initialises with correct mode defaults
- [ ] Tension updates each simulated year and is visible in console logs
- [ ] Cascade events are seeded into player's current settlement NPCs
- [ ] Narrative debt increments when player discovers zero player-caused events per era
- [ ] At debt ≥ 3, a Wandering Chronicler NPC appears (check in DevTools world state)
- [ ] Mode selector on TitleScreen changes `storyteller.mode`
- [ ] No TypeScript errors; build passes
