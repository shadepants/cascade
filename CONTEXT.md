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
- [x] Player action writes statDeltas — cascade phase can fire consequences (ActionMenu fix)
- [x] Heavy simulation upgrade: WebWorker engine, Gossip system, Visual DAG, Legendary Artifacts
- [x] Build errors from heavy upgrade fixed (73b50f6)
- [ ] Console logging added to tick.ts + worldgen.ts + ActionMenu.tsx — NOT yet committed or build-verified
- [ ] Playtest to verify cascade chain end-to-end
- [ ] Anti-snowball mechanics (overstretch penalty, rebellion trigger)
- [ ] Pressure fracture visibility (NPC tension lines, artifact significance score)
- [ ] Action budget (5-7 actions per era)
- [ ] Zustand migration (useReducer + 7 subscribers is overdue)
- [ ] React 19 canvas fix (useLayoutEffect + rAF cleanup in GameCanvas.tsx)
- [ ] Tauri wrapper (Phase 3)

## Don't Forget
- `runSimulation(world, jumpYears): GameEvent[]` — external contract must stay unchanged (called in App.tsx)
- NPC now uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`) — all callers updated
- Phase 5 CASCADE only fires if player events have non-empty `statDeltas` — ActionMenu fix was critical
- Cascade chain: player gives item → statDeltas on event → Phase 5 reads deltas → threshold crossing → consequence event with `causedBy` → NPC dialogue notifies player
- `getCausalDepth()` in DialoguePanel walks the causedBy chain to show ripple depth
- Geographic territory transfer (border tiles only) — not random tile reassignment
- Post-hoc motivation: event fires from state, then motivation string attached (Caves of Qud pattern)
- Build at ~228KB (Vite, no tree-shaking issues)
