# AI Agent Handoff Protocol — Project Cascade

## Current Session Status
**Last Updated:** 2026-03-04
**Active Agent:** Claude Code
**Current Goal:** Implement Storyteller Director + accuracy-tiered dialogue; playtest full cascade chain.

## Changes This Session
- [x] **Bug fix (critical):** Cascade events never seeded into NPC knowledge — gossip had nothing to spread. Added `seedEventKnowledge()` in tick.ts; reordered cascade → seed → gossip.
- [x] **Task 001 — Accuracy-Tiered Templates:** `templates.ts` expanded with 12 tiered dialogue strings (certain/rumored/legend × 4 personalities), 4 chain synthesis strings, `ETHICS_VOCAB` (5 ethics × 3 stances), `EVENT_ACTION_VOCAB` (17 event types × 4 personalities), `findKnowledgeChain()`, `generateEthicsComment()`. DialoguePanel uses tier-appropriate templates + accuracy dot indicator (●/◑/○).
- [x] **Task 002 — Storyteller Director:** New `src/simulation/storyteller.ts` — tension formula, spotlight (cascade threshold 0.40→0.25 for player's last faction), pacing cooldowns (mode-dependent duration), narrative debt interventions (SEED_KNOWLEDGE/PLACE_WITNESS/FORCE_NOTIFICATION at 30/50/70yr). Wired into tick.ts at 4 injection points. Mode selector (Clio/Ares/Tyche) added to TitleScreen. `setSpotlight()` called from ActionMenu on item give.
- [x] **Spec files written:** tasks/001, tasks/002, tasks/003 (playtest SOP)
- [ ] **Task 003 — Playtest:** Not yet run. Run `npm run dev` and follow tasks/003-playtest-sop.md.

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | PASSED | tsc + vite, no type errors |
| NPC knowledge seeding | CODE VERIFIED | seedEventKnowledge() called after phaseCascade |
| Tiered dialogue | CODE VERIFIED | AccuracyTier selected from knowledge.accuracy |
| Storyteller tension | CODE VERIFIED | computeTension() wired at year-start |
| Cascade threshold | CODE VERIFIED | getCascadeThreshold() replaces hardcoded 0.4 |
| Narrative debt | CODE VERIFIED | accumulateDebt() + fireDebtIntervention() at year-end |
| End-to-end playtest | NOT RUN | See tasks/003-playtest-sop.md for browser console procedure |

## Next Steps
1. [ ] **Run playtest SOP** (`npm run dev`, follow tasks/003-playtest-sop.md in browser console)
2. [ ] **Wire pendingNotification to UI** — `world.storyteller.pendingNotification` is set by FORCE_NOTIFICATION but App.tsx doesn't yet display it (optional polish)
3. [ ] **Gossip spotlight boost** — `getGossipBoost()` exists in storyteller.ts but phaseGossip doesn't use it yet (the 0.3 probability is still hardcoded in tick.ts line ~753)
4. [ ] **High-sig event gating** — `shouldSuppressEvent()` / `registerHighSigEvent()` exist but aren't wired into phase functions yet (budget and cooldown enforcement is partial)
5. [ ] **Score screen / cascade depth display** — show player's longest chain in end-of-run summary

## Notes
- **Run command:** `npm run dev` → http://localhost:5173
- **Playtest guide:** `tasks/003-playtest-sop.md` — full browser console procedure
- **Git:** 4 commits this session (d7a1695, 5297939, aba4ea4 are the key ones)
- **No remote origin** configured — local only
