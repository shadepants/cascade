// ─── Dialogue Panel ─────────────────────────────────────────────────────
// Overlay that appears when the player bumps into an NPC.
// Shows the NPC's greeting and their knowledge of historical events.

import { useGame } from '../store.ts';
import { DIALOGUE, fillTemplate } from '../data/templates.ts';
import type { GameEvent, KnowledgeEntry } from '../types.ts';

/** Walk the causedBy chain to find how many links deep this event is. */
function getCausalDepth(event: GameEvent, allEvents: GameEvent[]): number {
  let depth = 0;
  let current: GameEvent | undefined = event;
  while (current?.causedBy) {
    depth++;
    current = allEvents.find(e => e.id === current!.causedBy);
    if (depth > 20) break; // safety guard
  }
  return depth;
}

export function DialoguePanel() {
  const { state, dispatch } = useGame();
  const { activeNpc, world } = state;

  if (!activeNpc || !world) return null;

  const faction = world.factions.find(f => f.id === activeNpc.factionId);
  const factionName = faction?.name ?? 'Unknown';

  // Build greeting
  const greeting = fillTemplate(DIALOGUE.greeting[activeNpc.personality], {
    name: activeNpc.name,
    faction: factionName,
  });

  // Build event knowledge lines
  const knownEvents = activeNpc.knowledge
    .map(k => world.events.find(e => e.id === k.eventId))
    .filter((e): e is GameEvent => e != null);

  const eventLines = knownEvents.map(event =>
    fillTemplate(DIALOGUE.eventKnowledge[activeNpc.personality], {
      name: activeNpc.name,
      faction: factionName,
      event: event.description,
      year: String(event.year),
    }),
  );

  function handleLearnEvent(event: GameEvent) {
    const entry: KnowledgeEntry = {
      eventId: event.id,
      source: activeNpc!.name,
      factionPerspective: factionName,
      text: event.description,
      discoveredYear: world!.currentYear,
    };

    // Add to player's knowledge log (avoid duplicates)
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

    // Flash cascade notification when discovering a player-caused consequence
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

      <p className="dialogue-text">{greeting}</p>

      {eventLines.length > 0 && (
        <div className="dialogue-events">
          <h4>What they know:</h4>
          {knownEvents.map((event, i) => (
            <div key={event.id} className="event-entry">
              <p>{eventLines[i]}</p>
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
