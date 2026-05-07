# Cascade

Cascade is a browser-based historical simulation roguelike where player actions create long causal chains across centuries.

## Stack
- React 19 + TypeScript + Vite
- Pure TypeScript simulation engine (`src/simulation`)
- WebWorker execution for time jumps (`src/simulation/worker.ts`)
- Canvas renderer (`src/engine/renderer.ts`)
- IndexedDB persistence via Dexie

## Quick Start
```bash
npm ci
npm run dev
```

## Core Architecture
- `src/simulation/tick.ts`: yearly orchestrator and storyteller lifecycle
- `src/simulation/phases/cascade.ts`: cascade consequence derivation
- `src/simulation/phases/knowledge.ts`: cascade knowledge seeding and gossip spread
- `src/world/worldgen.ts`: terrain/factions/entities + deep history pre-sim
- `src/ui/App.tsx`: app phase routing and jump worker integration
- `src/store.ts`: reducer-backed app state and immutable state transitions

## Engine Invariants
See: `docs/ENGINE_INVARIANTS.md`

## Commands
- `npm run dev` — local playtest
- `npm run test` — unit tests (`src/**/*.test.ts`)
- `npm run build` — type-check + production build
- `npm run lint` — eslint (currently reports pre-existing repo violations)

## Validation Matrix (before merge)
1. `npm run test`
2. `npm run build`
3. `npm run lint` (record existing vs newly introduced issues)
4. Run Task 003 SOP (`tasks/003-playtest-sop.md`) and capture PASS/FAIL in run table

## Playtest/QA Docs
- `tasks/003-playtest-sop.md`
- `tasks/004-gems-playtest-guide.md`
