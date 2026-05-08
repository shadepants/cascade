# CODEBASE — Auto-Generated Index
> Generated: 2026-05-08T11:29:12.847Z | Commit: 863065f5a400e4cab5c44e79ce5c71bb659ea679 | Run: `npm run scout`

## Module Map
| Path | Exports | Lines | Test? |
|------|---------|-------|-------|
| src/data/biomes.ts | BIOME_COLORS, BIOME_GLYPHS | 31 | — |
| src/data/db.ts | SaveSlot, CascadeDatabase, db | 57 | — |
| src/data/names.ts | FACTION_TEMPLATES, NPC_NAMES, ITEM_TEMPLATES | 67 | — |
| src/data/templates.ts | DialogueTemplate, DIALOGUE, fillTemplate, AccuracyTier, getAccuracyTier | 504 | — |
| src/engine/camera.ts | createCamera, centerOnPlayer | 41 | — |
| src/engine/index.ts |  | 8 | — |
| src/engine/input.ts | GameAction, mapKeyToAction | 41 | — |
| src/engine/renderer.ts | RenderContext, renderWorld | 344 | — |
| src/engine/tileMap.test.ts |  | 120 | — |
| src/engine/tileMap.ts | SPRITE_SIZE, TileRegion, SHEET_TERRAIN, SHEET_SETTLEMENT, SHEET_CHARACTER | 109 | ✓ |
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
| src/simulation/phases/colonization.ts | phaseSettlementGrowth, phaseColonization | 143 | — |
| src/simulation/phases/conflict.ts | phaseConflict, fractureFaction | 239 | — |
| src/simulation/phases/ecology.ts | phaseEcology | 61 | — |
| src/simulation/phases/economics.ts | phaseEconomics | 64 | — |
| src/simulation/phases/interestGroups.ts | phaseInterestGroups | 45 | — |
| src/simulation/phases/knowledge.test.ts |  | 63 | — |
| src/simulation/phases/knowledge.ts | seedEventKnowledge, phaseGossip, runKnowledgePipeline | 68 | ✓ |
| src/simulation/phases/politics.ts | phasePolitics | 67 | — |
| src/simulation/phases/stability.ts | phaseStability | 140 | — |
| src/simulation/phases/succession.ts | getRulerForFaction, hasTrait, phaseSuccession | 96 | — |
| src/simulation/storyteller.ts | computeTension, decayTension, pruneCooldowns, shouldSuppressEvent, registerHighSigEvent | 349 | — |
| src/simulation/tick.test.ts |  | 253 | — |
| src/simulation/tick.ts | runSimulation, _forTesting | 119 | ✓ |
| src/simulation/worker.ts | SimulationMessage, SimulationResult | 50 | — |
| src/store.ts | initialState, GameStoreAction, gameReducer, GameContextValue, GameContext | 115 | — |
| src/types/index.ts |  | 5 | — |
| src/types/simulation.ts | GameEvent, CausalChain, CausalNode | 31 | — |
| src/types/storyteller.ts | StorytellerMode, CooldownEntry, StorytellerState, defaultStorytellerState | 51 | — |
| src/types/ui.ts | DEFAULT_CONFIG, GamePhase, Camera, GameStore, TILE_SIZE | 46 | — |
| src/types/world.ts | Position, Biome, Tile, GameMap, EthicStance | 217 | — |
| src/ui/ActionMenu.tsx | ActionMenu | 145 | — |
| src/ui/App.tsx | App | 190 | — |
| src/ui/CascadeMap.tsx | CascadeMap | 127 | — |
| src/ui/CascadeScore.tsx | CascadeScore | 72 | — |
| src/ui/DialoguePanel.tsx | DialoguePanel | 237 | — |
| src/ui/GameCanvas.tsx | GameCanvas | 176 | — |
| src/ui/HUD.tsx | HUD | 72 | — |
| src/ui/KnowledgeLog.tsx | KnowledgeLog | 40 | — |
| src/ui/PixiViewport.tsx | PixiViewport | 630 | — |
| src/ui/simulationResult.test.ts |  | 72 | — |
| src/ui/simulationResult.ts | processSimulationResult | 94 | ✓ |
| src/ui/TitleScreen.tsx | TitleScreen | 144 | — |
| src/utils/noise.ts | createNoise2D, createFBM2D | 113 | — |
| src/utils/rng.ts | SeededRNG | 39 | — |
| src/world/entities.ts | generateNPCs, createPlayer, generateItems | 171 | — |
| src/world/events.ts | createEvent, buildCausalChains, resetEventIds, initEventIds | 99 | — |
| src/world/factions.ts | generateFactions, generateRelationships, computeEthicsDivergence | 249 | — |
| src/world/index.ts |  | 12 | — |
| src/world/terrain.ts | generateTerrain | 148 | — |
| src/world/worldgen.ts | generateWorld | 204 | — |

## Dependency Graph (Directory Level)
```mermaid
graph LR
  data --> src
  engine --> src
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
  types --> src\types
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
- src/types (39 imports)
- src/simulation/../types (13 imports)
- src/utils/rng.ts (10 imports)
- src/simulation/../utils/rng.ts (10 imports)
- src/store.ts (10 imports)

## Hotspots (Size × Churn)
| File | Lines | Commits | Risk |
|------|-------|---------|------|
| src/ui/PixiViewport.tsx | 630 | 7 | 🟡 |
| src/ui/App.tsx | 190 | 17 | 🟡 |
| src/simulation/tick.ts | 119 | 16 | 🟢 |
| src/world/worldgen.ts | 204 | 8 | 🟢 |
| src/data/templates.ts | 504 | 3 | 🟢 |
| src/ui/DialoguePanel.tsx | 237 | 6 | 🟢 |
| src/engine/renderer.ts | 344 | 4 | 🟢 |
| src/simulation/storyteller.ts | 349 | 3 | 🟢 |
| src/ui/TitleScreen.tsx | 144 | 7 | 🟢 |
| src/world/factions.ts | 249 | 4 | 🟢 |

## Recent Changes (Last 10 Merges/Commits)
```
cc922e1 refactor(simulation): decompose tick monolith and optimize spatial queries
2214411 feat: implement title screen with storyteller mode selection and AI settings alongside playtest SOP documentation
b4d7ba3 test: increase playwright timeouts for slow-running jump/world tests
717ad43 Reorganize root clutter and consolidate src/types barrel (#14)
c826d5e Merge branch 'master' of https://github.com/shadepants/cascade
772a9f8 Potential fix for code scanning alert no. 2: Prototype-polluting assignment (#13)
1a960d6 Merge branch 'master' of https://github.com/shadepants/cascade
79cfbd8 Modularize simulation pipeline, split domain types, and centralize jump-result processing (#12)
028d2e0 Potential fix for code scanning alert no. 1: Clear text storage of sensitive information (#11)
de8c75b feat: era year display, terrain tinting, biome hover tooltip
```
