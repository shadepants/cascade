// ─── Cascade Tauri Backend ───────────────────────────────────────────────────
//
// This is the native Rust backend for the Cascade desktop wrapper.
// In the browser build, Anthropic API calls are proxied through a Vite
// dev proxy (dev-only) or a server-side nginx/Cloudflare Worker (production).
//
// In the Tauri build, calls go directly to the Anthropic API via the
// tauri-plugin-http native HTTP client, which bypasses CORS entirely.
// The user's API key is stored in a local config file managed by
// tauri-plugin-store. The key is never passed over IPC from the frontend.
//
// Tauri command: `anthropic_chat` forwards the request body to Anthropic
// and returns the full response to the frontend.

use std::sync::Mutex;
use tauri::{State, Emitter, Manager};
use tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItemBuilder, PredefinedMenuItem};

pub mod state;
pub mod rng;
pub mod simulation;

pub struct StaticMapCache(pub Mutex<Option<state::StaticMapData>>);

#[tauri::command]
fn cache_static_map(
    map: state::GameMap,
    cache: State<'_, StaticMapCache>,
) -> Result<(), String> {
    let static_data = state::StaticMapData {
        width: map.width,
        height: map.height,
        tiles: map.tiles.into_iter().map(|row| {
            row.into_iter().map(|t| state::StaticTileData {
                biome: t.biome,
                elevation: t.elevation,
                rainfall: t.rainfall,
                walkable: t.walkable,
            }).collect()
        }).collect(),
    };
    *cache.0.lock().unwrap() = Some(static_data);
    Ok(())
}

fn reconstruct_world(static_ref: &state::StaticMapData, dynamic: state::WorldStateDynamic) -> state::WorldState {
    let full_map = state::GameMap {
        width: dynamic.map.width,
        height: dynamic.map.height,
        tiles: dynamic.map.tiles.into_iter().enumerate().map(|(y, row)| {
            row.into_iter().enumerate().map(|(x, dt)| {
                let st = &static_ref.tiles[y][x];
                state::Tile {
                    biome: st.biome,
                    elevation: st.elevation,
                    rainfall: st.rainfall,
                    walkable: st.walkable,
                    faction_id: dt.faction_id,
                    settlement_id: dt.settlement_id,
                    modifiers: dt.modifiers,
                }
            }).collect()
        }).collect(),
    };

    state::WorldState {
        seed: dynamic.seed,
        current_year: dynamic.current_year,
        map: full_map,
        factions: dynamic.factions,
        relationships: dynamic.relationships,
        historical_figures: dynamic.historical_figures,
        settlements: dynamic.settlements,
        ruins: dynamic.ruins,
        resource_nodes: dynamic.resource_nodes,
        npcs: dynamic.npcs,
        items: dynamic.items,
        trade_routes: dynamic.trade_routes,
        religions: dynamic.religions,
        holy_sites: dynamic.holy_sites,
        innovations: dynamic.innovations,
        events: dynamic.events,
        player: dynamic.player,
        storyteller: dynamic.storyteller,
        visuals: dynamic.visuals,
        sim_config: dynamic.sim_config,
    }
}

fn extract_dynamic(full: state::WorldState) -> state::WorldStateDynamic {
    let dynamic_map = state::GameMapDynamic {
        width: full.map.width,
        height: full.map.height,
        tiles: full.map.tiles.into_iter().map(|row| {
            row.into_iter().map(|t| state::TileDynamic {
                faction_id: t.faction_id,
                settlement_id: t.settlement_id,
                modifiers: t.modifiers,
            }).collect()
        }).collect(),
    };

    state::WorldStateDynamic {
        seed: full.seed,
        current_year: full.current_year,
        map: dynamic_map,
        factions: full.factions,
        relationships: full.relationships,
        historical_figures: full.historical_figures,
        settlements: full.settlements,
        ruins: full.ruins,
        resource_nodes: full.resource_nodes,
        npcs: full.npcs,
        items: full.items,
        trade_routes: full.trade_routes,
        religions: full.religions,
        holy_sites: full.holy_sites,
        innovations: full.innovations,
        events: full.events,
        player: full.player,
        storyteller: full.storyteller,
        visuals: full.visuals,
        sim_config: full.sim_config,
    }
}

#[tauri::command]
async fn run_simulation(
    world_dynamic: state::WorldStateDynamic,
    years: i32,
    next_event_id: u32,
    cache: State<'_, StaticMapCache>,
) -> Result<(state::WorldStateDynamic, Vec<state::GameEvent>), String> {
    let static_map = cache.0.lock().unwrap();
    let static_ref = static_map.as_ref()
        .ok_or("Map cache not initialized")?;
    
    let mut full_world = reconstruct_world(static_ref, world_dynamic);
    
    // Clear incoming events since they are append-only. They shouldn't be sent from frontend,
    // but just in case, we clear them to ensure we don't return them.
    full_world.events.clear();
    
    let (mut new_world, new_events) = simulation::run_simulation_loop(full_world, years, next_event_id);
    
    new_world.events.clear();
    
    let dynamic_out = extract_dynamic(new_world);
    Ok((dynamic_out, new_events))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let new_game_i = MenuItemBuilder::with_id("new_game", "New Game").build(app)?;
            let load_auto_i = MenuItemBuilder::with_id("load_auto", "Load Auto-Save").build(app)?;
            let toggle_ledger_i = MenuItemBuilder::with_id("toggle_ledger", "Toggle Global Ledger (L)").build(app)?;
            let toggle_oracle_i = MenuItemBuilder::with_id("toggle_oracle", "Toggle Oracle's Eye (O)").build(app)?;
            let quit_i = PredefinedMenuItem::quit(app, None)?;
            
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_game_i)
                .item(&load_auto_i)
                .separator()
                .item(&quit_i)
                .build()?;
                
            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_ledger_i)
                .item(&toggle_oracle_i)
                .build()?;
                
            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &view_menu])
                .build()?;
                
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let id = event.id.as_ref();
                if id != "quit" {
                    let _ = app_handle.emit("menu-click", id);
                }
            });

            Ok(())
        })
        .manage(StaticMapCache(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![run_simulation, cache_static_map])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
