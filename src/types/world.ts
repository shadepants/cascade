import type { StorytellerMode, StorytellerState } from './storyteller.ts';
import type { GameEvent } from './simulation.ts';

export interface Position {
  x: number;
  y: number;
}

export type Biome =
  | 'ocean'
  | 'coast'
  | 'grassland'
  | 'forest'
  | 'rainforest'
  | 'arid'
  | 'desert'
  | 'tundra'
  | 'mountain';

export interface Tile {
  biome: Biome;
  elevation: number;
  rainfall: number;
  factionId: string | null;
  settlementId: string | null;
  walkable: boolean;
  modifiers?: TileModifier[];
}

export interface TileModifier {
  type: 'bloom' | 'omen' | 'plague' | 'blessing';
  duration: number; // years remaining
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

export type EthicStance = 'embraced' | 'neutral' | 'shunned';

export interface FactionEthics {
  violence: EthicStance;
  expansion: EthicStance;
  trade: EthicStance;
  tradition: EthicStance;
  mercy: EthicStance;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  aggression: number;
  settlements: string[];
  population: number;
  stability: number;
  wealth: number;
  military: number;
  culture: number;
  ethics: FactionEthics;
  leaderId: string | null;
  interestGroups: InterestGroup[];
}

export interface InterestGroup {
  id: string;
  name: string;
  type: 'merchant' | 'military' | 'religious' | 'labor' | 'scholar';
  power: number;
  ethicsBias: Partial<FactionEthics>;
}

export type DiplomaticState = 'peace' | 'war' | 'tribute' | 'alliance';

export interface FactionRelationship {
  factionA: string;
  factionB: string;
  opinion: number;
  animosity: number;
  state: DiplomaticState;
}

export interface HistoricalFigure {
  id: string;
  name: string;
  factionId: string;
  role: 'ruler' | 'general';
  values: {
    ambition: number;
    loyalty: number;
    compassion: number;
    cunning: number;
  };
  traits: RulerTrait[];
  bornYear: number;
  diedYear: number | null;
  legitimacy: number;
}

export type RulerTrait =
  | 'bloodthirsty'
  | 'industrious'
  | 'xenophobic'
  | 'diplomatic'
  | 'pious'
  | 'corrupt';

export interface Entity {
  id: string;
  name: string;
  position: Position;
}

export interface NPC extends Entity {
  factionId: string;
  personality: NPCPersonality;
  knowledge: NPCKnowledge[];
  dialogueKey: string;
  alive: boolean;
}

export interface NPCKnowledge {
  eventId: string;
  discoveredYear: number;
  accuracy: number;
  sourceId: string | 'direct';
}

export type NPCPersonality = 'loyal' | 'skeptic' | 'zealot' | 'pragmatist';

export interface Player extends Entity {
  inventory: Item[];
  knowledgeLog: KnowledgeEntry[];
  actionsThisEra: string[];
  insight: number;
}

export type EchoType = 'whisper' | 'omen' | 'insight' | 'bloom';

export interface TemporalEcho {
  type: EchoType;
  topic?: string;
  targetId?: string;
  cost: number;
  position?: Position | null;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  significance: number;
  position: Position;
  history: ItemHistoryEntry[];
}

export interface ItemHistoryEntry {
  year: number;
  ownerName: string;
}

export type ItemType = 'artifact' | 'letter' | 'key';

export interface KnowledgeEntry {
  eventId: string;
  source: string;
  factionPerspective: string;
  text: string;
  discoveredYear: number;
}

export type FactionStatKey = 'population' | 'stability' | 'wealth' | 'military' | 'culture';

export interface StatDelta {
  factionId: string;
  stat: FactionStatKey;
  delta: number;
}

export interface Settlement {
  id: string;
  name: string;
  position: Position;
  factionId: string;
  npcs: string[];
  items: string[];
  faith: FaithPressure[];
  dominantReligionId: string | null;
}

export interface Ruin {
  id: string;
  name: string;
  position: Position;
  formerFactionId: string;
  collapsedYear: number;
}

export interface ResourceNode {
  id: string;
  type: 'iron' | 'gold' | 'relic';
  position: Position;
  value: number;
}

export interface TradeRoute {
  id: string;
  startSettlementId: string;
  endSettlementId: string;
  path: Position[];
  volume: number; // 0-100, affects wealth transfer
  commodity: 'grain' | 'luxury' | 'arms' | 'textiles';
  active: boolean;
}

export interface Religion {
  id: string;
  name: string;
  founderId: string | null;
  originSettlementId: string;
  tenets: ('peace' | 'war' | 'charity' | 'knowledge' | 'wealth')[];
  color: string;
}

export interface FaithPressure {
  religionId: string;
  pressure: number; // 0 to 100
}

export interface HolySite {
  id: string;
  name: string;
  position: Position;
  religionId: string;
}

export interface VisualEffect {
  id: string;
  type: 'ripple' | 'aura' | 'sparkle';
  position: Position;
  startTime: number; // in-game tick or year
  duration: number; // ticks or years
  color?: string;
}

export interface WorldState {
  seed: number;
  currentYear: number;
  map: GameMap;
  factions: Faction[];
  relationships: FactionRelationship[];
  historicalFigures: HistoricalFigure[];
  settlements: Settlement[];
  ruins: Ruin[];
  resourceNodes: ResourceNode[];
  npcs: NPC[];
  items: Item[];
  tradeRoutes: TradeRoute[];
  religions: Religion[];
  holySites: HolySite[];
  events: GameEvent[];
  player: Player;
  storyteller: StorytellerState;
  visuals: VisualEffect[];
}

export interface WorldConfig {
  seed: number;
  mapSize: number;
  numFactions: number;
  numSettlementsPerFaction: number;
  npcsPerSettlement: number;
  pregenYears: number;
  ticksPerYear: number;
  storytellerMode: StorytellerMode;
}
