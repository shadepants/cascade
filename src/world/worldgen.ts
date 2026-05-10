// ─── World Generation Orchestrator ──────────────────────────────────────
// Builds a complete WorldState. Pipeline:
//   1. Terrain
//   2. Factions + territory + settlements
//   3. Historical figures (rulers)
//   4. NPCs + items
//   5. Pre-history simulation (real tick engine, not templates)
//   6. Assign NPC knowledge from pre-history events
//   7. Player start
//
// DF insight: pre-history IS the simulation. We run the actual tick engine
// for pregenYears so the world has mechanically-derived history when the
// player arrives — not hand-authored templates.

import type {
  WorldState, WorldConfig, Position, HistoricalFigure, Faction, RulerTrait, ResourceNode, GameMap, NPC, GameEvent,
  Religion, HolySite, Settlement,
} from '../types';
import { generateTerrain } from './terrain.ts';
import { generateFactions } from './factions.ts';
import { generateNPCs, createPlayer, generateItems } from './entities.ts';
import { resetEventIds } from './events.ts';
import { runSimulation } from '../simulation/tick.ts';
import { defaultStorytellerState } from '../types';
import { NPC_NAMES } from '../data/names.ts';
import { SeededRNG } from '../utils/rng.ts';

/** Generate a complete world from a config. Pure function (stateless). */
export function generateWorld(config: WorldConfig): WorldState {
  const seed = config.seed || Date.now();

  resetEventIds();
  const rng = new SeededRNG(seed + 9000);

  // ── Step 1: Terrain ────────────────────────────────────────────────────
  const map = generateTerrain(seed, config.mapSize);

  // ── Step 1.5: Strategic Resources ──────────────────────────────────────
  const resourceNodes = generateResourceNodes(map, rng);

  // ── Step 2: Factions + territory + settlements ─────────────────────────
  const { factions, relationships, settlements } =
    generateFactions(map, config.numFactions, seed);

  // ── Step 3: Historical figures — one ruler per faction ─────────────────
  const historicalFigures = spawnRulers(factions, seed, rng);

  // Assign rulers to their factions
  for (const hf of historicalFigures) {
    const faction = factions.find(f => f.id === hf.factionId);
    if (faction) faction.leaderId = hf.id;
  }

  // ── Step 4: NPCs ──────────────────────────────────────────────────────
  const npcs = generateNPCs(settlements, factions, config.npcsPerSettlement, map, seed);
  const npcPositions = npcs.map(n => n.position);

  // ── Step 4.5: Religions + Holy Sites ───────────────────────────────────
  const religions = generateReligions(factions, settlements, rng);
  const holySites = spawnHolySites(religions, settlements, map, rng);

  // ── Step 5: Pre-history simulation ────────────────────────────────────
  // Build an initial world stub and run the real tick engine.
  // currentYear starts at 0; simulation advances it to pregenYears.
  const startPos = findPlayerStart(map, config.mapSize);
  const player = createPlayer(startPos);

  const worldStub: WorldState = {
    seed,
    currentYear: 0,
    map,
    factions,
    relationships,
    historicalFigures,
    settlements,
    ruins: [],
    resourceNodes,
    npcs,
    items: [],
    tradeRoutes: [],
    religions,
    holySites,
    events: [],
    visuals: [],
    player,
    storyteller: defaultStorytellerState(config.storytellerMode ?? 'clio'),
  };

  // Run the pre-history simulation — this is what makes history real.
  // Events are world-state-driven, not templates.
  console.log(`[WORLDGEN] Running ${config.pregenYears}-year deep history simulation (headless)...`);
  runSimulation(worldStub, config.pregenYears, true);
  console.log(`[WORLDGEN] Deep history complete. ${worldStub.events.length} events generated.`);

  // ── Step 5.5: Seed items into settlements and ruins ───────────────────
  const items = generateItems(settlements, worldStub.ruins, map, npcPositions, seed);
  worldStub.items = items;
  console.log(`[WORLDGEN] Seeded ${items.length} items across the world.`);
  console.log(`[WORLDGEN] Faction states: ${worldStub.factions.map(f => `${f.name}(pop:${f.population} mil:${f.military} stab:${f.stability} wealth:${f.wealth})`).join(', ')}`);

  // ── Step 6: Assign NPC knowledge from pre-history ──────────────────────
  assignKnowledgeToNPCs(npcs, worldStub.events);
  console.log(`[WORLDGEN] Assigned pre-history knowledge to ${npcs.length} NPCs.`);

  return worldStub;
}

/** Spawn strategic resource nodes across the map. */
function generateResourceNodes(map: GameMap, rng: SeededRNG): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  const types: ResourceNode['type'][] = ['iron', 'gold', 'relic'];
  const count = Math.floor((map.width * map.height) / 400); // density scaling

  for (let i = 0; i < count; i++) {
    const x = rng.nextInt(map.width);
    const y = rng.nextInt(map.height);
    const tile = map.tiles[y][x];
    
    if (tile.walkable && tile.biome !== 'ocean' && tile.biome !== 'coast') {
      const type = types[rng.nextInt(types.length)];
      nodes.push({
        id: `node_${i}`,
        type,
        position: { x, y },
        value: 40 + rng.nextInt(60),
      });
    }
  }
  return nodes;
}

// ─── Historical Figure Generation ────────────────────────────────────────

/** Spawn one ruler per faction. Rulers' personality values modulate war. */
function spawnRulers(factions: Faction[], _seed: number, rng: SeededRNG): HistoricalFigure[] {
  const usedNames = new Set<string>();
  const traitPool: RulerTrait[] = ['bloodthirsty', 'industrious', 'xenophobic', 'diplomatic', 'pious', 'corrupt'];

  return factions.map(faction => {
    let name = NPC_NAMES[rng.nextInt(NPC_NAMES.length)];
    // Avoid name collisions
    let attempts = 0;
    while (usedNames.has(name) && attempts < 20) {
      name = NPC_NAMES[rng.nextInt(NPC_NAMES.length)];
      attempts++;
    }
    usedNames.add(name);

    return {
      id:        `ruler_${faction.id}`,
      name:      `${name} of ${faction.name}`,
      factionId: faction.id,
      role:      'ruler' as const,
      values: {
        ambition:   rng.nextInt(101) - 50,  // -50 to +50
        loyalty:    rng.nextInt(101) - 50,
        compassion: rng.nextInt(101) - 50,
        cunning:    rng.nextInt(101) - 50,
      },
      traits: [traitPool[rng.nextInt(traitPool.length)]],
      bornYear: -(rng.nextInt(30) + 20), // 20-50 years before world start
      diedYear: null,
      legitimacy: 80 + rng.nextInt(20),
    };
  });
}

// ─── Spatial Helpers ──────────────────────────────────────────────────────

/** Find a walkable starting position near the center of the map. */
function findPlayerStart(map: GameMap, mapSize: number): Position {
  const center = Math.floor(mapSize / 2);

  for (let radius = 0; radius < mapSize; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = center + dx;
        const y = center + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (map.tiles[y][x].walkable) return { x, y };
      }
    }
  }

  return { x: center, y: center }; // fallback
}

/** Give each NPC knowledge of 2-4 random historical events. */
function assignKnowledgeToNPCs(
  npcs: NPC[],
  events: GameEvent[],
): void {
  if (events.length === 0) return;

  // Deterministic assignment — not using SeededRNG to avoid circular import
  for (let i = 0; i < npcs.length; i++) {
    const count = 2 + (i % 3); // 2, 3, or 4 events per NPC
    for (let j = 0; j < count; j++) {
      const eventIndex = (i * 7 + j * 3) % events.length;
      const event = events[eventIndex];
      
      if (!npcs[i].knowledge.some(k => k.eventId === event.id)) {
        npcs[i].knowledge.push({
          eventId: event.id,
          discoveredYear: event.year,
          accuracy: 1.0,           // worldgen events are 'known truth' for pre-history
          sourceId: 'direct',
        });
      }
    }
  }
}

/** Generate a religion for some factions. */
function generateReligions(factions: Faction[], settlements: Settlement[], rng: SeededRNG): Religion[] {
  const religions: Religion[] = [];
  const RELIGION_NAMES = [
    'Solaris', 'The Void', 'Iron Root', 'Silver Path', 'Deep Water',
    'Ashen Crown', 'The Pale Flame', 'Verdant Heart', 'The Twin Moons', 'Ember Court',
    'Stone Witness', 'The Hollow Tide', 'Sunken Pact', 'Crimson Accord', 'The Wandering Eye',
  ];
  const RELIGION_COLORS = ['#ffcc00', '#440066', '#446600', '#cccccc', '#0066ff'];

  // Religions are founded in some capital settlements
  for (let i = 0; i < factions.length; i++) {
    if (rng.nextFloat() > 0.5) { // 50% chance for a faction to have a unique religion
      const nameIndex = (i * 3 + rng.nextInt(3)) % RELIGION_NAMES.length;
      const name = RELIGION_NAMES[nameIndex];
      const settlement = settlements.find(s => s.factionId === factions[i].id);
      if (!settlement) continue;

      // Derive tenets from the founding faction's ethics
      const ethics = factions[i].ethics;
      const tenets: Religion['tenets'] = [];
      if (ethics.violence === 'embraced')  tenets.push('war');
      if (ethics.trade === 'embraced')     tenets.push('wealth');
      if (ethics.mercy === 'embraced')     tenets.push('charity');
      if (ethics.tradition === 'embraced') tenets.push('peace');
      if (tenets.length === 0)             tenets.push('knowledge'); // default fallback

      const religion: Religion = {
        id: `rel_${factions[i].id}`,
        name: `${name} of ${factions[i].name}`,
        founderId: factions[i].leaderId,
        originSettlementId: settlement.id,
        tenets,
        color: RELIGION_COLORS[i % RELIGION_COLORS.length],
      };

      religions.push(religion);
      
      // Initialize settlement faith
      settlement.faith.push({ religionId: religion.id, pressure: 100 });
      settlement.dominantReligionId = religion.id;
    }
  }
  return religions;
}

/** Spawn holy sites at the origin of religions. */
function spawnHolySites(religions: Religion[], settlements: Settlement[], _map: GameMap, _rng: SeededRNG): HolySite[] {
  return religions.map((rel, i) => {
    const settlement = settlements.find(s => s.id === rel.originSettlementId);
    const pos = settlement ? settlement.position : { x: 0, y: 0 };

    return {
      id: `holy_${i}`,
      name: `Grand Temple of ${rel.name}`,
      position: pos,
      religionId: rel.id,
    };
  });
}
