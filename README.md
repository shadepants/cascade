# Cascade

Cascade is a browser-based historical simulation roguelike where player actions create long causal chains across centuries.

## Stack
- React 19 + TypeScript + Vite
- Pure TypeScript simulation engine (`src/simulation`)
- WebWorker execution for time jumps (`src/simulation/worker.ts`)
- PixiJS v8 WebGL renderer (`src/ui/PixiViewport.tsx`)
- IndexedDB persistence via Dexie
- Zustand state management (`src/store`)

## Quick Start
```bash
npm ci
npm run dev
```

## Core Architecture
- `src/simulation/tick.ts`: Decomposed orchestrator managing 10+ modular phases.
- `src/simulation/phases/`: Specialized simulation logic (Religion, Tech, Trade, Conflict).
- `src/world/worldgen.ts`: Terrain/factions/entities + deep history pre-simulation.
- `src/ui/App.tsx`: App phase routing and jump worker integration.
- `src/store/index.ts`: Zustand-backed global state with slice architecture.

## Engine Invariants
See: `docs/ENGINE_INVARIANTS.md`

## Commands
- `npm run dev` — local playtest
- `npm run test` — unit tests (`src/**/*.test.ts`)
- `npm run build` — type-check + production build
- `npm run lint` — eslint (currently reports pre-existing repo violations)
- `npm run tauri:dev` — launch the Tauri desktop wrapper (requires `src-tauri/` Rust toolchain)
- `npm run tauri:build` — compile a cross-platform desktop binary via Tauri

## Validation Matrix (before merge)
1. `npm run test`
2. `npm run build`
3. `npm run lint` (record existing vs newly introduced issues)
4. Run Task 003 SOP (`tasks/003-playtest-sop.md`) and capture PASS/FAIL in run table

## Playtest/QA Docs
- `tasks/003-playtest-sop.md`
- `tasks/004-gems-playtest-guide.md`

## LLM / Anthropic API — Production Deployment

In development, a Vite proxy forwards `/api/anthropic` → `https://api.anthropic.com`.
This proxy is **dev-only** and does not exist in a production build.

### Browser (production)

You must run a reverse proxy on your server that forwards `/api/anthropic` to
`https://api.anthropic.com` and injects the `x-api-key` header.

An nginx config snippet is provided at [`public/api-proxy.example.conf`](public/api-proxy.example.conf).

Alternative hosted solutions:
- **Cloudflare Workers**: deploy a worker that proxies the Anthropic endpoint.
- **Caddy**: use `reverse_proxy` with header injection.

### Tauri (desktop)

When running inside the Tauri desktop wrapper, HTTP requests bypass CORS entirely
via `tauri-plugin-http`. The Anthropic call is made from a native Tauri command
(`src-tauri/src/lib.rs`) using the system HTTP client rather than the browser
fetch API. This is the cleanest architecture for the desktop build — no proxy
needed, and the API key is stored in the OS keychain via `tauri-plugin-store`.

See `src-tauri/tauri.conf.json` for the Tauri configuration.
