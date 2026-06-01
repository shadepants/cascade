// ─── Game State Structs ──────────────────────────────────────────────────────
// Ported from src/types/world.ts, src/types/storyteller.ts, and src/types/simulation.ts
//
// These structures represent the full game state. They are decorated with
// ts-rs macros so we can automatically generate TypeScript interfaces,
// ensuring the Rust engine and TypeScript frontend share compile-safe contracts.

use serde::{Serialize, Deserialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum Biome {
    Ocean,
    Coast,
    Grassland,
    Forest,
    Rainforest,
    Arid,
    Desert,
    Tundra,
    Mountain,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
pub struct TileModifier {
    #[serde(rename = "type")]
    pub modifier_type: TileModifierType,
    pub duration: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum TileModifierType {
    Bloom,
    Omen,
    Plague,
    Blessing,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Tile {
    pub biome: Biome,
    pub elevation: f64,
    pub rainfall: f64,
    #[serde(rename = "factionId")]
    pub faction_id: Option<String>,
    #[serde(rename = "settlementId")]
    pub settlement_id: Option<String>,
    pub walkable: bool,
    pub modifiers: Option<Vec<TileModifier>>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct GameMap {
    pub width: i32,
    pub height: i32,
    pub tiles: Vec<Vec<Tile>>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct TileDynamic {
    #[serde(rename = "factionId")]
    pub faction_id: Option<String>,
    #[serde(rename = "settlementId")]
    pub settlement_id: Option<String>,
    pub modifiers: Option<Vec<TileModifier>>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct GameMapDynamic {
    pub width: i32,
    pub height: i32,
    pub tiles: Vec<Vec<TileDynamic>>,
}

#[derive(Clone, Debug)]
pub struct StaticTileData {
    pub biome: Biome,
    pub elevation: f64,
    pub rainfall: f64,
    pub walkable: bool,
}

#[derive(Clone, Debug)]
pub struct StaticMapData {
    pub width: i32,
    pub height: i32,
    pub tiles: Vec<Vec<StaticTileData>>,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum EthicStance {
    Embraced,
    Neutral,
    Shunned,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct FactionEthics {
    pub violence: EthicStance,
    pub expansion: EthicStance,
    pub trade: EthicStance,
    pub tradition: EthicStance,
    pub mercy: EthicStance,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct PartialFactionEthics {
    pub violence: Option<EthicStance>,
    pub expansion: Option<EthicStance>,
    pub trade: Option<EthicStance>,
    pub tradition: Option<EthicStance>,
    pub mercy: Option<EthicStance>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct InterestGroup {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub ig_type: InterestGroupType,
    pub power: f64,
    #[serde(rename = "ethicsBias")]
    pub ethics_bias: PartialFactionEthics,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum InterestGroupType {
    Merchant,
    Military,
    Religious,
    Labor,
    Scholar,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Faction {
    pub id: String,
    pub name: String,
    pub color: String,
    pub aggression: f64,
    pub settlements: Vec<String>,
    pub population: i32,
    pub stability: f64,
    pub wealth: f64,
    pub military: f64,
    pub culture: f64,
    #[serde(rename = "techLevel")]
    pub tech_level: f64,
    pub ethics: FactionEthics,
    #[serde(rename = "leaderId")]
    pub leader_id: Option<String>,
    #[serde(rename = "interestGroups")]
    pub interest_groups: Vec<InterestGroup>,
    pub innovations: Vec<String>,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum DiplomaticState {
    Peace,
    War,
    Tribute,
    Alliance,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct FactionRelationship {
    #[serde(rename = "factionA")]
    pub faction_a: String,
    #[serde(rename = "factionB")]
    pub faction_b: String,
    pub opinion: f64,
    pub animosity: f64,
    pub state: DiplomaticState,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum RulerTrait {
    Bloodthirsty,
    Industrious,
    Xenophobic,
    Diplomatic,
    Pious,
    Corrupt,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct HistoricalFigureValues {
    pub ambition: f64,
    pub loyalty: f64,
    pub compassion: f64,
    pub cunning: f64,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum HistoricalFigureRole {
    Ruler,
    General,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct HistoricalFigure {
    pub id: String,
    pub name: String,
    #[serde(rename = "factionId")]
    pub faction_id: String,
    pub role: HistoricalFigureRole,
    pub values: HistoricalFigureValues,
    pub traits: Vec<RulerTrait>,
    #[serde(rename = "bornYear")]
    pub born_year: i32,
    #[serde(rename = "diedYear")]
    pub died_year: Option<i32>,
    pub legitimacy: f64,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum NPCPersonality {
    Loyal,
    Skeptic,
    Zealot,
    Pragmatist,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct NPCKnowledge {
    #[serde(rename = "eventId")]
    pub event_id: String,
    #[serde(rename = "discoveredYear")]
    pub discovered_year: i32,
    pub accuracy: f64,
    #[serde(rename = "sourceId")]
    pub source_id: String,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct NPC {
    pub id: String,
    pub name: String,
    pub position: Position,
    #[serde(rename = "factionId")]
    pub faction_id: String,
    pub personality: NPCPersonality,
    pub knowledge: Vec<NPCKnowledge>,
    #[serde(rename = "dialogueKey")]
    pub dialogue_key: String,
    pub alive: bool,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    Artifact,
    Letter,
    Key,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct ItemHistoryEntry {
    pub year: i32,
    #[serde(rename = "ownerName")]
    pub owner_name: String,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub item_type: ItemType,
    pub significance: f64,
    pub position: Position,
    pub history: Vec<ItemHistoryEntry>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct KnowledgeEntry {
    #[serde(rename = "eventId")]
    pub event_id: String,
    pub source: String,
    #[serde(rename = "factionPerspective")]
    pub faction_perspective: String,
    pub text: String,
    #[serde(rename = "discoveredYear")]
    pub discovered_year: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub position: Position,
    pub inventory: Vec<Item>,
    #[serde(rename = "knowledgeLog")]
    pub knowledge_log: Vec<KnowledgeEntry>,
    #[serde(rename = "actionsThisEra")]
    pub actions_this_era: Vec<String>,
    pub insight: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Hash, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum FactionStatKey {
    Population,
    Stability,
    Wealth,
    Military,
    Culture,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct StatDelta {
    #[serde(rename = "factionId")]
    pub faction_id: String,
    pub stat: FactionStatKey,
    pub delta: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct FaithPressure {
    #[serde(rename = "religionId")]
    pub religion_id: String,
    pub pressure: f64,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Settlement {
    pub id: String,
    pub name: String,
    pub position: Position,
    #[serde(rename = "factionId")]
    pub faction_id: String,
    pub npcs: Vec<String>,
    pub items: Vec<String>,
    pub faith: Vec<FaithPressure>,
    #[serde(rename = "dominantReligionId")]
    pub dominant_religion_id: Option<String>,
    pub innovations: Vec<String>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Ruin {
    pub id: String,
    pub name: String,
    pub position: Position,
    #[serde(rename = "formerFactionId")]
    pub former_faction_id: String,
    #[serde(rename = "collapsedYear")]
    pub collapsed_year: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ResourceNodeType {
    Iron,
    Gold,
    Relic,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct ResourceNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: ResourceNodeType,
    pub position: Position,
    pub value: f64,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum TradeCommodity {
    Grain,
    Luxury,
    Arms,
    Textiles,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct TradeRoute {
    pub id: String,
    #[serde(rename = "startSettlementId")]
    pub start_settlement_id: String,
    #[serde(rename = "endSettlementId")]
    pub end_settlement_id: String,
    pub path: Vec<Position>,
    pub volume: f64,
    pub commodity: TradeCommodity,
    pub active: bool,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Hash, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ReligionTenet {
    Peace,
    War,
    Charity,
    Knowledge,
    Wealth,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Religion {
    pub id: String,
    pub name: String,
    #[serde(rename = "founderId")]
    pub founder_id: Option<String>,
    #[serde(rename = "originSettlementId")]
    pub origin_settlement_id: String,
    pub tenets: Vec<ReligionTenet>,
    pub color: String,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct HolySite {
    pub id: String,
    pub name: String,
    pub position: Position,
    #[serde(rename = "religionId")]
    pub religion_id: String,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum InnovationType {
    Agriculture,
    Metallurgy,
    Navigation,
    Scholarship,
    Engineering,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct Innovation {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub innovation_type: InnovationType,
    pub description: String,
    #[serde(rename = "originYear")]
    pub origin_year: i32,
    #[serde(rename = "originSettlementId")]
    pub origin_settlement_id: String,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct GameEvent {
    pub id: String,
    pub tick: i32,
    pub year: i32,
    #[serde(rename = "secondsOffset")]
    pub seconds_offset: f64,
    pub subject: String,
    pub action: String,
    pub object: String,
    #[serde(rename = "causedBy")]
    pub caused_by: Option<String>,
    pub significance: f64,
    #[serde(rename = "playerCaused")]
    pub player_caused: bool,
    pub description: String,
    pub motivation: String,
    #[serde(rename = "statDeltas")]
    pub stat_deltas: Vec<StatDelta>,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum StorytellerMode {
    Clio,
    Ares,
    Tyche,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct CooldownEntry {
    #[serde(rename = "triggerEventId")]
    pub trigger_event_id: String,
    #[serde(rename = "triggerSignificance")]
    pub trigger_significance: f64,
    #[serde(rename = "startYear")]
    pub start_year: i32,
    #[serde(rename = "durationYears")]
    pub duration_years: i32,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct StorytellerState {
    pub mode: StorytellerMode,
    pub tension: f64,
    #[serde(rename = "tensionDecayRate")]
    pub tension_decay_rate: f64,
    #[serde(rename = "tensionFloor")]
    pub tension_floor: f64,
    #[serde(rename = "spotlightFactionId")]
    pub spotlight_faction_id: Option<String>,
    #[serde(rename = "spotlightSetYear")]
    pub spotlight_set_year: i32,
    #[serde(rename = "spotlightDecayYears")]
    pub spotlight_decay_years: i32,
    #[serde(rename = "yearsSincePlayerDiscovery")]
    pub years_since_player_discovery: i32,
    #[serde(rename = "debtInterventionsFired")]
    pub debt_interventions_fired: i32,
    pub cooldowns: Vec<CooldownEntry>,
    #[serde(rename = "maxEventsPerYear")]
    pub max_events_per_year: i32,
    #[serde(rename = "highSigEventsThisYear")]
    pub high_sig_events_this_year: i32,
    #[serde(rename = "lastHighSigYear")]
    pub last_high_sig_year: i32,
    #[serde(rename = "consecutiveQuietYears")]
    pub consecutive_quiet_years: i32,
    #[serde(rename = "playerActionCount")]
    pub player_action_count: i32,
    #[serde(rename = "pendingNotification")]
    pub pending_notification: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum VisualEffectType {
    Ripple,
    Aura,
    Sparkle,
    #[serde(rename = "tech_spark")]
    TechSpark,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct VisualEffect {
    pub id: String,
    #[serde(rename = "type")]
    pub effect_type: VisualEffectType,
    pub position: Position,
    #[serde(rename = "startTime")]
    pub start_time: i32,
    pub duration: i32,
    pub color: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct SimConfig {
    #[serde(rename = "schismProbability")]
    pub schism_probability: f64,
    #[serde(rename = "techDiffusionRate")]
    pub tech_diffusion_rate: f64,
    #[serde(rename = "tradeDecayRate")]
    pub trade_decay_rate: f64,
    #[serde(rename = "tradeGrowthRate")]
    pub trade_growth_rate: f64,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct WorldState {
    pub seed: f64,
    #[serde(rename = "currentYear")]
    pub current_year: i32,
    pub map: GameMap,
    pub factions: Vec<Faction>,
    pub relationships: Vec<FactionRelationship>,
    #[serde(rename = "historicalFigures")]
    pub historical_figures: Vec<HistoricalFigure>,
    pub settlements: Vec<Settlement>,
    pub ruins: Vec<Ruin>,
    #[serde(rename = "resourceNodes")]
    pub resource_nodes: Vec<ResourceNode>,
    pub npcs: Vec<NPC>,
    pub items: Vec<Item>,
    #[serde(rename = "tradeRoutes")]
    pub trade_routes: Vec<TradeRoute>,
    pub religions: Vec<Religion>,
    #[serde(rename = "holySites")]
    pub holy_sites: Vec<HolySite>,
    pub innovations: Vec<Innovation>,
    pub events: Vec<GameEvent>,
    pub player: Player,
    pub storyteller: StorytellerState,
    pub visuals: Vec<VisualEffect>,
    #[serde(rename = "simConfig")]
    pub sim_config: Option<SimConfig>,
}

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct WorldStateDynamic {
    pub seed: f64,
    #[serde(rename = "currentYear")]
    pub current_year: i32,
    pub map: GameMapDynamic,
    pub factions: Vec<Faction>,
    pub relationships: Vec<FactionRelationship>,
    #[serde(rename = "historicalFigures")]
    pub historical_figures: Vec<HistoricalFigure>,
    pub settlements: Vec<Settlement>,
    pub ruins: Vec<Ruin>,
    #[serde(rename = "resourceNodes")]
    pub resource_nodes: Vec<ResourceNode>,
    pub npcs: Vec<NPC>,
    pub items: Vec<Item>,
    #[serde(rename = "tradeRoutes")]
    pub trade_routes: Vec<TradeRoute>,
    pub religions: Vec<Religion>,
    #[serde(rename = "holySites")]
    pub holy_sites: Vec<HolySite>,
    pub innovations: Vec<Innovation>,
    pub events: Vec<GameEvent>,
    pub player: Player,
    pub storyteller: StorytellerState,
    pub visuals: Vec<VisualEffect>,
    #[serde(rename = "simConfig")]
    pub sim_config: Option<SimConfig>,
}
