import { useGameStore } from '../store/index';
import { executeEcho } from '../engine/echoSystem.ts';

export function InterventionMenu() {
  const activeTile = useGameStore(s => s.activeTile);
  const world = useGameStore(s => s.world);
  const setWorld = useGameStore(s => s.setWorld);
  const closeIntervention = useGameStore(s => s.closeIntervention);
  const showNotification = useGameStore(s => s.showNotification);

  if (!activeTile || !world) return null;

  const holySite = world.holySites.find(hs => hs.position.x === activeTile.x && hs.position.y === activeTile.y);
  const settlement = world.settlements.find(s => s.position.x === activeTile.x && s.position.y === activeTile.y);

  const insight = world.player.insight;

  function handleIntervention(type: 'omen' | 'whisper' | 'bloom', cost: number) {
    try {
      const echo = {
        type,
        targetId: holySite?.id || settlement?.id || `${activeTile!.x},${activeTile!.y}`,
        cost,
        position: activeTile
      };

      const newWorld = executeEcho(world!, echo as any);
      
      // Add a visual effect
      newWorld.visuals.push({
        id: `fx-${Date.now()}`,
        type: 'sparkle',
        position: activeTile!,
        startTime: world!.currentYear,
        duration: 3,
        color: type === 'omen' ? '#facc15' : '#adcbe3'
      });

      setWorld(newWorld);
      showNotification(`${type.toUpperCase()} manifested at ${activeTile!.x}, ${activeTile!.y}`);
      closeIntervention();
    } catch (e: any) {
      showNotification(e.message);
    }
  }

  // Cost calculation (matching echoSystem.ts logic)
  const isHolySite = !!holySite;
  const omenCost = isHolySite ? 40 : 20; // 2x cost for Holy Sites

  return (
    <div className="intervention-panel">
      <div className="panel-header">
        <span>Coordinate {activeTile.x}, {activeTile.y}</span>
        <button onClick={closeIntervention} aria-label="Close intervention menu">✕</button>
      </div>

      <h2 className="intervention-title">Temporal Intervention</h2>
      <p className="intervention-subtitle">
        {isHolySite ? `Sacred grounds of ${holySite.name}` : settlement ? `Settlement of ${settlement.name}` : 'Wilderness tile'}
      </p>

      <div className="intervention-options">
        <button 
          className="intervention-btn"
          disabled={insight < omenCost}
          onClick={() => handleIntervention('omen', omenCost)}
        >
          <div>
            <strong>Sacred Omen</strong>
            <span className="desc">
              {isHolySite 
                ? "Double the reach and fervor of this Holy Site's faith." 
                : "Plant the seeds of a new prophecy in this land."}
            </span>
          </div>
          <span className="cost">{omenCost} ✨</span>
        </button>

        {settlement && (
          <button 
            className="intervention-btn"
            disabled={insight < 15}
            onClick={() => handleIntervention('bloom', 15)}
          >
            <div>
              <strong>Bloom</strong>
              <span className="desc">Accelerate growth and prosperity for a generation.</span>
            </div>
            <span className="cost">15 ✨</span>
          </button>
        )}

        <button 
          className="intervention-btn"
          disabled={insight < 10}
          onClick={() => handleIntervention('whisper', 10)}
        >
          <div>
            <strong>Whisper</strong>
            <span className="desc">Subtle guidance to shift local values.</span>
          </div>
          <span className="cost">10 ✨</span>
        </button>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="dialogue-hint" style={{ marginTop: 0 }}>Press Escape to cancel</p>
        <p className="dialogue-hint" style={{ marginTop: 0 }}>Insight Balance: {insight} ✨</p>
      </div>
    </div>
  );
}
