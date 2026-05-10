// ─── HUD (Heads-Up Display) ─────────────────────────────────────────────
// Top bar showing current year, player position, and action hints.
// Also renders the cascade discovery notification flash.

import { useGameStore } from '../store/index';
import { MAX_ACTIONS_PER_ERA } from '../types';

export function HUD() {
  const world = useGameStore(s => s.world);
  const notification = useGameStore(s => s.notification);
  const phase = useGameStore(s => s.phase);
  const config = useGameStore(s => s.config);
  const hasPreviousWorld = useGameStore(s => !!s.previousWorld);
  const setPhase = useGameStore(s => s.setPhase);

  if (!world) return null;

  // Era year: relative to when the player entered (pregenYears = year 0 of player time).
  // pregenYears = 500 → game starts at "Era Year 1", ends at "Era Year ~200".
  const eraYear = world.currentYear - config.pregenYears + 1;

  const actionsUsed = world.player.actionsThisEra.length;
  const actionsLeft = MAX_ACTIONS_PER_ERA - actionsUsed;

  const heldItem = world.items.find(
    item => item.position.x === world.player.position.x &&
            item.position.y === world.player.position.y
  );

  return (
    <div className="hud">
      <div className="hud-left">
        <span className="hud-year">Era Year {eraYear}</span>
        <span className="hud-pos">
          ({world.player.position.x}, {world.player.position.y})
        </span>
        <span style={{ color: actionsLeft === 0 ? "#f87171" : "#6b8fa3", fontSize: "0.8rem" }}>
          Act {actionsUsed}/{MAX_ACTIONS_PER_ERA}
        </span>
        <span className="hud-insight" title="Insight earned by narrative engagement">
          ✧ {world.player.insight} Insight
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
              ↑↓←→ move | Enter: use item | J: jump | Click tile: intervene
              {hasPreviousWorld && ' | H: hold for history'}
            </span>
            <button
              className="hud-score-btn"
              onClick={() => setPhase('score')}
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
