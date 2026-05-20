# 🌪️ Cascade — Gemini CLI (Scout)

## 🛠️ Build & Test
- **Dev:** `npm run dev`
- **Build:** `npm run build` (tsc -b && vite build)
- **Test:** `npm test` (Vitest, 186 tests)
- **Scout:** `npm run scout` (Regenerate CODEBASE.md)

## 📜 Development Rules
- **Role:** Master Control Plane for global automation and multi-project orchestration.
- **Tick Order:** ecology -> economics -> politics -> conflict -> cascade.
- **State:** Zustand state MUST be updated via `set` (manual spread or Immer).
- **Zustand Usage:** Use `useGameStore` in React; `useGameStore.getState()` in simulation logic.
- **Type Integrity:** No `any` types allowed. Use `GameRNG` interface for RNG. Use type-only imports for state properties.
- **Performance:** Avoid unnecessary re-renders in `PixiViewport.tsx`. Batch graphics updates.
- **Cascade Thresholds:** culture > 40, military > 50.

## 🧠 Synthesis-Derived Rules (§5)
- **Batch Shell Ops:** Plan full command sequences (status -> add -> commit -> push) before execution. Use `;` in PowerShell to chain dependent commands. Avoid reactive one-at-a-time commands to minimize context waste.
- **Diagnostic Scripts:** For complex subsystem debugging (timeout issues, import failures), write focused Python diagnostic scripts that import project modules directly instead of using individual shell probes.
- **Hotspot Stabilization:** `PixiViewport.tsx` and `tick.ts` are high-churn files. Before editing, verify logic separation to avoid increasing design debt.
- **Git Timeout Strategy:** If a git command times out, check `git log` immediately. Use `WaitForExit(15000)` in a custom Process object for heavy operations (auto-packing/large commits).

---
_Last Updated: 2026-05-13 | Insights Synthesis Cycle 1_
