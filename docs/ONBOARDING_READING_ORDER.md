# Cascade Onboarding Reading Order (Fast Path)

Use this order to understand the codebase quickly with minimal backtracking.

## 1) Foundation docs
- /home/runner/work/cascade/cascade/README.md
- /home/runner/work/cascade/cascade/docs/ENGINE_INVARIANTS.md
- /home/runner/work/cascade/cascade/docs/TEST_STRATEGY.md
- /home/runner/work/cascade/cascade/CODEBASE.md

## 2) App/runtime entry points
- /home/runner/work/cascade/cascade/src/main.tsx
- /home/runner/work/cascade/cascade/src/ui/App.tsx
- /home/runner/work/cascade/cascade/src/store/index.ts
- /home/runner/work/cascade/cascade/src/store/slices/world.ts

## 3) Core simulation flow
- /home/runner/work/cascade/cascade/src/simulation/README.md
- /home/runner/work/cascade/cascade/src/simulation/worker.ts
- /home/runner/work/cascade/cascade/src/simulation/tick.ts
- /home/runner/work/cascade/cascade/src/simulation/storyteller.ts
- /home/runner/work/cascade/cascade/src/simulation/phases/cascade.ts
- /home/runner/work/cascade/cascade/src/simulation/phases/knowledge.ts

## 4) World lifecycle
- /home/runner/work/cascade/cascade/src/world/worldgen.ts
- /home/runner/work/cascade/cascade/src/world/factions.ts
- /home/runner/work/cascade/cascade/src/world/entities.ts
- /home/runner/work/cascade/cascade/src/world/events.ts

## 5) Rendering + UX layers
- /home/runner/work/cascade/cascade/src/ui/PixiViewport.tsx
- /home/runner/work/cascade/cascade/src/engine/worldRenderer.ts
- /home/runner/work/cascade/cascade/src/engine/visualEffects.ts
- /home/runner/work/cascade/cascade/src/ui/TitleScreen.tsx
- /home/runner/work/cascade/cascade/src/ui/DialoguePanel.tsx

## 6) Persistence + result handling + test contracts
- /home/runner/work/cascade/cascade/src/data/db.ts
- /home/runner/work/cascade/cascade/src/ui/simulationResult.ts
- /home/runner/work/cascade/cascade/src/simulation/tick.test.ts
- /home/runner/work/cascade/cascade/tests/cascade.spec.ts
