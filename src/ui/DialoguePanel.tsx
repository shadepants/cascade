// ─── Dialogue Panel ─────────────────────────────────────────────────────
// Overlay that appears when the player bumps into an NPC.
// Shows the NPC's greeting and their knowledge of historical events.

import { useGameStore } from '../store/index';
import {
  EXPANDED_DIALOGUE, fillTemplate,
  getAccuracyTier, generateEthicsComment,
  findKnowledgeChain, EVENT_ACTION_VOCAB,
  type AccuracyTier, type EventActionType,
} from '../data/templates.ts';
import type { GameEvent, KnowledgeEntry, TemporalEcho } from '../types';
import { assembleNarrativeContext, buildInterrogationPrompt, synthesizeHistoryMonologue } from '../simulation/narrative.ts';
import { getLLMConfig, fetchNarrative } from '../simulation/llm.ts';
import { SeededRNG } from '../utils/rng.ts';
import { useState, useEffect } from 'react';
import { executeEcho } from '../engine/echoSystem.ts';

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
  const activeNpc = useGameStore(s => s.activeNpc);
  const world = useGameStore(s => s.world);
  const updateWorld = useGameStore(s => s.updateWorld);
  const closeDialogue = useGameStore(s => s.closeDialogue);
  const showNotification = useGameStore(s => s.showNotification);

  const [aiText, setAiText] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasInterrogated, setHasInterrogated] = useState(false);

  useEffect(() => {
    if (!activeNpc || !world) return;

    // Default to instant simulation synthesis
    const simText = synthesizeHistoryMonologue(activeNpc, world);
    setAiText(simText);
    setHasInterrogated(false);
    setIsTyping(false);
  }, [activeNpc, world]);

  const handleAskForDepth = async () => {
    if (!activeNpc || !world) return;
    const config = getLLMConfig();
    if (!config) {
      showNotification("LLM not configured. Check settings.");
      return;
    }

    setIsTyping(true);
    setHasInterrogated(true);
    const narrativeCtx = assembleNarrativeContext(activeNpc, world);
    const prompt = buildInterrogationPrompt(narrativeCtx);

    try {
      const depthText = await fetchNarrative(prompt, config);
      setAiText(prev => `${prev}\n\n[DEEP INTERROGATION]\n${depthText}`);
    } catch (err) {
      console.error('LLM Error:', err);
      showNotification("AI failed to respond. Check API key.");
    } finally {
      setIsTyping(false);
    }
  };

  if (!activeNpc || !world) return null;

  const faction    = world.factions.find(f => f.id === activeNpc.factionId);
  const factionName = faction?.name ?? 'Unknown';

  // Find the settlement where this NPC is located
  const settlement = world.settlements.find(s => s.npcs.includes(activeNpc.id));

  // Deterministic RNG for phrase picks — consistent per NPC per year
  const rng = new SeededRNG(
    world.seed + world.currentYear + activeNpc.id.charCodeAt(0),
  );
  const pick = <T,>(arr: T[]): T => arr[rng.nextInt(arr.length)];


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

  const gainInsight = useGameStore(s => s.gainInsight);

  function handleLearnEvent(event: GameEvent) {
    const entry: KnowledgeEntry = {
      eventId:           event.id,
      source:            activeNpc!.name,
      factionPerspective: factionName,
      text:              event.description,
      discoveredYear:    world!.currentYear,
    };

    const alreadyKnown = world!.player.knowledgeLog.some(k => k.eventId === event.id);

    if (!alreadyKnown) {
      gainInsight(5);
    }

    updateWorld((w) => {
      if (alreadyKnown) return w;
      return {
        ...w,
        player: {
          ...w.player,
          knowledgeLog: [...w.player.knowledgeLog, entry],
        },
      };
    });

    if (event.playerCaused && event.causedBy !== null && world) {
      const depth = getCausalDepth(event, world.events);
      showNotification(`Cascade! Your action rippled ${depth} link${depth !== 1 ? 's' : ''} into history.`);
    }
  }

  const setWorld = useGameStore(s => s.setWorld);

  function handleWhisper(topic: string) {
    if (!activeNpc || !world) return;
    if (world.player.insight < 10) {
      showNotification("Not enough Insight to whisper.");
      return;
    }

      try {
        const echo: TemporalEcho = {
          type: 'whisper',
          topic,
          targetId: activeNpc.id,
          cost: 10
        };
        const newWorld = executeEcho(world, echo);
        setWorld(newWorld);
        showNotification(`You whispered of ${topic} to ${activeNpc.name}.`);
      } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="panel dialogue-panel">
      <div className="panel-header">
        <span>{activeNpc.name} — {factionName}</span>
        <button onClick={closeDialogue} aria-label="Close dialogue panel">
          ✕
        </button>
      </div>

      <div className="dialogue-text-container" style={{ position: 'relative' }}>
        <div className="dialogue-text" style={{ whiteSpace: 'pre-wrap' }}>
          {aiText}
        </div>

        {isTyping && (
          <p className="dialogue-text" style={{ fontStyle: 'italic', color: '#4ade80', marginTop: '12px' }}>
            Interrogating the deeper simulation...
          </p>
        )}

        {!isTyping && !hasInterrogated && getLLMConfig() && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="depth-btn"
              onClick={handleAskForDepth}
              style={{ 
                background: 'rgba(74, 222, 128, 0.1)', 
                border: '1px solid #4ade80',
                color: '#4ade80',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85em',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              Ask for Depth (AI)
            </button>
            <span style={{ fontSize: '0.75em', color: '#666' }}>
              Requires LLM Config
            </span>
          </div>
        )}
      </div>

      {settlement && settlement.faith.length > 0 && (
        <div className="faith-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <span className="whisper-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>
            Faith at {settlement.name}
          </span>
          <div className="faith-bars" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...settlement.faith].sort((a, b) => b.pressure - a.pressure).map(f => {
              const rel = world.religions.find(r => r.id === f.religionId);
              return (
                <div key={f.religionId} className="faith-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75em', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rel?.name ?? 'Unknown'}
                  </span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', left: 0, top: 0, height: '100%', 
                      width: `${f.pressure}%`, 
                      background: rel?.color ?? '#888',
                      borderRadius: '3px',
                      boxShadow: f.religionId === settlement.dominantReligionId ? `0 0 4px ${rel?.color ?? '#888'}` : 'none'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.75em', color: '#888', width: '25px' }}>{Math.round(f.pressure)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="whisper-section"
 style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
        <span className="whisper-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>
          Whisper of...
        </span>
        <div className="whisper-btns" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['violence', 'expansion', 'trade', 'tradition', 'mercy'].map(topic => (
            <button
              key={topic}
              className="whisper-btn"
              onClick={() => handleWhisper(topic)}
              disabled={world.player.insight < 10}
              style={{ padding: '4px 10px', fontSize: '0.8em' }}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

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
