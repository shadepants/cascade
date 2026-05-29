use crate::state::{GameMap, Faction, WorldState, Position, Biome, FactionEthics, EthicStance, FactionStatKey, StatDelta};
use std::collections::{HashMap, HashSet};

pub struct FactionMapStats {
    pub tiles: Vec<Position>,
    pub count: i32,
    pub biome_counts: HashMap<String, i32>,
}

pub type MapOwnershipSummary = HashMap<String, FactionMapStats>;

pub fn get_map_ownership_summary(map: &GameMap) -> MapOwnershipSummary {
    let mut summary = HashMap::new();
    for y in 0..map.height {
        for x in 0..map.width {
            let tile = &map.tiles[y as usize][x as usize];
            if let Some(faction_id) = &tile.faction_id {
                let stats = summary.entry(faction_id.clone()).or_insert_with(|| FactionMapStats {
                    tiles: Vec::new(),
                    count: 0,
                    biome_counts: HashMap::new(),
                });
                
                stats.tiles.push(Position { x, y });
                stats.count += 1;
                
                let biome_str = match tile.biome {
                    Biome::Ocean => "ocean",
                    Biome::Coast => "coast",
                    Biome::Grassland => "grassland",
                    Biome::Forest => "forest",
                    Biome::Rainforest => "rainforest",
                    Biome::Arid => "arid",
                    Biome::Desert => "desert",
                    Biome::Tundra => "tundra",
                    Biome::Mountain => "mountain",
                };
                
                *stats.biome_counts.entry(biome_str.to_string()).or_insert(0) += 1;
            }
        }
    }
    summary
}

pub fn get_tiles_with_pos_for_faction(map: &GameMap, faction_id: &str) -> Vec<Position> {
    let mut result = Vec::new();
    for y in 0..map.height {
        for x in 0..map.width {
            let tile = &map.tiles[y as usize][x as usize];
            if tile.faction_id.as_deref() == Some(faction_id) {
                result.push(Position { x, y });
            }
        }
    }
    result
}

pub fn get_border_tiles_of(map: &GameMap, loser_faction_id: &str, winner_faction_id: &str) -> Vec<Position> {
    let mut border = Vec::new();
    for y in 0..map.height {
        for x in 0..map.width {
            let tile = &map.tiles[y as usize][x as usize];
            if tile.faction_id.as_deref() != Some(loser_faction_id) {
                continue;
            }
            
            let neighbors = [
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ];
            
            let adjacent_to_winner = neighbors.iter().any(|&(nx, ny)| {
                nx >= 0 && ny >= 0 && nx < map.width && ny < map.height
                    && map.tiles[ny as usize][nx as usize].faction_id.as_deref() == Some(winner_faction_id)
            });
            
            if adjacent_to_winner {
                border.push(Position { x, y });
            }
        }
    }
    border
}

pub fn count_shared_border_tiles(map: &GameMap, faction_a_id: &str, faction_b_id: &str) -> i32 {
    let mut count = 0;
    for y in 0..map.height {
        for x in 0..map.width {
            let tile = &map.tiles[y as usize][x as usize];
            if tile.faction_id.as_deref() != Some(faction_a_id) {
                continue;
            }
            
            let neighbors = [
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ];
            
            if neighbors.iter().any(|&(nx, ny)| {
                nx >= 0 && ny >= 0 && nx < map.width && ny < map.height
                    && map.tiles[ny as usize][nx as usize].faction_id.as_deref() == Some(faction_b_id)
            }) {
                count += 1;
            }
        }
    }
    count
}

pub fn get_neighboring_factions(world: &WorldState, faction_id: &str) -> Vec<Faction> {
    let mut neighbor_ids = HashSet::new();
    let map = &world.map;
    for y in 0..map.height {
        for x in 0..map.width {
            let tile = &map.tiles[y as usize][x as usize];
            if tile.faction_id.as_deref() != Some(faction_id) {
                continue;
            }
            
            let neighbors = [
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ];
            
            for &(nx, ny) in neighbors.iter() {
                if nx < 0 || ny < 0 || nx >= map.width || ny >= map.height {
                    continue;
                }
                if let Some(n_id) = &map.tiles[ny as usize][nx as usize].faction_id {
                    if n_id != faction_id {
                        neighbor_ids.insert(n_id.clone());
                    }
                }
            }
        }
    }
    world.factions.iter().filter(|f| neighbor_ids.contains(&f.id)).cloned().collect()
}

pub fn get_faction_stat(faction: &Faction, stat: &FactionStatKey) -> f64 {
    match stat {
        FactionStatKey::Population => faction.population as f64,
        FactionStatKey::Stability => faction.stability,
        FactionStatKey::Wealth => faction.wealth,
        FactionStatKey::Military => faction.military,
        FactionStatKey::Culture => faction.culture,
    }
}

pub fn set_faction_stat(faction: &mut Faction, stat: &FactionStatKey, value: f64) {
    match stat {
        FactionStatKey::Population => faction.population = value as i32,
        FactionStatKey::Stability => faction.stability = value,
        FactionStatKey::Wealth => faction.wealth = value,
        FactionStatKey::Military => faction.military = value,
        FactionStatKey::Culture => faction.culture = value,
    }
}

pub fn apply_stat_deltas(world: &mut WorldState, deltas: &[StatDelta]) {
    for d in deltas {
        if let Some(faction) = world.factions.iter_mut().find(|f| f.id == d.faction_id) {
            let cur = get_faction_stat(faction, &d.stat);
            let next = cur + d.delta as f64;
            
            let (min, max) = match d.stat {
                FactionStatKey::Population => (0.0, 2000.0),
                _ => (0.0, 100.0),
            };
            
            let clamped = next.max(min).min(max);
            set_faction_stat(faction, &d.stat, clamped);
        }
    }
}

pub fn compute_ethics_divergence(a: &FactionEthics, b: &FactionEthics) -> f64 {
    let stance_value = |s: &EthicStance| -> f64 {
        match s {
            EthicStance::Embraced => 2.0,
            EthicStance::Neutral => 1.0,
            EthicStance::Shunned => 0.0,
        }
    };
    
    let diff = |f: &EthicStance, g: &EthicStance| {
        (stance_value(f) - stance_value(g)).abs()
    };
    
    diff(&a.violence, &b.violence)
        + diff(&a.expansion, &b.expansion)
        + diff(&a.trade, &b.trade)
        + diff(&a.tradition, &b.tradition)
        + diff(&a.mercy, &b.mercy)
}

pub fn shift_toward_embraced(current: EthicStance) -> EthicStance {
    match current {
        EthicStance::Shunned => EthicStance::Neutral,
        _ => EthicStance::Embraced,
    }
}
