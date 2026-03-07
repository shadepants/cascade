# Claude's Plan — Cascade Bug Fixes & Polish
*Created: 2026-03-06 | Based on collab-review (Claude + Gemini adversarial pass)*
*Compare to: gem upgradesv1.txt (Gemini's world-expansion wishlist — separate scope)*

---

## Scope

This plan addresses **bugs and omissions** found in the current codebase —
things that are broken or missing right now, not new features.
It does NOT overlap with gem upgradesv1.txt (fractal terrain, dynastic succession, etc.),
which is a separate, larger future scope.

Most of the fixes in `claude upgradev1.txt` (also in the repo root) were **planned
but never applied to the code**. This plan is the implementation spec for that work.

---

## Priority 1 — Gameplay-Blocking Bugs (nothing works without these)

### Fix 1A: phaseCascade — Unapplied lookback window
**File:** `src/simulation/tick.ts`
**Problem:** `phaseCascade` scans ALL of `world.events` every year. As history grows,
this becomes unbounded. The fix was described in `claude upgradev1.txt` but the code
still has no year filter.
**Current code (line ~802):**
```ts
const playerEvents = [...world.events, ...recentEvents].filter(
  e => e.playerCaused && e.significance >= CASCADE_SIGNIFICANCE_MIN,
);
```
**Fix:** Add constant + year filter:
```ts
const CASCADE_LOOKBACK_YEARS = 12;

const playerEvents = [...world.events, ...recentEvents].filter(
  e => e.playerCaused &&
       e.significance >= CASCADE_SIGNIFICANCE_MIN &&
       e.year > year - CASCADE_LOOKBACK_YEARS,
);
```

---

### Fix 1B: phaseCascade — Probability still inverted, spotlight lookup still wrong
**File:** `src/simulation/tick.ts`
**Problem:** Two bugs on the same line (~807):
1. `rng.nextFloat() > threshold` fires cascade only 40% of the time. Should be `<` so base rate is 60%.
2. `trigger.subject` is 'player' for player-give events — spotlight lookup always returns BASE threshold.
   Must use `trigger.object` (the recipient faction).

**Current code (line ~807):**
```ts
if (rng.nextFloat() > getCascadeThreshold(world.storyteller, trigger.subject, year)) continue;
```
**Fix:**
```ts
if (rng.nextFloat() < getCascadeThreshold(world.storyteller, trigger.object, year)) continue;
```
Wait — invert the `continue` logic too. With `< threshold`:
- float < 0.40 → condition true → continue (skip) — that's wrong, we want MORE cascades.

Correct reading: we want cascade to fire when float is BELOW the threshold.
`continue` means SKIP. So:
```ts
if (rng.nextFloat() >= getCascadeThreshold(world.storyteller, trigger.object, year)) continue;
```
With BASE = 0.40: fires when float < 0.40 = 40%? No, that's the original bug.
Lower threshold = more likely. `< threshold` fires threshold% of the time.
With threshold = 0.40: fires 40%. With threshold = 0.25 (spotlight): fires 25%. That's backwards.

**Correct intent:** lower threshold = more cascades. So:
```ts
// Fire cascade if float is BELOW (1 - threshold), i.e., threshold controls suppression rate.
if (rng.nextFloat() > (1 - getCascadeThreshold(world.storyteller, trigger.object, year))) continue;
```
Or simpler — flip the threshold math in getCascadeThreshold so it returns a PROBABILITY (higher = more cascades):
- Base cascade probability = 0.60 (60%)
- Spotlight peak probability = 0.75 (75%)

Then in phaseCascade:
```ts
if (rng.nextFloat() > getCascadeThreshold(world.storyteller, trigger.object, year)) continue;
```
And in storyteller.ts `getCascadeThreshold`:
```ts
const BASE = 0.60;
// spotlight bonus: up to +0.15
const bonus = 0.15 * (1 - decayFraction);
return BASE + bonus;  // 0.75 at peak
```

**Action:** Update both tick.ts (trigger.object) and storyteller.ts (flip BASE + bonus).

---

### Fix 1C: deriveConsequence — Missing positive-delta branches
**File:** `src/simulation/tick.ts`
**Problem:** Only negative cascades exist (rebellion, military buildup). Giving artifacts
that boost +stability or +wealth produces zero derived consequences. The `alliance_formed`
and `trade_boom` branches were described in upgradev1.txt but are not in the code.

**Add to `deriveConsequence` after existing branches:**

```ts
// +stability → alliance_formed (if faction has a neighbor with high opinion)
if (stat === 'stability' && delta.delta > 0 && newValue >= 65) {
  const rel = world.relationships.find(r =>
    (r.factionA === faction.id || r.factionB === faction.id) &&
    r.state === 'peace' && r.opinion >= ALLIANCE_OPINION_MIN,
  );
  if (rel && rng.nextFloat() < 0.35) {
    const allyId = rel.factionA === faction.id ? rel.factionB : rel.factionA;
    const ally = world.factions.find(f => f.id === allyId);
    if (!ally) return null;
    rel.state = 'alliance';
    return createEvent({
      tick: year, year,
      subject: faction.id, action: 'alliance_formed', object: allyId,
      causedBy: parentEvent.id,
      significance: Math.max(1, parentEvent.significance - 1),
      playerCaused: true,
      description: `Stability in ${faction.name} created conditions for alliance with ${ally.name}`,
      motivation: pickMotivation('alliance_formed', rng),
      statDeltas: [
        { factionId: faction.id, stat: 'stability', delta: 5 },
        { factionId: allyId,     stat: 'stability', delta: 5 },
      ],
    });
  }
}

// +wealth → trade_boom (spreads wealth to a neighbor, 45% roll)
if (stat === 'wealth' && delta.delta > 0 && newValue > 50 && rng.nextFloat() < 0.45) {
  const neighbors = getNeighboringFactions(world, faction.id);
  if (neighbors.length === 0) return null;
  const target = neighbors[rng.nextInt(neighbors.length)];
  return createEvent({
    tick: year, year,
    subject: faction.id, action: 'trade_boom', object: target.id,
    causedBy: parentEvent.id,
    significance: Math.max(1, parentEvent.significance - 1),
    playerCaused: true,
    description: `Wealth flowing through ${faction.name} spilled into ${target.name}`,
    motivation: pickMotivation('trade_boom', rng),
    statDeltas: [{ factionId: target.id, stat: 'wealth', delta: 8 }],
  });
}
```

---

### Fix 1D: deriveConsequence — Culture threshold too high
**File:** `src/simulation/tick.ts`
**Problem:** `newValue > 65` means artifacts that give +culture to a faction starting
at 40–55 never trigger cultural spread. Fix: lower to 45, raise roll to 0.5.

**Current (line ~863):**
```ts
if (stat === 'culture' && delta.delta > 0 && newValue > 65 && rng.nextFloat() < 0.4) {
```
**Fix:**
```ts
if (stat === 'culture' && delta.delta > 0 && newValue > 45 && rng.nextFloat() < 0.5) {
```

---

## Priority 2 — Design Bugs (from collab-review)

### Fix 2A: seedEventKnowledge — Seeds wrong faction for multi-faction events
**File:** `src/simulation/tick.ts`
**Problem:** Always uses `event.subject`. For `cultural_spread`, the affected (disrupted)
faction is `event.object`. Those NPCs never get knowledge about their own disruption.
**Fix:** Route by action:
```ts
function getAffectedFactionId(event: GameEvent): string {
  switch (event.action) {
    case 'cultural_spread':
    case 'trade_boom':
    case 'military_buildup':
      return event.object;    // target faction is affected
    default:
      return event.subject;   // actor knows what they did
  }
}
// In seedEventKnowledge:
const affectedFactionId = getAffectedFactionId(event);
```
Also seed BOTH factions for bilateral events (alliance_formed, trade_boom):
- Both subject and object factions should have NPCs who know about it.

---

### Fix 2B: pendingNotification — Unsafe cast in StorytellerState
**File:** `src/types.ts` + `src/simulation/storyteller.ts`
**Problem:** `pendingNotification` is added via unsafe cast at storyteller.ts line 345.
**Fix:** Add to the interface and default:
```ts
// types.ts — StorytellerState
pendingNotification: string | null;

// types.ts — defaultStorytellerState
pendingNotification: null,

// storyteller.ts — FORCE_NOTIFICATION case — remove the cast:
world.storyteller.pendingNotification = `Rumors reach you...`;
```

---

### Fix 2C: Debt interventions — Shared counter can't enforce per-type limits
**File:** `src/types.ts` + `src/simulation/storyteller.ts`
**Problem:** One `debtInterventionsFired` counter. FORCE_NOTIFICATION can exhaust
the budget before SEED_KNOWLEDGE ever fires.
**Fix:** Replace single counter with three:
```ts
// types.ts — StorytellerState
seedKnowledgeFired: number;
placeWitnessFired: number;
forceNotificationFired: number;
// (remove debtInterventionsFired)

// storyteller.ts — fireDebtIntervention
const MAX = 3;
if (debt >= 70 && state.forceNotificationFired < MAX) {
  state.forceNotificationFired++;
  return { type: 'FORCE_NOTIFICATION', eventId: target.id };
}
if (debt >= 50 && state.placeWitnessFired < MAX) {
  state.placeWitnessFired++;
  return { type: 'PLACE_WITNESS', ... };
}
if (debt >= 30 && state.seedKnowledgeFired < MAX) {
  state.seedKnowledgeFired++;
  return { type: 'SEED_KNOWLEDGE', eventId: target.id };
}
```

---

## Priority 3 — Wiring (from HANDOFF next steps)

### Fix 3A: Wire pendingNotification to UI
**File:** `src/ui/App.tsx`
After `runSimulation` returns, check `world.storyteller.pendingNotification` and
dispatch it to the store's `notification` field. Clear it after display.
```ts
if (newWorld.storyteller.pendingNotification) {
  dispatch({ type: 'SET_NOTIFICATION', payload: newWorld.storyteller.pendingNotification });
  newWorld.storyteller.pendingNotification = null;
}
```

### Fix 3B: Wire gossip spotlight boost
**File:** `src/simulation/tick.ts` — `phaseGossip`
Replace hardcoded `0.3` probability with `getGossipBoost()`:
```ts
import { getGossipBoost } from './storyteller.ts';
// ...
const gossipProb = getGossipBoost(world.storyteller, npcA.factionId, year);
if (npcA.knowledge.length > 0 && rng.nextFloat() < gossipProb) {
```

---

## Priority 4 — Performance (low urgency for POC scale)

### Fix 4A: Pre-build event map for O(1) lookups
**File:** `src/simulation/storyteller.ts`
`computeTension` and `accumulateDebt` both call `world.events.find()` in hot paths.
Build a map once per tick in `runSimulation` and pass it to these functions:
```ts
// In runSimulation, before the year loop:
const eventMap = new Map(world.events.map(e => [e.id, e]));

// Pass to computeTension and accumulateDebt signatures
```
Low priority — only matters when `world.events` is large (1000+).

---

## Not Included (Gemini's scope / deferred)

- Fractal terrain, tectonic plates, moisture simulation → gem upgradesv1.txt
- Dynastic succession, ruler traits, interest groups → gem upgradesv1.txt
- 128×128 map scale → gem upgradesv1.txt
- Animated entities, painterly rendering → gem upgradesv1.txt
- Zustand migration → CONTEXT.md (deferred until perf felt)
- Tauri wrapper → Phase 3

---

## Implementation Order

```
1. Fix 1D (culture threshold)       — 2 lines, immediate win
2. Fix 2B (pendingNotification type) — 3 lines, unblocks 3A
3. Fix 1A (lookback window)          — 3 lines, correctness
4. Fix 1B (probability + spotlight)  — update both files
5. Fix 1C (alliance_formed/trade_boom) — 30 lines, core gameplay
6. Fix 2A (seedEventKnowledge routing) — 10 lines
7. Fix 2C (per-type debt counters)    — types.ts + storyteller.ts
8. Fix 3A (wire pendingNotification)  — App.tsx
9. Fix 3B (wire gossip boost)         — phaseGossip
10. Fix 4A (event map perf)           — low urgency
```

After step 5, the cascade chain should work end-to-end.
Run Task 003 (playtest SOP) after step 5 to verify before continuing.

---

## Acceptance Criteria

- [ ] Player gives artifact → 2-4 cascade events fire in the following 12 years
- [ ] Cascade events include at least one positive-outcome branch (alliance or trade)
- [ ] NPCs in recipient faction can discuss the cascade in dialogue
- [ ] KnowledgeLog populates after a player action
- [ ] pendingNotification appears in UI when FORCE_NOTIFICATION fires
- [ ] No TypeScript errors (`npm run build` clean)
