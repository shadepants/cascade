# Handoff — Phase 2 Expansion & Next Steps

## Current State
- **TypeScript Integrity**: Stabilized. Formalized `GameRNG` interface with `reseed()`, standardized `fireDebtIntervention` signatures, and resolved `TemporalEcho` enum mismatches.
- **Build & Tests**: Clean build (`npm run build`). Test suite expanded to 186 tests in 24 files, all passing.
- **Zustand Migration**: Fully complete. `useGameStore` is the single source of truth for React and simulation logic.
- **Track B (Religion & Tech)**: Implemented `phaseReligion.ts` (Holy Site spread, martyrdom, schisms) and `phaseTech.ts` (Innovation discovery/diffusion, whisper mechanics).
- **UI Components**: Integrated `OraclesEye` (narrative dashboard) and enhanced `GlobalLedger` with trade routes.

## Next Steps
1. **Phase 3 (Tauri)**: Begin wrapping the application in Tauri for desktop deployment.
2. **Refinement**: Tune Religious Schism frequencies and Innovation spread rates based on playtest feedback.
3. **Performance**: Continue monitoring `PixiViewport.tsx` for unnecessary re-renders during high-speed jumps.

## Technical Notes
- Legacy `useGame()` is deleted. Use `useGameStore` for React components.
- For simulation engine/non-React files, use `useGameStore.getState()` and `useGameStore.setState()`.
- Ensure type-only imports (`import type { ... } from 'zustand'`) when adding new state or slice properties.
