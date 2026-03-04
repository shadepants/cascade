// ─── Action Menu ────────────────────────────────────────────────────────
// Overlay for player choices when interacting with an item.
// POC: give artifact to faction, free prisoner, deliver letter.

import { useGame } from '../store.ts';
import { createEvent } from '../world/events.ts';

export function ActionMenu() {
  const { state, dispatch } = useGame();
  const { activeItem, world } = state;

  if (!activeItem || !world) return null;

  const factions = world.factions;

  function handleGiveToFaction(factionId: string) {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) return;

    // Create a player-caused event
    const event = createEvent({
      tick: world!.currentYear,
      year: world!.currentYear,
      subject: 'player',
      action: `gave_${activeItem!.type}`,
      object: factionId,
      causedBy: null,
      significance: activeItem!.significance,
      playerCaused: true,
      description: `The Traveler gave the ${activeItem!.name} to ${faction.name}`,
    });

    // Record event, remove item from world map, track player action
    dispatch({
      type: 'UPDATE_WORLD',
      updater: (w) => ({
        ...w,
        events: [...w.events, event],
        items: w.items.filter(i => i.id !== activeItem!.id),
        player: {
          ...w.player,
          actionsThisEra: [...w.player.actionsThisEra, event.id],
        },
      }),
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
