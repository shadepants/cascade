# CODEBASE — Auto-Generated Index
> Generated: 2026-05-10T00:51:33.503Z | Commit: 67c624f1c7d98e85ba90fd4d237d3f512c104605 | Run: `npm run scout`

## Module Map
| Path | Exports | Lines | Test? |
|------|---------|-------|-------|
| src/data/biomes.ts | BIOME_COLORS, BIOME_GLYPHS | 31 | — |
| src/data/db.ts | SaveSlot, CascadeDatabase, db | 57 | — |
| src/data/names.ts | FACTION_TEMPLATES, NPC_NAMES, ITEM_TEMPLATES | 67 | — |
| src/data/templates.ts | DialogueTemplate, DIALOGUE, fillTemplate, AccuracyTier, getAccuracyTier | 504 | — |
| src/engine/camera.ts | createCamera, centerOnPlayer | 41 | — |
| src/engine/echoSystem.ts | executeEcho | 118 | — |
| src/engine/index.ts |  | 8 | — |
| src/engine/input.ts | GameAction, mapKeyToAction | 41 | — |
| src/engine/renderer.ts | RenderContext, renderWorld | 344 | — |
| src/engine/tileMap.test.ts |  | 120 | — |
| src/engine/tileMap.ts | SPRITE_SIZE, TileRegion, SHEET_TERRAIN, SHEET_SETTLEMENT, SHEET_CHARACTER | 111 | ✓ |
| src/main.tsx |  | 11 | — |
| src/simulation/cascade.ts | CascadeResult, CascadeTier, calculateCascade, formatChainAsTree | 68 | — |
| src/simulation/constants.ts | WAR_ANIMOSITY_THRESHOLD, FAMINE_DESERT_THRESHOLD, FAMINE_POPULATION_MIN, REBELLION_STABILITY_MIN, ALLIANCE_OPINION_MIN | 38 | — |
| src/simulation/emitEvent.ts | emitEvent | 13 | — |
| src/simulation/helpers/spatial.ts | FactionMapStats, MapOwnershipSummary, getMapOwnershipSummary, getTilesForFaction, getTilesWithPosForFaction | 116 | — |
| src/simulation/helpers/stats.ts | getFactionStat, applyStatDeltas | 35 | — |
| src/simulation/index.ts |  | 6 | — |
| src/simulation/llm.ts | LLMConfig, getLLMConfig, saveLLMConfig | 77 | — |
| src/simulation/narrative.ts | NarrativeContext, assembleNarrativeContext, buildSocraticPrompt, getTemplateDialogue | 106 | — |
| src/simulation/phases/cascade.ts | phaseCascade, deriveConsequence, cascadeTesting | 192 | — |
| src/simulation/phases/colonization.ts | phaseSettlementGrowth, phaseColonization | 145 | — |
| src/simulation/phases/conflict.ts | phaseConflict, fractureFaction | 239 | — |
| src/simulation/phases/ecology.ts | phaseEcology | 61 | — |
| src/simulation/phases/economics.ts | phaseEconomics | 64 | — |
| src/simulation/phases/interestGroups.ts | phaseInterestGroups | 45 | — |
| src/simulation/phases/knowledge.test.ts |  | 67 | — |
| src/simulation/phases/knowledge.ts | seedEventKnowledge, phaseGossip, runKnowledgePipeline | 68 | ✓ |
| src/simulation/phases/phaseReligion.test.ts |  | 165 | — |
| src/simulation/phases/phaseReligion.ts | phaseReligion | 151 | ✓ |
| src/simulation/phases/phaseTrade.ts | phaseTrade | 144 | — |
| src/simulation/phases/politics.ts | phasePolitics | 67 | — |
| src/simulation/phases/stability.ts | phaseStability | 140 | — |
| src/simulation/phases/succession.ts | getRulerForFaction, hasTrait, phaseSuccession | 96 | — |
| src/simulation/storyteller.ts | computeTension, decayTension, pruneCooldowns, shouldSuppressEvent, registerHighSigEvent | 349 | — |
| src/simulation/tick.test.ts |  | 261 | — |
| src/simulation/tick.ts | runSimulation, _forTesting | 145 | ✓ |
| src/simulation/worker.ts | SimulationMessage, SimulationResult | 50 | — |
| src/store/index.ts | useGameStore, getGameState, dispatchGameAction | 44 | — |
| src/store/slices/camera.ts | createCameraSlice | 20 | — |
| src/store/slices/config.ts | createConfigSlice | 10 | — |
| src/store/slices/ui.ts | createUISlice | 47 | — |
| src/store/slices/world.ts | createWorldSlice | 34 | — |
| src/store/types.ts | WorldSlice, CameraSlice, UISlice, ConfigSlice, GameStore | 45 | — |
| src/types/index.ts |  | 5 | — |
| src/types/simulation.ts | GameEvent, CausalChain, CausalNode | 31 | — |
| src/types/storyteller.ts | StorytellerMode, CooldownEntry, StorytellerState, defaultStorytellerState | 51 | — |
| src/types/ui.ts | DEFAULT_CONFIG, GamePhase, Camera, GameStore, TILE_SIZE | 47 | — |
| src/types/world.ts | Position, Biome, Tile, TileModifier, GameMap | 279 | — |
| src/ui/ActionMenu.tsx | ActionMenu | 144 | — |
| src/ui/App.tsx | App | 196 | — |
| src/ui/CascadeMap.tsx | CascadeMap | 127 | — |
| src/ui/CascadeScore.tsx | CascadeScore | 72 | — |
| src/ui/DialoguePanel.tsx | DialoguePanel | 284 | — |
| src/ui/GameCanvas.tsx | GameCanvas | 182 | — |
| src/ui/HUD.tsx | HUD | 79 | — |
| src/ui/InterventionMenu.tsx | InterventionMenu | 111 | — |
| src/ui/KnowledgeLog.tsx | KnowledgeLog | 39 | — |
| src/ui/PixiViewport.tsx | PixiViewport | 772 | — |
| src/ui/simulationResult.test.ts |  | 76 | — |
| src/ui/simulationResult.ts | processSimulationResult | 94 | ✓ |
| src/ui/TitleScreen.tsx | TitleScreen | 149 | — |
| src/utils/noise.ts | createNoise2D, createFBM2D | 113 | — |
| src/utils/rng.ts | SeededRNG | 39 | — |
| src/world/entities.ts | generateNPCs, createPlayer, generateItems | 172 | — |
| src/world/events.ts | createEvent, buildCausalChains, resetEventIds, initEventIds | 99 | — |
| src/world/factions.ts | generateFactions, generateRelationships, computeEthicsDivergence | 251 | — |
| src/world/index.ts |  | 12 | — |
| src/world/terrain.ts | generateTerrain | 148 | — |
| src/world/worldgen.ts | generateWorld | 260 | — |

## Dependency Graph (Directory Level)
```mermaid
graph LR
  data --> src
  engine --> src
  engine --> src\types
  engine --> src\engine
  engine --> src\data
  src --> src\ui
  simulation --> src
  simulation --> src\world
  simulation --> src\utils
  simulation --> src\simulation
  simulation --> src\data
  simulation --> src\simulation\helpers
  simulation --> src\simulation\phases
  simulation_helpers --> src
  simulation_phases --> src
  simulation_phases --> src\world
  simulation_phases --> src\utils
  simulation_phases --> src\simulation
  simulation_phases --> src\simulation\helpers
  simulation_phases --> src\data
  simulation_phases --> src\simulation\phases
  simulation_phases --> src\types
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
  ui --> src\utils
  ui --> src\engine
  world --> src
  world --> src\data
  world --> src\utils
  world --> src\world
  world --> src\simulation
```

## Hub Files (Most Imported)
- src/types (38 imports)
- src/simulation/../types (16 imports)
- src/simulation/../utils/rng.ts (13 imports)
- src/simulation/../world/events.ts (11 imports)
- src/utils/rng.ts (10 imports)

## Hotspots (Size × Churn)
| File | Lines | Commits | Risk |
|------|-------|---------|------|
| src/ui/PixiViewport.tsx | 772 | 9 | 🔴 |
| src/ui/App.tsx | 196 | 19 | 🟡 |
| src/simulation/tick.ts | 145 | 18 | 🟡 |
| src/world/worldgen.ts | 260 | 10 | 🟡 |
| src/ui/DialoguePanel.tsx | 284 | 7 | 🟢 |
| src/data/templates.ts | 504 | 3 | 🟢 |
| src/engine/renderer.ts | 344 | 4 | 🟢 |
| src/simulation/tick.test.ts | 261 | 5 | 🟢 |
| src/world/factions.ts | 251 | 5 | 🟢 |
| src/ui/TitleScreen.tsx | 149 | 8 | 🟢 |

## Recent Changes (Last 10 Merges/Commits)
```
67c624f feat: implement faction generation with ethics-based territory assignment and UI state management
8c0f5de chore: finalize zustand migration, fix missing insight and tradeRoutes in tests
cc922e1 refactor(simulation): decompose tick monolith and optimize spatial queries
2214411 feat: implement title screen with storyteller mode selection and AI settings alongside playtest SOP documentation
b4d7ba3 test: increase playwright timeouts for slow-running jump/world tests
717ad43 Reorganize root clutter and consolidate src/types barrel (#14)
c826d5e Merge branch 'master' of https://github.com/shadepants/cascade
772a9f8 Potential fix for code scanning alert no. 2: Prototype-polluting assignment (#13)
1a960d6 Merge branch 'master' of https://github.com/shadepants/cascade
79cfbd8 Modularize simulation pipeline, split domain types, and centralize jump-result processing (#12)
```
