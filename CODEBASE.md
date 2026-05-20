# CODEBASE — Auto-Generated Index
> Generated: 2026-05-14T00:01:30.402Z | Commit: 365d4fce63fb89f4e4227878f6d0bb3e7d955ac7 | Run: `npm run scout`

## Module Map
| Path | Exports | Lines | Test? |
|------|---------|-------|-------|
| src/data/biomes.ts | BIOME_COLORS, BIOME_GLYPHS | 31 | — |
| src/data/db.ts | SaveSlot, CascadeDatabase, db | 57 | — |
| src/data/names.ts | FACTION_TEMPLATES, NPC_NAMES, ITEM_TEMPLATES | 67 | — |
| src/data/templates.ts | DialogueTemplate, DIALOGUE, fillTemplate, AccuracyTier, getAccuracyTier | 504 | — |
| src/engine/camera.ts | createCamera, centerOnPlayer | 41 | — |
| src/engine/echoSystem.test.ts |  | 137 | — |
| src/engine/echoSystem.ts | executeEcho | 277 | ✓ |
| src/engine/index.ts |  | 8 | — |
| src/engine/input.ts | GameAction, mapKeyToAction | 41 | — |
| src/engine/renderer.ts | RenderContext, renderWorld | 344 | — |
| src/engine/tileMap.test.ts |  | 120 | — |
| src/engine/tileMap.ts | SPRITE_SIZE, TileRegion, SHEET_TERRAIN, SHEET_SETTLEMENT, SHEET_CHARACTER | 133 | ✓ |
| src/main.tsx |  | 11 | — |
| src/simulation/cascade.ts | CascadeResult, CascadeTier, calculateCascade, formatChainAsTree | 74 | — |
| src/simulation/constants.ts | WAR_ANIMOSITY_THRESHOLD, FAMINE_DESERT_THRESHOLD, FAMINE_POPULATION_MIN, REBELLION_STABILITY_MIN, ALLIANCE_OPINION_MIN | 39 | — |
| src/simulation/emitEvent.ts | emitEvent | 13 | — |
| src/simulation/helpers/spatial.test.ts |  | 169 | — |
| src/simulation/helpers/spatial.ts | FactionMapStats, MapOwnershipSummary, getMapOwnershipSummary, getTilesForFaction, getTilesWithPosForFaction | 116 | ✓ |
| src/simulation/helpers/stats.test.ts |  | 124 | — |
| src/simulation/helpers/stats.ts | getFactionStat, applyStatDeltas | 35 | ✓ |
| src/simulation/index.ts |  | 6 | — |
| src/simulation/llm.ts | LLMConfig, getLLMConfig, saveLLMConfig | 77 | — |
| src/simulation/narrative.ts | NarrativeContext, assembleNarrativeContext, buildInterrogationPrompt, synthesizeHistoryMonologue, getTemplateDialogue | 256 | — |
| src/simulation/phases/cascade.ts | phaseCascade, deriveConsequence, cascadeTesting | 186 | — |
| src/simulation/phases/colonization.ts | phaseSettlementGrowth, phaseColonization | 179 | — |
| src/simulation/phases/conflict.test.ts |  | 225 | — |
| src/simulation/phases/conflict.ts | phaseConflict, fractureFaction | 251 | ✓ |
| src/simulation/phases/ecology.test.ts |  | 89 | — |
| src/simulation/phases/ecology.ts | phaseEcology | 61 | ✓ |
| src/simulation/phases/economics.test.ts |  | 103 | — |
| src/simulation/phases/economics.ts | phaseEconomics | 108 | ✓ |
| src/simulation/phases/interestGroups.test.ts |  | 108 | — |
| src/simulation/phases/interestGroups.ts | phaseInterestGroups | 45 | ✓ |
| src/simulation/phases/knowledge.test.ts |  | 91 | — |
| src/simulation/phases/knowledge.ts | seedEventKnowledge, phaseGossip, phaseDiffusion, runKnowledgePipeline | 100 | ✓ |
| src/simulation/phases/phaseReligion.test.ts |  | 159 | — |
| src/simulation/phases/phaseReligion.ts | phaseReligion | 281 | ✓ |
| src/simulation/phases/phaseTech.test.ts |  | 107 | — |
| src/simulation/phases/phaseTech.ts | phaseTech | 192 | ✓ |
| src/simulation/phases/phaseTrade.test.ts |  | 148 | — |
| src/simulation/phases/phaseTrade.ts | phaseTrade | 156 | ✓ |
| src/simulation/phases/politics.test.ts |  | 77 | — |
| src/simulation/phases/politics.ts | phasePolitics | 78 | ✓ |
| src/simulation/phases/stability.test.ts |  | 114 | — |
| src/simulation/phases/stability.ts | phaseStability | 152 | ✓ |
| src/simulation/phases/succession.test.ts |  | 123 | — |
| src/simulation/phases/succession.ts | getRulerForFaction, hasTrait, phaseSuccession | 96 | ✓ |
| src/simulation/storyteller.test.ts |  | 405 | — |
| src/simulation/storyteller.ts | computeTension, decayTension, pruneCooldowns, shouldSuppressEvent, registerHighSigEvent | 348 | ✓ |
| src/simulation/tick.test.ts |  | 266 | — |
| src/simulation/tick.ts | runSimulation, _forTesting | 148 | ✓ |
| src/simulation/worker.ts | SimulationMessage, SimulationResult | 50 | — |
| src/store/index.ts | useGameStore, getGameState, dispatchGameAction | 44 | — |
| src/store/slices/camera.ts | createCameraSlice | 20 | — |
| src/store/slices/config.ts | createConfigSlice | 10 | — |
| src/store/slices/ui.ts | createUISlice | 62 | — |
| src/store/slices/world.ts | createWorldSlice | 34 | — |
| src/store/types.ts | WorldSlice, CameraSlice, UISlice, ConfigSlice, GameStore | 51 | — |
| src/types/index.ts |  | 6 | — |
| src/types/simulation.ts | GameEvent, CausalChain, CausalNode | 31 | — |
| src/types/storyteller.ts | StorytellerMode, CooldownEntry, StorytellerState, defaultStorytellerState | 51 | — |
| src/types/test.ts | TestAction | 12 | — |
| src/types/ui.ts | DEFAULT_CONFIG, GamePhase, Camera, GameStore, TILE_SIZE | 47 | — |
| src/types/world.ts | Position, Biome, Tile, TileModifier, GameMap | 295 | — |
| src/ui/ActionMenu.tsx | ActionMenu | 144 | — |
| src/ui/App.tsx | App | 209 | — |
| src/ui/CascadeMap.tsx | CascadeMap | 127 | — |
| src/ui/CascadeScore.tsx | CascadeScore | 72 | — |
| src/ui/DialoguePanel.tsx | DialoguePanel | 230 | — |
| src/ui/GameCanvas.tsx | GameCanvas | 182 | — |
| src/ui/GlobalLedger.tsx | GlobalLedger | 127 | — |
| src/ui/HUD.tsx | HUD | 77 | — |
| src/ui/InterventionMenu.tsx | InterventionMenu | 163 | — |
| src/ui/KnowledgeLog.tsx | KnowledgeLog | 39 | — |
| src/ui/OraclesEye.tsx | OraclesEye | 130 | — |
| src/ui/PixiViewport.tsx | PixiViewport | 1004 | — |
| src/ui/simulationResult.test.ts |  | 129 | — |
| src/ui/simulationResult.ts | formatNotificationValue, processSimulationResult | 117 | ✓ |
| src/ui/TitleScreen.tsx | TitleScreen | 147 | — |
| src/utils/noise.test.ts |  | 76 | — |
| src/utils/noise.ts | createNoise2D, createFBM2D | 113 | ✓ |
| src/utils/rng.test.ts |  | 87 | — |
| src/utils/rng.ts | GameRNG, SeededRNG | 52 | ✓ |
| src/window.d.ts |  | 12 | — |
| src/world/entities.test.ts |  | 165 | — |
| src/world/entities.ts | generateNPCs, createPlayer, generateItems | 172 | ✓ |
| src/world/events.perf.test.ts |  | 43 | — |
| src/world/events.ts | createEvent, buildCausalChains, resetEventIds, initEventIds | 116 | — |
| src/world/factions.ts | generateFactions, generateRelationships, computeEthicsDivergence | 253 | — |
| src/world/index.ts |  | 12 | — |
| src/world/terrain.test.ts |  | 93 | — |
| src/world/terrain.ts | generateTerrain | 148 | ✓ |
| src/world/worldgen.test.ts |  | 47 | — |
| src/world/worldgen.ts | generateWorld | 326 | ✓ |

## Dependency Graph (Directory Level)
```mermaid
graph LR
  data --> src
  engine --> src
  engine --> src\engine
  engine --> src\types
  engine --> src\data
  src --> src\ui
  src --> src\store
  simulation --> src
  simulation --> src\world
  simulation --> src\utils
  simulation --> src\simulation
  simulation --> src\data
  simulation --> src\simulation\helpers
  simulation --> src\simulation\phases
  simulation_helpers --> src\simulation\helpers
  simulation_helpers --> src
  simulation_phases --> src
  simulation_phases --> src\world
  simulation_phases --> src\utils
  simulation_phases --> src\simulation
  simulation_phases --> src\simulation\helpers
  simulation_phases --> src\data
  simulation_phases --> src\simulation\phases
  store --> src\store
  store --> src\store\slices
  store --> src
  store_slices --> src\store
  store_slices --> src
  types --> src\types
  ui --> src\store
  ui --> src
  ui --> src\world
  ui --> src\simulation
  ui --> src\ui
  ui --> src\data
  ui --> src\engine
  ui --> src\utils
  utils --> src\utils
  world --> src\world
  world --> src
  world --> src\data
  world --> src\utils
  world --> src\simulation
```

## Hub Files (Most Imported)
- src/types (44 imports)
- src/simulation/../types (32 imports)
- src/simulation/../utils/rng.ts (22 imports)
- src/utils/rng.ts (12 imports)
- src/simulation/../world/events.ts (12 imports)

## Hotspots (Size × Churn)
| File | Lines | Commits | Risk |
|------|-------|---------|------|
| src/ui/PixiViewport.tsx | 1004 | 20 | 🔴 |
| src/ui/App.tsx | 209 | 24 | 🔴 |
| src/world/worldgen.ts | 326 | 15 | 🟡 |
| src/simulation/tick.ts | 148 | 22 | 🟡 |
| src/ui/DialoguePanel.tsx | 230 | 12 | 🟡 |
| src/simulation/phases/conflict.test.ts | 225 | 12 | 🟡 |
| src/simulation/phases/phaseReligion.ts | 281 | 8 | 🟡 |
| src/world/factions.ts | 253 | 8 | 🟡 |
| src/simulation/storyteller.ts | 348 | 5 | 🟢 |
| src/engine/echoSystem.ts | 277 | 6 | 🟢 |

## Recent Changes (Last 10 Merges/Commits)
```
ee2a83c feat: implement core UI structure and styling for Cascade POC game interface
054ac23 feat: implement core simulation engine modules, world generation systems, and comprehensive unit testing suites.
c1dbc16 feat: implement simulation tick orchestrator and UI integration for time-jump processing
2463b31 feat: implement Track B simulation mechanics including Echo System, trade, religion, and tech systems with supporting UI and audit agents.
2463b54 feat(sim): finalize Phase 2 (Religion) with scenic Holy Sites and enhanced visuals
5953c05 feat(sim): finalize Religion Phase and Echo System with full test coverage
2e4b69a feat: implement UI store, HUD component, and PixiJS viewport for world rendering
ac81bdd feat: implement temporal echo system and religious simulation mechanics with omen-based modifiers
ecb7c00 feat: implement religious diffusion, schism mechanics, and dialogue panel system
029105c feat: implement simulation phases with full test suite, UI components, and world generation logic
```
