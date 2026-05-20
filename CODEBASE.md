# CODEBASE — Auto-Generated Index
> Generated: 2026-05-20T09:07:54.313Z | Commit: ef4206a1fdf1897f3708f07a4bc4d22d927e055c | Run: `npm run scout`

## Module Map
| Path | Exports | Lines | Test? |
|------|---------|-------|-------|
| src/data/biomes.ts | BIOME_COLORS, BIOME_GLYPHS | 31 | — |
| src/data/db.ts | SaveSlot, CascadeDatabase, db | 57 | — |
| src/data/names.ts | FACTION_TEMPLATES, NPC_NAMES, ITEM_TEMPLATES | 67 | — |
| src/data/templates.ts | DialogueTemplate, DIALOGUE, fillTemplate, AccuracyTier, getAccuracyTier | 504 | — |
| src/engine/camera.ts | createCamera, centerOnPlayer | 41 | — |
| src/engine/echoSystem.test.ts |  | 176 | — |
| src/engine/echoSystem.ts | executeEcho | 295 | ✓ |
| src/engine/ghostLayer.ts | strokeDashedEdge, updateGhostLayer | 131 | — |
| src/engine/index.ts |  | 8 | — |
| src/engine/input.ts | GameAction, mapKeyToAction | 41 | — |
| src/engine/pixiTypes.ts | Sheets, Layers, SheetKey, TextureSheetKey, CascadeSpriteMeta | 50 | — |
| src/engine/renderer.ts | RenderContext, renderWorld | 344 | — |
| src/engine/tileMap.test.ts |  | 120 | — |
| src/engine/tileMap.ts | SPRITE_SIZE, TileRegion, SHEET_TERRAIN, SHEET_SETTLEMENT, SHEET_CHARACTER | 133 | ✓ |
| src/engine/tradeLayer.ts | updateTradeLayer | 68 | — |
| src/engine/visualEffects.ts | updateVisualEffectsLayer, updateModifierLayer | 136 | — |
| src/engine/worldRenderer.ts | terrainTint, rebuildWorldSprites | 345 | — |
| src/main.tsx |  | 11 | — |
| src/simulation/cascade.ts | CascadeResult, CascadeTier, calculateCascade, formatChainAsTree | 74 | — |
| src/simulation/constants.ts | WAR_ANIMOSITY_THRESHOLD, FAMINE_DESERT_THRESHOLD, FAMINE_POPULATION_MIN, REBELLION_STABILITY_MIN, ALLIANCE_OPINION_MIN | 56 | — |
| src/simulation/emitEvent.ts | emitEvent | 13 | — |
| src/simulation/helpers/spatial.test.ts |  | 169 | — |
| src/simulation/helpers/spatial.ts | FactionMapStats, MapOwnershipSummary, getMapOwnershipSummary, getTilesForFaction, getTilesWithPosForFaction | 116 | ✓ |
| src/simulation/helpers/stats.test.ts |  | 124 | — |
| src/simulation/helpers/stats.ts | getFactionStat, applyStatDeltas | 35 | ✓ |
| src/simulation/index.ts |  | 6 | — |
| src/simulation/llm.ts | LLMConfig, getLLMConfig, saveLLMConfig | 77 | — |
| src/simulation/narrative.ts | NarrativeContext, assembleNarrativeContext, buildInterrogationPrompt, synthesizeHistoryMonologue, getTemplateDialogue | 256 | — |
| src/simulation/phases/cascade.ts | phaseCascade, deriveConsequence, cascadeTesting | 181 | — |
| src/simulation/phases/colonization.ts | phaseSettlementGrowth, phaseColonization | 179 | — |
| src/simulation/phases/conflict.test.ts |  | 295 | — |
| src/simulation/phases/conflict.ts | phaseConflict, fractureFaction | 293 | ✓ |
| src/simulation/phases/ecology.test.ts |  | 89 | — |
| src/simulation/phases/ecology.ts | phaseEcology | 61 | ✓ |
| src/simulation/phases/economics.test.ts |  | 103 | — |
| src/simulation/phases/economics.ts | phaseEconomics | 108 | ✓ |
| src/simulation/phases/interestGroups.test.ts |  | 108 | — |
| src/simulation/phases/interestGroups.ts | phaseInterestGroups | 45 | ✓ |
| src/simulation/phases/knowledge.test.ts |  | 91 | — |
| src/simulation/phases/knowledge.ts | seedEventKnowledge, phaseGossip, phaseDiffusion, runKnowledgePipeline | 122 | ✓ |
| src/simulation/phases/phaseReligion.test.ts |  | 205 | — |
| src/simulation/phases/phaseReligion.ts | phaseReligion | 298 | ✓ |
| src/simulation/phases/phaseTech.test.ts |  | 137 | — |
| src/simulation/phases/phaseTech.ts | phaseTech | 205 | ✓ |
| src/simulation/phases/phaseTrade.test.ts |  | 185 | — |
| src/simulation/phases/phaseTrade.ts | phaseTrade | 159 | ✓ |
| src/simulation/phases/politics.test.ts |  | 77 | — |
| src/simulation/phases/politics.ts | phasePolitics | 81 | ✓ |
| src/simulation/phases/stability.test.ts |  | 114 | — |
| src/simulation/phases/stability.ts | phaseStability | 156 | ✓ |
| src/simulation/phases/succession.test.ts |  | 125 | — |
| src/simulation/phases/succession.ts | getRulerForFaction, hasTrait, phaseSuccession | 104 | ✓ |
| src/simulation/storyteller.perf.test.ts |  | 103 | — |
| src/simulation/storyteller.test.ts |  | 483 | — |
| src/simulation/storyteller.ts | computeTension, decayTension, pruneCooldowns, shouldSuppressEvent, registerHighSigEvent | 426 | ✓ |
| src/simulation/tick.test.ts |  | 266 | — |
| src/simulation/tick.ts | runSimulation, _forTesting | 164 | ✓ |
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
| src/types/world.ts | Position, Biome, Tile, TileModifier, GameMap | 310 | — |
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
| src/ui/PixiViewport.tsx | PixiViewport | 518 | — |
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
| src/world/worldgen.ts | generateWorld | 343 | ✓ |

## Dependency Graph (Directory Level)
```mermaid
graph LR
  data --> src
  engine --> src
  engine --> types
  engine --> utils
  engine --> data
  src --> ui
  src --> store
  simulation --> src
  simulation --> world
  simulation --> utils
  simulation --> data
  simulation --> simulation_helpers
  simulation --> simulation_phases
  simulation_helpers --> src
  simulation_phases --> src
  simulation_phases --> world
  simulation_phases --> utils
  simulation_phases --> simulation
  simulation_phases --> simulation_helpers
  simulation_phases --> data
  store --> store_slices
  store --> src
  store_slices --> store
  store_slices --> src
  ui --> store
  ui --> src
  ui --> world
  ui --> simulation
  ui --> data
  ui --> engine
  ui --> utils
  world --> src
  world --> data
  world --> utils
  world --> simulation
```

## Hub Files (Most Imported)
- src/types (49 imports)
- src/simulation/../types (32 imports)
- src/simulation/../utils/rng.ts (22 imports)
- src/utils/rng.ts (13 imports)
- src/simulation/storyteller.ts (13 imports)

## Hotspots (Size × Churn)
| File | Lines | Commits | Risk |
|------|-------|---------|------|
| src/ui/PixiViewport.tsx | 518 | 1 | 🟢 |
| src/data/templates.ts | 504 | 1 | 🟢 |
| src/simulation/storyteller.test.ts | 483 | 1 | 🟢 |
| src/simulation/storyteller.ts | 426 | 1 | 🟢 |
| src/engine/worldRenderer.ts | 345 | 1 | 🟢 |
| src/engine/renderer.ts | 344 | 1 | 🟢 |
| src/world/worldgen.ts | 343 | 1 | 🟢 |
| src/types/world.ts | 310 | 1 | 🟢 |
| src/simulation/phases/phaseReligion.ts | 298 | 1 | 🟢 |
| src/engine/echoSystem.ts | 295 | 1 | 🟢 |

## Recent Changes (Last 10 Merges/Commits)
```
ef4206a Merge pull request #37 from shadepants/copilot/explore-codebase-implementation-plan
```
