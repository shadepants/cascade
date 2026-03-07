# CASCADE — Context

## Goal
Browser-based roguelike where the player time-travels through procedurally simulated history, giving artifacts to factions and watching cascading consequences ripple across centuries.

## Tech Stack
- **Frontend:** React 19 + TypeScript (strict), Vite, plain CSS
- **Simulation:** Pure TypeScript tick engine (no ECS), SeededRNG
- **Rendering:** HTML5 Canvas (`GameCanvas.tsx`)
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
- [x] **Vitest regression tests** — `src/simulation/tick.test.ts` (6 tests, all passing); `_forTesting` export in tick.ts; Vitest scoped to `src/**/*.test.ts` only
- [x] **Task 004:** Gems High-Fidelity Upgrade — 128x128 map, FBM/Voronoi terrain, climate simulation, ruins, artifacts, internal politics, interest groups, succession, traits, resources, and enhanced renderer (hillshading, clouds, zoom).
- [ ] **Task 003:** Playtest SOP — verify full cascade chain end-to-end in browser (needs re-run for 128x128 map)
- [ ] Zustand migration (defer until perf is felt)
- [ ] Tauri wrapper (Phase 3)

## Roadmap
- tasks/001-accuracy-tiered-templates.md — DONE
- tasks/002-storyteller-director.md — DONE
- tasks/003-playtest-sop.md — run next session (browser console verification)

## Don't Forget
- `runSimulation(world, jumpYears): GameEvent[]` — external contract must stay unchanged
- NPC uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`)
- CASCADE order: cascade → seedEventKnowledge → gossip (seeding must precede gossip)
- FactionEthics keys: `violence | expansion | trade | tradition | mercy` with `embraced | neutral | shunned`
- MAX_ACTIONS_PER_ERA = 6 in types.ts — reset in App.tsx after each jump
- LLM config in `sessionStorage` as `cascade_llm_config` (session-only, not localStorage)
- Vite proxy: `/api/anthropic` → `api.anthropic.com` (dev only; prod needs real proxy)
- Build ~541KB (xyflow/react + vocab tables; chunk warning is expected)
- `emitEvent(world, pool, event, year)` — helper in tick.ts; returns void, not usable where side-effects need suppression gating (phaseCascade consequence block stays inline)
- Mode selector on TitleScreen passes storytellerMode into WorldConfig → worldgen → defaultStorytellerState()
- Unit tests: `npm test` (Vitest, node env, scoped to src/**/*.test.ts — Playwright E2E excluded)
