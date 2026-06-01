pub mod helpers;
pub mod phases;

use crate::state::{WorldState, GameEvent, SimConfig, StorytellerState, StorytellerMode, NPC, CooldownEntry, NPCPersonality, Position};
use crate::rng::SeededRNG;
use self::helpers::*;
use self::phases::*;
use std::collections::{HashMap, HashSet};

pub fn compute_tension(state: &StorytellerState, world: &WorldState) -> f64 {
    let mut event_map = HashMap::new();
    let mut recent_action_count = 0;
    let threshold_year = world.current_year - 20;

    for e in &world.events {
        event_map.insert(e.id.clone(), e);
        if e.player_caused && e.caused_by.is_none() && e.year > threshold_year {
            recent_action_count += 1;
        }
    }
    
    let action_pressure = (recent_action_count * 15) as f64;
    let action_pressure = action_pressure.min(45.0);

    let mut max_depth = 0;
    let mut depth_cache = HashMap::new();
    
    fn chain_depth(event_id: &str, event_map: &HashMap<String, &GameEvent>, cache: &mut HashMap<String, i32>) -> i32 {
        if let Some(&d) = cache.get(event_id) {
            return d;
        }
        
        let event = match event_map.get(event_id) {
            Some(e) => e,
            None => {
                cache.insert(event_id.to_string(), 0);
                return 0;
            }
        };
        
        let d = match &event.caused_by {
            Some(cb) => 1 + chain_depth(cb, event_map, cache),
            None => 0,
        };
        
        cache.insert(event_id.to_string(), d);
        d
    }

    for e in &world.events {
        if e.player_caused {
            let d = chain_depth(&e.id, &event_map, &mut depth_cache);
            if d > max_depth {
                max_depth = d;
            }
        }
    }
    
    let depth_pressure = (max_depth * 5) as f64;
    let depth_pressure = depth_pressure.min(25.0);

    let avg_instability = if !world.factions.is_empty() {
        world.factions.iter().map(|f| 100.0 - f.stability).sum::<f64>() / world.factions.len() as f64
    } else {
        0.0
    };
    let instability_pressure = (avg_instability * 0.3).min(30.0);

    let raw = action_pressure + depth_pressure + instability_pressure;
    let mode_multiplier = match state.mode {
        StorytellerMode::Clio => 0.7,
        StorytellerMode::Ares => 1.3,
        StorytellerMode::Tyche => 1.0,
    };

    (raw * mode_multiplier).round().max(0.0).min(100.0)
}

pub fn accumulate_debt(
    state: &mut StorytellerState,
    knowledge_log: &[crate::state::KnowledgeEntry],
    events: &[crate::state::GameEvent],
    current_year: i32,
) {
    if state.player_action_count == 0 {
        return;
    }
    state.years_since_player_discovery += 1;

    let has_entries_this_year = knowledge_log.iter()
        .any(|k| k.discovered_year == current_year);

    let mut discovered_this_year = false;
    if has_entries_this_year {
        let event_map: HashMap<String, &GameEvent> = events.iter()
            .map(|e| (e.id.clone(), e))
            .collect();

        for entry in knowledge_log {
            if entry.discovered_year == current_year {
                if let Some(event) = event_map.get(&entry.event_id) {
                    if event.player_caused {
                        discovered_this_year = true;
                        break;
                    }
                }
            }
        }
    }

    if discovered_this_year {
        state.years_since_player_discovery = 0;
    } else {
        state.consecutive_quiet_years += 1;
    }
}

pub enum StorytellerIntervention {
    SeedKnowledge { event_id: String },
    PlaceWitness { event_id: String, secondary_event_ids: Vec<String> },
    ForceNotification { event_id: String },
}

pub fn fire_debt_intervention(
    state: &mut StorytellerState,
    knowledge_log: &[crate::state::KnowledgeEntry],
    events: &[crate::state::GameEvent],
) -> Option<StorytellerIntervention> {
    let debt = state.years_since_player_discovery;
    if debt < 30 {
        return None;
    }

    let known_ids: HashSet<String> = knowledge_log.iter()
        .map(|k| k.event_id.clone())
        .collect();

    let mut target: Option<&GameEvent> = None;
    let mut second: Option<&GameEvent> = None;
    let mut third: Option<&GameEvent> = None;

    for e in events {
        if e.player_caused && !known_ids.contains(&e.id) {
            if target.is_none() || e.significance > target.unwrap().significance {
                third = second;
                second = target;
                target = Some(e);
            } else if second.is_none() || e.significance > second.unwrap().significance {
                third = second;
                second = Some(e);
            } else if third.is_none() || e.significance > third.unwrap().significance {
                third = Some(e);
            }
        }
    }

    let target_event = target?;
    let max_per_type = 3;

    if debt >= 70 && state.debt_interventions_fired >= max_per_type * 2 && state.debt_interventions_fired < max_per_type * 3 {
        state.debt_interventions_fired += 1;
        return Some(StorytellerIntervention::ForceNotification { event_id: target_event.id.clone() });
    }
    if debt >= 50 && state.debt_interventions_fired >= max_per_type && state.debt_interventions_fired < max_per_type * 2 {
        state.debt_interventions_fired += 1;
        let mut secondary_event_ids = Vec::new();
        if let Some(s) = second { secondary_event_ids.push(s.id.clone()); }
        if let Some(t) = third { secondary_event_ids.push(t.id.clone()); }
        return Some(StorytellerIntervention::PlaceWitness {
            event_id: target_event.id.clone(),
            secondary_event_ids,
        });
    }
    if debt >= 30 && state.debt_interventions_fired < max_per_type {
        state.debt_interventions_fired += 1;
        return Some(StorytellerIntervention::SeedKnowledge { event_id: target_event.id.clone() });
    }

    None
}

pub fn apply_intervention(
    intervention: StorytellerIntervention,
    world: &mut WorldState,
    rng: &mut SeededRNG,
    current_year: i32,
) {
    let event_id = match &intervention {
        StorytellerIntervention::SeedKnowledge { event_id } => event_id,
        StorytellerIntervention::PlaceWitness { event_id, .. } => event_id,
        StorytellerIntervention::ForceNotification { event_id } => event_id,
    };

    let event = match world.events.iter().find(|e| &e.id == event_id).cloned() {
        Some(e) => e,
        None => return,
    };

    match intervention {
        StorytellerIntervention::SeedKnowledge { .. } => {
            let player_pos = &world.player.position;
            let mut target_npc_idx = None;
            let mut min_distance = i32::MAX;

            for (idx, n) in world.npcs.iter().enumerate() {
                if n.alive && !n.knowledge.iter().any(|k| k.event_id == event.id) {
                    let distance = (n.position.x - player_pos.x).abs() + (n.position.y - player_pos.y).abs();
                    if distance < min_distance {
                        min_distance = distance;
                        target_npc_idx = Some(idx);
                    }
                }
            }

            if let Some(idx) = target_npc_idx {
                world.npcs[idx].knowledge.push(crate::state::NPCKnowledge {
                    event_id: event.id.clone(),
                    discovered_year: current_year,
                    accuracy: 0.95,
                    source_id: "direct".to_string(),
                });
                println!("[STORYTELLER] SEED_KNOWLEDGE — seeded \"{}\" into {}", event.description, world.npcs[idx].name);
            }
        }
        StorytellerIntervention::PlaceWitness { event_id, secondary_event_ids } => {
            let player_pos = &world.player.position;
            let mut player_settlement_idx = None;
            let mut min_dist = f64::MAX;

            for (idx, s) in world.settlements.iter().enumerate() {
                let dx = s.position.x - player_pos.x;
                let dy = s.position.y - player_pos.y;
                let dist = ((dx*dx + dy*dy) as f64).sqrt();
                if dist < min_dist {
                    min_dist = dist;
                    player_settlement_idx = Some(idx);
                }
            }

            let settlement_idx = player_settlement_idx.unwrap_or(0);
            if world.settlements.is_empty() {
                return;
            }

            let sett_pos = world.settlements[settlement_idx].position;
            let sett_faction = world.settlements[settlement_idx].faction_id.clone();
            let sett_name = world.settlements[settlement_idx].name.clone();

            let witness_id = format!("witness_{}_{}", current_year, rng.next_int(9999));
            let mut witness = NPC {
                id: witness_id.clone(),
                name: "Wandering Chronicler".to_string(),
                position: sett_pos,
                faction_id: sett_faction,
                personality: NPCPersonality::Pragmatist,
                dialogue_key: "default".to_string(),
                alive: true,
                knowledge: Vec::new(),
            };

            let mut ids_to_share = vec![event_id];
            ids_to_share.extend(secondary_event_ids);

            for eid in ids_to_share {
                if world.events.iter().any(|e| e.id == eid) {
                    witness.knowledge.push(crate::state::NPCKnowledge {
                        event_id: eid,
                        discovered_year: current_year,
                        accuracy: 0.7,
                        source_id: "direct".to_string(),
                    });
                }
            }

            world.settlements[settlement_idx].npcs.push(witness_id);
            world.npcs.push(witness);
            println!("[STORYTELLER] PLACE_WITNESS — Wandering Chronicler placed at {}", sett_name);
        }
        StorytellerIntervention::ForceNotification { .. } => {
            println!("[STORYTELLER] FORCE_NOTIFICATION — \"{}\" (sig:{})", event.description, event.significance);
            world.storyteller.pending_notification = Some(format!(
                "Rumors reach you of upheaval — your past choices echo: \"{}\"",
                event.description
            ));
        }
    }
}

pub fn run_simulation_loop(
    mut world: WorldState,
    years: i32,
    mut next_event_id: u32,
) -> (WorldState, Vec<GameEvent>) {
    let mut rng = SeededRNG::new(world.seed + world.current_year as f64);
    let mut all_new_events = Vec::new();


    for _ in 0..years {
        let year = world.current_year + 1;

        world.storyteller.high_sig_events_this_year = 0;
        world.storyteller.cooldowns.retain(|cd| {
            year < cd.start_year + cd.duration_years
        });
        world.storyteller.tension = compute_tension(&world.storyteller, &world);

        let map_summary = get_map_ownership_summary(&world.map);

        let mut prior_events = Vec::new();
        prior_events.extend(phase_colonization(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_settlement_growth(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_ecology(&mut world, year, &mut rng, &map_summary, &mut next_event_id));
        prior_events.extend(phase_economics(&mut world, year, &mut rng, &map_summary, &mut next_event_id));
        prior_events.extend(phase_trade(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_religion(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_tech(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_interest_groups(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_politics(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_conflict(&mut world, year, &mut rng, &mut next_event_id));
        prior_events.extend(phase_stability(&mut world, year, &mut rng, &map_summary, &mut next_event_id));
        prior_events.extend(phase_succession(&mut world, year, &mut rng, &mut next_event_id));

        let cascade_events = phase_cascade(&mut world, &prior_events, year, &mut rng, &mut next_event_id);
        
        let mut all_year_events = prior_events;
        all_year_events.extend(cascade_events);

        run_knowledge_pipeline(&mut world, &all_year_events, year, &mut rng);

        for event in &all_year_events {
            apply_stat_deltas(&mut world, &event.stat_deltas);
        }

        world.events.extend(all_year_events.clone());
        all_new_events.extend(all_year_events);

        world.storyteller.tension = (world.storyteller.tension - world.storyteller.tension_decay_rate)
            .max(world.storyteller.tension_floor);
        
        accumulate_debt(&mut world.storyteller, &world.player.knowledge_log, &world.events, year);
        if let Some(intervention) = fire_debt_intervention(&mut world.storyteller, &world.player.knowledge_log, &world.events) {
            apply_intervention(intervention, &mut world, &mut rng, year);
        }

        world.current_year = year;

        for ty in 0..world.map.height {
            for tx in 0..world.map.width {
                let tile = &mut world.map.tiles[ty as usize][tx as usize];
                if let Some(mods) = &mut tile.modifiers {
                    for m in mods.iter_mut() {
                        m.duration -= 1;
                    }
                    mods.retain(|m| m.duration > 0);
                }
                if let Some(mods) = &tile.modifiers {
                    if mods.is_empty() {
                        tile.modifiers = None;
                    }
                }
            }
        }

        for v in &mut world.visuals {
            v.duration -= 1;
        }
        world.visuals.retain(|v| v.duration > 0);
    }

    (world, all_new_events)
}
