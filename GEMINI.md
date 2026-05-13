# 🌪️ Cascade — Gemini CLI (Scout)

@c:\Users\User\Repositories\cascade\CONTEXT.md

## 💼 Role: Storyteller Audit & Gossip Review
- Audit 5-phase tick engine execution.
- Verify Gossip/Cascade ordering logic.
- Perform adversarial review of Storyteller Director.

## 🚨 Cascade Pitfalls
- **Tick Order:** ecology -> economics -> politics -> conflict -> cascade.
- **State Mutation:** Zustand state MUST be updated via `set` (manual spread or Immer).
- **Gossip Boost:** Wiring must hit phaseGossip before story events.
- **Notification UI:** Dual-format JSON fallback required for logging.
- **Cascade Thresholds:** `cultural_spread` requires culture >40; `military_buildup` requires military >50. Starting factions (stats 10–30) will only cascade after multiple player actions or eras of sim.
- **Mode Persistence:** TitleScreen reads mode from `state.config.storytellerMode` — always dispatch `SET_CONFIG` before `SET_WORLD` on New Game.
- **Spread Logic:** `phaseReligion` uses Holy Sites + Proximity; `phaseTech` uses Culture + Trade + Whispers.

## 🚀 Cascade Commands
- `npm run dev`: Launch Playtest SOP.
- `npm run build`: Verify TS/Vite integrity (tsc -b && vite build, ~50s).
- `npm test`: Run Vitest (186 tests / 24 suites, node env, ~4s).

## ✅ Last Verified (2026-05-13)
- Build: clean, exit 0, 970 modules
- Tests: 186/186 pass (24 suites)
- Playtest SOP 003: PixiJS viewport rendering confirmed; cascade chain logic correct; NPC knowledge seeding verified (96 entries / 18 NPCs)
- Task 005: Tick engine refactored to modular orchestrator pattern (Religion, Tech, Trade, etc.).
- Optimization: MapOwnershipSummary implemented; spatial complexity reduced from O(N*M) to O(1) for faction-level map lookups.
- Scout: Ingest/Index system active; post-merge hooks installed.
- State: Zustand migration complete; legacy `useGame` hook removed.

## 📜 Global Mandates
- Follow the **Research -> Strategy -> Execution** cycle strictly.
- Section 5 of `.gemini/GEMINI.md` takes precedence for local pitfalls.

---
_Last Updated: 2026-05-08 | Cascade_
