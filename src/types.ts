// ─── Cascade POC — Shared Type Definitions ─────────────────────────────
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

// ─── Factions ───────────────────────────────────────────────────────────

export interface Faction {
  id: string;
  name: string;
  color: string;        // hex color for territory rendering
  aggression: number;   // 0-100, drives conflict probability
  settlements: string[];
}

export interface FactionRelationship {
  factionA: string;
  factionB: string;
  opinion: number;      // -100 (hostile) to +100 (allied)
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
  knownEvents: string[];       // event IDs this NPC knows about
  dialogueKey: string;         // key into dialogue templates
  alive: boolean;
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

// ─── Events & Causal Graph ──────────────────────────────────────────────

export interface GameEvent {
  id: string;
  tick: number;
  year: number;
  subject: string;             // who did it (entity or faction ID)
  action: string;              // what happened
  object: string;              // who/what was affected
  causedBy: string | null;     // parent event ID, null = root cause
  significance: number;        // 0-10, gates cascade propagation
  playerCaused: boolean;       // true if player action or downstream
  description: string;         // human-readable summary
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

// ─── World State (the big container) ────────────────────────────────────

export interface WorldState {
  seed: number;
  currentYear: number;
  map: GameMap;
  factions: Faction[];
  relationships: FactionRelationship[];
  settlements: Settlement[];
  npcs: NPC[];
  items: Item[];
  events: GameEvent[];
  player: Player;
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
}

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 0,           // 0 = random at runtime
  mapSize: 24,
  numFactions: 3,
  numSettlementsPerFaction: 1,
  npcsPerSettlement: 3,
  pregenYears: 100,
  ticksPerYear: 1,
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
