# Simulation Module Ownership

## Files
- `tick.ts`: simulation orchestrator for per-year execution order and storyteller lifecycle.
- `constants.ts`: shared simulation thresholds, biome deltas, and motivation text helpers.
- `helpers/stats.ts`: canonical faction stat read/write/clamp behavior.
- `phases/cascade.ts`: cascade derivation and threshold-triggered cascade events.
- `phases/knowledge.ts`: knowledge seeding and gossip propagation pipeline.
- `storyteller.ts`: pacing/tension/spotlight/debt policies and interventions.
- `worker.ts`: WebWorker boundary for running the simulation off-thread.

## Data flow
1. UI sends world + years to worker.
2. Worker calls `runSimulation` from `tick.ts`.
3. `tick.ts` coordinates core phases, cascade phase, then knowledge pipeline.
4. Storyteller applies year-start and year-end hooks.
5. Worker returns updated world and emitted events to UI.

## Rules
- Keep `runSimulation(world, jumpYears)` contract stable.
- Keep cascade -> knowledge seeding -> gossip ordering stable.
- Keep simulation-side state mutation contained to simulation modules, with UI consuming output only.
