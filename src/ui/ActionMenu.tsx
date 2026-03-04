// ─── Action Menu ────────────────────────────────────────────────────────
// Overlay for player choices when interacting with an item.
// When the player gives an artifact to a faction, we:
//   1. Compute stat deltas based on item type + significance
//   2. Apply those deltas immediately to faction stats
//   3. Store them on the event (for cascade attribution)
//
// This connects the player's action to the simulation's cascade phase:
// the tick engine reads statDeltas to derive mechanically-legible consequences.

import { useGame } from '../store.ts';
import { createEvent } from '../world/events.ts';
import type { StatDelta } from '../types.ts';

export function ActionMenu() {
  const { state, dispatch } = useGame();
  const { activeItem, world } = state;

  if (!activeItem || !world) return null;

  const factions = world.factions;

  function handleGiveToFaction(factionId: string) {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) return;

    // Compute stat deltas from item type + significance.
    // These reflect what actually changes in the world when the player acts.
    const sig = activeItem!.significance;
    const deltas: StatDelta[] = (() => {
      switch (activeItem!.type) {
        case 'artifact':
          // Artifacts confer legitimacy and cultural weight
          return [
            { factionId, stat: 'culture'   as const, delta: Math.round(sig * 1.2) },
            { factionId, stat: 'stability' as const, delta: Math.round(sig * 0.8) },
          ];
        case 'letter':
          // Letters shift political relationships; can stabilise or destabilise
          return [
            { factionId, stat: 'stability' as const, delta: Math.round(sig * 1.0) },
            { factionId, stat: 'wealth'    as const, delta: Math.round(sig * 0.5) },
          ];
        case 'key':
          // Keys unlock military or political advantage
          return [
            { factionId, stat: 'military'  as const, delta: Math.round(sig * 1.0) },
            { factionId, stat: 'stability' as const, delta: -Math.round(sig * 0.3) },
          ];
      }
    })();

    const event = createEvent({
      tick: world!.currentYear,
      year: world!.currentYear,
      subject: 'player',
      action: `gave_${activeItem!.type}`,
      object: factionId,
      causedBy: null,
      significance: sig,
      playerCaused: true,
      description: `The Traveler gave the ${activeItem!.name} to ${faction.name}`,
      motivation: 'driven by the weight of choice',
      statDeltas: deltas,
    });

    dispatch({
      type: 'UPDATE_WORLD',
      updater: (w) => {
        // Apply stat changes to the faction immediately
        const updatedFactions = w.factions.map(f => {
          if (f.id !== factionId) return f;
          const updated = { ...f };
          for (const d of deltas) {
            const ranges: Record<string, [number, number]> = {
              population: [0, 1000], stability: [0, 100],
              wealth: [0, 100], military: [0, 100], culture: [0, 100],
            };
            const [min, max] = ranges[d.stat] ?? [0, 100];
            const cur = (updated as unknown as Record<string, number>)[d.stat] ?? 0;
            (updated as unknown as Record<string, number>)[d.stat] =
              Math.max(min, Math.min(max, cur + d.delta));
          }
          return updated;
        });

        return {
          ...w,
          factions: updatedFactions,
          events: [...w.events, event],
          items: w.items.filter(i => i.id !== activeItem!.id),
          player: {
            ...w.player,
            actionsThisEra: [...w.player.actionsThisEra, event.id],
          },
        };
      },
    });

    dispatch({ type: 'CLOSE_ACTION' });
  }

  return (
    <div className="panel action-panel">
      <div className="panel-header">
        <span>{activeItem.name}</span>
        <button onClick={() => dispatch({ type: 'CLOSE_ACTION' })}>
          ✕
        </button>
      </div>

      <p className="item-description">{activeItem.description}</p>

      <div className="action-choices">
        <h4>What do you do?</h4>
        {factions.map((faction) => (
          <button
            key={faction.id}
            className="action-btn"
            onClick={() => handleGiveToFaction(faction.id)}
            style={{ borderColor: faction.color }}
          >
            Give to {faction.name}
          </button>
        ))}
      </div>

      <p className="dialogue-hint">Press Escape to cancel</p>
    </div>
  );
}
