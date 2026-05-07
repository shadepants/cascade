# Test Strategy

## Layers
1. **Unit tests (`vitest`)**
   - Simulation invariants
   - Cascade derivation
   - Knowledge seeding and gossip propagation
   - UI jump-result processing helpers

2. **Browser E2E (`playwright`)**
   - Title and mode selection
   - Action flow and spotlight updates
   - Time jump and downstream narrative surfaces

## Determinism policy
- Prefer deterministic unit coverage for probabilistic mechanics (cascade/gossip) using controlled RNG test doubles.
- Keep E2E assertions focused on stable contracts and avoid broad regex selectors that match multiple controls.
- For probabilistic E2E paths, allow skip when no qualifying event is generated and cover behavior deterministically in unit tests.

## Merge validation checklist
- `npm run test`
- `npm run build`
- `npm run lint` (track existing known violations separately)
- `npx playwright test tests/cascade.spec.ts --reporter=line`
- Task 003 run record update with PASS/FAIL and notes
