# CASCADE — Context

## Goal
Browser-based roguelike where the player time-travels through procedurally simulated history, giving artifacts to factions and watching cascading consequences ripple across centuries.

## Tech Stack
- **Frontend:** React 19 + TypeScript (strict), Vite, plain CSS
- **Simulation:** Pure TypeScript tick engine (no ECS), SeededRNG
- **Rendering:** PixiJS v8 WebGL (`PixiViewport.tsx`) — migration from GameCanvas complete
- **State:** useReducer + Context (store.ts)
- **Target wrap:** Tauri (Phase 3, not yet)
- **No backend** — fully client-side POC

## Current State
- [x] POC MVP, 5-phase DF-inspired simulation engine
- [x] WebWorker engine, Gossip system, Visual DAG, Legendary Artifacts
- [x] Socratic Gate: LLM-powered NPC dialogue (Anthropic API via Vite proxy)
- [x] IndexedDB save/load (Dexie), Ghost of History layer (hold H)
- [x] Action budget: 6/era, stale worldRef fix, session-only API key
- [x] **Task 001:** Accuracy-tiered dialogue, ETHICS_VOCAB, EVENT_ACTION_VOCAB, chain synthesis
- [x] **Task 002:** Storyteller Director — tension, spotlight, cooldowns, narrative debt, mode selector
- [x] **GitHub PRs resolved** — PRs #1–8 all closed/merged; master is clean
- [x] **Bug fix:** animosity mutation-before-suppression in `deriveConsequence` — deferred to `phaseCascade` gated on `shouldSuppressEvent`
- [x] **emitEvent abstraction** adopted throughout tick.ts
- [x] `pendingNotification` consumed in App.tsx after SET_WORLD (clear-before-dispatch)
- [x] `.claude/settings.local.json` removed from tracking; `.claude/` added to .gitignore
- [x] **Vitest regression tests** — 24 tests across 4 suites, all passing; `_forTesting` export in tick.ts
- [x] **Task 004:** Gems High-Fidelity Upgrade — 128x128 map, FBM/Voronoi terrain, climate simulation, ruins, artifacts, internal politics, interest groups, succession, traits, resources, and enhanced renderer (hillshading, clouds, zoom).
- [x] **PixiJS Phase 1:** `src/engine/tileMap.ts` + `src/ui/PixiViewport.tsx` (PixiJS v8 renderer, 4 sprite sheets)
- [x] **PixiJS Phase 2:** Ghost of History ghost layer — dashed faction borders from `previousWorld` at 0.4 alpha when H held; batched per faction color
- [x] **PixiJS Phase 3:** Texture pooling — `Map<string, Texture>` keyed by `sheetKey:x:y`; pool destroyed on unmount
- [x] **PixiJS Phase 3b:** BIOME_TILES calibrated to DawnLike Tile.png row 0 (8 hex terrain fills, visually verified)
- [x] **PixiJS Phase 5:** `<GameCanvas />` → `<PixiViewport />` swapped in App.tsx; `feat-pixi-viewport` merged to master (`145f459`)
- [x] **Merge:** `feat-pixi-viewport` → master — complete; branch is ancestor of master
- [x] **Task 003:** Playtest SOP — verified 2026-05-08: PixiJS viewport confirmed rendering, cascade chain logic correct, NPC knowledge seeding working (96 entries / 18 NPCs, accuracy 0.81–1.00)
- [x] **Cascade threshold fix:** `cultural_spread` lowered `>65` → `>40`; `military_buildup` lowered `>70` → `>50` — enables early-game cascade events (faction stats start 10–30, old thresholds were unreachable)
- [x] **Mode persistence fix:** `TitleScreen` now initializes `mode` from `state.config.storytellerMode`; `SET_CONFIG` action added to store; selected mode is written back to config on New Game start
- [x] **Task 005:** Tick Engine Refactor — Decomposed 1,007-line tick engine into 10 modular phases; optimized per-faction map scans via `MapOwnershipSummary` (P2 audit); improved type safety (P1 audit).
- [x] **Cascade Scout:** AI context indexing system with `CODEBASE.md` generation and git `post-merge` hook integration.
- [ ] Zustand migration (defer until perf is felt)
- [ ] Tauri wrapper (Phase 3)

## Roadmap
- tasks/001-accuracy-tiered-templates.md — DONE
- tasks/002-storyteller-director.md — DONE
- tasks/003-playtest-sop.md — DONE (2026-05-08 verified)
- tasks/006-final-asset-evaluation.md — ALL PHASES DONE

## Don't Forget
- `runSimulation(world, jumpYears): GameEvent[]` — external contract must stay unchanged
- NPC uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`)
- CASCADE order: cascade → seedEventKnowledge → gossip (seeding must precede gossip)
- FactionEthics keys: `violence | expansion | trade | tradition | mercy` with `embraced | neutral | shunned`
- MAX_ACTIONS_PER_ERA = 6 in types.ts — reset in App.tsx after each jump
- LLM config in `sessionStorage` as `cascade_llm_config` (session-only, not localStorage)
- Vite proxy: `/api/anthropic` → `api.anthropic.com` (dev only; prod needs real proxy)
- Build ~813KB main bundle (xyflow/react + PixiJS + vocab tables; chunk warning is expected)
- `emitEvent(world, pool, event, year)` — helper in tick.ts; returns void, not usable where side-effects need suppression gating (phaseCascade consequence block stays inline)
- Mode selector on TitleScreen reads `state.config.storytellerMode` on mount; dispatches `SET_CONFIG` on New Game before `SET_WORLD`
- Unit tests: `npm test` (Vitest, 24 tests / 4 suites, node env, scoped to src/**/*.test.ts — Playwright E2E excluded)
- SHEET_TERRAIN = Tile.png (NOT Map0.png). BIOME_TILES calibrated to row 0. forest/grassland intentionally share green tile — tree sprites differentiate visually.
- Ghost layer batching: edges grouped by faction color → one `g.stroke()` per color (not per segment)
- Texture pool key: `sheetKey:region.x:region.y` (sheetKey = 'terrain'|'settlement'|'character'|'player')
- Cascade thresholds (cascade.ts): `cultural_spread` fires at culture >40 (was >65); `military_buildup` fires at military >50 (was >70)
- `SET_CONFIG` action in store.ts — updates `state.config` with a `WorldConfig` value; WorldConfig is now in the type import
- `CODEBASE.md` — auto-generated module map, dependency graph, and hotspot analysis. Run `npm run scout` to regenerate. Updated automatically on git merge via post-merge hook.
