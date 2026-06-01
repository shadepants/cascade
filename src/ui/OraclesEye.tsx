import { useGameStore } from '../store/index';
import { useMemo } from 'react';

export function OraclesEye() {
  const world = useGameStore(s => s.world);
  const toggleOraclesEye = useGameStore(s => s.toggleOraclesEye);

  const playerEvents = useMemo(() => {
    if (!world) return [];
    return [...world.events]
      .filter(e => e.playerCaused)
      .sort((a, b) => b.year - a.year);
  }, [world]);

  const avgStability = useMemo(() => {
    if (!world || world.factions.length === 0) return 0;
    return world.factions.reduce((acc, f) => acc + f.stability, 0) / world.factions.length;
  }, [world]);

  const totalTradeVolume = useMemo(() => {
    if (!world || !world.tradeRoutes) return 0;
    return world.tradeRoutes.reduce((acc, r) => acc + (r.active ? r.volume : 0), 0);
  }, [world]);

  if (!world) return null;

  const st = world.storyteller;

  return (
    <div className="oracles-eye-panel glass-panel">
      <div className="panel-header">
        <span className="oracle-title">THE ORACLE'S EYE</span>
        <button className="close-btn" onClick={toggleOraclesEye}>✕</button>
      </div>

      <div className="oracle-layout">
        {/* Left: Narrative Pulse */}
        <div className="oracle-sidebar">
          <div className="stat-card">
            <label>NARRATIVE TENSION</label>
            <div className="tension-gauge">
              <div className="gauge-fill" style={{ width: `${st.tension}%`, background: st.tension > 70 ? '#f87171' : st.tension > 40 ? '#fbbf24' : '#60a5fa' }} />
              <span className="gauge-value">{st.tension}%</span>
            </div>
          </div>

          <div className="stat-card">
            <label>STORYTELLER MODE</label>
            <div className="mode-badge">{st.mode.toUpperCase()}</div>
            <p className="mode-desc">
              {st.mode === 'clio' && 'The Chronicler: Focuses on historical depth and rare, meaningful cascades.'}
              {st.mode === 'ares' && 'The Warlord: Accelerates conflict and military escalation.'}
              {st.mode === 'tyche' && 'The Chaotic: Unleashes unpredictable and frequent chain reactions.'}
            </p>
          </div>

          <div className="stat-card">
            <label>TEMPORAL DEBT</label>
            <div className="debt-meter">
              <div className="debt-fill" style={{ width: `${Math.min(100, (st.yearsSincePlayerDiscovery / 70) * 100)}%` }} />
              <span className="debt-value">{st.yearsSincePlayerDiscovery} Years</span>
            </div>
            <p className="hint">Thresholds: 30 (Seed), 50 (Witness), 70 (Voice)</p>
          </div>

          <div className="stat-card">
            <label>INTERVENTIONS</label>
            <div className="stat-value">{st.debtInterventionsFired} / 9</div>
          </div>
        </div>

        {/* Center: Temporal Echoes */}
        <div className="oracle-main">
          <h3>TEMPORAL ECHOES (CAUSAL HISTORY)</h3>
          <div className="echo-timeline">
            {playerEvents.length === 0 ? (
              <div className="empty-echo">No significant echoes detected in the causal stream.</div>
            ) : (
              playerEvents.map(event => (
                <div key={event.id} className="echo-item">
                  <div className="echo-meta">
                    <span className="echo-year">Year {event.year}</span>
                    <span className="echo-sig" style={{ opacity: event.significance / 10 }}>Sig: {event.significance}</span>
                  </div>
                  <div className="echo-content">
                    <p className="echo-desc">{event.description}</p>
                    {event.causedBy && (
                      <div className="echo-cause">
                        ↳ Triggered by: <span className="cause-link">{world.events.find(e => e.id === event.causedBy)?.description || 'Unknown event'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: World Insight */}
        <div className="oracle-sidebar right">
          <div className="stat-card highlight">
            <label>GLOBAL STABILITY</label>
            <div className="stat-value large">{avgStability.toFixed(1)}%</div>
          </div>

          <div className="stat-card">
            <label>TRADE SYNERGY</label>
            <div className="stat-value">{totalTradeVolume.toFixed(1)} Vol</div>
          </div>

          <div className="stat-card">
            <label>RECENT INNOVATIONS</label>
            <div className="innovation-mini-list">
              {world.innovations.slice(-3).reverse().map(i => (
                <div key={i.id} className="mini-item">
                  <strong>{i.name}</strong>
                  <span>Year {i.originYear}</span>
                </div>
              ))}
              {world.innovations.length === 0 && <div className="empty-hint">None</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="oracle-footer">
        <span>PRESS <kbd>O</kbd> TO CLOSE THE EYE</span>
      </div>
    </div>
  );
}
