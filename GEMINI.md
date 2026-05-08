# 🌪️ Cascade — Gemini CLI (Scout)

@c:\Users\User\Repositories\cascade\CONTEXT.md

## 💼 Role: Storyteller Audit & Gossip Review
- Audit 5-phase tick engine execution.
- Verify Gossip/Cascade ordering logic.
- Perform adversarial review of Storyteller Director.

## 🚨 Cascade Pitfalls
- **Tick Order:** ecology -> economics -> politics -> conflict -> cascade.
- **State Mutation:** SET_WORLD reducer MUST be immutable.
- **Gossip Boost:** Wiring must hit phaseGossip before story events.
- **Notification UI:** Dual-format JSON fallback required for logging.
- **Cascade Thresholds:** `cultural_spread` requires culture >40; `military_buildup` requires military >50. Starting factions (stats 10–30) will only cascade after multiple player actions or eras of sim.
- **Mode Persistence:** TitleScreen reads mode from `state.config.storytellerMode` — always dispatch `SET_CONFIG` before `SET_WORLD` on New Game.

## 🚀 Cascade Commands
- `npm run dev`: Launch Playtest SOP.
- `npm run build`: Verify TS/Vite integrity (tsc -b && vite build, ~50s).
- `npm test`: Run Vitest (24 tests / 4 suites, node env, ~2s).

## ✅ Last Verified (2026-05-08)
- Build: clean, exit 0, 948 modules
- Tests: 24/24 pass
- Playtest SOP 003: PixiJS viewport rendering confirmed; cascade chain logic correct; NPC knowledge seeding verified (96 entries / 18 NPCs)
- Task 005: Tick engine refactored to modular orchestrator pattern.
- Optimization: MapOwnershipSummary implemented; spatial complexity reduced from O(N*M) to O(1) for faction-level map lookups.
- Scout: Ingest/Index system active; post-merge hooks installed.

## 📜 Global Mandates
- Follow the **Research -> Strategy -> Execution** cycle strictly.
- Section 5 of `.gemini/GEMINI.md` takes precedence for local pitfalls.

---
_Last Updated: 2026-05-08 | Cascade_
