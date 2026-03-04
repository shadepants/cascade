// ─── Cascade — Shared Type Definitions ─────────────────────────────────
// Single file for POC. Split into types/ directory when complexity warrants it.

// ─── Geometry ───────────────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

// ─── Map & Terrain ──────────────────────────────────────────────────────

export type Biome =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'desert'
  | 'tundra'
  | 'water';

export interface Tile {
  biome: Biome;
  elevation: number;   // 0-1, from Perlin noise
  rainfall: number;    // 0-1, from Perlin noise
  factionId: string | null;
  settlementId: string | null;
  walkable: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];      // tiles[y][x]
}

// ─── Faction Ethics ──────────────────────────────────────────────────────
// Simplified DF ethics system: 5 categories, 3 stances each.
// Divergence between faction ethics pairs accumulates animosity.

export type EthicStance = 'embraced' | 'neutral' | 'shunned';

export interface FactionEthics {
  violence:  EthicStance;   // how they treat enemies
  expansion: EthicStance;   // right to take territory
  trade:     EthicStance;   // openness to commerce
  tradition: EthicStance;   // respect for hierarchy / history
  mercy:     EthicStance;   // treatment of defeated
}

// ─── Factions ───────────────────────────────────────────────────────────

export interface Faction {
  id: string;
  name: string;
  color: string;          // hex color for territory rendering
  aggression: number;     // 0-100, war-proneness (ruler personality modifier)
  settlements: string[];

  // Simulation stats — pressure values that drive events
  population:   number;   // 0-1000, grows/shrinks with territory quality
  stability:    number;   // 0-100, internal cohesion; <20 = rebellion risk
  wealth:       number;   // 0-100, economic power; feeds military upkeep
  military:     number;   // 0-100, fighting strength
  culture:      number;   // 0-100, cultural influence; spreads to neighbors

  ethics:       FactionEthics;
  leaderId:     string | null;  // HistoricalFigure ID of current ruler
}

// ─── Diplomacy ──────────────────────────────────────────────────────────

export type DiplomaticState = 'peace' | 'war' | 'tribute' | 'alliance';

export interface FactionRelationship {
  factionA: string;
  factionB: string;
  opinion:   number;          // -100 (hostile) to +100 (allied)
  animosity: number;          // 0-200, accumulates via ethics divergence → war
  state:     DiplomaticState;
}

// ─── Historical Figures ──────────────────────────────────────────────────
// Two-tier population: fully-tracked rulers/generals + abstract pop counts.
// Only figures that generate events need full simulation state.

export interface HistoricalFigure {
  id:       string;
  name:     string;
  factionId: string;
  role:     'ruler' | 'general';
  values: {
    ambition:    number;   // -50 to +50, high = lower war threshold
    loyalty:     number;   // -50 to +50
    compassion:  number;   // -50 to +50, high = raises war threshold
    cunning:     number;   // -50 to +50
  };
  bornYear:  number;
  diedYear:  number | null;
}

// ─── Entities ───────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  name: string;
  position: Position;
}

export interface NPC extends Entity {
  factionId: string;
  personality: NPCPersonality;
  knowledge: NPCKnowledge[];   // upgraded from simple string[]
  dialogueKey: string;         // key into dialogue templates
  alive: boolean;
}

export interface NPCKnowledge {
  eventId: string;
  discoveredYear: number;
  accuracy: number;            // 0-1, information degrades over time/transfers
  sourceId: string | 'direct'; // which NPC told them, or 'direct' if they saw it
}

export type NPCPersonality = 'loyal' | 'skeptic' | 'zealot' | 'pragmatist';

export interface Player extends Entity {
  inventory: Item[];
  knowledgeLog: KnowledgeEntry[];
  actionsThisEra: string[];    // event IDs of actions player took
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  significance: number;        // 0-10, how historically important
  position: Position;          // map tile where item sits (removed from world.items on pickup)
  history: ItemHistoryEntry[]; // era markers for legendary status
}

export interface ItemHistoryEntry {
  year: number;
  ownerName: string;
}

export type ItemType = 'artifact' | 'letter' | 'key';

// ─── Knowledge ──────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  eventId: string;
  source: string;              // NPC name who told the player
  factionPerspective: string;  // which faction's version
  text: string;                // what was learned
  discoveredYear: number;
}

// ─── Stat Delta ─────────────────────────────────────────────────────────
// Records what numerical changes an event caused. Enables mechanically-
// derived cascade consequences instead of random template selection.

export type FactionStatKey = 'population' | 'stability' | 'wealth' | 'military' | 'culture';

export interface StatDelta {
  factionId: string;
  stat: FactionStatKey;
  delta: number;
}

// ─── Events & Causal Graph ──────────────────────────────────────────────

export interface GameEvent {
  id: string;
  tick: number;
  year: number;
  secondsOffset: number;       // 0-11999, sub-year narrative texture (cheap)
  subject: string;             // who did it (entity or faction ID)
  action: string;              // what happened
  object: string;              // who/what was affected
  causedBy: string | null;     // parent event ID, null = root cause
  significance: number;        // 0-10, gates cascade propagation
  playerCaused: boolean;       // true if player action or downstream
  description: string;         // human-readable summary
  motivation: string;          // post-hoc rationalization (Caves of Qud pattern)
  statDeltas: StatDelta[];      // world state changes this event caused
}

export interface CausalChain {
  rootEventId: string;
  nodes: CausalNode[];
  totalDepth: number;
  score: number;
}

export interface CausalNode {
  eventId: string;
  depth: number;               // distance from player's action
  children: string[];          // event IDs caused by this event
}

// ─── Settlements ────────────────────────────────────────────────────────

export interface Settlement {
  id: string;
  name: string;
  position: Position;
  factionId: string;
  npcs: string[];              // NPC IDs stationed here
  items: string[];             // Item IDs available here
}

// ─── Storyteller Director ────────────────────────────────────────────────

export type StorytellerMode = 'clio' | 'ares' | 'tyche';

export interface CooldownEntry {
  triggerEventId: string;
  triggerSignificance: number;
  startYear: number;
  durationYears: number;
}

export interface StorytellerState {
  mode: StorytellerMode;

  // Tension (0-100): narrative pressure — gates event frequency/cascade depth
  tension: number;
  tensionDecayRate: number;    // per simulated year
  tensionFloor: number;        // minimum after decay

  // Spotlight: faction the director is foregrounding
  spotlightFactionId: string | null;
  spotlightSetYear: number;
  spotlightDecayYears: number;

  // Narrative debt: years since player discovered a playerCaused event
  yearsSincePlayerDiscovery: number;
  debtInterventionsFired: number;  // diminishing returns counter

  // Pacing cooldowns: suppress event stacking after high-sig events
  cooldowns: CooldownEntry[];

  // Event budget per simulated year (significance >= 5)
  maxEventsPerYear: number;
  highSigEventsThisYear: number;  // reset each year

  // Tracking
  lastHighSigYear: number;
  consecutiveQuietYears: number;
  playerActionCount: number;
}

export function defaultStorytellerState(mode: StorytellerMode = 'clio'): StorytellerState {
  const modeDefaults: Record<StorytellerMode, { tensionDecayRate: number; tensionFloor: number; maxEventsPerYear: number; spotlightDecayYears: number }> = {
    clio:  { tensionDecayRate: 3,  tensionFloor: 10, maxEventsPerYear: 2, spotlightDecayYears: 50 },
    ares:  { tensionDecayRate: 8,  tensionFloor: 20, maxEventsPerYear: 4, spotlightDecayYears: 20 },
    tyche: { tensionDecayRate: 5,  tensionFloor: 0,  maxEventsPerYear: 8, spotlightDecayYears: 10 },
  };
  return {
    mode,
    tension: 20,
    ...modeDefaults[mode],
    spotlightFactionId: null,
    spotlightSetYear: 0,
    yearsSincePlayerDiscovery: 0,
    debtInterventionsFired: 0,
    cooldowns: [],
    highSigEventsThisYear: 0,
    lastHighSigYear: 0,
    consecutiveQuietYears: 0,
    playerActionCount: 0,
  };
}

// ─── World State (the big container) ────────────────────────────────────

export interface WorldState {
  seed: number;
  currentYear: number;
  map: GameMap;
  factions: Faction[];
  relationships: FactionRelationship[];
  historicalFigures: HistoricalFigure[];
  settlements: Settlement[];
  npcs: NPC[];
  items: Item[];
  events: GameEvent[];
  player: Player;
  storyteller: StorytellerState;
}

// ─── World Generation Config ────────────────────────────────────────────

export interface WorldConfig {
  seed: number;
  mapSize: number;             // 24 for POC
  numFactions: number;         // 3 for POC
  numSettlementsPerFaction: number; // 1 for POC
  npcsPerSettlement: number;   // 2-3 for POC
  pregenYears: number;         // 100 for POC
  ticksPerYear: number;        // 1 for POC (simplified)
  storytellerMode: StorytellerMode; // clio | ares | tyche
}

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 0,           // 0 = random at runtime
  mapSize: 24,
  numFactions: 3,
  numSettlementsPerFaction: 1,
  npcsPerSettlement: 3,
  pregenYears: 100,
  ticksPerYear: 1,
  storytellerMode: 'clio' as StorytellerMode,
};

// ─── Game Phase (UI state machine) ──────────────────────────────────────

export type GamePhase =
  | 'title'           // title screen
  | 'worldgen'        // generating world (loading)
  | 'exploring'       // walking the map
  | 'dialogue'        // talking to NPC
  | 'action'          // choosing what to do with an item
  | 'jumping'         // time jump in progress (loading)
  | 'score';          // end-of-run cascade score

// ─── Game Store (top-level app state) ───────────────────────────────────

export interface GameStore {
  phase: GamePhase;
  world: WorldState | null;
  previousWorld: WorldState | null; // For rendering the 'Ghost of History' layer
  config: WorldConfig;

  // UI state
  activeNpc: NPC | null;            // NPC in dialogue
  activeItem: Item | null;          // item being interacted with
  notification: string | null;      // cascade discovery flash

  // Camera
  camera: Camera;
}

export interface Camera {
  x: number;          // top-left world coordinate
  y: number;
  viewportWidth: number;   // in tiles
  viewportHeight: number;
}

// ─── Renderer Config ────────────────────────────────────────────────────

export const TILE_SIZE = 24;       // pixels per tile
export const VIEWPORT_TILES = 24;  // tiles visible in each direction
export const MAX_ACTIONS_PER_ERA = 6; // player action budget per time jump
