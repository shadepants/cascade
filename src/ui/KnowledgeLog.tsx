// ─── Knowledge Log Sidebar ──────────────────────────────────────────────
// Shows everything the player has learned from NPCs.
// Displayed as a persistent sidebar next to the game canvas.

import { useGame } from '../store.ts';

export function KnowledgeLog() {
  const { state } = useGame();
  const { world } = state;

  if (!world) return null;

  const entries = world.player.knowledgeLog;

  return (
    <div className="panel knowledge-panel">
      <h3>Knowledge Log</h3>

      {entries.length === 0 ? (
        <p className="empty-hint">Talk to NPCs to learn about history.</p>
      ) : (
        <ul className="knowledge-list">
          {entries.map((entry) => (
            <li key={`${entry.eventId}-${entry.source}`}>
              <span className="knowledge-text">"{entry.text}"</span>
              <span className="knowledge-source">
                — {entry.source} ({entry.factionPerspective})
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="knowledge-footer">
        <span>{entries.length} fact{entries.length !== 1 ? 's' : ''} learned</span>
      </div>
    </div>
  );
}
