// ─── Cascade Score Screen ───────────────────────────────────────────────
// End-of-run display showing causal chains and total cascade score.
// The payoff moment — "look what your actions caused."

import { useGame } from '../store.ts';
import { calculateCascade, formatChainAsTree } from '../simulation/cascade.ts';

export function CascadeScore() {
  const { state, dispatch } = useGame();
  const { world } = state;

  if (!world) return null;

  const result = calculateCascade(world.events);

  return (
    <div className="panel score-panel">
      <h2>Cascade Score</h2>

      <div className="score-tier">
        <span className={`tier tier-${result.tier.toLowerCase()}`}>
          {result.tier}
        </span>
      </div>

      <div className="score-stats">
        <div className="stat">
          <span className="stat-value">{result.totalScore}</span>
          <span className="stat-label">Total Score</span>
        </div>
        <div className="stat">
          <span className="stat-value">{result.totalEvents}</span>
          <span className="stat-label">Events Caused</span>
        </div>
        <div className="stat">
          <span className="stat-value">{result.maxDepth}</span>
          <span className="stat-label">Max Depth</span>
        </div>
      </div>

      {result.chains.length > 0 ? (
        <div className="causal-chains">
          <h3>Your Causal Chains</h3>
          {result.chains.map((chain) => (
            <pre key={chain.rootEventId} className="chain-tree">
              {formatChainAsTree(chain, world.events)}
            </pre>
          ))}
        </div>
      ) : (
        <p className="no-chains">
          You made no significant choices this run.
          Try interacting with items and NPCs before jumping.
        </p>
      )}

      <button
        className="play-again-btn"
        onClick={() => dispatch({ type: 'RESET' })}
      >
        Play Again
      </button>
    </div>
  );
}
