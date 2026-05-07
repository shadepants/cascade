import type { Faction, FactionStatKey, StatDelta, WorldState } from '../../types.ts';

export function getFactionStat(faction: Faction, stat: FactionStatKey): number {
  switch (stat) {
    case 'population': return faction.population;
    case 'stability': return faction.stability;
    case 'wealth': return faction.wealth;
    case 'military': return faction.military;
    case 'culture': return faction.culture;
  }
}

function setFactionStat(faction: Faction, stat: FactionStatKey, value: number): void {
  switch (stat) {
    case 'population': faction.population = value; break;
    case 'stability': faction.stability = value; break;
    case 'wealth': faction.wealth = value; break;
    case 'military': faction.military = value; break;
    case 'culture': faction.culture = value; break;
  }
}

export function applyStatDeltas(world: WorldState, deltas: StatDelta[]): void {
  for (const d of deltas) {
    const faction = world.factions.find(f => f.id === d.factionId);
    if (!faction) continue;

    const cur = getFactionStat(faction, d.stat);
    const next = cur + d.delta;

    const [min, max] = d.stat === 'population' ? [0, 1000] : [0, 100];
    setFactionStat(faction, d.stat, Math.max(min, Math.min(max, next)));
  }
}
