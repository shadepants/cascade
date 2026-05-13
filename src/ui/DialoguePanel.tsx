// ─── Dialogue Panel ─────────────────────────────────────────────────────
// Overlay that appears when the player bumps into an NPC.
// Shows the NPC's greeting and their knowledge of historical events.

import { useGameStore } from '../store/index';
import { useState, useEffect } from 'react';
import { executeEcho } from '../engine/echoSystem.ts';
import type { KnowledgeEntry, TemporalEcho } from '../types';
import {
  synthesizeHistoryMonologue,
  assembleNarrativeContext,
  buildInterrogationPrompt,
} from '../simulation/narrative.ts';
import { getLLMConfig, fetchNarrative } from '../simulation/llm.ts';

export function DialoguePanel() {
  const activeNpc = useGameStore(s => s.activeNpc);
  const world = useGameStore(s => s.world);
  const updateWorld = useGameStore(s => s.updateWorld);
  const closeDialogue = useGameStore(s => s.closeDialogue);
  const showNotification = useGameStore(s => s.showNotification);
  const gainInsight = useGameStore(s => s.gainInsight);
  const setWorld = useGameStore(s => s.setWorld);

  const [aiText, setAiText] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasInterrogated, setHasInterrogated] = useState(false);
  const [showLocalIntel, setShowLocalIntel] = useState(false);
  const [showWhisperMenu, setShowWhisperMenu] = useState(false);

  useEffect(() => {
    if (!activeNpc || !world) return;

    // Default to instant simulation synthesis
    const simText = synthesizeHistoryMonologue(activeNpc, world);
    setAiText(simText);
    setHasInterrogated(false);
    setIsTyping(false);
  }, [activeNpc, world]);

  if (!activeNpc || !world) return null;

  const faction = world.factions.find(f => f.id === activeNpc.factionId);
  const factionName = faction?.name ?? 'Unknown';
  const settlement = world.settlements.find(s => s.npcs.includes(activeNpc.id));

  // Spotlight Logic: Identify the single event that was mentioned in the monologue
  const loggedEventIds = new Set(world.player.knowledgeLog.map(k => k.eventId));
  const unseenKnowledge = activeNpc.knowledge
    .filter(k => !loggedEventIds.has(k.eventId))
    .sort((a, b) => {
      const eA = world.events.find(e => e.id === a.eventId);
      const eB = world.events.find(e => e.id === b.eventId);
      return ((eB?.significance ?? 0) * b.accuracy) - ((eA?.significance ?? 0) * a.accuracy);
    });

  const spotlightEvent = unseenKnowledge[0] 
    ? world.events.find(e => e.id === unseenKnowledge[0].eventId) 
    : null;

  function handleLearnEvent() {
    if (!spotlightEvent || !world) return;
    
    const entry: KnowledgeEntry = {
      eventId:           spotlightEvent.id,
      source:            activeNpc!.name,
      factionPerspective: factionName,
      text:              spotlightEvent.description,
      discoveredYear:    world!.currentYear,
    };

    gainInsight(5);

    updateWorld((w) => ({
      ...w,
      player: {
        ...w.player,
        knowledgeLog: [...w.player.knowledgeLog, entry],
      },
    }));

    showNotification(`Learned about ${spotlightEvent.action.replace('_', ' ')}. (+5 Insight)`);
  }

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
      setShowWhisperMenu(false);
    } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : String(e));
    }
  }

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

  return (
    <div className="panel dialogue-panel">
      <div className="panel-header">
        <span>{activeNpc.name} — {factionName}</span>
        <button onClick={closeDialogue} aria-label="Close dialogue panel">✕</button>
      </div>

      <div className="dialogue-text-container">
        <div className="dialogue-text" style={{ whiteSpace: 'pre-wrap', fontSize: '1.1em' }}>
          {aiText}
        </div>

        {isTyping && (
          <p className="dialogue-text" style={{ fontStyle: 'italic', color: '#4ade80', marginTop: '12px' }}>
            Interrogating the deeper simulation...
          </p>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {spotlightEvent && !isTyping && (
            <button 
              className="start-btn" 
              onClick={handleLearnEvent}
              style={{ padding: '8px 24px', fontSize: '14px', background: 'rgba(255, 204, 0, 0.1)' }}
            >
              Absorb Knowledge (+5 Insight)
            </button>
          )}

          {!isTyping && !hasInterrogated && getLLMConfig() && (
            <button className="depth-btn" onClick={handleAskForDepth}>
              Ask for Depth (AI)
            </button>
          )}
        </div>
      </div>

      <div className="collapsible-sections" style={{ marginTop: '24px' }}>
        {settlement && (
          <div className="intel-section" style={{ marginBottom: '12px' }}>
            <button 
              className="whisper-label" 
              onClick={() => setShowLocalIntel(!showLocalIntel)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {showLocalIntel ? '▼' : '▶'} Local Intel: {settlement.name}
            </button>
            {showLocalIntel && (
              <div className="faith-bars" style={{ marginTop: '12px', paddingLeft: '12px' }}>
                {[...settlement.faith].sort((a, b) => b.pressure - a.pressure).map(f => {
                  const rel = world.religions.find(r => r.id === f.religionId);
                  return (
                    <div key={f.religionId} className="faith-bar-container">
                      <span className="faith-label">{rel?.name ?? 'Unknown'}</span>
                      <div className="faith-bar-bg">
                        <div 
                          className="faith-bar-fill" 
                          style={{ width: `${f.pressure}%`, background: rel?.color ?? '#888' }} 
                        />
                      </div>
                      <span className="faith-percentage">{Math.round(f.pressure)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="whisper-section-new">
          <button 
            className="whisper-label" 
            onClick={() => setShowWhisperMenu(!showWhisperMenu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {showWhisperMenu ? '▼' : '▶'} Whisper...
          </button>
          {showWhisperMenu && (
            <div className="whisper-btns" style={{ marginTop: '12px', paddingLeft: '12px' }}>
              {['violence', 'expansion', 'trade', 'tradition', 'mercy'].map(topic => (
                <button
                  key={topic}
                  className="whisper-btn"
                  onClick={() => handleWhisper(topic)}
                  disabled={world.player.insight < 10}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="dialogue-hint">Press Escape to leave • {activeNpc.personality} personality</p>
    </div>
  );
}
