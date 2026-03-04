# Task 001 — Accuracy-Tiered NPC Dialogue Templates

**Status:** Pending  
**Priority:** 1 (implement first — no dependencies)  
**Estimated scope:** ~200 lines across 3 files

---

## Goal

Replace the 8 flat dialogue strings in `src/data/templates.ts` with a tier-stratified system
(certain / rumored / legend) that varies vocabulary by NPC personality and ethics stance.
Also add per-event-type action phrasing so dialogue feels grounded in what actually happened.

---

## Current State

```
src/data/templates.ts  — 8 strings: 4 personalities × 2 types
src/ui/DialoguePanel.tsx — picks a template, slots in event data
```

NPCs all speak in the same register regardless of how well they actually know the event.
`NPCKnowledge.accuracy` (0–1) exists on every knowledge entry but is ignored at render time.

---

## Desired State

- 3 accuracy tiers gate vocabulary and commitment:
  - **Certain** (accuracy > 0.8): direct assertions, specific names, definite blame
  - **Rumored** (accuracy 0.5–0.8): hedged language, partial names, attributed to sources
  - **Legend** (accuracy < 0.5): mythologised, distorted, named wrong but feels real
- 5 ethics stances × 3 positions (hawk/neutral/dove) produce 15 vocabulary banks
- 4 personalities × 6 event types × 3 tiers = 72+ distinct action phrasings
- DialoguePanel selects tier based on the speaking NPC's `accuracy` for the event

---

## Implementation Steps

### Step 1 — Expand `src/data/templates.ts`

Add after existing exports:

```typescript
// ─── Accuracy Tiers ───────────────────────────────────────────────────────

export type AccuracyTier = 'certain' | 'rumored' | 'legend';

export function getAccuracyTier(accuracy: number): AccuracyTier {
  if (accuracy > 0.8) return 'certain';
  if (accuracy > 0.5) return 'rumored';
  return 'legend';
}

// Tier preambles — prepended to any statement to signal epistemic confidence
export const TIER_PREAMBLE: Record<AccuracyTier, string[]> = {
  certain: [
    'I witnessed it myself —',
    'There is no question:',
    'I can tell you plainly:',
  ],
  rumored: [
    'Word has it that',
    'They say, though I cannot swear it,',
    'A traveller told me —',
    'Rumour reaches us that',
  ],
  legend: [
    'The old stories claim',
    'Some say — though the tale has grown strange —',
    'It is whispered, though the truth is lost:',
    'In the telling it has become:',
  ],
};
```

### Step 2 — Add Ethics Vocabulary Banks

```typescript
// ─── Ethics Vocabulary ────────────────────────────────────────────────────
// FactionEthics stances: hawk | neutral | dove (derived from faction.ethics)

type EthicsStance = 'hawk' | 'neutral' | 'dove';

export const ETHICS_VOCAB: Record<
  string,                       // ethics key (e.g. 'militaristic', 'mercantile')
  Record<EthicsStance, { adjectives: string[]; nouns: string[]; framing: string[] }>
> = {
  militaristic: {
    hawk:    { adjectives: ['decisive', 'necessary', 'glorious'],    nouns: ['victory', 'conquest', 'discipline'],  framing: ['as strength demands', 'to secure the frontier'] },
    neutral: { adjectives: ['costly', 'inconclusive', 'prolonged'],  nouns: ['campaign', 'conflict', 'skirmish'],   framing: ['as war tends to go', 'for better or worse'] },
    dove:    { adjectives: ['ruinous', 'senseless', 'avoidable'],    nouns: ['bloodshed', 'carnage', 'folly'],      framing: ['at great cost', 'to everyone\'s grief'] },
  },
  mercantile: {
    hawk:    { adjectives: ['profitable', 'strategic', 'shrewd'],    nouns: ['opportunity', 'leverage', 'gain'],   framing: ['at the right price', 'as trade dictates'] },
    neutral: { adjectives: ['transactional', 'measured', 'fair'],    nouns: ['exchange', 'arrangement', 'deal'],   framing: ['as agreed', 'on terms both sides accepted'] },
    dove:    { adjectives: ['exploitative', 'unjust', 'extractive'], nouns: ['debt', 'dependency', 'tribute'],     framing: ['at their expense', 'to line wealthy pockets'] },
  },
  agrarian: {
    hawk:    { adjectives: ['fertile', 'righteous', 'earned'],       nouns: ['harvest', 'stewardship', 'bounty'],  framing: ['as the land demands', 'as seasons teach'] },
    neutral: { adjectives: ['steady', 'slow', 'seasonal'],           nouns: ['yield', 'toil', 'cycle'],            framing: ['as always', 'year after year'] },
    dove:    { adjectives: ['scarce', 'stolen', 'desperate'],        nouns: ['famine', 'loss', 'desperation'],     framing: ['when the fields fail', 'in lean years'] },
  },
  scholarly: {
    hawk:    { adjectives: ['proven', 'documented', 'undeniable'],   nouns: ['record', 'evidence', 'precedent'],  framing: ['as the texts confirm', 'by all accounts'] },
    neutral: { adjectives: ['debated', 'complex', 'uncertain'],      nouns: ['account', 'interpretation', 'view'], framing: ['depending on the source', 'as scholars argue'] },
    dove:    { adjectives: ['forgotten', 'suppressed', 'distorted'], nouns: ['erasure', 'revision', 'silence'],   framing: ['though records were lost', 'if truth be told'] },
  },
  nomadic: {
    hawk:    { adjectives: ['swift', 'bold', 'mobile'],              nouns: ['raid', 'movement', 'freedom'],      framing: ['as the wind moves', 'without warning'] },
    neutral: { adjectives: ['passing', 'temporary', 'shifting'],     nouns: ['camp', 'route', 'season'],          framing: ['as we move through', 'in passing'] },
    dove:    { adjectives: ['displaced', 'scattered', 'driven'],     nouns: ['exile', 'wandering', 'loss'],       framing: ['far from home', 'without roots'] },
  },
};
```

### Step 3 — Add Event Action Phrasing

```typescript
// ─── Event Action Vocabulary ──────────────────────────────────────────────
// Per personality × event type action phrasing (present tense description)

export const EVENT_ACTION_VOCAB: Record<
  string,   // personality
  Record<string, string[]>  // eventType → phrasings
> = {
  scholarly: {
    internal_rebellion: ['records a collapse of internal order in', 'notes civil fracture within'],
    cultural_spread:    ['documents cultural diffusion from', 'chronicles the spread of ideas out of'],
    military_buildup:   ['observes force concentration in', 'notes militarisation of'],
    trade_disruption:   ['records commercial collapse between', 'documents loss of exchange routes through'],
    famine:             ['records famine conditions across', 'documents subsistence failure in'],
    war_declaration:    ['records a declaration of hostilities between', 'documents the outbreak of war across'],
  },
  warrior: {
    internal_rebellion: ['saw blood spilled inside', 'heard the swords drawn within'],
    cultural_spread:    ['watched foreign ways creep into', 'saw their customs pushed on'],
    military_buildup:   ['saw banners raised and blades sharpened in', 'watched armies mass near'],
    trade_disruption:   ['saw the trade roads close to', 'watched merchants flee from'],
    famine:             ['saw people starve in', 'watched hunger hollow out'],
    war_declaration:    ['heard the war-horns sound against', 'saw armies march on'],
  },
  merchant: {
    internal_rebellion: ['lost contracts when disorder took', 'watched profits vanish inside'],
    cultural_spread:    ['saw new buyers emerge from', 'found new markets opening in'],
    military_buildup:   ['saw tariffs rise and caravans turn back from', 'watched the roads close near'],
    trade_disruption:   ['lost shipments when the routes through', 'saw the markets dry up in'],
    famine:             ['watched prices spiral when hunger hit', 'lost grain contracts when famine struck'],
    war_declaration:    ['closed my accounts when war came to', 'lost everything when fighting broke between'],
  },
  elder: {
    internal_rebellion: ['lived to see collapse come again to', 'remember when peace gave way in'],
    cultural_spread:    ['saw the young abandon old ways in', 'watched traditions fade from'],
    military_buildup:   ['smell the old trouble rising in', 'have seen this gathering before in'],
    trade_disruption:   ['remember when the roads still led through', 'watched the silence take the markets of'],
    famine:             ['have seen hunger like this before in', 'remember the last time the fields failed in'],
    war_declaration:    ['have buried enough of the young to know what comes when', 'wept when war returned to'],
  },
};
```

### Step 4 — Update `src/ui/DialoguePanel.tsx`

Add a helper that assembles a full NPC statement:

```typescript
import {
  getAccuracyTier,
  TIER_PREAMBLE,
  ETHICS_VOCAB,
  EVENT_ACTION_VOCAB,
} from '../data/templates.ts';

function buildTieredDialogue(
  npc: NPC,
  event: GameEvent,
  accuracy: number,
  rng: SeededRNG,
): string {
  const tier = getAccuracyTier(accuracy);

  // Pick preamble
  const preambles = TIER_PREAMBLE[tier];
  const preamble = preambles[Math.floor(rng.nextFloat() * preambles.length)];

  // Pick action phrasing for personality × event type
  const personalityKey = npc.personality ?? 'elder';
  const eventVocab = EVENT_ACTION_VOCAB[personalityKey]?.[event.action] ?? [];
  const actionPhrase = eventVocab.length > 0
    ? eventVocab[Math.floor(rng.nextFloat() * eventVocab.length)]
    : `heard something happened in`;

  // Pick ethics framing
  const ethicsKey = npc.ethics ?? 'agrarian';
  const ethicsStance: EthicsStance = npc.ethicsStance ?? 'neutral';
  const ethicsBank = ETHICS_VOCAB[ethicsKey]?.[ethicsStance];
  const framing = ethicsBank
    ? ethicsBank.framing[Math.floor(rng.nextFloat() * ethicsBank.framing.length)]
    : '';

  // Assemble
  const subjectName = tier === 'legend'
    ? (event.subject + ' (or someone like them)')
    : event.subject;

  return `${preamble} ${subjectName} ${actionPhrase} ${event.object} — ${framing}.`;
}
```

Then in the render: replace the existing template lookup with `buildTieredDialogue(npc, event, knowledge.accuracy, rng)`.

### Step 5 — Prerequisite: Fix Knowledge Seeding Bug

**This must happen first.** Currently cascade events are never seeded into any NPC's
knowledge, so gossip has nothing to spread. The fix is in tick.ts:

1. After `phaseCascade()` runs, seed cascade events into NPCs in or near affected factions:

```typescript
// Seed cascade events into witness NPCs (same settlement as affected faction capital)
function seedEventKnowledge(
  world: WorldState,
  events: GameEvent[],
  year: number,
  rng: SeededRNG,
): void {
  for (const event of events) {
    const affectedFactionId = event.subject;
    // Find NPCs in settlements of the affected faction
    const affectedSettlements = world.settlements.filter(s => s.factionId === affectedFactionId);
    for (const settlement of affectedSettlements) {
      const settlementNpcs = world.npcs.filter(n => settlement.npcs.includes(n.id) && n.alive);
      for (const npc of settlementNpcs) {
        if (!npc.knowledge.some(k => k.eventId === event.id)) {
          // Witnesses know it well; bystanders have degraded accuracy
          const baseAccuracy = rng.nextFloat() < 0.3 ? 1.0 : 0.7 + rng.nextFloat() * 0.2;
          npc.knowledge.push({
            eventId:        event.id,
            discoveredYear: year,
            accuracy:       baseAccuracy,
            sourceId:       npc.id,
          });
        }
      }
    }
  }
}
```

2. Reorder the phase loop so cascade runs before gossip can spread it:

```typescript
// BEFORE (buggy):
const gos  = phaseGossip(world, year, rng);
const cas  = phaseCascade(world, [...eco, ...econ, ...pol, ...con, ...stab, ...gos], year, rng);

// AFTER (fixed):
const cas  = phaseCascade(world, [...eco, ...econ, ...pol, ...con, ...stab], year, rng);
seedEventKnowledge(world, cas, year, rng);
const gos  = phaseGossip(world, year, rng);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/data/templates.ts` | Add AccuracyTier, TIER_PREAMBLE, ETHICS_VOCAB, EVENT_ACTION_VOCAB |
| `src/ui/DialoguePanel.tsx` | Import new vocab, add `buildTieredDialogue()`, use in render |
| `src/simulation/tick.ts` | Add `seedEventKnowledge()`, reorder cascade → seed → gossip |

---

## Acceptance Criteria

- [ ] Cascade events appear in NPC knowledge arrays in the same year they fire
- [ ] NPC dialogue shows different registers for accuracy > 0.8 vs < 0.5
- [ ] Ethics framing differs between hawkish and dovish NPCs for the same event
- [ ] Scholarly NPCs use different action phrasings than Warrior NPCs for the same event type
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Build passes (`npm run build`)
