import { useGameStore } from '../store/index';

export function GlobalLedger() {
  const world = useGameStore(s => s.world);
  const toggleLedger = useGameStore(s => s.toggleLedger);

  if (!world) return null;

  return (
    <div className="ledger-panel">
      <div className="panel-header">
        <span>The Oracle's Ledger</span>
        <button onClick={toggleLedger} aria-label="Close ledger">✕</button>
      </div>

      <div className="ledger-content">
        <section className="ledger-section">
          <h3>Factions of the World</h3>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Pop</th>
                <th>Mil</th>
                <th>Stab</th>
                <th>Wealth</th>
                <th>Cult</th>
                <th>Tech</th>
              </tr>
            </thead>
            <tbody>
              {world.factions.map(f => (
                <tr key={f.id}>
                  <td style={{ color: f.color }}>{f.name}</td>
                  <td>{f.population}</td>
                  <td>{f.military}</td>
                  <td>{f.stability}%</td>
                  <td>{f.wealth}</td>
                  <td>{f.culture}</td>
                  <td>{f.techLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ledger-section">
          <h3>Established Innovations</h3>
          {world.innovations.length === 0 ? (
            <p className="empty-hint">No innovations discovered yet.</p>
          ) : (
            <div className="innovation-grid">
              {world.innovations.map(i => {
                const origin = world.settlements.find(s => s.id === i.originSettlementId);
                return (
                  <div key={i.id} className="innovation-item">
                    <strong>{i.name}</strong>
                    <span>Origin: {origin?.name || 'Unknown'} (Year {i.originYear})</span>
                    <p>{i.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="ledger-section">
          <h3>Global Trade Networks</h3>
          {(!world.tradeRoutes || world.tradeRoutes.length === 0) ? (
            <p className="empty-hint">No active trade routes.</p>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Volume</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {world.tradeRoutes.map((route, idx) => {
                  const start = world.settlements.find(s => s.id === route.startSettlementId);
                  const end = world.settlements.find(s => s.id === route.endSettlementId);
                  return (
                    <tr key={idx}>
                      <td>{start?.name} ↔ {end?.name}</td>
                      <td>{route.active ? 'Active' : 'Dormant'}</td>
                      <td>{route.volume.toFixed(1)}</td>
                      <td>{((route.volume / 100) * 100).toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="ledger-section">
          <h3>Religions & Faith</h3>
          {world.religions.length === 0 ? (
            <p className="empty-hint">No religions have emerged.</p>
          ) : (
            <div className="religion-list">
              {world.religions.map(r => {
                const origin = world.settlements.find(s => s.id === r.originSettlementId);
                const founder = world.npcs.find(n => n.id === r.founderId);
                return (
                  <div key={r.id} className="religion-item" style={{ borderLeft: `4px solid ${r.color}` }}>
                    <strong>{r.name}</strong>
                    <span>Founded by {founder?.name || 'Unknown'} in {origin?.name}</span>
                    <div className="tenets">
                      {r.tenets.map(t => <span key={t} className="tenet-tag">{t}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="dialogue-hint">Press L to toggle ledger</div>
    </div>
  );
}
