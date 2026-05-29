# Cascade Structural Invariants

The following invariants MUST be maintained. These are mechanically validated during agent operations.

- `API_CONTRACT: runSimulation`: `runSimulation(world, jumpYears): GameEvent[]` external contract must stay unchanged.
- `DATA_MODEL: NPC_Knowledge`: NPC uses `knowledge: NPCKnowledge[]` (not old `knownEvents: string[]`).
- `LIFECYCLE: Cascade_Order`: CASCADE order: cascade → seedEventKnowledge → gossip (seeding must precede gossip).
- `DATA_MODEL: FactionEthics`: Keys: `violence | expansion | trade | tradition | mercy` with values `embraced | neutral | shunned`.
- `CONFIG: Max_Actions`: `MAX_ACTIONS_PER_ERA = 6` in types.ts — reset in App.tsx after each jump.
- `SECURITY: LLM_Config`: LLM config in `sessionStorage` as `cascade_llm_config` (session-only, not localStorage).
- `INFRA: Vite_Proxy`: `/api/anthropic` → `api.anthropic.com` (dev only; prod needs real proxy).
- `PERFORMANCE: Build_Size`: Build ~813KB main bundle (xyflow/react + PixiJS + vocab tables; chunk warning is expected).
- `API_CONTRACT: emitEvent`: `emitEvent(world, pool, event, year)` returns void, not usable where side-effects need suppression gating.
- `LIFECYCLE: Mode_Selector`: Mode selector on TitleScreen reads `state.config.storytellerMode` on mount; dispatches `SET_CONFIG` on New Game before `SET_WORLD`.
- `INFRA: Unit_Tests`: `npm test` (Vitest, 186 tests / 24 suites, node env, scoped to src/**/*.test.ts — Playwright E2E excluded).
- `ASSETS: Terrain_Calibration`: `SHEET_TERRAIN = Tile.png`. BIOME_TILES calibrated to row 0. Forest/grassland share green tile.
- `PERFORMANCE: Pixi_Batching`: Ghost layer batching: edges grouped by faction color → one `g.stroke()` per color.
- `DATA_MODEL: Texture_Pool`: Texture pool key: `sheetKey:region.x:region.y`.
- `CONFIG: Cascade_Thresholds`: `cultural_spread` fires at culture >40; `military_buildup` fires at military >50.
- `STATE: Store_Actions`: `SET_CONFIG` action updates `state.config` with a `WorldConfig` value.
- `INFRA: Scout_System`: `CODEBASE.md` auto-generated module map. Run `npm run scout` to regenerate.
- `SIMULATION: Spread_Mechanics`: Faith spreads via Holy Sites, Trade Routes (>30). Tech spreads via proximity/trade, accelerated by Whisper echoes.
- `SIMULATION: Sacred_Omens`: Pressure multiplier (4x) for Holy Sites on Omen tiles; conversion tension boost (+8) on Omens.
