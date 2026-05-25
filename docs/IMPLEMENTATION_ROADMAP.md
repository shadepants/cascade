# Cascade Implementation Roadmap (Phased)

This roadmap turns the approved plan into executable phases with concrete file scope.

## P0 — Stabilize quality baseline (do first)

### 1) Stabilize lint baseline
- Target files first:
  - /home/runner/work/cascade/cascade/src/ui/TitleScreen.tsx
  - /home/runner/work/cascade/cascade/src/ui/DialoguePanel.tsx
  - /home/runner/work/cascade/cascade/src/ui/App.tsx
  - /home/runner/work/cascade/cascade/src/ui/PixiViewport.tsx
- Then clear `any`/unused-param debt in:
  - /home/runner/work/cascade/cascade/src/simulation/**
  - /home/runner/work/cascade/cascade/src/world/**
  - /home/runner/work/cascade/cascade/tests/**
- Exit criteria:
  - `npm run lint` has no newly introduced violations in touched files.
  - Invalid lint-rule comments are removed/fixed.

### 2) Reduce React effect fragility
- Refactor mount-time effects that synchronously call `setState`.
- Normalize dependency arrays for deterministic worker + jump flow.
- Prioritize:
  - /home/runner/work/cascade/cascade/src/ui/App.tsx
  - /home/runner/work/cascade/cascade/src/ui/TitleScreen.tsx
  - /home/runner/work/cascade/cascade/src/ui/DialoguePanel.tsx
  - /home/runner/work/cascade/cascade/src/ui/PixiViewport.tsx
- Exit criteria:
  - No hook-order/ref misuse violations.
  - Jump orchestration behavior remains unchanged.

### 3) Tighten type safety in tests and sim edges
- Remove remaining explicit `any`.
- Add typed fixtures/helpers where tests currently bypass strict types.
- Prioritize:
  - /home/runner/work/cascade/cascade/src/simulation/phases/phaseTech.test.ts
  - /home/runner/work/cascade/cascade/src/world/worldgen.ts
  - /home/runner/work/cascade/cascade/tests/cascade.spec.ts
- Exit criteria:
  - `npm run build` passes cleanly.
  - Test fixtures compile against current domain types.

## P1 — De-risk hotspots + improve observability

### 4) Split high-risk hotspot files
- Extract `PixiViewport.tsx` into modules:
  - setup/bootstrap
  - layer lifecycle
  - input handling
  - animation loop
  - overlay interaction wiring
- Split `App.tsx` by:
  - phase routing shell
  - worker/jump orchestration
- Exit criteria:
  - Behavior parity validated by existing tests and manual smoke flow.
  - File-level churn pressure reduced in hotspot files.

### 5) Improve simulation observability
- Add structured diagnostic toggles (off by default) for:
  - per-phase tick metrics
  - storyteller intervention traces
- Add deterministic regression tests for:
  - jump-result notification formatting
  - insight append behavior
  - seeded jump-knowledge distribution
- Scope:
  - /home/runner/work/cascade/cascade/src/simulation/tick.ts
  - /home/runner/work/cascade/cascade/src/simulation/storyteller.ts
  - /home/runner/work/cascade/cascade/src/ui/simulationResult.ts
  - /home/runner/work/cascade/cascade/src/ui/simulationResult.test.ts

## P2 — Upgrades, enhancements, and long-term hardening

### 6) Coverage support
- Add and configure:
  - `@vitest/coverage-v8`
- Enforce baseline coverage thresholds for simulation/world modules.

### 7) CI quality gates
- Ensure one required CI workflow runs:
  - lint
  - build
  - unit tests
  - Playwright smoke (`tests/cascade.spec.ts`)

### 8) Diplomacy visualization enhancement
- Add optional diplomacy overlay for `war`/`alliance`/`hostile`/`peace` readability.
- Keep as toggled layer to avoid baseline render overhead.

### 9) Save schema/versioning hardening
- Add save schema version stamp in Dexie records.
- Add explicit migration flow for backward compatibility.
- Scope:
  - /home/runner/work/cascade/cascade/src/data/db.ts
  - save/load call sites in UI/store integration paths

### 10) Performance profiling hooks
- Add lightweight profiling marks around expensive render/update paths:
  - ghost layer
  - trade layer
  - large frame update passes
- Keep gated by dev/debug toggles.

### 11) Architecture docs refresh process
- Keep docs synchronized with engine and UI wiring:
  - /home/runner/work/cascade/cascade/README.md
  - /home/runner/work/cascade/cascade/docs/ENGINE_INVARIANTS.md
  - /home/runner/work/cascade/cascade/docs/TEST_STRATEGY.md
  - /home/runner/work/cascade/cascade/CODEBASE.md (`npm run scout`)

## Standard validation for each phase
- `npm run lint`
- `npm run build`
- `npm run test`
- `npx playwright test tests/cascade.spec.ts --reporter=line`
