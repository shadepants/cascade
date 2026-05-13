# Handoff — Zustand Migration Complete & Next Steps

## Current State
- **TypeScript Integrity**: Stabilized. Formalized `GameRNG` interface with `reseed()`, standardized `fireDebtIntervention` signatures, and resolved `TemporalEcho` enum mismatches in `InterventionMenu`.
- **Build & Tests**: Clean build (`npm run build`). Test suite expanded and verified (176 tests in 21 files, all passing).
- **Global Types**: Resolved `Window` interface clashes and `TestAction` missing in `App.tsx` by centralizing declarations in `window.d.ts`.

## Next Steps
1. **Phase 2 (Religion)**: Finalize religious simulation mechanics (Track B). Implement `Religion` and `FaithPressure` logic in `phaseReligion.ts`.
2. **Performance Monitoring**: Monitor `PixiViewport.tsx` re-renders after Zustand migration.

## Technical Notes
- Legacy `useGame()` is deleted. Use `useGameStore` for React components.
- For simulation engine/non-React files, use `useGameStore.getState()` and `useGameStore.setState()`.
- Ensure type-only imports (`import type { ... } from 'zustand'`) when adding new state or slice properties.
