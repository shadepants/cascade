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
- [x] POC MVP (18 files, 6 bugs fixed)
- [x] Git initialized, all code committed
- [x] 5-phase DF-inspired simulation engine (tick.ts)
- [x] Player action writes statDeltas — cascade phase can fire consequences
- [x] Heavy simulation upgrade: WebWorker engine, Gossip system, Visual DAG, Legendary Artifacts
- [x] Phase 6 Stability: imperial overstretch penalty + fractureFaction() civil wars
- [x] Socratic Gate: LLM-powered NPC dialogue (Anthropic API via Vite proxy, localStorage key)
- [x] IndexedDB save/load (Dexie) — auto-save on jump, Resume button on title
- [x] Ghost of History layer (hold H) — dashed faction borders + ruins from previous era
- [x] Action budget: 6 actions per era, counter in HUD + ActionMenu, resets on jump
- [x] React 19 canvas fix: useLayoutEffect eliminates flash-of-unrendered-canvas
- [ ] Zustand migration (useReducer + many subscribers — defer until perf is felt)
- [ ] Tauri wrapper (Phase 3)

## Roadmap
- **Next:** Playtest the full cascade chain end-to-end (give item → jump → talk to NPC)
- **Polish:** Artifact significance score visible in ActionMenu tooltip
- **Gameplay:** NPC tension lines on map (show faction animosity as coloured borders)

## Don't Forget
- `runSimulation(world, jumpYears): GameEvent[]` — external contract must stay unchanged
- NPC uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`)
- Phase 5 CASCADE only fires if player events have non-empty `statDeltas`
- Cascade chain: player gives item → statDeltas → Phase 5 threshold → consequence with `causedBy`
- `getCausalDepth()` in DialoguePanel walks causedBy chain to show ripple depth
- Geographic territory transfer (border tiles only) — not random tile reassignment
- Post-hoc motivation: event fires from state, then motivation string attached
- Build at ~519KB (xyflow/react drives bundle; chunk warning is expected)
- MAX_ACTIONS_PER_ERA = 6 in types.ts — reset in App.tsx after each jump
- LLM config stored in localStorage as `cascade_llm_config` (provider/apiKey/model)
- Vite proxy: `/api/anthropic` → `api.anthropic.com` (dev only; prod needs real proxy)
