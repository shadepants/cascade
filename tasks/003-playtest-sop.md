# Task 003 — Playtest SOP

**Status:** Pending  
**Priority:** 3 (run after Tasks 001 and 002 are implemented)  
**Type:** Standard Operating Procedure — not a code feature

---

## Goal

A repeatable, console-driven procedure to verify the full cascade chain works end-to-end:
player gives artifact → statDeltas applied → cascade fires → NPCs learn it → player discovers it.

Run this after implementing Tasks 001 and 002, and after any tick.ts changes.

---

## Prerequisites

- Both Task 001 (templates) and Task 002 (storyteller) implemented
- Dev server running: `npm run dev`
- Browser DevTools open (F12) with Console tab visible

---

## Step 1: Open Browser Console and Load World State

```javascript
// Expose the game store globally (add this to App.tsx during playtesting, remove after):
// window.__CASCADE_STATE = state;

// Or use the existing React DevTools to inspect store state
```

**Expected:** You can see `world.factions`, `world.events`, `world.npcs`, `world.storyteller`.

---

## Step 2: Verify Initial Storyteller State

```javascript
// In console, inspect storyteller after world generates:
console.log(window.__CASCADE_STATE?.world?.storyteller);
```

**Pass criteria:**
- `tension` is between `tensionFloor` (5) and 30 at world start
- `narrativeDebt` is 0
- `spotlightFactionId` is null or a valid faction ID
- `mode` matches what was selected on TitleScreen

**If missing:** `world.storyteller` is undefined → check `src/store.ts` initialState.

---

## Step 3: Give an Artifact — Verify StatDeltas

1. Start a game. In the ActionMenu, give a high-significance artifact to a faction.
2. After the jump completes, in console:

```javascript
const state = window.__CASCADE_STATE;
const playerEvents = state.world.events.filter(e => e.playerCaused);
console.table(playerEvents.map(e => ({
  id: e.id,
  action: e.action,
  significance: e.significance,
  statDeltas: JSON.stringify(e.statDeltas),
})));
```

**Pass criteria:**
- At least 1 event has `playerCaused: true`
- That event has non-empty `statDeltas` array
- Delta values are non-zero

**If empty statDeltas:** Check `src/simulation/tick.ts` — phasePlayer or the action dispatch.

---

## Step 4: Verify Cascade Events Generated

```javascript
const state = window.__CASCADE_STATE;
const cascadeEvents = state.world.events.filter(e => e.causedBy);
console.log(`Cascade events: ${cascadeEvents.length}`);
console.table(cascadeEvents.map(e => ({
  id: e.id,
  action: e.action,
  causedBy: e.causedBy,
  significance: e.significance,
  year: e.year,
})));
```

**Pass criteria:**
- At least 1 event has `causedBy` pointing to a playerCaused event
- Cascade events have `playerCaused: true` (they inherit it)

**If no cascade events:**
- Check `CASCADE_SIGNIFICANCE_MIN` threshold (defined in tick.ts)
- Check that player events have `significance >= CASCADE_SIGNIFICANCE_MIN`
- The 40% cascade chance means you may need to jump multiple eras
- Try lowering `CASCADE_SIGNIFICANCE_MIN` temporarily for testing

---

## Step 5: Verify NPC Knowledge Seeding (Task 001 prerequisite fix)

```javascript
const state = window.__CASCADE_STATE;
const allKnowledge = state.world.npcs.flatMap(n => n.knowledge);
console.log(`Total NPC knowledge entries: ${allKnowledge.length}`);

// Check cascade event knowledge specifically
const cascadeIds = new Set(state.world.events.filter(e => e.causedBy).map(e => e.id));
const cascadeKnowledge = allKnowledge.filter(k => cascadeIds.has(k.eventId));
console.log(`Knowledge entries about cascade events: ${cascadeKnowledge.length}`);
```

**Pass criteria:**
- Total NPC knowledge entries > 0
- At least 1 knowledge entry references a cascade event (not just player-caused origin events)
- Accuracy values span the range 0.3–1.0 (not all the same)

**If all knowledge is empty:**
- `seedEventKnowledge()` in tick.ts is not being called
- Check the cascade → seed → gossip order in the year loop

---

## Step 6: Verify Gossip Spreading

Jump multiple eras (3+). Then:

```javascript
const state = window.__CASCADE_STATE;
const cascadeIds = new Set(state.world.events.filter(e => e.causedBy).map(e => e.id));
const knowledgePerNPC = state.world.npcs.map(n => ({
  npcId: n.id,
  name: n.name,
  cascadeKnowledgeCount: n.knowledge.filter(k => cascadeIds.has(k.eventId)).length,
  avgAccuracy: n.knowledge.length > 0
    ? (n.knowledge.reduce((s, k) => s + k.accuracy, 0) / n.knowledge.length).toFixed(2)
    : 'n/a',
}));
console.table(knowledgePerNPC.filter(r => r.cascadeKnowledgeCount > 0));
```

**Pass criteria:**
- Multiple NPCs know about cascade events (not just the 1 seeded witness)
- Accuracy degrades further from source NPCs (re-gossipped entries have accuracy < 0.9)

---

## Step 7: Verify Dialogue Tier Rendering (Task 001)

Click on an NPC who has cascade event knowledge. In the DialoguePanel:

**Pass criteria for Certain tier (accuracy > 0.8):**
> "I witnessed it myself — The Iron Confederacy saw open rebellion erupt — as strength demands."

**Pass criteria for Rumored tier (accuracy 0.5–0.8):**
> "Word has it that The Iron Confederacy (or someone nearby) suffered upheaval — for better or worse."

**Pass criteria for Legend tier (accuracy < 0.5):**
> "In the telling it has become: something that might be The Iron Confederacy collapsed — though records were lost."

**If all dialogue looks the same:** `buildTieredDialogue()` is not using accuracy. Check imports in DialoguePanel.tsx.

---

## Step 8: Verify Narrative Debt (Task 002)

Without clicking any NPCs for 3+ eras, check:

```javascript
const st = window.__CASCADE_STATE?.world?.storyteller;
console.log(`Narrative debt: ${st?.narrativeDebt}`);
console.log(`Spotlight: ${st?.spotlightFactionId}`);
console.log(`Tension: ${st?.tension}`);
```

**Pass criteria:**
- Debt increments each era you don't discover a player-caused cascade event
- At debt ≥ 3, a Wandering Chronicler appears in your settlement's NPC list
- At debt ≥ 5, `forceIntervention` flag triggers dialogue automatically

---

## Step 9: Verify Storyteller Mode Differences

Start three games with different modes. In each, jump 10 eras with the same artifact pattern.

**Clio mode:**
- Cascade events: few (≤ 2/era on average)
- NPC dialogue: more scholarly, longer time before any intervention

**Ares mode:**
- Cascade events: many (≤ 5/era), military events overrepresented
- Tension climbs fast; NPCs know about crises quickly

**Tyche mode:**
- Cascade events: variable; chaos — some years many, some none
- Ethics vocab is more extreme

---

## Regression Checklist (run after any tick.ts change)

- [ ] Build passes: `npm run build`
- [ ] Player-caused events have non-empty statDeltas
- [ ] Cascade events have `causedBy` linking back to player event
- [ ] Cascade events appear in NPC knowledge within 1 simulated year
- [ ] Gossip spreads cascade knowledge across NPCs over time
- [ ] Accuracy degrades on each gossip hop (each re-share × 0.9)
- [ ] DialoguePanel shows different text for accuracy > 0.8 vs < 0.5
- [ ] `world.storyteller.tension` changes across jumps
- [ ] Narrative debt increments and triggers intervention at threshold
- [ ] Mode selector on TitleScreen persists to `world.storyteller.mode`

---

## Failure Diagnosis Tree

```
Q: No cascade events in world.events?
  → Check CASCADE_SIGNIFICANCE_MIN vs player event significance
  → Check phaseCascade is called and 40% chance isn't always failing (try 5+ jumps)

Q: Cascade events exist but no NPC knowledge?
  → seedEventKnowledge() missing or not called in tick.ts

Q: NPC knowledge exists but dialogue is flat/identical?
  → buildTieredDialogue() not wired into DialoguePanel.tsx

Q: Dialogue varies but always "Rumored" tier?
  → seeded accuracy values are all in 0.5–0.8 range; check seedEventKnowledge accuracy logic

Q: Narrative debt stays at 0?
  → updateStorytellerDebt() not called in tick.ts, or discovery detection is wrong

Q: Storyteller state undefined?
  → defaultStorytellerState() not added to store.ts initialState
  → Check if world is being generated with a code path that bypasses store
```
