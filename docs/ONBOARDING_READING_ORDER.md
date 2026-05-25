# Cascade Onboarding Reading Order (Fast Path)

Use this order to understand the codebase quickly with minimal backtracking.

## 1) Foundation docs
- [README.md](../README.md)
- [docs/ENGINE_INVARIANTS.md](ENGINE_INVARIANTS.md)
- [docs/TEST_STRATEGY.md](TEST_STRATEGY.md)
- [CODEBASE.md](../CODEBASE.md)

## 2) App/runtime entry points
- [src/main.tsx](../src/main.tsx)
- [src/ui/App.tsx](../src/ui/App.tsx)
- [src/store/index.ts](../src/store/index.ts)
- [src/store/slices/world.ts](../src/store/slices/world.ts)

## 3) Core simulation flow
- [src/simulation/README.md](../src/simulation/README.md)
- [src/simulation/worker.ts](../src/simulation/worker.ts)
- [src/simulation/tick.ts](../src/simulation/tick.ts)
- [src/simulation/storyteller.ts](../src/simulation/storyteller.ts)
- [src/simulation/phases/cascade.ts](../src/simulation/phases/cascade.ts)
- [src/simulation/phases/knowledge.ts](../src/simulation/phases/knowledge.ts)

## 4) World lifecycle
- [src/world/worldgen.ts](../src/world/worldgen.ts)
- [src/world/factions.ts](../src/world/factions.ts)
- [src/world/entities.ts](../src/world/entities.ts)
- [src/world/events.ts](../src/world/events.ts)

## 5) Rendering + UX layers
- [src/ui/PixiViewport.tsx](../src/ui/PixiViewport.tsx)
- [src/engine/worldRenderer.ts](../src/engine/worldRenderer.ts)
- [src/engine/visualEffects.ts](../src/engine/visualEffects.ts)
- [src/ui/TitleScreen.tsx](../src/ui/TitleScreen.tsx)
- [src/ui/DialoguePanel.tsx](../src/ui/DialoguePanel.tsx)

## 6) Persistence + result handling + test contracts
- [src/data/db.ts](../src/data/db.ts)
- [src/ui/simulationResult.ts](../src/ui/simulationResult.ts)
- [src/simulation/tick.test.ts](../src/simulation/tick.test.ts)
- [tests/cascade.spec.ts](../tests/cascade.spec.ts)
