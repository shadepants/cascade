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

use serde::Deserialize;
use tauri::command;
use tauri_plugin_store::StoreExt;

/// Minimal request envelope — mirrors what the browser sends to /api/anthropic/v1/messages
#[derive(Deserialize)]
pub struct AnthropicRequest {
    pub model: String,
    pub max_tokens: u32,
    pub messages: serde_json::Value,
    pub system: Option<String>,
}

/// Forward an Anthropic chat request from the frontend.
/// The API key is read from the local Tauri store — it is never accepted
/// as an IPC argument, so it does not transit the JS/Rust boundary at runtime.
#[command]
pub async fn anthropic_chat(
    app: tauri::AppHandle,
    request: AnthropicRequest,
) -> Result<String, String> {
    // Read the API key from the local store (cascade.json) — never from the frontend.
    let store = app
        .store("cascade.json")
        .map_err(|e| format!("Store open error: {e}"))?;
    let api_key = store
        .get("anthropic_api_key")
        .and_then(|v| v.as_str().map(str::to_owned))
        .ok_or_else(|| {
            "Anthropic API key not configured. Save it via the Settings panel.".to_string()
        })?;

    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();

    let mut body = serde_json::json!({
        "model": request.model,
        "max_tokens": request.max_tokens,
        "messages": request.messages,
    });
    if let Some(system) = &request.system {
        body["system"] = serde_json::Value::String(system.clone());
    }

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {e}"))?;

    let text = response
        .text()
        .await
        .map_err(|e| format!("Response read error: {e}"))?;

    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![anthropic_chat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
