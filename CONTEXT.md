# CASCADE — Context

## Goal
Browser-based roguelike where the player time-travels through procedurally simulated history, giving artifacts to factions and watching cascading consequences ripple across centuries.

## Tech Stack
- **Frontend:** React 19 + TypeScript (strict), Vite, plain CSS
- **Simulation:** Pure TypeScript tick engine (no ECS), SeededRNG
- **Rendering:** PixiJS v8 WebGL (`PixiViewport.tsx`) — migration from GameCanvas complete
- **State:** Zustand (slices architecture in `src/store/slices`)
- **Target wrap:** Tauri (Phase 3, upcoming)
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
- [x] **Vitest regression tests** — 186 tests across 24 files, all passing; `_forTesting` export in tick.ts
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
- [x] **Task 005:** Tick Engine Refactor — Decomposed 1,007-line tick engine into modular phases (Religion, Tech, Trade, Politics, etc.); optimized per-faction map scans via `MapOwnershipSummary`.
- [x] **Cascade Scout:** AI context indexing system with `CODEBASE.md` generation and git `post-merge` hook integration.
- [x] **Task 007:** TypeScript Integrity Stabilization — Formalized `GameRNG` interface (`reseed` method); standardized `fireDebtIntervention` signature; resolved `TemporalEcho` and `TestAction` type mismatches.
- [x] **Zustand Migration:** Fully transitioned from useReducer/Context to Zustand slices for World, UI, Camera, and Config.
- [x] **Track B Expansion:** Implemented Religious Simulation (Phase Religion) and Technological Innovation (Phase Tech).
- [x] **UI Dashboards:** Integrated Oracle's Eye (narrative pulse) and enhanced Global Ledger (trade network visibility).
- [ ] Tauri wrapper (Phase 3)

## Roadmap
- tasks/001-accuracy-tiered-templates.md — DONE
- tasks/002-storyteller-director.md — DONE
- tasks/003-playtest-sop.md — DONE (2026-05-08 verified)
- tasks/006-final-asset-evaluation.md — ALL PHASES DONE

## See Also
- `@INVARIANTS.md` — Strict mechanical rules and constraints for the Cascade engine.
