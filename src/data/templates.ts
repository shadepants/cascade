// ─── Dialogue Templates ─────────────────────────────────────────────────
// Template strings for NPC dialogue. Uses string interpolation, not LLM.
// Placeholders: {name}, {faction}, {event}, {year}, {ethicsComment}, etc.

import type { NPCPersonality, GameEvent, NPCKnowledge, FactionEthics } from '../types.ts';

// ─── Backward-Compatible Flat Templates ─────────────────────────────────

export interface DialogueTemplate {
  eventKnowledge: Record<NPCPersonality, string>;
  greeting: Record<NPCPersonality, string>;
  noKnowledge: string;
}

export const DIALOGUE: DialogueTemplate = {
  greeting: {
    loyal:
      '{name} straightens up. "You\'re not from around here. What do you want with {faction}?"',
    skeptic:
      '{name} eyes you warily. "Another traveler. I suppose you want something."',
    zealot:
      '{name} grabs your arm. "A stranger! Have you heard the truth about {faction}?"',
    pragmatist:
      '{name} nods. "Traveler. Information costs, but I\'m willing to trade."',
  },
  eventKnowledge: {
    loyal:
      '{name} leans in. "In the year {year}, {event}. {faction} was right to act — we had no choice."',
    skeptic:
      '{name} shrugs. "They say in {year}, {event}. But who knows what really happened?"',
    zealot:
      '{name}\'s eyes blaze. "Year {year}! {event}! It was destiny — {faction}\'s divine right!"',
    pragmatist:
      '{name} counts on their fingers. "Year {year}. {event}. The real question is who profited."',
  },
  noKnowledge:
    '{name} shakes their head. "I don\'t know anything about that. Try asking someone else."',
};

/** Fill in template placeholders. */
export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ─── Accuracy Tiers ──────────────────────────────────────────────────────

export type AccuracyTier = 'certain' | 'rumored' | 'legend';

export function getAccuracyTier(accuracy: number): AccuracyTier {
  if (accuracy > 0.8) return 'certain';
  if (accuracy >= 0.5) return 'rumored';
  return 'legend';
}

// ─── Expanded Tiered Dialogue Templates ─────────────────────────────────

export interface ExpandedDialogueTemplate {
  greeting: Record<NPCPersonality, string>;
  eventKnowledge: Record<AccuracyTier, Record<NPCPersonality, string>>;
  multiEventSynthesis: Record<NPCPersonality, string>;
  noKnowledge: string;
}

export const EXPANDED_DIALOGUE: ExpandedDialogueTemplate = {
  greeting: {
    loyal:
      '{name} straightens up. "You\'re not from around here. What do you want with {faction}?"',
    skeptic:
      '{name} eyes you warily. "Another traveler. I suppose you want something."',
    zealot:
      '{name} grabs your arm. "A stranger! Have you heard the truth about {faction}?"',
    pragmatist:
      '{name} nods. "Traveler. Information costs, but I\'m willing to trade."',
  },

  // ── Certain (accuracy > 0.8): first-hand, confident, specific ──
  eventKnowledge: {
    certain: {
      loyal:
        '{name} leans in, voice low and steady. "I was there in {year} when {event}. {faction} did what had to be done. {ethicsComment} You can doubt us, but you cannot doubt what I saw."',
      skeptic:
        '{name} folds their arms. "Year {year}. {event}. I saw it myself, so I can tell you the official story is mostly right — mostly. {ethicsComment} Make of that what you will."',
      zealot:
        '{name} seizes your collar, trembling. "In {year}, {event}! I was there — I SAW it! {ethicsComment} This was no accident. The fates chose {faction} for a reason!"',
      pragmatist:
        '{name} taps the table twice. "Year {year}. {event}. I have firsthand sources. {ethicsComment} The records are clear if you know where to look, and I do."',
    },

    // ── Rumored (accuracy 0.5–0.8): hedged, secondhand, partial ──
    rumored: {
      loyal:
        '{name} hesitates. "They say that around {year}, {event} — or something like it. I wasn\'t there myself, but someone I trust told me. {ethicsComment} Whatever happened, {faction} had good reason."',
      skeptic:
        '{name} scratches their chin. "There\'s a story going around about {year}. {event}, supposedly. {ethicsComment} But stories change with every telling, and this one has been told many times."',
      zealot:
        '{name} whispers urgently. "I heard — from someone who KNEW — that in {year}, {event}. {ethicsComment} The signs were all there. Not everyone could see them, but {faction}\'s faithful understood."',
      pragmatist:
        '{name} weighs their words. "Word is, around {year}, {event}. Secondhand, mind you. {ethicsComment} I wouldn\'t stake my purse on the details, but the broad strokes ring true."',
    },

    // ── Legend (accuracy < 0.5): mythologised, garbled, approximate ──
    legend: {
      loyal:
        '{name} squints, dredging up old memory. "Long ago — maybe {year}, maybe not — they say {event}. The old ones spoke of it with pride. {ethicsComment} Even if half of it is embellished, {faction}\'s honor in it was real."',
      skeptic:
        '{name} waves dismissively. "Oh, THAT story. Sometime around {year}, {event} — allegedly. {ethicsComment} I\'ve heard five versions and none of them agree. Believe it if it helps you sleep."',
      zealot:
        '{name}\'s eyes go distant. "The prophecy speaks of {year}... when {event}. {ethicsComment} The unbelievers say it\'s just a legend. But legends are the bones of truth! {faction}\'s destiny was written that day!"',
      pragmatist:
        '{name} shrugs. "Ancient history. Around {year}, so the story goes, {event}. {ethicsComment} Could be true, could be a tale that grew in the telling. I only deal in what I can verify, and this — I cannot."',
    },
  },

  // ── Multi-event synthesis: when NPC knows a causal chain ──
  multiEventSynthesis: {
    loyal:
      '{name} takes a deep breath. "Let me tell you how it really happened. First, {event1}. Because of that — and mark me, this is the important part — {event2}. {synthComment} {faction} weathered it all. We always do."',
    skeptic:
      '{name} counts on their fingers. "Alright, here\'s the chain as I understand it. {event1}. That led to {event2}. {synthComment} Convenient narrative, isn\'t it? Almost too neat. But that\'s the version going around."',
    zealot:
      '{name} paces, gesturing wildly. "Don\'t you SEE? {event1} — that was the spark! And then {event2}! {synthComment} It\'s all connected! {faction}\'s destiny unfolds like scripture!"',
    pragmatist:
      '{name} lays it out methodically. "Cause and effect. {event1}. Directly from that, {event2}. {synthComment} Follow the resources and the bodies, and the chain writes itself."',
  },

  noKnowledge:
    '{name} shakes their head slowly. "I don\'t know anything about that. Ask someone else — or try the traders. They hear things."',
};

// ─── Ethics Vocabulary Bank ──────────────────────────────────────────────
// Keys match FactionEthics fields: violence | expansion | trade | tradition | mercy
// Stances match EthicStance: embraced | neutral | shunned

export interface EthicsVocab {
  adjectives: string[];
  nouns: string[];
  framing: string[];
}

export type EthicStance = 'embraced' | 'neutral' | 'shunned';

export const ETHICS_VOCAB: Record<
  keyof FactionEthics,
  Record<EthicStance, EthicsVocab>
> = {
  violence: {
    embraced: {
      adjectives: ['iron-willed', 'battle-forged', 'unrelenting'],
      nouns: ['warriors', 'the iron tide', 'the blade-sworn'],
      framing: [
        'Strength is the only currency that matters.',
        'The weak invite conquest; we merely accept the invitation.',
        'Our enemies were given the choice to yield. They chose poorly.',
      ],
    },
    neutral: {
      adjectives: ['resolute', 'measured', 'firm'],
      nouns: ['defenders', 'the steadfast', 'our people'],
      framing: [
        'Violence is a tool, not a creed.',
        'We fight when we must, not because we wish to.',
        'War finds everyone eventually. We simply prepare.',
      ],
    },
    shunned: {
      adjectives: ['restrained', 'patient', 'long-suffering'],
      nouns: ['keepers of peace', 'the gentle hand', 'the unblooded'],
      framing: [
        'Every death diminishes us all.',
        'There is always another way, if you have the courage to find it.',
        'We remember what violence costs. Others forget too easily.',
      ],
    },
  },

  expansion: {
    embraced: {
      adjectives: ['ambitious', 'far-reaching', 'boundless'],
      nouns: ['pioneers', "the frontier's children", 'empire-builders'],
      framing: [
        'The land does not belong to those who merely sit upon it.',
        'Our borders are a promise, not a limit.',
        'Every horizon is an invitation.',
      ],
    },
    neutral: {
      adjectives: ['settled', 'rooted', 'established'],
      nouns: ['our homelands', 'the heartlands', 'the old territory'],
      framing: [
        'We hold what is ours. No more, no less.',
        'Growth should be earned, not seized.',
        'Our borders serve our people, not the other way around.',
      ],
    },
    shunned: {
      adjectives: ['contained', 'humble', 'inward-looking'],
      nouns: ['stewards', 'the bounded', 'keepers of the hearth'],
      framing: [
        'A nation that swells too large forgets its own name.',
        'We have enough. The hunger for more is a sickness.',
        'Let others chase the horizon. We tend what we have.',
      ],
    },
  },

  trade: {
    embraced: {
      adjectives: ['prosperous', 'well-connected', 'shrewd'],
      nouns: ['merchants', 'the trade-wise', "the market's children"],
      framing: [
        'Gold builds more bridges than swords.',
        'Our caravans go where armies cannot.',
        'Prosperity is the best argument for peace.',
      ],
    },
    neutral: {
      adjectives: ['self-sufficient', 'practical', 'fair-dealing'],
      nouns: ['our craftsfolk', 'working people', 'honest traders'],
      framing: [
        "Trade is useful, but we won't depend on outsiders.",
        "A fair deal is a fair deal. Nothing more complicated than that.",
        'We trade when it serves us.',
      ],
    },
    shunned: {
      adjectives: ['self-reliant', 'proud', 'unbought'],
      nouns: ['the independent', 'the uncorrupted', 'free folk'],
      framing: [
        'Foreign gold comes with foreign chains.',
        'We make what we need. We need what we make.',
        'Those who sell everything eventually sell themselves.',
      ],
    },
  },

  tradition: {
    embraced: {
      adjectives: ['ancient', 'venerable', 'hallowed'],
      nouns: ['the old guard', 'keepers of the way', 'the anointed'],
      framing: [
        'Our ancestors built this. We will not be the ones to tear it down.',
        'Tradition is not a chain — it is a foundation.',
        'The old ways endured for a reason.',
      ],
    },
    neutral: {
      adjectives: ['adaptable', 'balanced', 'moderate'],
      nouns: ['the reasonable', 'our council', 'the assembly'],
      framing: [
        'We respect the past without being enslaved by it.',
        'Wisdom is knowing which traditions to keep and which to release.',
        'Change and continuity must dance together.',
      ],
    },
    shunned: {
      adjectives: ['progressive', 'restless', 'reforming'],
      nouns: ['the new thinkers', 'the unshackled', 'the forward-looking'],
      framing: [
        'Tradition is the corpse of innovation.',
        'The world changes. Those who do not change with it become relics.',
        "Our grandparents' solutions will not solve our problems.",
      ],
    },
  },

  mercy: {
    embraced: {
      adjectives: ['compassionate', 'magnanimous', 'forgiving'],
      nouns: ['the merciful', 'the open-handed', 'healers'],
      framing: [
        'A conquered enemy can become a grateful ally. A dead one is just dead.',
        'Mercy is not weakness — it is the hardest kind of strength.',
        'We remember what it felt like to need mercy ourselves.',
      ],
    },
    neutral: {
      adjectives: ['pragmatic', 'calculating', 'judicious'],
      nouns: ['realists', 'the level-headed', 'our judges'],
      framing: [
        'Mercy when it serves us. Justice when it does not.',
        "Every case is different. Blanket mercy is as foolish as blanket cruelty.",
        'We weigh outcomes, not sentiments.',
      ],
    },
    shunned: {
      adjectives: ['ruthless', 'unflinching', 'iron-fisted'],
      nouns: ['the unforgiving', 'the hard-eyed', 'executors'],
      framing: [
        'Mercy is a luxury for those who have never been betrayed.',
        'Show mercy to a snake and it will bite your children.',
        'Our enemies made their choice. We made ours.',
      ],
    },
  },
};

// ─── Event Action Vocabulary ─────────────────────────────────────────────
// Per event action × personality. Replaces raw event.description in dialogue.

export type EventActionType =
  | 'suffered_famine'
  | 'population_growth'
  | 'trade_agreement'
  | 'alliance_formed'
  | 'peace_tribute'
  | 'peace_treaty'
  | 'declared_war'
  | 'conquered'
  | 'imperial_overstretch'
  | 'administrative_reform'
  | 'civil_war_fracture'
  | 'internal_rebellion'
  | 'cultural_spread'
  | 'military_buildup'
  | 'gave_artifact'
  | 'gave_letter'
  | 'gave_key';

export const EVENT_ACTION_VOCAB: Record<EventActionType, Record<NPCPersonality, string>> = {
  suffered_famine: {
    loyal:      '{subject} endured a terrible famine, but our people\'s spirit was unbroken',
    skeptic:    '{subject} starved — though you won\'t hear the leaders admit they saw it coming',
    zealot:     '{subject} was tested by hunger, a trial sent to purify the faithful',
    pragmatist: '{subject} lost a significant portion of its harvest stores — the numbers don\'t lie',
  },
  population_growth: {
    loyal:      '{subject}\'s people flourished — our lands reward the hardworking',
    skeptic:    '{subject}\'s population swelled — good for taxes, pressure on everything else',
    zealot:     '{subject} was blessed with abundance! The people multiply as a sign of favor!',
    pragmatist: '{subject}\'s population increased significantly — more workers, more soldiers, more mouths',
  },
  trade_agreement: {
    loyal:      '{subject} and {object} traded fairly, strengthening both peoples',
    skeptic:    '{subject} and {object} struck a deal — someone always gets the better end',
    zealot:     '{subject}\'s abundance flowed to {object}, proof of divine favor!',
    pragmatist: '{subject} and {object} exchanged goods at favorable rates — the ledgers balance',
  },
  alliance_formed: {
    loyal:      '{subject} and {object} stood together, united by shared purpose',
    skeptic:    '{subject} and {object} signed papers — alliances last until they don\'t',
    zealot:     '{subject} and {object} were bound by fate itself!',
    pragmatist: '{subject} and {object} formalized their alliance — mutual benefit, clearly calculated',
  },
  peace_tribute: {
    loyal:      '{object} bent the knee to {subject} and pays tribute — as is right',
    skeptic:    '{object} is paying tribute to {subject} now — "peace" with a price tag',
    zealot:     '{object} submitted before {subject}\'s divine authority!',
    pragmatist: '{object} agreed to tributary status under {subject} — cheaper than continued war',
  },
  peace_treaty: {
    loyal:      '{subject} and {object} agreed to peace — wisdom in accepting terms',
    skeptic:    '{subject} and {object} stopped fighting — for now. These truces have expiration dates',
    zealot:     'the heavens granted a respite between {subject} and {object}',
    pragmatist: '{subject} and {object} negotiated a ceasefire — both sides were bleeding too much to continue',
  },
  declared_war: {
    loyal:      '{subject} marched against {object}, answering grievances too long ignored',
    skeptic:    '{subject} picked a fight with {object} — the reasons given were... convenient',
    zealot:     '{subject} took up holy arms against {object}, as destiny demanded',
    pragmatist: '{subject} declared war on {object} — the military calculus finally tipped',
  },
  conquered: {
    loyal:      '{subject} claimed rightful territory from {object} through force of arms',
    skeptic:    '{subject} beat {object} in the field, for whatever that\'s worth',
    zealot:     '{subject} triumphed over {object} in glorious conquest!',
    pragmatist: '{subject} seized {object}\'s border provinces — strategically sound, if costly',
  },
  imperial_overstretch: {
    loyal:      '{subject} struggled under the weight of its vast dominion — a burden borne with honor',
    skeptic:    '{subject} grew too large to govern — surprise, surprise',
    zealot:     '{subject}\'s reach exceeds even the divine mandate — a test of faith!',
    pragmatist: '{subject}\'s administrative costs exceeded sustainable thresholds — overextension by the numbers',
  },
  administrative_reform: {
    loyal:      '{subject} reorganized its governance to serve the people better',
    skeptic:    '{subject} reshuffled its bureaucracy — same people, different desks',
    zealot:     '{subject} purified its institutions, casting out the corrupt!',
    pragmatist: '{subject} streamlined its administration — efficiency gains were measurable',
  },
  civil_war_fracture: {
    loyal:      'traitors within {subject} broke away, forming the {object}',
    skeptic:    '{subject} shattered — the {object} split off, and both sides claim to be the real authority',
    zealot:     'heretics in {subject} turned against the true path, spawning the wretched {object}',
    pragmatist: '{subject} fragmented into two. The {object} controls the frontier now — that\'s the fact that matters',
  },
  internal_rebellion: {
    loyal:      'malcontents within {subject} rose up — dealt with as traitors deserve',
    skeptic:    '{subject}\'s own people turned on their leaders — and who can blame them, honestly?',
    zealot:     'the faithless within {subject} dared to defy the righteous order!',
    pragmatist: '{subject} faced an internal uprising — stability costs were severe',
  },
  cultural_spread: {
    loyal:      '{subject}\'s way of life spread naturally into {object}\'s lands — who could resist our example?',
    skeptic:    '{subject}\'s culture crept into {object}\'s territory — "spread" and "impose" are close cousins',
    zealot:     '{subject}\'s truth illuminated the benighted people of {object}!',
    pragmatist: '{subject}\'s cultural exports displaced local traditions in {object} — soft power at work',
  },
  military_buildup: {
    loyal:      '{subject} strengthened its armies — a wise precaution with {object} at the border',
    skeptic:    '{subject} is arming up, and {object} is nervous — this usually ends one way',
    zealot:     '{subject} marshals the faithful for what is to come! {object} should tremble!',
    pragmatist: '{subject}\'s military expenditure alarmed {object} — an arms race in the making',
  },
  gave_artifact: {
    loyal:      'a traveler entrusted a powerful artifact to {object} — a sign of trust well placed',
    skeptic:    'some stranger handed {object} an old relic — and everyone acts like it changes everything',
    zealot:     'a sacred artifact was delivered to {object} by a mysterious traveler — surely a divine messenger!',
    pragmatist: 'an outsider gave {object} an artifact of considerable cultural significance — the political implications were immediate',
  },
  gave_letter: {
    loyal:      'a messenger brought intelligence to {object} — our leadership used it wisely',
    skeptic:    'someone slipped {object} a letter — and suddenly policy changed. Coincidence?',
    zealot:     'a letter of prophecy reached {object}, carried by one who walks between ages!',
    pragmatist: 'diplomatic correspondence reached {object} via an intermediary — the contents shifted the balance',
  },
  gave_key: {
    loyal:      'a key to a forgotten armory was given to {object} — our strength grew as it should',
    skeptic:    '{object} got their hands on some kind of military key — and now they\'re swaggering about',
    zealot:     'the key to power was placed in {object}\'s hands by a traveler from beyond time!',
    pragmatist: 'an access key with military applications was transferred to {object} — force projection increased accordingly',
  },
};

// ─── Ethics Comment Generation ───────────────────────────────────────────

/** Which ethic dimension is most relevant to each event type. */
const EVENT_ETHIC_RELEVANCE: Partial<Record<EventActionType, keyof FactionEthics>> = {
  suffered_famine:      'tradition',
  declared_war:         'violence',
  conquered:            'expansion',
  civil_war_fracture:   'tradition',
  cultural_spread:      'expansion',
  alliance_formed:      'trade',
  trade_agreement:      'trade',
  internal_rebellion:   'mercy',
  peace_tribute:        'mercy',
  peace_treaty:         'violence',
  military_buildup:     'violence',
  imperial_overstretch: 'expansion',
  administrative_reform:'tradition',
  population_growth:    'tradition',
  gave_artifact:        'tradition',
  gave_letter:          'trade',
  gave_key:             'violence',
};

/** Pick an ethics framing phrase for the given event action + faction ethics. */
export function generateEthicsComment(
  eventAction: string,
  factionEthics: FactionEthics,
  pick: (arr: string[]) => string,
): string {
  const ethicKey = EVENT_ETHIC_RELEVANCE[eventAction as EventActionType] ?? 'tradition';
  const stance = factionEthics[ethicKey];
  const vocab = ETHICS_VOCAB[ethicKey]?.[stance];
  if (!vocab || vocab.framing.length === 0) return '';
  return pick(vocab.framing);
}

// ─── Causal Chain Detection ──────────────────────────────────────────────

/**
 * If the NPC's knowledge contains events that form a causal chain (via causedBy),
 * returns the chain in order (root first), capped at 3 events. Returns null otherwise.
 */
export function findKnowledgeChain(
  knowledge: NPCKnowledge[],
  allEvents: GameEvent[],
): GameEvent[] | null {
  const knownIds = new Set(knowledge.map(k => k.eventId));
  const knownEvents = knowledge
    .map(k => allEvents.find(e => e.id === k.eventId))
    .filter((e): e is GameEvent => e != null);

  for (const event of knownEvents) {
    if (!event.causedBy || !knownIds.has(event.causedBy)) continue;

    // Found a child → build chain walking up to root
    const chain: GameEvent[] = [];
    let current: GameEvent | undefined = event;
    while (current) {
      chain.unshift(current);
      if (!current.causedBy) break;
      current = knownEvents.find(e => e.id === current!.causedBy);
    }

    // Extend chain one level down from the leaf
    const leaf = chain[chain.length - 1];
    const child = knownEvents.find(e => e.causedBy === leaf.id);
    if (child) chain.push(child);

    if (chain.length >= 2) return chain.slice(0, 3);
  }

  return null;
}
