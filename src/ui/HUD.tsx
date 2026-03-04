// ─── HUD (Heads-Up Display) ─────────────────────────────────────────────
// Top bar showing current year, player position, and action hints.
// Also renders the cascade discovery notification flash.

import { useGame } from '../store.ts';
import { MAX_ACTIONS_PER_ERA } from '../types.ts';

export function HUD() {
  const { state, dispatch } = useGame();
  const { world, notification, phase } = state;

  if (!world) return null;

  const actionsUsed = world.player.actionsThisEra.length;
  const actionsLeft = MAX_ACTIONS_PER_ERA - actionsUsed;

  const heldItem = world.items.find(
    item => item.position.x === world.player.position.x &&
            item.position.y === world.player.position.y
  );

  return (
    <div className="hud">
      <div className="hud-left">
        <span className="hud-year">Year {world.currentYear}</span>
        <span className="hud-pos">
          ({world.player.position.x}, {world.player.position.y})
        </span>
        <span style={{ color: actionsLeft === 0 ? "#f87171" : "#6b8fa3", fontSize: "0.8rem" }}>
          Act {actionsUsed}/{MAX_ACTIONS_PER_ERA}
        </span>
        {heldItem && (
          <span className="hud-item">★ {heldItem.name} [Enter to use]</span>
        )}
      </div>

      <div className="hud-center">
        {notification && (
          <span className="hud-notification">{notification}</span>
        )}
        {phase === 'jumping' && (
          <span className="hud-notification">Jumping forward in time...</span>
        )}
      </div>

      <div className="hud-right">
        {phase === 'exploring' && (
          <>
            <span className="hud-hint">
              ↑↓←→ move | Enter: use item | J: jump
              {state.previousWorld && ' | H: hold for history'}
            </span>
            <button
              className="hud-score-btn"
              onClick={() => dispatch({ type: 'SET_PHASE', phase: 'score' })}
            >
              Show Score
            </button>
          </>
        )}
        {phase === 'dialogue' && (
          <span className="hud-hint">Esc: close</span>
        )}
      </div>
    </div>
  );
}
