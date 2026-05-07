# Engine Invariants

This document captures behavior that must remain stable while refactoring.

## Tick sequencing
- `runSimulation(world, jumpYears)` is the external simulation contract and must continue returning the emitted `GameEvent[]` for all simulated years.
- Per simulated year, the orchestrator runs in this order:
  1. `phaseColonization`
  2. `phaseSettlementGrowth`
  3. `phaseEcology`
  4. `phaseEconomics`
  5. `phaseInterestGroups`
  6. `phasePolitics`
  7. `phaseConflict`
  8. `phaseStability`
  9. `phaseSuccession`
  10. `phaseCascade`
  11. knowledge pipeline: `seedEventKnowledge` then `phaseGossip`
- Storyteller lifecycle remains year-scoped: prune/reset/compute at year start and decay/debt/intervention at year end.

## Cascade knowledge/gossip ordering
- Cascade consequences are generated before NPC knowledge seeding.
- Knowledge seeding runs before gossip in the same year so gossip can propagate newly seeded cascade knowledge immediately.
- Gossip transfer accuracy degrades per hop (`accuracy * 0.9`).

## `SET_WORLD` immutability expectations
- `SET_WORLD` in `/home/runner/work/cascade/cascade/src/store.ts` must return a new store object and never mutate existing `state`.
- `UPDATE_WORLD` updater must return a new `WorldState` object for React change detection.

## Notification flow (`pendingNotification`)
- Storyteller interventions may enqueue `world.storyteller.pendingNotification` during simulation.
- UI must consume and clear this field before dispatching `SET_WORLD`, then show a UI notification from the consumed value.
- Notification rendering must remain resilient to malformed values via formatting fallback.

## Compatibility constraints
- Save compatibility guard (`if (!world.storyteller) world.storyteller = defaultStorytellerState()`) must remain in simulation.
- Existing test-only access (`_forTesting`) must continue exposing cascade consequence behavior used by unit tests.
