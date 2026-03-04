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
- [x] **Bug fix:** cascade events now seeded into NPC knowledge before gossip spreads
- [x] **Task 001:** Accuracy-tiered dialogue (certain/rumored/legend), ETHICS_VOCAB, EVENT_ACTION_VOCAB, chain synthesis in DialoguePanel
- [x] **Task 002:** Storyteller Director — tension formula, spotlight, cooldowns, narrative debt (SEED/PLACE_WITNESS/FORCE_NOTIFICATION), mode selector (Clio/Ares/Tyche)
- [ ] **Task 003:** Playtest SOP — verify full cascade chain end-to-end in browser
- [ ] Zustand migration (defer until perf is felt)
- [ ] Tauri wrapper (Phase 3)

## Roadmap
- tasks/001-accuracy-tiered-templates.md — DONE
- tasks/002-storyteller-director.md — DONE
- tasks/003-playtest-sop.md — run next session (browser console verification)

## Don't Forget
- `runSimulation(world, jumpYears): GameEvent[]` — external contract must stay unchanged
- NPC uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`)
- CASCADE: cascade → seedEventKnowledge → gossip (order matters — seeding must precede gossip)
- FactionEthics keys: `violence | expansion | trade | tradition | mercy` with `embraced | neutral | shunned`
- MAX_ACTIONS_PER_ERA = 6 in types.ts — reset in App.tsx after each jump
- LLM config in `sessionStorage` as `cascade_llm_config` (session-only, not localStorage)
- Vite proxy: `/api/anthropic` → `api.anthropic.com` (dev only; prod needs real proxy)
- Build ~541KB (xyflow/react + vocab tables; chunk warning is expected)
- storyteller.pendingNotification: set by FORCE_NOTIFICATION intervention — UI should display it
- Mode selector on TitleScreen passes storytellerMode into WorldConfig → worldgen → defaultStorytellerState()
