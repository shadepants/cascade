// ─── Dialogue Panel ─────────────────────────────────────────────────────
// Overlay that appears when the player bumps into an NPC.
// Shows the NPC's greeting and their knowledge of historical events.

import { useGame } from '../store.ts';
import {
  DIALOGUE, EXPANDED_DIALOGUE, fillTemplate,
  getAccuracyTier, generateEthicsComment,
  findKnowledgeChain, EVENT_ACTION_VOCAB,
  type AccuracyTier, type EventActionType,
} from '../data/templates.ts';
import type { GameEvent, KnowledgeEntry } from '../types.ts';
import { assembleNarrativeContext, buildSocraticPrompt } from '../simulation/narrative.ts';
import { getLLMConfig, fetchNarrative } from '../simulation/llm.ts';
import { SeededRNG } from '../utils/rng.ts';
import { useState, useEffect } from 'react';

/** Walk the causedBy chain to find how many links deep this event is. */
function getCausalDepth(event: GameEvent, allEvents: GameEvent[]): number {
  let depth = 0;
  let current: GameEvent | undefined = event;
  while (current?.causedBy) {
    depth++;
    current = allEvents.find(e => e.id === current!.causedBy);
    if (depth > 20) break;
  }
  return depth;
}

/** Describe an event using personality-specific action vocabulary. */
function describeEvent(
  event: GameEvent,
  personality: string,
  allFactions: { id: string; name: string }[],
): string {
  const actionVocab = EVENT_ACTION_VOCAB[event.action as EventActionType];
  if (!actionVocab) return event.description;
  const template = actionVocab[personality as keyof typeof actionVocab] ?? event.description;
  return fillTemplate(template, {
    subject: allFactions.find(f => f.id === event.subject)?.name ?? event.subject,
    object:  allFactions.find(f => f.id === event.object)?.name  ?? event.object,
  });
}

const TIER_LABEL: Record<AccuracyTier, string> = {
  certain: '●',   // solid — certain
  rumored: '◑',   // half — partial
  legend:  '○',   // empty — legend
};

const TIER_COLOR: Record<AccuracyTier, string> = {
  certain: '#4ade80',  // green
  rumored: '#facc15',  // yellow
  legend:  '#f87171',  // red
};

export function DialoguePanel() {
  const { state, dispatch } = useGame();
  const { activeNpc, world } = state;
  const [aiText, setAiText] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!activeNpc || !world) return;

    const config = getLLMConfig();
    if (config) {
      setIsTyping(true);
      const narrativeCtx = assembleNarrativeContext(activeNpc, world);
      const prompt = buildSocraticPrompt(narrativeCtx);

      fetchNarrative(prompt, config)
        .then(text => setAiText(text))
        .catch(err => {
          console.error('LLM Error:', err);
          setAiText(null);
        })
        .finally(() => setIsTyping(false));
    } else {
      setAiText(null);
      setIsTyping(false);
    }
  }, [activeNpc, world]);

  if (!activeNpc || !world) return null;

  const faction    = world.factions.find(f => f.id === activeNpc.factionId);
  const factionName = faction?.name ?? 'Unknown';

  // Deterministic RNG for phrase picks — consistent per NPC per year
  const rng = new SeededRNG(
    world.seed + world.currentYear + activeNpc.id.charCodeAt(0),
  );
  const pick = <T,>(arr: T[]): T => arr[rng.nextInt(arr.length)];

  // Greeting
  const greeting = fillTemplate(DIALOGUE.greeting[activeNpc.personality], {
    name:    activeNpc.name,
    faction: factionName,
  });

  // Resolve known events
  const knownEvents = activeNpc.knowledge
    .map(k => world.events.find(e => e.id === k.eventId))
    .filter((e): e is GameEvent => e != null);

  // Check for causal chain synthesis
  const chain = findKnowledgeChain(activeNpc.knowledge, world.events);

  // Build the displayed lines
  let eventLines: { text: string; event: GameEvent; tier: AccuracyTier }[];

  if (chain && chain.length >= 2) {
    const synthComment = chain.length >= 3
      ? `And it didn't stop there — ${describeEvent(chain[2], activeNpc.personality, world.factions)}.`
      : '';

    const template = EXPANDED_DIALOGUE.multiEventSynthesis[activeNpc.personality];
    const text = fillTemplate(template, {
      name:        activeNpc.name,
      faction:     factionName,
      event1:      describeEvent(chain[0], activeNpc.personality, world.factions),
      event2:      describeEvent(chain[1], activeNpc.personality, world.factions),
      synthComment,
    });

    // Use the accuracy of the first chain event for the tier indicator
    const rootKnowledge = activeNpc.knowledge.find(k => k.eventId === chain[0].id);
    const tier = getAccuracyTier(rootKnowledge?.accuracy ?? 0.5);

    // Represent the synthesis as pointing at the leaf event for "Remember this"
    eventLines = [{ text, event: chain[chain.length - 1], tier }];
  } else {
    eventLines = knownEvents.map(event => {
      const knowledge = activeNpc.knowledge.find(k => k.eventId === event.id)!;
      const tier      = getAccuracyTier(knowledge.accuracy);
      const template  = EXPANDED_DIALOGUE.eventKnowledge[tier][activeNpc.personality];

      const ethicsComment = faction?.ethics
        ? generateEthicsComment(event.action, faction.ethics, pick)
        : '';

      const text = fillTemplate(template, {
        name:          activeNpc.name,
        faction:       factionName,
        event:         describeEvent(event, activeNpc.personality, world.factions),
        year:          String(event.year),
        ethicsComment,
      });

      return { text, event, tier };
    });
  }

  function handleLearnEvent(event: GameEvent) {
    const entry: KnowledgeEntry = {
      eventId:           event.id,
      source:            activeNpc!.name,
      factionPerspective: factionName,
      text:              event.description,
      discoveredYear:    world!.currentYear,
    };

    dispatch({
      type: 'UPDATE_WORLD',
      updater: (w) => {
        const alreadyKnown = w.player.knowledgeLog.some(k => k.eventId === event.id);
        if (alreadyKnown) return w;
        return {
          ...w,
          player: {
            ...w.player,
            knowledgeLog: [...w.player.knowledgeLog, entry],
          },
        };
      },
    });

    if (event.playerCaused && event.causedBy !== null && world) {
      const depth = getCausalDepth(event, world.events);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        text: `Cascade! Your action rippled ${depth} link${depth !== 1 ? 's' : ''} into history.`,
      });
    }
  }

  return (
    <div className="panel dialogue-panel">
      <div className="panel-header">
        <span>{activeNpc.name} — {factionName}</span>
        <button onClick={() => dispatch({ type: 'CLOSE_DIALOGUE' })}>
          ✕
        </button>
      </div>

      {isTyping ? (
        <p className="dialogue-text" style={{ fontStyle: 'italic', color: '#adcbe3' }}>
          {activeNpc.name} is speaking...
        </p>
      ) : aiText ? (
        <div className="dialogue-text" style={{ whiteSpace: 'pre-wrap' }}>
          {aiText}
        </div>
      ) : (
        <p className="dialogue-text">{greeting}</p>
      )}

      {(!isTyping && eventLines.length > 0) && (
        <div className="dialogue-events">
          <h4>What they know:</h4>
          {eventLines.map(({ text, event, tier }, i) => (
            <div key={`${event.id}-${i}`} className="event-entry">
              <span
                className="accuracy-dot"
                title={`${tier} (${(activeNpc.knowledge.find(k => k.eventId === event.id)?.accuracy ?? 0).toFixed(2)})`}
                style={{ color: TIER_COLOR[tier], marginRight: '6px', fontSize: '0.9em' }}
              >
                {TIER_LABEL[tier]}
              </span>
              <span className="event-text">{text}</span>
              <button
                className="learn-btn"
                onClick={() => handleLearnEvent(event)}
              >
                Remember this
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="dialogue-hint">Press Escape to leave</p>
    </div>
  );
}
