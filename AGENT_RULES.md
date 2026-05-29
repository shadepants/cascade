# 🌪️ Cascade — Agnostic Agent Rules

These rules apply universally across all coding agents (Gemini, Claude, etc.) operating in the Cascade project.

## 💼 Agent Roles & Global Mandates
- **Master Control Plane:** For global automation and multi-project orchestration.
- **Storyteller Audit:** Audit the 5-phase tick engine execution, verify Gossip/Cascade ordering logic, and perform adversarial reviews.
- **Workflow:** Follow the **Research -> Strategy -> Execution** cycle strictly.

## 🛠️ Build & Test Commands
- **Dev:** `npm run dev` (Launch Playtest SOP)
- **Build:** `npm run build` (Verify TS/Vite integrity: `tsc -b && vite build`)
- **Test:** `npm test` (Vitest, 186 tests / 24 suites, node env)
- **Scout:** `npm run scout` (Regenerate CODEBASE.md)

## 🚨 Cascade Pitfalls & Development Rules
- **Tick Order:** ecology -> economics -> politics -> conflict -> cascade.
- **State Mutation:** Zustand state MUST be updated via `set` (manual spread or Immer). Use `useGameStore` in React; `useGameStore.getState()` in simulation logic.
- **Type Integrity:** No `any` types allowed. Use `GameRNG` interface for RNG. Use type-only imports for state properties.
- **Gossip Boost:** Wiring must hit phaseGossip before story events.
- **Notification UI:** Dual-format JSON fallback required for logging.
- **Cascade Thresholds:** `cultural_spread` requires culture >40; `military_buildup` requires military >50. Starting factions (stats 10–30) will only cascade after multiple player actions or eras of sim.
- **Mode Persistence:** TitleScreen reads mode from `state.config.storytellerMode` — always dispatch `SET_CONFIG` before `SET_WORLD` on New Game.
- **Spread Logic:** `phaseReligion` uses Holy Sites + Proximity; `phaseTech` uses Culture + Trade + Whispers.
- **Performance:** Avoid unnecessary re-renders in `PixiViewport.tsx`. Batch graphics updates.

## 🧠 Synthesis-Derived Rules (§5)
- **Batch Shell Ops:** Plan full command sequences (status -> add -> commit -> push) before execution. Use `;` in PowerShell to chain dependent commands. Avoid reactive one-at-a-time commands to minimize context waste.
- **Diagnostic Scripts:** For complex subsystem debugging (timeout issues, import failures), write focused Python diagnostic scripts that import project modules directly instead of using individual shell probes.
- **Hotspot Stabilization:** `PixiViewport.tsx` and `tick.ts` are high-churn files. Before editing, verify logic separation to avoid increasing design debt.
- **Git Timeout Strategy:** If a git command times out, check `git log` immediately. Use `WaitForExit(15000)` in a custom Process object for heavy operations (auto-packing/large commits).
- **Mock Data Synchronization:** Before running integration tests, search the codebase (e.g. `grep_search` or `grep`) for `mock` or `createMock` to ensure mock data structures align with updated interfaces.
- **Architecture Constraints:** Prevent O(N) loop bottlenecks. Avoid causal chain array scans. For PixiJS animations, strictly use the PixiJS Ticker-driven system rather than React state (which causes severe overhead and re-renders).
