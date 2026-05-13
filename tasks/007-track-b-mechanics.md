# Task 007: Track B — Triple-Thread Expansion & Echo System

Expansion of the simulation engine with new mechanics and player agency.

## Phase 0: The Echo System (Early Game Vitality)
- [x] Define `Insight` state and `EchoAction` types
- [x] Implement `src/engine/echoSystem.ts` for Insight logic
- [x] Implement `Whisper` action (Gossip influence)
- [x] Implement `Intervention` action (Tile modifiers)
- [x] Visual: Whisper ripples and Insight aura in `PixiViewport.tsx`

## Phase 1: The Merchant's Path (Trade)
- [x] Define `TradeRoute` type and state schema
- [x] Implement `src/simulation/phases/phaseTrade.ts`
- [x] Integrate `phaseTrade` into `tick.ts` orchestrator
- [x] Hook: Trade routes generate Insight based on volume
- [x] Visual: Pulsing golden lines in `PixiViewport.tsx`

## Phase 2: The Prophet's Word (Religion)
- [x] Define `Religion` and `FaithPressure` types
- [x] Implement `src/simulation/phases/phaseReligion.ts`
- [x] Add 'Holy Site' building type to map generation
- [x] Hook: 'Interventions' on Holy Sites cost 2x but have 4x impact
- [x] Visual: Subtle 'bloom'/heat-map for faith influence

## Phase 3: The Scholar's Ledger (Tech)
- [x] Define `Innovation` type and Gossip category
- [x] Implement `src/simulation/phases/phaseTech.ts`
- [x] Hook: 'Whispering' about tech speeds up its adoption
- [x] Unlock new player `Action` types based on era tech
- [x] Visual: Innovation notification icons in UI

## Phase 4: Integration & Polish
- [ ] Create 'The Oracle's Eye' UI for Echo actions
- [ ] Create 'The Ledger' UI tab for global stats
- [ ] Run stability and performance audits (Vitest + Scout)
- [ ] Final 'Elegance & Fun' pass (animations/sound)
