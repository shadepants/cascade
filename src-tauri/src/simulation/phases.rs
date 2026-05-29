use crate::state::{
    WorldState, GameEvent, Faction, Position, Biome, Settlement, NPC,
    TileModifier, TileModifierType, FactionEthics, EthicStance, InterestGroup,
    InterestGroupType, FactionStatKey, StatDelta, FactionRelationship,
    DiplomaticState, HistoricalFigure, HistoricalFigureRole, RulerTrait,
    NPCPersonality, TradeRoute, TradeCommodity, Religion, HolySite,
    ReligionTenet, Innovation, InnovationType, SimConfig, CooldownEntry,
    StorytellerState, StorytellerMode,
};
use crate::rng::SeededRNG;
use crate::simulation::helpers::*;
use std::collections::{HashMap, HashSet};

pub const NPC_NAMES: &[&str] = &[
    "Aldric", "Brenna", "Corwin", "Dara", "Elias",
    "Fenna", "Gareth", "Halla", "Idris", "Jora",
    "Kael", "Lyra", "Maren", "Nessa", "Orin",
    "Petra", "Quinn", "Rowan", "Sable", "Theron",
];

pub const WAR_ANIMOSITY_THRESHOLD: f64 = 80.0;
pub const FAMINE_DESERT_THRESHOLD: f64 = 0.55;
pub const FAMINE_POPULATION_MIN: f64 = 300.0;
pub const REBELLION_STABILITY_MIN: f64 = 20.0;
pub const ALLIANCE_OPINION_MIN: f64 = 55.0;
pub const CASCADE_SIGNIFICANCE_MIN: f64 = 3.0;
pub const CASCADE_LOOKBACK_YEARS: i32 = 50;

pub const SCHISM_PROBABILITY_BASE: f64 = 0.2;
pub const TECH_DIFFUSION_RATE: f64 = 0.05;
pub const TRADE_ROUTE_DECAY_RATE: f64 = 15.0;
pub const TRADE_ROUTE_GROWTH_RATE: f64 = 5.0;

pub const PERSONALITIES: &[NPCPersonality] = &[
    NPCPersonality::Loyal,
    NPCPersonality::Skeptic,
    NPCPersonality::Zealot,
    NPCPersonality::Pragmatist,
];

fn get_biome_pop_delta(biome: &Biome) -> f64 {
    match biome {
        Biome::Grassland => 2.0,
        Biome::Forest => 0.5,
        Biome::Rainforest => 0.2,
        Biome::Mountain => -1.0,
        Biome::Desert => -2.0,
        Biome::Tundra => -2.0,
        Biome::Ocean => 0.0,
        Biome::Coast => 0.5,
        Biome::Arid => -0.5,
    }
}

fn get_biome_wealth_delta(biome: &Biome) -> f64 {
    match biome {
        Biome::Grassland => 1.0,
        Biome::Forest => 2.0,
        Biome::Rainforest => 1.5,
        Biome::Mountain => 0.5,
        Biome::Desert => -1.0,
        Biome::Tundra => -1.0,
        Biome::Ocean => 0.5,
        Biome::Coast => 1.0,
        Biome::Arid => 0.0,
    }
}

pub fn pick_motivation(key: &str, rng: &mut SeededRNG) -> String {
    let pool: &[&str] = match key {
        "famine" => &[
            "as drought consumed their lands",
            "as harvests failed for the third season",
            "as their territory could no longer sustain the growing populace",
        ],
        "trade_boom" => &[
            "as merchants found new routes through the borderlands",
            "as peacetime opened old trading paths",
            "as their surplus drew buyers from afar",
        ],
        "alliance_formed" => &[
            "bound by mutual fear of a common enemy",
            "as shared hardship forged unexpected bonds",
            "as their leaders found more to gain together than apart",
        ],
        "war_declared" => &[
            "driven by long-festering territorial grievances",
            "as their ruler's ambition outweighed caution",
            "responding to cultural insults that could no longer be ignored",
            "as border skirmishes finally ignited into open war",
        ],
        "conquered" => &[
            "breaking the defenders' resistance at the frontier",
            "exploiting a moment of political weakness",
            "as superior numbers overwhelmed the garrison",
        ],
        "peace_tribute" => &[
            "as the defeated had nothing left to offer but compliance",
            "as the victor demanded recompense for the costs of war",
        ],
        "peace_treaty" => &[
            "as both sides counted their dead and found the price too high",
            "exhausted and depleted, they sought terms",
        ],
        "rebellion" => &[
            "as the people could no longer bear the weight of instability",
            "as neglected grievances turned to open defiance",
            "sparked by a moment of weakness at the center of power",
        ],
        "cultural_spread" => &[
            "as their way of life proved attractive to neighboring peoples",
            "carried by traders, travelers, and refugees into foreign lands",
        ],
        "population_boom" => &[
            "as peaceful years and fertile land bore fruit",
            "as prosperity drew settlers from distant regions",
        ],
        _ => &["for reasons lost to history"],
    };
    pool[rng.next_int(pool.len() as i32) as usize].to_string()
}

// ─── Event Construction and Teller Helpers ────────────────────────────────────

pub fn seconds_offset(id: u32) -> f64 {
    ((id as u64 * 7919) % 12000) as f64
}

pub fn create_event(
    next_id: &mut u32,
    year: i32,
    subject: String,
    action: String,
    object: String,
    caused_by: Option<String>,
    significance: f64,
    player_caused: bool,
    description: String,
    motivation: String,
    stat_deltas: Vec<StatDelta>,
) -> GameEvent {
    let id = *next_id;
    *next_id += 1;
    GameEvent {
        id: format!("evt_{}", id),
        tick: 0,
        year,
        seconds_offset: seconds_offset(id),
        subject,
        action,
        object,
        caused_by,
        significance,
        player_caused,
        description,
        motivation,
        stat_deltas,
    }
}

pub fn should_suppress_event(
    storyteller: &StorytellerState,
    current_year: i32,
    significance: f64,
) -> bool {
    if significance < 5.0 {
        return false;
    }
    if storyteller.high_sig_events_this_year >= storyteller.max_events_per_year {
        return true;
    }
    storyteller.cooldowns.iter().any(|cd| {
        cd.trigger_significance >= significance
            && current_year < cd.start_year + cd.duration_years
    })
}

pub fn register_high_sig_event(
    storyteller: &mut StorytellerState,
    event: &GameEvent,
    current_year: i32,
) {
    if event.significance < 5.0 {
        return;
    }
    storyteller.high_sig_events_this_year += 1;

    let mode_multiplier = match storyteller.mode {
        StorytellerMode::Clio => 1.5,
        StorytellerMode::Ares => 0.6,
        StorytellerMode::Tyche => 0.0,
    };

    let duration = (((event.significance - 4.0) * 2.0).max(0.0) * mode_multiplier).round() as i32;

    if duration > 0 {
        storyteller.cooldowns.push(CooldownEntry {
            trigger_event_id: event.id.clone(),
            trigger_significance: event.significance,
            start_year: current_year,
            duration_years: duration,
        });
    }
}

pub fn emit_event(
    storyteller: &mut StorytellerState,
    pool: &mut Vec<GameEvent>,
    event: GameEvent,
    year: i32,
) -> bool {
    if should_suppress_event(storyteller, year, event.significance) {
        return false;
    }
    register_high_sig_event(storyteller, &event, year);
    pool.push(event);
    true
}

pub fn get_cascade_threshold(
    storyteller: &StorytellerState,
    faction_id: &str,
    current_year: i32,
) -> f64 {
    let base = 0.4;
    if storyteller.spotlight_faction_id.as_deref() != Some(faction_id) {
        return base;
    }
    let elapsed = current_year - storyteller.spotlight_set_year;
    if elapsed >= storyteller.spotlight_decay_years {
        return base;
    }
    let decay_fraction = elapsed as f64 / storyteller.spotlight_decay_years as f64;
    let bonus = 0.15 * (1.0 - decay_fraction);
    base - bonus
}

pub fn get_gossip_boost(
    storyteller: &StorytellerState,
    faction_id: &str,
    current_year: i32,
) -> f64 {
    let base = 0.3;
    if storyteller.spotlight_faction_id.as_deref() != Some(faction_id) {
        return base;
    }
    let elapsed = current_year - storyteller.spotlight_set_year;
    if elapsed >= storyteller.spotlight_decay_years {
        return base;
    }
    0.5
}

// ─── Phase 1: Colonization & Settlement ───────────────────────────────────────

fn find_colonization_spot(world: &WorldState, faction: &Faction, rng: &mut SeededRNG) -> Option<Position> {
    let tiles = get_tiles_with_pos_for_faction(&world.map, &faction.id);
    if tiles.is_empty() {
        return None;
    }

    let unclaimed: HashSet<String> = world.resource_nodes.iter()
        .filter(|n| {
            if let Some(row) = world.map.tiles.get(n.position.y as usize) {
                if let Some(tile) = row.get(n.position.x as usize) {
                    return tile.faction_id.is_none();
                }
            }
            false
        })
        .map(|n| format!("{},{}", n.position.x, n.position.y))
        .collect();

    let mut good_tiles = Vec::new();
    for pos in &tiles {
        if let Some(row) = world.map.tiles.get(pos.y as usize) {
            if let Some(tile) = row.get(pos.x as usize) {
                match tile.biome {
                    Biome::Grassland | Biome::Forest | Biome::Rainforest => {
                        good_tiles.push(*pos);
                    }
                    _ => {}
                }
            }
        }
    }

    let pool = if !good_tiles.is_empty() { good_tiles } else { tiles };
    let mut candidates = Vec::new();
    for pos in pool {
        if let Some(row) = world.map.tiles.get(pos.y as usize) {
            if let Some(tile) = row.get(pos.x as usize) {
                if tile.settlement_id.is_none() {
                    candidates.push(pos);
                }
            }
        }
    }
    if candidates.is_empty() {
        return None;
    }

    let mut valid_candidates = Vec::new();
    for c in candidates {
        let too_close = world.settlements.iter().any(|s| {
            (s.position.x - c.x).abs() + (s.position.y - c.y).abs() < 8
        });
        if !too_close {
            valid_candidates.push(c);
        }
    }
    if valid_candidates.is_empty() {
        return None;
    }

    let prefers_resources = faction.ethics.trade == EthicStance::Embraced 
        || faction.ethics.expansion == EthicStance::Embraced;
        
    if prefers_resources && !unclaimed.is_empty() {
        let mut adjacent_to_resource = Vec::new();
        for c in &valid_candidates {
            let neighbors = [
                format!("{},{}", c.x - 1, c.y),
                format!("{},{}", c.x + 1, c.y),
                format!("{},{}", c.x, c.y - 1),
                format!("{},{}", c.x, c.y + 1),
            ];
            if neighbors.iter().any(|k| unclaimed.contains(k)) {
                adjacent_to_resource.push(*c);
            }
        }
        if !adjacent_to_resource.is_empty() {
            return Some(adjacent_to_resource[rng.next_int(adjacent_to_resource.len() as i32) as usize]);
        }
    }

    Some(valid_candidates[rng.next_int(valid_candidates.len() as i32) as usize])
}

pub fn phase_colonization(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_len = world.factions.len();

    for i in 0..factions_len {
        let col_prob = if world.factions[i].ethics.trade == EthicStance::Embraced 
            || world.factions[i].ethics.expansion == EthicStance::Embraced 
        {
            0.144
        } else {
            0.12
        };

        let faction = &world.factions[i];
        if faction.population > 600 && faction.wealth > 50.0 && faction.stability > 50.0 && rng.next_float() < col_prob {
            if let Some(spot) = find_colonization_spot(world, faction, rng) {
                let faction_id = faction.id.clone();
                let faction_name = faction.name.clone();
                let id = format!("settlement_{}_y{}", faction_id, year);
                
                let new_settlement = Settlement {
                    id: id.clone(),
                    name: format!("{} Frontier", faction_name),
                    position: spot,
                    faction_id: faction_id.clone(),
                    npcs: vec![format!("npc_pioneer_{}", id)],
                    items: Vec::new(),
                    faith: Vec::new(),
                    dominant_religion_id: None,
                    innovations: Vec::new(),
                };
                
                let npc_id = format!("npc_pioneer_{}", id);
                let npc = NPC {
                    id: npc_id.clone(),
                    name: NPC_NAMES[rng.next_int(NPC_NAMES.len() as i32) as usize].to_string(),
                    position: spot,
                    faction_id: faction_id.clone(),
                    personality: PERSONALITIES[rng.next_int(PERSONALITIES.len() as i32) as usize].clone(),
                    knowledge: Vec::new(),
                    dialogue_key: "default".to_string(),
                    alive: true,
                };
                
                world.settlements.push(new_settlement);
                world.npcs.push(npc);
                world.map.tiles[spot.y as usize][spot.x as usize].settlement_id = Some(id.clone());
                
                if let Some(f_mut) = world.factions.iter_mut().find(|f| f.id == faction_id) {
                    f_mut.settlements.push(id.clone());
                }

                let col_event = create_event(
                    next_id, year,
                    faction_id.clone(), "colonization".to_string(), id,
                    None, 5.0, false,
                    format!("{} founded a new colony on the frontier", faction_name),
                    "population pressure and economic expansion".to_string(),
                    vec![
                        StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Population, delta: -100 },
                        StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: -20 },
                    ],
                );
                
                emit_event(&mut world.storyteller, &mut events, col_event, year);
            }
        }
    }
    events
}

pub fn phase_settlement_growth(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_len = world.factions.len();

    for i in 0..factions_len {
        let faction = &world.factions[i];
        if faction.population < 150 && faction.settlements.len() > 1 && rng.next_float() < 0.15 {
            let s_idx = rng.next_int(faction.settlements.len() as i32) as usize;
            let s_id = faction.settlements[s_idx].clone();
            
            if let Some(settlement) = world.settlements.iter().find(|s| s.id == s_id) {
                let settlement_pos = settlement.position;
                let settlement_name = settlement.name.clone();
                let faction_id = faction.id.clone();
                let faction_name = faction.name.clone();
                
                world.ruins.push(crate::state::Ruin {
                    id: format!("ruin_abandoned_{}_{}", s_id, year),
                    name: format!("Abandoned {}", settlement_name),
                    position: settlement_pos,
                    former_faction_id: faction_id.clone(),
                    collapsed_year: year,
                });
                
                // Kill settlement npcs
                for npc_id in &settlement.npcs {
                    if let Some(npc) = world.npcs.iter_mut().find(|n| n.id == *npc_id) {
                        npc.alive = false;
                    }
                }
                
                world.settlements.retain(|s| s.id != s_id);
                if let Some(f_mut) = world.factions.iter_mut().find(|f| f.id == faction_id) {
                    f_mut.settlements.retain(|id| id != &s_id);
                }
                
                // Clear tile settlement_id
                world.map.tiles[settlement_pos.y as usize][settlement_pos.x as usize].settlement_id = None;

                let aban_event = create_event(
                    next_id, year,
                    faction_id.clone(), "abandonment".to_string(), s_id,
                    None, 4.0, false,
                    format!("{} was forced to abandon {} as its people fled", faction_name, settlement_name),
                    "loss of population and structural decay".to_string(),
                    Vec::new(),
                );
                
                emit_event(&mut world.storyteller, &mut events, aban_event, year);
            }
        }
    }
    events
}

// ─── Phase 2: Ecology ────────────────────────────────────────────────────────

pub fn phase_ecology(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    map_summary: &MapOwnershipSummary,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_len = world.factions.len();

    for i in 0..factions_len {
        let faction = &world.factions[i];
        let stats = match map_summary.get(&faction.id) {
            Some(s) if s.count > 0 => s,
            _ => continue,
        };

        let mut pop_delta_sum = 0.0;
        for (biome_str, count) in &stats.biome_counts {
            let biome = match biome_str.as_str() {
                "ocean" => Biome::Ocean,
                "coast" => Biome::Coast,
                "grassland" => Biome::Grassland,
                "forest" => Biome::Forest,
                "rainforest" => Biome::Rainforest,
                "arid" => Biome::Arid,
                "desert" => Biome::Desert,
                "tundra" => Biome::Tundra,
                "mountain" => Biome::Mountain,
                _ => continue,
            };
            pop_delta_sum += get_biome_pop_delta(&biome) * (*count as f64);
        }
        let pop_delta = pop_delta_sum / (stats.count as f64);

        let desert_count = *stats.biome_counts.get("desert").unwrap_or(&0);
        let tundra_count = *stats.biome_counts.get("tundra").unwrap_or(&0);
        let harsh_tiles = (desert_count + tundra_count) as f64;
        let harshness = harsh_tiles / (stats.count as f64);
        let is_famine = harshness > FAMINE_DESERT_THRESHOLD && faction.population > FAMINE_POPULATION_MIN as i32;

        let faction_id = faction.id.clone();
        let faction_name = faction.name.clone();

        if is_famine && rng.next_float() < 0.4 {
            let lost_pop = (faction.population as f64 * 0.1).round() as i32;
            let deltas = vec![
                StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Population, delta: -lost_pop },
                StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: -5 },
            ];
            let fam_event = create_event(
                next_id, year,
                faction_id.clone(), "famine".to_string(), faction_id,
                None, 4.0, false,
                format!("Famine struck {} as the harsh terrain could not support its people", faction_name),
                pick_motivation("famine", rng),
                deltas,
            );
            emit_event(&mut world.storyteller, &mut events, fam_event, year);
        } else if pop_delta > 0.0 && rng.next_float() < 0.3 {
            let growth = (faction.population as f64 * 0.05).round() as i32;
            let deltas = vec![
                StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Population, delta: growth },
            ];
            let boom_event = create_event(
                next_id, year,
                faction_id.clone(), "population_boom".to_string(), faction_id,
                None, 2.0, false,
                format!("{}'s population grew in the fertile lands", faction_name),
                pick_motivation("population_boom", rng),
                deltas,
            );
            emit_event(&mut world.storyteller, &mut events, boom_event, year);
        }
    }
    events
}

// ─── Phase 3: Economics ──────────────────────────────────────────────────────

pub fn get_ruler_for_faction<'a>(world: &'a WorldState, faction_id: &str) -> Option<&'a HistoricalFigure> {
    let faction = world.factions.iter().find(|f| f.id == faction_id)?;
    let leader_id = faction.leader_id.as_deref()?;
    world.historical_figures.iter().find(|hf| hf.id == leader_id)
}

pub fn has_trait(hf: Option<&HistoricalFigure>, r_trait: RulerTrait) -> bool {
    if let Some(figure) = hf {
        figure.traits.contains(&r_trait)
    } else {
        false
    }
}

pub fn phase_economics(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    map_summary: &MapOwnershipSummary,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_len = world.factions.len();

    for i in 0..factions_len {
        let faction = &world.factions[i];
        let stats = match map_summary.get(&faction.id) {
            Some(s) if s.count > 0 => s,
            _ => continue,
        };

        let ruler = get_ruler_for_faction(world, &faction.id);
        let mut wealth_delta_sum = 0.0;
        for (b_str, count) in &stats.biome_counts {
            let biome = match b_str.as_str() {
                "ocean" => Biome::Ocean,
                "coast" => Biome::Coast,
                "grassland" => Biome::Grassland,
                "forest" => Biome::Forest,
                "rainforest" => Biome::Rainforest,
                "arid" => Biome::Arid,
                "desert" => Biome::Desert,
                "tundra" => Biome::Tundra,
                "mountain" => Biome::Mountain,
                _ => continue,
            };
            wealth_delta_sum += get_biome_wealth_delta(&biome) * (*count as f64);
        }
        let mut wealth_delta = wealth_delta_sum / (stats.count as f64);
        if has_trait(ruler, RulerTrait::Industrious) {
            wealth_delta += 0.5;
        }
        if has_trait(ruler, RulerTrait::Corrupt) {
            wealth_delta += 0.3;
        }

        let upkeep = (faction.military / 100.0) * 2.0;
        let net_wealth = wealth_delta - upkeep;

        let faction_id = faction.id.clone();
        let faction_name = faction.name.clone();

        if net_wealth > 1.5 && faction.wealth < 80.0 && rng.next_float() < 0.25 {
            let deltas = vec![
                StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: (net_wealth * 3.0).round() as i32 },
            ];
            let eco_event = create_event(
                next_id, year,
                faction_id.clone(), "trade_boom".to_string(), faction_id.clone(),
                None, 2.0, false,
                format!("Trade flourished in {}'s territories", faction_name),
                pick_motivation("trade_boom", rng),
                deltas,
            );
            emit_event(&mut world.storyteller, &mut events, eco_event, year);
        } else if net_wealth < -1.0 && faction.wealth > 20.0 && rng.next_float() < 0.3 {
            let deltas = vec![
                StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: (net_wealth * 2.0).round() as i32 },
            ];
            let decline_event = create_event(
                next_id, year,
                faction_id.clone(), "economic_decline".to_string(), faction_id.clone(),
                None, 2.0, false,
                format!("{}'s treasury strained under military costs", faction_name),
                "as the cost of their armies outpaced what the land could yield".to_string(),
                deltas,
            );
            emit_event(&mut world.storyteller, &mut events, decline_event, year);
        }

        // Apply resource node yields
        apply_resource_node_yields(world, &faction_id, year, next_id, &mut events);
    }
    events
}

fn apply_resource_node_yields(
    world: &mut WorldState,
    faction_id: &str,
    year: i32,
    next_id: &mut u32,
    events: &mut Vec<GameEvent>,
) {
    let mut controlled_nodes_count = 0;
    let mut deltas = Vec::new();
    
    // Scan resource nodes
    for node in &world.resource_nodes {
        if let Some(row) = world.map.tiles.get(node.position.y as usize) {
            if let Some(tile) = row.get(node.position.x as usize) {
                if tile.faction_id.as_deref() == Some(faction_id) {
                    controlled_nodes_count += 1;
                    match node.node_type {
                        crate::state::ResourceNodeType::Iron => deltas.push((FactionStatKey::Military, 3)),
                        crate::state::ResourceNodeType::Gold => deltas.push((FactionStatKey::Wealth, 3)),
                        crate::state::ResourceNodeType::Relic => deltas.push((FactionStatKey::Culture, 2)),
                    }
                }
            }
        }
    }

    if controlled_nodes_count == 0 {
        return;
    }

    // Collapse
    let mut collapsed = HashMap::new();
    for (stat, val) in deltas {
        *collapsed.entry(stat).or_insert(0) += val;
    }

    let collapsed_deltas: Vec<StatDelta> = collapsed.into_iter()
        .map(|(stat, delta)| StatDelta {
            faction_id: faction_id.to_string(),
            stat,
            delta,
        })
        .collect();

    let faction_name = world.factions.iter().find(|f| f.id == faction_id)
        .map(|f| f.name.as_str()).unwrap_or("Faction").to_string();

    events.push(create_event(
        next_id, year,
        faction_id.to_string(), "resource_yield".to_string(), faction_id.to_string(),
        None, 1.0, false,
        format!("{} drew yield from {} resource node(s)", faction_name, controlled_nodes_count),
        "strategic control of natural wealth".to_string(),
        collapsed_deltas,
    ));
}

// ─── Phase 4: Trade ──────────────────────────────────────────────────────────

fn generate_simple_path(start: Position, end: Position) -> Vec<Position> {
    let mut path = Vec::new();
    let mut cx = start.x;
    let mut cy = start.y;
    path.push(Position { x: cx, y: cy });

    while cx != end.x || cy != end.y {
        if cx < end.x { cx += 1; } else if cx > end.x { cx -= 1; }
        if cy < end.y { cy += 1; } else if cy > end.y { cy -= 1; }
        path.push(Position { x: cx, y: cy });
    }
    path
}

pub fn phase_trade(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let mut insight_gained = 0;
    
    let sim_config = world.sim_config.clone().unwrap_or(SimConfig {
        schism_probability: SCHISM_PROBABILITY_BASE,
        tech_diffusion_rate: TECH_DIFFUSION_RATE,
        trade_decay_rate: TRADE_ROUTE_DECAY_RATE,
        trade_growth_rate: TRADE_ROUTE_GROWTH_RATE,
    });

    let settlements_len = world.settlements.len();

    // 1. Process routes
    for i in 0..world.trade_routes.len() {
        let mut route = world.trade_routes[i].clone();
        let start_sett = world.settlements.iter().find(|s| s.id == route.start_settlement_id).cloned();
        let end_sett = world.settlements.iter().find(|s| s.id == route.end_settlement_id).cloned();

        if start_sett.is_none() || end_sett.is_none() || !route.active {
            route.active = false;
            world.trade_routes[i] = route;
            continue;
        }

        let start = start_sett.unwrap();
        let end = end_sett.unwrap();

        let rel = world.relationships.iter().find(|r| {
            (r.faction_a == start.faction_id && r.faction_b == end.faction_id)
                || (r.faction_a == end.faction_id && r.faction_b == start.faction_id)
        });

        let is_war = rel.map(|r| r.state == DiplomaticState::War).unwrap_or(false);
        let old_volume = route.volume;

        if is_war {
            route.volume = (route.volume - sim_config.trade_decay_rate).max(0.0);
        } else {
            route.volume = (route.volume + sim_config.trade_growth_rate).min(100.0);
        }

        if old_volume >= 20.0 && route.volume < 20.0 && route.active {
            let collapse_evt = create_event(
                next_id, year,
                start.faction_id.clone(), "trade_collapse".to_string(), end.faction_id.clone(),
                None, 2.0, false,
                format!("The trade route between {} and {} has withered due to instability.", start.name, end.name),
                "".to_string(),
                Vec::new(),
            );
            emit_event(&mut world.storyteller, &mut events, collapse_evt, year);
        }

        if route.volume > 0.0 {
            let wealth_delta = (route.volume / 20.0).floor() as i32;
            if wealth_delta > 0 {
                if let Some(f1) = world.factions.iter_mut().find(|f| f.id == start.faction_id) {
                    f1.wealth = (f1.wealth + wealth_delta as f64).min(100.0);
                }
                if let Some(f2) = world.factions.iter_mut().find(|f| f.id == end.faction_id) {
                    f2.wealth = (f2.wealth + wealth_delta as f64).min(100.0);
                }
            }
        }

        if route.volume <= 0.0 {
            route.active = false;
        }

        if route.active && route.volume >= 80.0 {
            world.player.insight += 1;
            insight_gained += 1;
        }

        world.trade_routes[i] = route;
    }

    // 2. Spawn route
    let active_count = world.trade_routes.iter().filter(|r| r.active).count();
    if settlements_len >= 2 && active_count < (settlements_len as f64 * 0.75) as usize {
        let s1 = world.settlements[rng.next_int(settlements_len as i32) as usize].clone();
        let s2 = world.settlements[rng.next_int(settlements_len as i32) as usize].clone();

        if s1.id != s2.id {
            let exists = world.trade_routes.iter().any(|r| {
                r.active && (
                    (r.start_settlement_id == s1.id && r.end_settlement_id == s2.id)
                        || (r.start_settlement_id == s2.id && r.end_settlement_id == s1.id)
                )
            });

            if !exists {
                let dx = s1.position.x - s2.position.x;
                let dy = s1.position.y - s2.position.y;
                let dist = ((dx*dx + dy*dy) as f64).sqrt();

                if dist < 25.0 {
                    let path = generate_simple_path(s1.position, s2.position);
                    let commodities = [TradeCommodity::Grain, TradeCommodity::Luxury, TradeCommodity::Arms, TradeCommodity::Textiles];
                    let commodity = commodities[rng.next_int(4) as usize].clone();

                    let route_id = format!("route-{}-{}-{}", s1.id, s2.id, year);
                    world.trade_routes.push(TradeRoute {
                        id: route_id,
                        start_settlement_id: s1.id.clone(),
                        end_settlement_id: s2.id.clone(),
                        path,
                        volume: 20.0,
                        commodity,
                        active: true,
                    });

                    let comm_str = match world.trade_routes.last().unwrap().commodity {
                        TradeCommodity::Grain => "grain",
                        TradeCommodity::Luxury => "luxury",
                        TradeCommodity::Arms => "arms",
                        TradeCommodity::Textiles => "textiles",
                    };

                    let trade_est = create_event(
                        next_id, year,
                        s1.id, "trade_route_established".to_string(), s2.id,
                        None, 3.0, false,
                        format!("A new trade route in {} established between {} and {}.", comm_str, s1.name, s2.name),
                        "".to_string(),
                        Vec::new(),
                    );
                    emit_event(&mut world.storyteller, &mut events, trade_est, year);
                }
            }
        }
    }

    if insight_gained > 0 {
        let ins_evt = create_event(
            next_id, year,
            "player".to_string(), "trade_prosperity".to_string(), "world".to_string(),
            None, 2.0, false,
            format!("Flourishing trade routes granted the Traveler {} insight into the world's currents.", insight_gained),
            "".to_string(),
            Vec::new(),
        );
        emit_event(&mut world.storyteller, &mut events, ins_evt, year);
    }

    events
}

// ─── Phase 5: Religion ───────────────────────────────────────────────────────

pub fn apply_religion_pressure(world: &mut WorldState, settlement_id: &str, religion_id: &str, amount: i32) {
    if let Some(settlement) = world.settlements.iter_mut().find(|s| s.id == settlement_id) {
        let faction_id = settlement.faction_id.clone();
        let mut effective_amount = amount as f64;

        if let Some(faction) = world.factions.iter().find(|f| f.id == faction_id) {
            let resistance = faction.stability / 200.0;
            effective_amount = ((amount as f64) * (1.0 - resistance)).round().max(1.0);
        }

        let existing = settlement.faith.iter_mut().find(|f| f.religion_id == religion_id);
        if let Some(f_press) = existing {
            f_press.pressure = (f_press.pressure + effective_amount).min(100.0);
        } else {
            settlement.faith.push(crate::state::FaithPressure {
                religion_id: religion_id.to_string(),
                pressure: effective_amount,
            });
        }
    }
}

pub fn share_religion_faith(world: &mut WorldState, s1_id: &str, s2_id: &str, amount: i32) {
    // S1 -> S2
    let f1_list = if let Some(s1) = world.settlements.iter().find(|s| s.id == s1_id) {
        s1.faith.clone()
    } else {
        return;
    };
    for f1 in f1_list {
        if f1.pressure > 15.0 {
            let press = ((amount as f64) * (f1.pressure / 100.0)).round() as i32;
            apply_religion_pressure(world, s2_id, &f1.religion_id, press);
        }
    }

    // S2 -> S1
    let f2_list = if let Some(s2) = world.settlements.iter().find(|s| s.id == s2_id) {
        s2.faith.clone()
    } else {
        return;
    };
    for f2 in f2_list {
        if f2.pressure > 15.0 {
            let press = ((amount as f64) * (f2.pressure / 100.0)).round() as i32;
            apply_religion_pressure(world, s1_id, &f2.religion_id, press);
        }
    }
}

pub fn update_settlement_dominance(settlement: &mut Settlement) {
    if settlement.faith.is_empty() {
        settlement.dominant_religion_id = None;
        return;
    }
    let mut best = &settlement.faith[0];
    for f in &settlement.faith {
        if f.pressure > best.pressure {
            best = f;
        }
    }
    if best.pressure > 40.0 {
        settlement.dominant_religion_id = Some(best.religion_id.clone());
    } else {
        settlement.dominant_religion_id = None;
    }
}

pub fn phase_religion(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    
    // 1. Spread from Holy Sites
    let sites_len = world.holy_sites.len();
    let settlements_len = world.settlements.len();

    for i in 0..sites_len {
        let site = world.holy_sites[i].clone();
        for j in 0..settlements_len {
            let s_pos = world.settlements[j].position;
            let s_id = world.settlements[j].id.clone();
            
            let dx = site.position.x - s_pos.x;
            let dy = site.position.y - s_pos.y;
            let dist_sq = dx*dx + dy*dy;

            if dist_sq < 100 {
                let dist = (dist_sq as f64).sqrt();
                let mut pressure = (25.0 - (dist * 1.5).floor()).max(1.0) as i32;
                
                let tile = &world.map.tiles[site.position.y as usize][site.position.x as usize];
                let has_omen = tile.modifiers.as_ref().map(|mods| {
                    mods.iter().any(|m| matches!(m.modifier_type, TileModifierType::Omen))
                }).unwrap_or(false);

                if has_omen {
                    pressure *= 4;
                }

                apply_religion_pressure(world, &s_id, &site.religion_id, pressure);
            }
        }
    }

    // 2. Diffusion
    for i in 0..settlements_len {
        for j in (i+1)..settlements_len {
            let s1 = world.settlements[i].clone();
            let s2 = world.settlements[j].clone();
            let dx = s1.position.x - s2.position.x;
            let dy = s1.position.y - s2.position.y;
            let dist_sq = dx*dx + dy*dy;

            if dist_sq < 625 {
                let dist = (dist_sq as f64).sqrt();
                let base_press = (8.0 - (dist / 3.0).floor()).max(1.0) as i32;
                share_religion_faith(world, &s1.id, &s2.id, base_press);
            }
        }
    }

    // 3. Trade Route Diffusion
    let routes_len = world.trade_routes.len();
    for i in 0..routes_len {
        let route = world.trade_routes[i].clone();
        if !route.active || route.volume < 30.0 {
            continue;
        }
        let pressure = (route.volume / 8.0).floor() as i32;
        share_religion_faith(world, &route.start_settlement_id, &route.end_settlement_id, pressure);
    }

    // 4. Martyrdom
    check_martyrdom(world, year, next_id, &mut events);

    // 5. Dom shifts
    for i in 0..settlements_len {
        let mut settlement = world.settlements[i].clone();
        let old_dom = settlement.dominant_religion_id.clone();
        update_settlement_dominance(&mut settlement);

        if settlement.dominant_religion_id.is_some() && settlement.dominant_religion_id != old_dom {
            let religion_id = settlement.dominant_religion_id.clone().unwrap();
            let has_omen = world.map.tiles[settlement.position.y as usize][settlement.position.x as usize]
                .modifiers.as_ref()
                .map(|mods| mods.iter().any(|m| matches!(m.modifier_type, TileModifierType::Omen)))
                .unwrap_or(false);

            let rel_name = world.religions.iter().find(|r| r.id == religion_id)
                .map(|r| r.name.as_str()).unwrap_or("a new faith");

            let omen_suffix = if has_omen { " as prophesied by a Sacred Omen" } else { "" };
            
            let conv_event = create_event(
                next_id, year,
                settlement.id.clone(), "religious_conversion".to_string(), religion_id.clone(),
                None, 4.0, has_omen,
                format!("{} has converted to {}{}.", settlement.name, rel_name, omen_suffix),
                "".to_string(),
                Vec::new(),
            );

            if !should_suppress_event(&world.storyteller, year, conv_event.significance) {
                world.storyteller.tension = (world.storyteller.tension + if has_omen { 8.0 } else { 4.0 }).min(100.0);
                
                // Update dominance in list
                world.settlements[i].dominant_religion_id = settlement.dominant_religion_id.clone();
                events.push(conv_event.clone());
                register_high_sig_event(&mut world.storyteller, &conv_event, year);

                let fact_id = settlement.faction_id.clone();
                let religion = world.religions.iter().find(|r| r.id == religion_id).cloned();

                if let Some(faction) = world.factions.iter_mut().find(|f| f.id == fact_id) {
                    if let Some(ig) = faction.interest_groups.iter_mut().find(|g| matches!(g.ig_type, InterestGroupType::Religious)) {
                        ig.power = (ig.power + 6.0).min(100.0);
                    }

                    if let Some(rel) = religion {
                        for tenet in &rel.tenets {
                            let (stat, delta_val) = match tenet {
                                ReligionTenet::Peace => (FactionStatKey::Stability, 2.0),
                                ReligionTenet::War => (FactionStatKey::Military, 2.0),
                                ReligionTenet::Charity => (FactionStatKey::Population, 5.0),
                                ReligionTenet::Knowledge => (FactionStatKey::Culture, 3.0),
                                ReligionTenet::Wealth => (FactionStatKey::Wealth, 2.0),
                            };
                            let cur = get_faction_stat(faction, &stat);
                            let next = cur + delta_val;
                            let (min, max) = match stat {
                                FactionStatKey::Population => (0.0, 2000.0),
                                _ => (0.0, 100.0),
                            };
                            let clamped = next.max(min).min(max);
                            set_faction_stat(faction, &stat, clamped);
                        }

                        if rel.tenets.contains(&ReligionTenet::Peace) || rel.tenets.contains(&ReligionTenet::Charity) {
                            faction.ethics.mercy = shift_toward_embraced(faction.ethics.mercy.clone());
                            faction.ethics.tradition = shift_toward_embraced(faction.ethics.tradition.clone());
                        }
                        if rel.tenets.contains(&ReligionTenet::War) {
                            faction.ethics.violence = shift_toward_embraced(faction.ethics.violence.clone());
                        }
                    }
                }
            }
        }

        // Schisms
        check_schism(world, &world.settlements[i].clone(), year, rng, next_id, &mut events);

        // Decay other faiths
        let dom_id = world.settlements[i].dominant_religion_id.clone();
        if let Some(dom_rel) = &dom_id {
            let dom_press = world.settlements[i].faith.iter()
                .find(|f| &f.religion_id == dom_rel)
                .map(|f| f.pressure).unwrap_or(0.0);

            for f in &mut world.settlements[i].faith {
                if &f.religion_id != dom_rel {
                    let persecution = (dom_press / 20.0).floor() as i32;
                    f.pressure = (f.pressure - (3.0 + persecution as f64)).max(0.0);
                }
            }
            world.settlements[i].faith.retain(|f| f.pressure > 0.0);
        }
    }

    events
}

fn check_schism(
    world: &mut WorldState,
    settlement: &Settlement,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
    events: &mut Vec<GameEvent>,
) {
    let contested: Vec<crate::state::FaithPressure> = settlement.faith.iter()
        .filter(|f| f.pressure > 40.0)
        .cloned()
        .collect();

    if contested.len() < 2 {
        return;
    }

    let schism_prob = world.sim_config.as_ref().map(|c| c.schism_probability).unwrap_or(SCHISM_PROBABILITY_BASE);
    if rng.next_float() >= schism_prob {
        return;
    }

    let tile = &world.map.tiles[settlement.position.y as usize][settlement.position.x as usize];
    let has_omen = tile.modifiers.as_ref()
        .map(|mods| mods.iter().any(|m| matches!(m.modifier_type, TileModifierType::Omen)))
        .unwrap_or(false);

    let fact_id = settlement.faction_id.clone();
    let rel_a = world.religions.iter().find(|r| r.id == contested[0].religion_id).cloned();
    let rel_b = world.religions.iter().find(|r| r.id == contested[1].religion_id).cloned();

    let sch_evt = create_event(
        next_id, year,
        settlement.id.clone(), "religious_schism".to_string(), contested[0].religion_id.clone(),
        None, 5.0, has_omen,
        format!("A schism erupted in {} between followers of {} and {}.", 
            settlement.name, 
            rel_a.map(|r| r.name).unwrap_or("an old faith".to_string()),
            rel_b.map(|r| r.name).unwrap_or("a new faith".to_string())
        ),
        "".to_string(),
        vec![StatDelta { faction_id: fact_id.clone(), stat: FactionStatKey::Stability, delta: -8 }],
    );

    if !should_suppress_event(&world.storyteller, year, sch_evt.significance) {
        world.storyteller.tension = (world.storyteller.tension + if has_omen { 12.0 } else { 6.0 }).min(100.0);
        events.push(sch_evt.clone());
        register_high_sig_event(&mut world.storyteller, &sch_evt, year);
        apply_stat_deltas(world, &sch_evt.stat_deltas);

        if let Some(faction) = world.factions.iter_mut().find(|f| f.id == fact_id) {
            if let Some(mil_ig) = faction.interest_groups.iter_mut().find(|g| matches!(g.ig_type, InterestGroupType::Military)) {
                mil_ig.power = (mil_ig.power + 5.0).min(100.0);
            }
        }
    }
}

fn check_martyrdom(world: &mut WorldState, year: i32, next_id: &mut u32, events: &mut Vec<GameEvent>) {
    let recent_deaths: Vec<GameEvent> = world.events.iter()
        .filter(|e| e.year == year - 1 && e.action == "death")
        .cloned()
        .collect();

    for death in recent_deaths {
        if let Some(figure) = world.historical_figures.iter().find(|hf| hf.id == death.subject) {
            if figure.traits.contains(&RulerTrait::Pious) {
                let fact_id = figure.faction_id.clone();
                let prim_rel_id = format!("rel_{}", fact_id);
                let prim_rel = world.religions.iter().find(|r| r.id == prim_rel_id).cloned();

                if let Some(rel) = prim_rel {
                    let mart_evt = create_event(
                        next_id, year,
                        figure.id.clone(), "martyrdom".to_string(), rel.id.clone(),
                        Some(death.id.clone()), 5.0, false,
                        format!("The passing of the pious {} has sparked a wave of religious fervor for {}.", figure.name, rel.name),
                        "".to_string(),
                        Vec::new(),
                    );

                    if !should_suppress_event(&world.storyteller, year, mart_evt.significance) {
                        let settlement_ids: Vec<String> = world.factions.iter()
                            .find(|f| f.id == fact_id)
                            .map(|f| f.settlements.clone())
                            .unwrap_or(Vec::new());

                        for s_id in settlement_ids {
                            apply_religion_pressure(world, &s_id, &rel.id, 15);
                        }

                        events.push(mart_evt.clone());
                        register_high_sig_event(&mut world.storyteller, &mart_evt, year);
                    }
                }
            }
        }
    }
}

// ─── Phase 6: Technology ─────────────────────────────────────────────────────

const INNOVATION_TEMPLATES: &[(InnovationType, &str, &str)] = &[
    (InnovationType::Agriculture, "Advanced Irrigation", "Sophisticated water management systems that increase crop yields."),
    (InnovationType::Metallurgy, "Blast Furnaces", "High-temperature furnaces for producing superior steel."),
    (InnovationType::Navigation, "Lateen Sails", "Triangular sails that allow for better maneuverability at sea."),
    (InnovationType::Scholarship, "Printing Press", "Mechanized movable type for rapid dissemination of knowledge."),
    (InnovationType::Engineering, "Fortification Architecture", "Modern defensive structures designed to withstand sieges."),
];

pub fn phase_tech(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let settlements_len = world.settlements.len();

    // 1. Discovery
    for i in 0..settlements_len {
        let sett = world.settlements[i].clone();
        if let Some(faction) = world.factions.iter().find(|f| f.id == sett.faction_id) {
            let chance = (faction.culture + faction.wealth) / 5000.0;
            if rng.next_float() < chance {
                let available_techs: Vec<(InnovationType, &str, &str)> = INNOVATION_TEMPLATES.iter()
                    .filter(|&&(t, _, _)| !world.innovations.iter().any(|i| i.innovation_type == t))
                    .cloned()
                    .collect();

                if !available_techs.is_empty() {
                    let selection = rng.next_int(available_techs.len() as i32) as usize;
                    let (t_type, t_name, t_desc) = &available_techs[selection];
                    
                    let type_str = match t_type {
                        InnovationType::Agriculture => "agriculture",
                        InnovationType::Metallurgy => "metallurgy",
                        InnovationType::Navigation => "navigation",
                        InnovationType::Scholarship => "scholarship",
                        InnovationType::Engineering => "engineering",
                    };

                    let disc_evt = create_event(
                        next_id, year,
                        sett.id.clone(), "tech_discovery".to_string(), type_str.to_string(),
                        None, 6.0, false,
                        format!("The scholars of {} have discovered {}: {}", sett.name, t_name, t_desc),
                        "".to_string(),
                        Vec::new(),
                    );

                    if !should_suppress_event(&world.storyteller, year, disc_evt.significance) {
                        let new_inno_id = format!("tech_{}_{}", type_str, year);
                        
                        world.innovations.push(Innovation {
                            id: new_inno_id.clone(),
                            name: t_name.to_string(),
                            innovation_type: t_type.clone(),
                            description: t_desc.to_string(),
                            origin_year: year,
                            origin_settlement_id: sett.id.clone(),
                        });
                        
                        world.settlements[i].innovations.push(new_inno_id.clone());

                        if let Some(fact_mut) = world.factions.iter_mut().find(|f| f.id == sett.faction_id) {
                            fact_mut.innovations.push(new_inno_id.clone());
                        }

                        events.push(disc_evt.clone());
                        register_high_sig_event(&mut world.storyteller, &disc_evt, year);
                        apply_stat_deltas(world, &[StatDelta { faction_id: sett.faction_id.clone(), stat: FactionStatKey::Culture, delta: 10 }]);
                    }
                }
            }
        }
    }

    // 2. Diffusion
    let mut recent_whispered_innovations = HashSet::new();
    for event in &world.events {
        if event.year >= year - 5 && event.action == "whisper" {
            recent_whispered_innovations.insert(event.object.clone());
        }
    }

    let innovations_len = world.innovations.len();
    for i in 0..innovations_len {
        let innovation = world.innovations[i].clone();
        let inno_id = innovation.id.clone();
        let diffusion_rate = world.sim_config.as_ref().map(|c| c.tech_diffusion_rate).unwrap_or(TECH_DIFFUSION_RATE);

        let type_str = match innovation.innovation_type {
            InnovationType::Agriculture => "agriculture",
            InnovationType::Metallurgy => "metallurgy",
            InnovationType::Navigation => "navigation",
            InnovationType::Scholarship => "scholarship",
            InnovationType::Engineering => "engineering",
        };

        let known_settlement_ids: Vec<String> = world.settlements.iter()
            .filter(|s| s.innovations.contains(&inno_id))
            .map(|s| s.id.clone())
            .collect();

        for known_s_id in known_settlement_ids {
            let known_s = world.settlements.iter().find(|s| s.id == known_s_id).cloned().unwrap();
            for j in 0..world.settlements.len() {
                let target_s = &world.settlements[j];
                if target_s.innovations.contains(&inno_id) {
                    continue;
                }

                let dx = known_s.position.x - target_s.position.x;
                let dy = known_s.position.y - target_s.position.y;
                let dist_sq = dx*dx + dy*dy;

                let mut spread_chance = 0.0;
                if dist_sq < 225 {
                    let dist = (dist_sq as f64).sqrt();
                    spread_chance = diffusion_rate * (1.0 - dist / 15.0);
                }

                let has_route = world.trade_routes.iter().find(|r| {
                    r.active && (
                        (r.start_settlement_id == known_s.id && r.end_settlement_id == target_s.id)
                            || (r.start_settlement_id == target_s.id && r.end_settlement_id == known_s.id)
                    )
                });

                if let Some(r) = has_route {
                    spread_chance += r.volume / 200.0;
                }

                let has_recent_whisper = recent_whispered_innovations.contains(type_str);
                if has_recent_whisper {
                    spread_chance *= 3.0;
                }

                if rng.next_float() < spread_chance {
                    let target_s_id = target_s.id.clone();
                    let target_s_name = target_s.name.clone();
                    let target_faction_id = target_s.faction_id.clone();

                    let adopt_evt = create_event(
                        next_id, year,
                        target_s_id.clone(), "tech_adoption".to_string(), type_str.to_string(),
                        Some(inno_id.clone()), 3.0, has_recent_whisper,
                        format!("{} has adopted the knowledge of {}.", target_s_name, innovation.name),
                        "".to_string(),
                        Vec::new(),
                    );

                    if !should_suppress_event(&world.storyteller, year, adopt_evt.significance) {
                        if let Some(f_mut) = world.factions.iter_mut().find(|f| f.id == target_faction_id) {
                            if !f_mut.innovations.contains(&inno_id) {
                                f_mut.innovations.push(inno_id.clone());
                                world.settlements[j].innovations.push(inno_id.clone());
                                events.push(adopt_evt.clone());
                                apply_stat_deltas(world, &[StatDelta { faction_id: target_faction_id.clone(), stat: FactionStatKey::Culture, delta: 2 }]);
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Apply Impacts
    let factions_len = world.factions.len();
    for i in 0..factions_len {
        let faction_id = world.factions[i].id.clone();
        let inno_ids = world.factions[i].innovations.clone();
        
        let mut deltas = Vec::new();
        for inno_id in inno_ids {
            if let Some(inno) = world.innovations.iter().find(|inv| inv.id == inno_id) {
                match inno.innovation_type {
                    InnovationType::Agriculture => {
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Population, delta: 2 });
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: 1 });
                    }
                    InnovationType::Metallurgy => {
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Military, delta: 2 });
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: 1 });
                    }
                    InnovationType::Navigation => {
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: 3 });
                    }
                    InnovationType::Scholarship => {
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Culture, delta: 3 });
                    }
                    InnovationType::Engineering => {
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Military, delta: 1 });
                        deltas.push(StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: 2 });
                    }
                }
            }
        }
        if !deltas.is_empty() {
            apply_stat_deltas(world, &deltas);
        }
    }

    events
}

// ─── Phase 7: Interest Groups ────────────────────────────────────────────────

pub fn phase_interest_groups(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_len = world.factions.len();

    for i in 0..factions_len {
        let faction_id = world.factions[i].id.clone();
        let faction_name = world.factions[i].name.clone();
        
        let ig_len = world.factions[i].interest_groups.len();
        for j in 0..ig_len {
            let mut ig = world.factions[i].interest_groups[j].clone();
            let mut power_delta = 0;

            match ig.ig_type {
                InterestGroupType::Military => {
                    if world.factions[i].military > 60.0 { power_delta += 2; }
                    if world.factions[i].stability < 40.0 { power_delta += 3; }
                }
                InterestGroupType::Merchant => {
                    if world.factions[i].wealth > 60.0 { power_delta += 2; }
                }
                InterestGroupType::Religious => {
                    if world.factions[i].culture > 50.0 { power_delta += 2; }
                }
                _ => {}
            }

            ig.power = (ig.power + power_delta as f64 - 1.0).max(5.0).min(100.0);

            if ig.power > 70.0 && rng.next_float() < 0.1 {
                // Bias keys
                let mut bias_keys = Vec::new();
                if ig.ethics_bias.violence.is_some() { bias_keys.push("violence"); }
                if ig.ethics_bias.expansion.is_some() { bias_keys.push("expansion"); }
                if ig.ethics_bias.trade.is_some() { bias_keys.push("trade"); }
                if ig.ethics_bias.tradition.is_some() { bias_keys.push("tradition"); }
                if ig.ethics_bias.mercy.is_some() { bias_keys.push("mercy"); }

                if !bias_keys.is_empty() {
                    let bias_key = bias_keys[rng.next_int(bias_keys.len() as i32) as usize];
                    let stance = match bias_key {
                        "violence" => ig.ethics_bias.violence.clone().unwrap(),
                        "expansion" => ig.ethics_bias.expansion.clone().unwrap(),
                        "trade" => ig.ethics_bias.trade.clone().unwrap(),
                        "tradition" => ig.ethics_bias.tradition.clone().unwrap(),
                        "mercy" => ig.ethics_bias.mercy.clone().unwrap(),
                        _ => EthicStance::Neutral,
                    };

                    let current_stance = match bias_key {
                        "violence" => world.factions[i].ethics.violence.clone(),
                        "expansion" => world.factions[i].ethics.expansion.clone(),
                        "trade" => world.factions[i].ethics.trade.clone(),
                        "tradition" => world.factions[i].ethics.tradition.clone(),
                        "mercy" => world.factions[i].ethics.mercy.clone(),
                        _ => EthicStance::Neutral,
                    };

                    if current_stance != stance {
                        match bias_key {
                            "violence" => world.factions[i].ethics.violence = stance.clone(),
                            "expansion" => world.factions[i].ethics.expansion = stance.clone(),
                            "trade" => world.factions[i].ethics.trade = stance.clone(),
                            "tradition" => world.factions[i].ethics.tradition = stance.clone(),
                            "mercy" => world.factions[i].ethics.mercy = stance.clone(),
                            _ => {}
                        }

                        let stance_str = match stance {
                            EthicStance::Embraced => "embraced",
                            EthicStance::Neutral => "neutral",
                            EthicStance::Shunned => "shunned",
                        };

                        let eth_evt = create_event(
                            next_id, year,
                            faction_id.clone(), "ethics_shift".to_string(), ig.id.clone(),
                            None, 4.0, false,
                            format!("The {} shifted {}'s stance on {} towards {}", ig.name, faction_name, bias_key, stance_str),
                            "political lobbying and internal pressure".to_string(),
                            Vec::new(),
                        );
                        emit_event(&mut world.storyteller, &mut events, eth_evt, year);
                    }
                }
            }

            world.factions[i].interest_groups[j] = ig;
        }
    }

    events
}

// ─── Phase 8: Politics ───────────────────────────────────────────────────────

pub fn phase_politics(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let rels_len = world.relationships.len();

    for i in 0..rels_len {
        let mut rel = world.relationships[i].clone();
        let f_a = world.factions.iter().find(|f| f.id == rel.faction_a).cloned();
        let f_b = world.factions.iter().find(|f| f.id == rel.faction_b).cloned();
        
        if f_a.is_none() || f_b.is_none() {
            continue;
        }
        let a = f_a.unwrap();
        let b = f_b.unwrap();

        let ruler_a = get_ruler_for_faction(world, &a.id);
        let ruler_b = get_ruler_for_faction(world, &b.id);

        let divergence = compute_ethics_divergence(&a.ethics, &b.ethics);
        if divergence > 2.0 {
            rel.animosity = (rel.animosity + (divergence * 0.5).round()).min(200.0);
        }

        if has_trait(ruler_a, RulerTrait::Xenophobic) || has_trait(ruler_b, RulerTrait::Xenophobic) {
            rel.animosity = (rel.animosity + 2.0).min(200.0);
        }

        if has_trait(ruler_a, RulerTrait::Diplomatic) || has_trait(ruler_b, RulerTrait::Diplomatic) {
            rel.opinion = (rel.opinion + 1.0).min(100.0);
        }

        if rel.state == DiplomaticState::Peace 
            && rel.opinion >= ALLIANCE_OPINION_MIN 
            && a.stability >= 40.0 
            && b.stability >= 40.0 
            && rng.next_float() < 0.05 
        {
            let ally_evt = create_event(
                next_id, year,
                a.id.clone(), "alliance_formed".to_string(), b.id.clone(),
                None, 5.0, false,
                format!("{} and {} forged a formal alliance", a.name, b.name),
                pick_motivation("alliance_formed", rng),
                vec![
                    StatDelta { faction_id: a.id.clone(), stat: FactionStatKey::Stability, delta: 5 },
                    StatDelta { faction_id: b.id.clone(), stat: FactionStatKey::Stability, delta: 5 },
                ],
            );

            if !should_suppress_event(&world.storyteller, year, ally_evt.significance) {
                rel.state = DiplomaticState::Alliance;
                events.push(ally_evt.clone());
                register_high_sig_event(&mut world.storyteller, &ally_evt, year);
                apply_stat_deltas(world, &ally_evt.stat_deltas);
            }
        }

        world.relationships[i] = rel;
    }

    // Aggression modulation
    let factions_len = world.factions.len();
    for i in 0..factions_len {
        let leader_id = world.factions[i].leader_id.clone();
        let traits = if let Some(lid) = leader_id {
            world.historical_figures.iter()
                .find(|hf| hf.id == lid)
                .map(|hf| hf.traits.clone())
                .unwrap_or_default()
        } else {
            Vec::new()
        };
        
        if traits.contains(&RulerTrait::Diplomatic) && world.factions[i].aggression > 0.0 {
            world.factions[i].aggression = (world.factions[i].aggression - 1.0).max(0.0);
        }
        if traits.contains(&RulerTrait::Xenophobic) && world.factions[i].aggression < 100.0 {
            world.factions[i].aggression = (world.factions[i].aggression + 1.0).min(100.0);
        }
    }

    events
}

// ─── Phase 9: Conflict ───────────────────────────────────────────────────────

pub fn phase_conflict(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let rels_len = world.relationships.len();

    for i in 0..rels_len {
        let mut rel = world.relationships[i].clone();
        
        if rel.state == DiplomaticState::War {
            if let Some(winner_id) = resolve_war(world, &mut rel, year, rng, next_id, &mut events) {
                let loser_id = if rel.faction_a == winner_id { rel.faction_b.clone() } else { rel.faction_a.clone() };
                let winner_name = world.factions.iter().find(|f| f.id == winner_id).map(|f| f.name.as_str()).unwrap_or("Faction A").to_string();
                let loser_name = world.factions.iter().find(|f| f.id == loser_id).map(|f| f.name.as_str()).unwrap_or("Faction B").to_string();

                let peace_type = if rng.next_float() < 0.4 { "peace_tribute" } else { "peace_treaty" };

                let peace_evt = create_event(
                    next_id, year,
                    winner_id.clone(), peace_type.to_string(), loser_id.clone(),
                    None, 5.0, false,
                    format!("The war between {} and {} ended", winner_name, loser_name),
                    pick_motivation(peace_type, rng),
                    vec![
                        StatDelta { faction_id: rel.faction_a.clone(), stat: FactionStatKey::Stability, delta: -10 },
                        StatDelta { faction_id: rel.faction_b.clone(), stat: FactionStatKey::Stability, delta: -10 },
                    ],
                );

                if !should_suppress_event(&world.storyteller, year, peace_evt.significance) {
                    rel.state = DiplomaticState::Peace;
                    rel.animosity = (rel.animosity - 30.0).max(0.0);
                    events.push(peace_evt.clone());
                    register_high_sig_event(&mut world.storyteller, &peace_evt, year);
                    apply_stat_deltas(world, &peace_evt.stat_deltas);
                }
            }
            world.relationships[i] = rel;
            continue;
        }

        if rel.animosity >= WAR_ANIMOSITY_THRESHOLD && rel.state != DiplomaticState::Alliance {
            let f_a = world.factions.iter().find(|f| f.id == rel.faction_a).cloned();
            let f_b = world.factions.iter().find(|f| f.id == rel.faction_b).cloned();
            if f_a.is_none() || f_b.is_none() {
                continue;
            }
            let a = f_a.unwrap();
            let b = f_b.unwrap();

            let border_tiles = count_shared_border_tiles(&world.map, &a.id, &b.id);
            if border_tiles == 0 {
                continue;
            }

            let max_aggr = a.aggression.max(b.aggression);
            let war_prob = ((rel.animosity / 200.0) * 0.6 + (max_aggr / 100.0) * 0.2).min(0.8);

            if rng.next_float() < war_prob {
                let war_evt = create_event(
                    next_id, year,
                    a.id.clone(), "war_declared".to_string(), b.id.clone(),
                    None, 6.0, false,
                    format!("{} declared war on {}", a.name, b.name),
                    pick_motivation("war_declared", rng),
                    vec![
                        StatDelta { faction_id: a.id.clone(), stat: FactionStatKey::Stability, delta: -8 },
                        StatDelta { faction_id: b.id.clone(), stat: FactionStatKey::Stability, delta: -8 },
                    ],
                );

                if !should_suppress_event(&world.storyteller, year, war_evt.significance) {
                    rel.state = DiplomaticState::War;
                    events.push(war_evt.clone());
                    register_high_sig_event(&mut world.storyteller, &war_evt, year);
                    apply_stat_deltas(world, &war_evt.stat_deltas);
                }
            }
        }

        world.relationships[i] = rel;
    }

    events
}

fn resolve_war(
    world: &mut WorldState,
    rel: &mut FactionRelationship,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
    events: &mut Vec<GameEvent>,
) -> Option<String> {
    let f_a = world.factions.iter().find(|f| f.id == rel.faction_a).cloned()?;
    let f_b = world.factions.iter().find(|f| f.id == rel.faction_b).cloned()?;

    let str_a = f_a.military * (f_a.stability / 100.0);
    let str_b = f_b.military * (f_b.stability / 100.0);
    let total = str_a + str_b;
    if total == 0.0 {
        return None;
    }

    if rng.next_float() > 0.4 {
        return None;
    }

    let f_a_wins = rng.next_float() < str_a / total;
    let winner = if f_a_wins { &f_a } else { &f_b };
    let loser = if f_a_wins { &f_b } else { &f_a };

    let conq_evt = create_event(
        next_id, year,
        winner.id.clone(), "conquered".to_string(), loser.id.clone(),
        None, 7.0, false,
        format!("{} pushed back {}'s forces and seized territory", winner.name, loser.name),
        pick_motivation("conquered", rng),
        vec![
            StatDelta { faction_id: winner.id.clone(), stat: FactionStatKey::Military, delta: -10 },
            StatDelta { faction_id: winner.id.clone(), stat: FactionStatKey::Wealth, delta: 15 },
            StatDelta { faction_id: loser.id.clone(), stat: FactionStatKey::Military, delta: -20 },
            StatDelta { faction_id: loser.id.clone(), stat: FactionStatKey::Stability, delta: -15 },
            StatDelta { faction_id: loser.id.clone(), stat: FactionStatKey::Population, delta: -50 },
        ],
    );

    if should_suppress_event(&world.storyteller, year, conq_evt.significance) {
        return None;
    }

    let border_tiles = get_border_tiles_of(&world.map, &loser.id, &winner.id);
    let tiles_to_transfer = (border_tiles.len() as f64 * 0.3).floor().max(1.0).min(border_tiles.len() as f64) as usize;

    let mut loser_settlements: HashSet<String> = loser.settlements.iter().cloned().collect();
    let mut winner_settlements: HashSet<String> = winner.settlements.iter().cloned().collect();

    for i in 0..tiles_to_transfer {
        let pos = border_tiles[i];
        let tile = &mut world.map.tiles[pos.y as usize][pos.x as usize];

        if let Some(sett_id) = &tile.settlement_id {
            let sett_id_cl = sett_id.clone();
            if let Some(s) = world.settlements.iter_mut().find(|set| set.id == sett_id_cl) {
                if s.faction_id != winner.id {
                    s.faction_id = winner.id.clone();
                    loser_settlements.remove(&s.id);
                    winner_settlements.insert(s.id.clone());

                    for ty in 0..world.map.height {
                        for tx in 0..world.map.width {
                            if world.map.tiles[ty as usize][tx as usize].settlement_id.as_ref() == Some(&s.id) {
                                world.map.tiles[ty as usize][tx as usize].faction_id = Some(winner.id.clone());
                            }
                        }
                    }
                }
            }
        } else {
            tile.faction_id = Some(winner.id.clone());
        }
    }

    if let Some(w_mut) = world.factions.iter_mut().find(|f| f.id == winner.id) {
        w_mut.settlements = winner_settlements.into_iter().collect();
    }
    if let Some(l_mut) = world.factions.iter_mut().find(|f| f.id == loser.id) {
        l_mut.settlements = loser_settlements.into_iter().collect();
    }

    events.push(conq_evt.clone());
    register_high_sig_event(&mut world.storyteller, &conq_evt, year);
    apply_stat_deltas(world, &conq_evt.stat_deltas);

    let loser_stab = world.factions.iter().find(|f| f.id == loser.id).map(|f| f.stability).unwrap_or(100.0);
    if loser_stab < 20.0 && rng.next_float() < 0.3 {
        let loser_cl = world.factions.iter().find(|f| f.id == loser.id).cloned().unwrap();
        if let Some(frac_evt) = fracture_faction(world, &loser_cl, year, rng, next_id) {
            emit_event(&mut world.storyteller, events, frac_evt, year);
        }
    }

    Some(winner.id.clone())
}

pub fn fracture_faction(
    world: &mut WorldState,
    original: &Faction,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Option<GameEvent> {
    let tiles = get_tiles_with_pos_for_faction(&world.map, &original.id);
    if tiles.len() < 10 {
        return None;
    }

    let capital_id = original.settlements.get(0)?;
    let capital = world.settlements.iter().find(|s| &s.id == capital_id)?;
    let cap_pos = capital.position;

    let mut furthest = tiles[0];
    let mut max_dist = -1;
    for t in &tiles {
        let d = (t.x - cap_pos.x).abs() + (t.y - cap_pos.y).abs();
        if d > max_dist {
            max_dist = d;
            furthest = *t;
        }
    }

    let new_faction_id = format!("faction_rebel_{}_{}_{}", original.id, year, (rng.next_float() * 1000.0).floor() as i32);

    if should_suppress_event(&world.storyteller, year, 8.0) {
        return None;
    }

    let target_count = (tiles.len() as f64 * 0.3).floor() as usize;
    let mut queue = vec![furthest];
    let mut claimed = HashSet::new();
    let mut new_tiles = Vec::new();

    while !queue.is_empty() && new_tiles.len() < target_count {
        let curr = queue.remove(0);
        let key = (curr.x, curr.y);
        if claimed.contains(&key) {
            continue;
        }
        claimed.insert(key);
        new_tiles.push(curr);

        let neighbors = [
            Position { x: curr.x - 1, y: curr.y },
            Position { x: curr.x + 1, y: curr.y },
            Position { x: curr.x, y: curr.y - 1 },
            Position { x: curr.x, y: curr.y + 1 },
        ];
        for n in neighbors {
            if n.x >= 0 && n.y >= 0 && n.x < world.map.width && n.y < world.map.height {
                if world.map.tiles[n.y as usize][n.x as usize].faction_id.as_deref() == Some(&original.id) {
                    queue.push(n);
                }
            }
        }
    }

    let new_faction = Faction {
        id: new_faction_id.clone(),
        name: format!("{} Remnant", original.name),
        color: format!("#{:06x}", (rng.next_float() * 16777215.0).floor() as u32),
        aggression: original.aggression,
        population: original.population,
        stability: 50.0,
        wealth: (original.wealth * 0.3).round(),
        military: (original.military * 0.4).round(),
        culture: original.culture,
        tech_level: original.tech_level,
        ethics: original.ethics.clone(),
        leader_id: None,
        settlements: Vec::new(),
        interest_groups: original.interest_groups.clone(), // copies structure
        innovations: original.innovations.clone(),
    };

    let mut original_settlements: HashSet<String> = original.settlements.iter().cloned().collect();
    let mut rebel_settlements = Vec::new();

    for pos in &new_tiles {
        let tile = &mut world.map.tiles[pos.y as usize][pos.x as usize];
        if let Some(sett_id) = &tile.settlement_id {
            let sett_id_cl = sett_id.clone();
            if let Some(s) = world.settlements.iter_mut().find(|set| set.id == sett_id_cl) {
                if s.faction_id != new_faction_id {
                    s.faction_id = new_faction_id.clone();
                    if !rebel_settlements.contains(&s.id) {
                        rebel_settlements.push(s.id.clone());
                    }
                    original_settlements.remove(&s.id);

                    for ty in 0..world.map.height {
                        for tx in 0..world.map.width {
                            if world.map.tiles[ty as usize][tx as usize].settlement_id.as_ref() == Some(&s.id) {
                                world.map.tiles[ty as usize][tx as usize].faction_id = Some(new_faction_id.clone());
                            }
                        }
                    }
                }
            }
        } else {
            tile.faction_id = Some(new_faction_id.clone());
        }
    }

    if let Some(orig_mut) = world.factions.iter_mut().find(|f| f.id == original.id) {
        orig_mut.settlements = original_settlements.into_iter().collect();
    }

    let mut rebel_faction = new_faction;
    rebel_faction.settlements = rebel_settlements;

    world.factions.push(rebel_faction);
    world.relationships.push(FactionRelationship {
        faction_a: original.id.clone(),
        faction_b: new_faction_id.clone(),
        opinion: -100.0,
        animosity: 150.0,
        state: DiplomaticState::War,
    });

    Some(create_event(
        next_id, year,
        original.id.clone(), "civil_war_fracture".to_string(), new_faction_id,
        None, 8.0, false,
        format!("A civil war shattered {}, as the {} Remnant seized the frontier", original.name, original.name),
        "sparked by the collapse of central authority and long-held regional grievances".to_string(),
        vec![
            StatDelta { faction_id: original.id.clone(), stat: FactionStatKey::Stability, delta: -30 },
            StatDelta { faction_id: original.id.clone(), stat: FactionStatKey::Military, delta: -20 },
        ],
    ))
}

// ─── Phase 10: Stability ─────────────────────────────────────────────────────

pub fn phase_stability(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    map_summary: &MapOwnershipSummary,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let current_factions_ids: Vec<String> = world.factions.iter().map(|f| f.id.clone()).collect();

    for faction_id in current_factions_ids {
        let faction = world.factions.iter().find(|f| f.id == faction_id).cloned().unwrap();
        let stats = map_summary.get(&faction_id);

        if stats.is_none() || stats.unwrap().count == 0 {
            let collapse_evt = create_event(
                next_id, year,
                faction_id.clone(), "collapse".to_string(), "history".to_string(),
                None, 8.0, false,
                format!("{} has collapsed into history, leaving only ruins.", faction.name),
                "imperial overstretch and loss of territory".to_string(),
                Vec::new(),
            );

            if !should_suppress_event(&world.storyteller, year, collapse_evt.significance) {
                // Turn settlements to ruins
                let affected_s_ids: Vec<String> = world.settlements.iter()
                    .filter(|s| s.faction_id == faction_id)
                    .map(|s| s.id.clone())
                    .collect();

                for s_id in affected_s_ids {
                    let s = world.settlements.iter().find(|set| set.id == s_id).unwrap().clone();
                    world.ruins.push(crate::state::Ruin {
                        id: format!("ruin_{}_{}", s.id, year),
                        name: format!("Ruins of {}", s.name),
                        position: s.position,
                        former_faction_id: faction_id.clone(),
                        collapsed_year: year,
                    });

                    for npc_id in &s.npcs {
                        if let Some(npc) = world.npcs.iter_mut().find(|n| n.id == *npc_id) {
                            npc.alive = false;
                        }
                    }
                }

                world.settlements.retain(|s| s.faction_id != faction_id);
                world.factions.retain(|f| f.id != faction_id);
                events.push(collapse_evt.clone());
                register_high_sig_event(&mut world.storyteller, &collapse_evt, year);
            }
            continue;
        }

        // Rebellion
        if faction.stability < REBELLION_STABILITY_MIN && faction.population > 100 && rng.next_float() < 0.25 {
            let rebel_evt = create_event(
                next_id, year,
                faction_id.clone(), "internal_rebellion".to_string(), faction_id.clone(),
                None, 5.0, false,
                format!("Unrest tore through {} as stability collapsed", faction.name),
                pick_motivation("rebellion", rng),
                vec![
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: -10 },
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Military, delta: -5 },
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Population, delta: -20 },
                ],
            );
            emit_event(&mut world.storyteller, &mut events, rebel_evt, year);
        }

        // Cultural spread
        if faction.culture > 75.0 && rng.next_float() < 0.15 {
            let neighbors = get_neighboring_factions(world, &faction_id);
            if !neighbors.is_empty() {
                let target = &neighbors[rng.next_int(neighbors.len() as i32) as usize];
                let cult_evt = create_event(
                    next_id, year,
                    faction_id.clone(), "cultural_spread".to_string(), target.id.clone(),
                    None, 3.0, false,
                    format!("{}'s cultural influence spread into {}", faction.name, target.name),
                    pick_motivation("cultural_spread", rng),
                    vec![
                        StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Culture, delta: 3 },
                        StatDelta { faction_id: target.id.clone(), stat: FactionStatKey::Stability, delta: -3 },
                    ],
                );
                emit_event(&mut world.storyteller, &mut events, cult_evt, year);
            }
        }

        // War exhaustion recovery
        let at_war = world.relationships.iter().any(|r| {
            (r.faction_a == faction_id || r.faction_b == faction_id) && r.state == DiplomaticState::War
        });
        if !at_war && faction.stability < 60.0 && rng.next_float() < 0.3 {
            let stab_evt = create_event(
                next_id, year,
                faction_id.clone(), "stability_recovery".to_string(), faction_id.clone(),
                None, 1.0, false,
                format!("{} began recovering from recent turmoil", faction.name),
                "as peacetime allowed wounds to heal and order to be restored".to_string(),
                vec![StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: 15 }],
            );
            emit_event(&mut world.storyteller, &mut events, stab_evt, year);
        }

        // Military buildup
        if faction.wealth > 70.0 && faction.military < 60.0 && rng.next_float() < 0.2 {
            let build_evt = create_event(
                next_id, year,
                faction_id.clone(), "military_expansion".to_string(), faction_id.clone(),
                None, 2.0, false,
                format!("{} invested wealth into expanding their armies", faction.name),
                "as prosperity gave their rulers the means to project power".to_string(),
                vec![
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Military, delta: 10 },
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: -8 },
                ],
            );
            emit_event(&mut world.storyteller, &mut events, build_evt, year);
        }

        // Prosperity social calm
        if faction.wealth > 60.0 && faction.stability < 70.0 && rng.next_float() < 0.2 {
            let calm_evt = create_event(
                next_id, year,
                faction_id.clone(), "prosperity_stability".to_string(), faction_id.clone(),
                None, 2.0, false,
                format!("Prosperity in {} brought social calm", faction.name),
                "as full granaries and busy markets eased old grievances".to_string(),
                vec![
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Stability, delta: 15 },
                    StatDelta { faction_id: faction_id.clone(), stat: FactionStatKey::Wealth, delta: -20 },
                ],
            );
            emit_event(&mut world.storyteller, &mut events, calm_evt, year);
        }

        // Stability fracture
        let current_stab = world.factions.iter().find(|f| f.id == faction_id).map(|f| f.stability).unwrap_or(100.0);
        if current_stab < 10.0 && rng.next_float() < 0.15 {
            let faction_cl = world.factions.iter().find(|f| f.id == faction_id).cloned().unwrap();
            if let Some(frac_evt) = fracture_faction(world, &faction_cl, year, rng, next_id) {
                emit_event(&mut world.storyteller, &mut events, frac_evt, year);
            }
        }

        // Aggression mod
        if let Some(faction_mut) = world.factions.iter_mut().find(|f| f.id == faction_id) {
            let at_war_now = world.relationships.iter().any(|r| {
                (r.faction_a == faction_id || r.faction_b == faction_id) && r.state == DiplomaticState::War
            });
            if at_war_now {
                faction_mut.aggression = (faction_mut.aggression + 1.0).min(100.0);
            } else {
                faction_mut.aggression = (faction_mut.aggression - 1.0).max(0.0);
            }
        }
    }

    events
}

// ─── Phase 11: Succession ────────────────────────────────────────────────────

fn spawn_new_ruler(faction: &Faction, year: i32, rng: &mut SeededRNG) -> HistoricalFigure {
    let trait_pool = [
        RulerTrait::Bloodthirsty,
        RulerTrait::Industrious,
        RulerTrait::Xenophobic,
        RulerTrait::Diplomatic,
        RulerTrait::Pious,
        RulerTrait::Corrupt,
    ];
    let name = NPC_NAMES[rng.next_int(NPC_NAMES.len() as i32) as usize];

    HistoricalFigure {
        id: format!("ruler_{}_{}", faction.id, year),
        name: format!("{} of {}", name, faction.name),
        faction_id: faction.id.clone(),
        role: HistoricalFigureRole::Ruler,
        values: crate::state::HistoricalFigureValues {
            ambition: (rng.next_int(101) - 50) as f64,
            loyalty: (rng.next_int(101) - 50) as f64,
            compassion: (rng.next_int(101) - 50) as f64,
            cunning: (rng.next_int(101) - 50) as f64,
        },
        traits: vec![trait_pool[rng.next_int(trait_pool.len() as i32) as usize].clone()],
        born_year: year - (rng.next_int(30) + 20),
        died_year: None,
        legitimacy: (70 + rng.next_int(30)) as f64,
    }
}

pub fn phase_succession(
    world: &mut WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut events = Vec::new();
    let factions_ids: Vec<String> = world.factions.iter().map(|f| f.id.clone()).collect();

    for faction_id in factions_ids {
        let faction = world.factions.iter().find(|f| f.id == faction_id).cloned().unwrap();
        let ruler = get_ruler_for_faction(world, &faction_id).cloned();
        
        if ruler.is_none() {
            continue;
        }
        let r = ruler.unwrap();
        let age = year - r.born_year;
        let death_chance = ((age - 50) as f64 * 0.012).max(0.0);

        if rng.next_float() < death_chance {
            let death_evt = create_event(
                next_id, year,
                r.id.clone(), "death".to_string(), faction_id.clone(),
                None, 6.0, false,
                format!("{}, ruler of {}, has died at age {}", r.name, faction.name, age),
                "natural causes and the passage of time".to_string(),
                Vec::new(),
            );

            if !should_suppress_event(&world.storyteller, year, death_evt.significance) {
                // Kill ruler
                if let Some(r_mut) = world.historical_figures.iter_mut().find(|hf| hf.id == r.id) {
                    r_mut.died_year = Some(year);
                }

                events.push(death_evt.clone());
                register_high_sig_event(&mut world.storyteller, &death_evt, year);

                if r.legitimacy < 45.0 && rng.next_float() < 0.4 {
                    if let Some(mut frac_evt) = fracture_faction(world, &faction, year, rng, next_id) {
                        frac_evt.description = format!("A succession crisis following {}'s death shattered {}", r.name, faction.name);
                        emit_event(&mut world.storyteller, &mut events, frac_evt, year);
                    }
                } else {
                    let new_r = spawn_new_ruler(&faction, year, rng);
                    let new_r_id = new_r.id.clone();
                    let new_r_name = new_r.name.clone();

                    let asc_evt = create_event(
                        next_id, year,
                        new_r_id.clone(), "ascension".to_string(), faction_id.clone(),
                        None, 5.0, false,
                        format!("{} has ascended to the throne of {}", new_r_name, faction.name),
                        "orderly dynastic succession".to_string(),
                        Vec::new(),
                    );

                    if !should_suppress_event(&world.storyteller, year, asc_evt.significance) {
                        world.historical_figures.push(new_r);
                        if let Some(f_mut) = world.factions.iter_mut().find(|f| f.id == faction_id) {
                            f_mut.leader_id = Some(new_r_id);
                        }
                        events.push(asc_evt.clone());
                        register_high_sig_event(&mut world.storyteller, &asc_evt, year);
                    }
                }
            }
        }
    }

    events
}

// ─── Phase 12: Cascade ────────────────────────────────────────────────────────

pub fn phase_cascade(
    world: &mut WorldState,
    recent_events: &[GameEvent],
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Vec<GameEvent> {
    let mut cascade_events = Vec::new();
    let mut rebelled = HashSet::new();

    let lookback_year = year - CASCADE_LOOKBACK_YEARS;
    let mut player_events: Vec<GameEvent> = world.events.iter()
        .filter(|e| e.year > lookback_year)
        .cloned()
        .collect();
    
    player_events.extend(recent_events.iter().cloned());
    let trigger_events: Vec<GameEvent> = player_events.iter()
        .filter(|e| e.player_caused && e.significance >= CASCADE_SIGNIFICANCE_MIN)
        .cloned()
        .collect();

    for trigger in trigger_events {
        let threshold = get_cascade_threshold(&world.storyteller, &trigger.subject, year);
        if rng.next_float() > threshold {
            continue;
        }

        let trigger_id = trigger.id.clone();

        for delta in &trigger.stat_deltas {
            let faction_id = delta.faction_id.clone();
            let has_faction = world.factions.iter().any(|f| f.id == faction_id);
            if !has_faction || rebelled.contains(&faction_id) {
                continue;
            }

            let faction = world.factions.iter().find(|f| f.id == faction_id).unwrap().clone();
            
            if let Some(consequence) = derive_consequence(&faction, delta, &trigger, world, year, rng, next_id) {
                if !should_suppress_event(&world.storyteller, year, consequence.significance) {
                    if consequence.action == "internal_rebellion" {
                        rebelled.insert(faction_id.clone());
                    }
                    if consequence.action == "military_buildup" {
                        let sub = consequence.subject.clone();
                        let obj = consequence.object.clone();
                        if let Some(rel) = world.relationships.iter_mut().find(|r| {
                            (r.faction_a == sub && r.faction_b == obj) || (r.faction_a == obj && r.faction_b == sub)
                        }) {
                            rel.animosity = (rel.animosity + 20.0).min(200.0);
                        }
                    }

                    cascade_events.push(consequence.clone());
                    register_high_sig_event(&mut world.storyteller, &consequence, year);
                }
            }
        }
    }

    let factions_len = world.factions.len();
    for i in 0..factions_len {
        let faction_id = world.factions[i].id.clone();
        if rebelled.contains(&faction_id) {
            continue;
        }
        check_threshold_events(world, &faction_id, year, rng, &player_events, &mut cascade_events, &mut rebelled, next_id);
    }

    cascade_events
}

pub fn derive_consequence(
    faction: &Faction,
    delta: &StatDelta,
    parent_event: &GameEvent,
    world: &WorldState,
    year: i32,
    rng: &mut SeededRNG,
    next_id: &mut u32,
) -> Option<GameEvent> {
    let stat = &delta.stat;
    let new_value = get_faction_stat(faction, stat);

    if matches!(stat, FactionStatKey::Stability) && delta.delta < 0 && new_value < REBELLION_STABILITY_MIN {
        let deltas = vec![
            StatDelta { faction_id: faction.id.clone(), stat: FactionStatKey::Stability, delta: -10 },
            StatDelta { faction_id: faction.id.clone(), stat: FactionStatKey::Military, delta: -8 },
            StatDelta { faction_id: faction.id.clone(), stat: FactionStatKey::Population, delta: -30 },
        ];
        return Some(create_event(
            next_id, year,
            faction.id.clone(), "internal_rebellion".to_string(), faction.id.clone(),
            Some(parent_event.id.clone()), (parent_event.significance - 1.0).max(1.0), true,
            format!("Instability within {} erupted into open rebellion", faction.name),
            pick_motivation("rebellion", rng),
            deltas,
        ));
    }

    if matches!(stat, FactionStatKey::Culture) && delta.delta > 0 && new_value > 40.0 && rng.next_float() < 0.4 {
        let neighbors = get_neighboring_factions(world, &faction.id);
        if neighbors.is_empty() {
            return None;
        }
        let target = &neighbors[rng.next_int(neighbors.len() as i32) as usize];
        let deltas = vec![
            StatDelta { faction_id: faction.id.clone(), stat: FactionStatKey::Culture, delta: 5 },
            StatDelta { faction_id: target.id.clone(), stat: FactionStatKey::Stability, delta: -5 },
        ];
        return Some(create_event(
            next_id, year,
            faction.id.clone(), "cultural_spread".to_string(), target.id.clone(),
            Some(parent_event.id.clone()), (parent_event.significance - 1.0).max(1.0), true,
            format!("The influence of {} spread into {}'s territory", faction.name, target.name),
            pick_motivation("cultural_spread", rng),
            deltas,
        ));
    }

    if matches!(stat, FactionStatKey::Military) && delta.delta > 0 && new_value > 50.0 {
        let fact_id = &faction.id;
        let rel = world.relationships.iter().find(|r| {
            ((&r.faction_a == fact_id || &r.faction_b == fact_id))
                && r.state != DiplomaticState::War && r.opinion < -20.0
        })?;
        
        let target_id = if &rel.faction_a == fact_id { &rel.faction_b } else { &rel.faction_a };
        let target = world.factions.iter().find(|f| &f.id == target_id)?;

        return Some(create_event(
            next_id, year,
            faction.id.clone(), "military_buildup".to_string(), target.id.clone(),
            Some(parent_event.id.clone()), (parent_event.significance - 1.0).max(1.0), true,
            format!("{}'s military buildup alarmed {}", faction.name, target.name),
            "as their growing armies cast long shadows over neighboring lands".to_string(),
            vec![StatDelta { faction_id: target.id.clone(), stat: FactionStatKey::Stability, delta: -5 }],
        ));
    }

    None
}

fn check_threshold_events(
    world: &mut WorldState,
    faction_id: &str,
    year: i32,
    rng: &mut SeededRNG,
    player_events: &[GameEvent],
    events: &mut Vec<GameEvent>,
    rebelled: &mut HashSet<String>,
    next_id: &mut u32,
) {
    let faction = world.factions.iter().find(|f| f.id == faction_id).cloned().unwrap();
    if faction.stability < REBELLION_STABILITY_MIN && rng.next_float() < 0.35 {
        let precursor = player_events.iter().find(|e| {
            e.stat_deltas.iter().any(|d| d.faction_id == faction_id && matches!(d.stat, FactionStatKey::Stability))
        });
        if let Some(prec) = precursor {
            if !rebelled.contains(faction_id) {
                let deltas = vec![
                    StatDelta { faction_id: faction_id.to_string(), stat: FactionStatKey::Stability, delta: -8 },
                    StatDelta { faction_id: faction_id.to_string(), stat: FactionStatKey::Population, delta: -20 },
                ];
                let rebel_evt = create_event(
                    next_id, year,
                    faction_id.to_string(), "internal_rebellion".to_string(), faction_id.to_string(),
                    Some(prec.id.clone()), 5.0, true,
                    format!("{} tore itself apart in civil strife", faction.name),
                    pick_motivation("rebellion", rng),
                    deltas,
                );
                
                emit_event(&mut world.storyteller, events, rebel_evt, year);
                rebelled.insert(faction_id.to_string());
            }
        }
    }
}

// ─── Knowledge Pipeline ──────────────────────────────────────────────────────

pub fn seed_event_knowledge(
    world: &mut WorldState,
    events: &[GameEvent],
    year: i32,
    rng: &mut SeededRNG,
) {
    for event in events {
        for npc in &mut world.npcs {
            if !npc.alive || npc.faction_id != event.subject {
                continue;
            }
            if npc.knowledge.iter().any(|k| k.event_id == event.id) {
                continue;
            }
            let accuracy = 0.75 + rng.next_float() * 0.25;
            npc.knowledge.push(crate::state::NPCKnowledge {
                event_id: event.id.clone(),
                discovered_year: year,
                accuracy,
                source_id: "direct".to_string(),
            });
        }
    }
}

pub fn phase_gossip(world: &mut WorldState, year: i32, rng: &mut SeededRNG) {
    let settlements_len = world.settlements.len();

    for s_idx in 0..settlements_len {
        let sett = &world.settlements[s_idx];
        let mut local_npcs = Vec::new();
        for npc_id in &sett.npcs {
            if let Some(npc) = world.npcs.iter().find(|n| &n.id == npc_id && n.alive) {
                local_npcs.push(npc.clone());
            }
        }

        if local_npcs.len() < 2 {
            continue;
        }

        let npcs_len = local_npcs.len();
        for i in 0..npcs_len {
            let npc_a = &local_npcs[i];
            let npc_b_id = &local_npcs[(i + 1) % npcs_len].id;

            let gossip_prob = get_gossip_boost(&world.storyteller, &npc_a.faction_id, year);
            if !npc_a.knowledge.is_empty() && rng.next_float() < gossip_prob {
                let k_idx = rng.next_int(npc_a.knowledge.len() as i32) as usize;
                let k_share = &npc_a.knowledge[k_idx];

                if let Some(npc_b) = world.npcs.iter_mut().find(|n| &n.id == npc_b_id) {
                    if !npc_b.knowledge.iter().any(|k| k.event_id == k_share.event_id) {
                        npc_b.knowledge.push(crate::state::NPCKnowledge {
                            event_id: k_share.event_id.clone(),
                            discovered_year: year,
                            accuracy: k_share.accuracy * 0.9,
                            source_id: npc_a.id.clone(),
                        });
                    }
                }
            }
        }
    }
}

pub fn phase_diffusion(world: &mut WorldState, year: i32, rng: &mut SeededRNG) {
    let settlements_len = world.settlements.len();
    let npc_ids_with_knowledge: Vec<(String, String, Vec<crate::state::NPCKnowledge>)> = world.npcs.iter()
        .filter(|n| n.alive && !n.knowledge.is_empty())
        .map(|n| (n.id.clone(), n.faction_id.clone(), n.knowledge.clone()))
        .collect();

    for s_idx in 0..settlements_len {
        if rng.next_float() < 0.05 {
            let sett = &world.settlements[s_idx];
            let mut local_npcs = Vec::new();
            for npc_id in &sett.npcs {
                if let Some(npc) = world.npcs.iter().find(|n| &n.id == npc_id && n.alive) {
                    local_npcs.push(npc.id.clone());
                }
            }
            if local_npcs.is_empty() {
                continue;
            }
            let target_npc_id = &local_npcs[rng.next_int(local_npcs.len() as i32) as usize];
            
            let sett_npc_ids_set: HashSet<&String> = sett.npcs.iter().collect();
            let source_npcs: Vec<&(String, String, Vec<crate::state::NPCKnowledge>)> = npc_ids_with_knowledge.iter()
                .filter(|(id, _, _)| !sett_npc_ids_set.contains(id))
                .collect();

            if source_npcs.is_empty() {
                continue;
            }
            let source = source_npcs[rng.next_int(source_npcs.len() as i32) as usize];
            let k_share = &source.2[rng.next_int(source.2.len() as i32) as usize];

            if let Some(target_npc) = world.npcs.iter_mut().find(|n| &n.id == target_npc_id) {
                if !target_npc.knowledge.iter().any(|k| k.event_id == k_share.event_id) {
                    target_npc.knowledge.push(crate::state::NPCKnowledge {
                        event_id: k_share.event_id.clone(),
                        discovered_year: year,
                        accuracy: k_share.accuracy * 0.7,
                        source_id: format!("traveler_from_{}", source.0),
                    });
                }
            }
        }
    }
}

pub fn run_knowledge_pipeline(
    world: &mut WorldState,
    all_year_events: &[GameEvent],
    year: i32,
    rng: &mut SeededRNG,
) {
    seed_event_knowledge(world, all_year_events, year, rng);
    phase_gossip(world, year, rng);
    phase_diffusion(world, year, rng);
}
