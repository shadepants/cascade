# Cascade Codebase Overview

## `data/biomes.ts`
- **Size**: 31 lines
- **Imports**: ../types
- **Summary**: General utility or component.

## `data/db.ts`
- **Size**: 57 lines
- **Imports**: dexie, ../types
- **Functions**: db, saveGame, existing, loadMostRecentSave, latest, getSaveSlots
- **Types/Interfaces**: Table, SaveSlot
- **Summary**: General utility or component.

## `data/names.ts`
- **Size**: 67 lines
- **Imports**: ../types
- **Functions**: FACTION_TEMPLATES
- **Summary**: General utility or component.

## `data/templates.ts`
- **Size**: 504 lines
- **Imports**: ../types
- **Functions**: fillTemplate, getAccuracyTier, generateEthicsComment, ethicKey, stance, vocab, findKnowledgeChain, knownIds, knownEvents, leaf, child
- **Types/Interfaces**: DialogueTemplate, AccuracyTier, ExpandedDialogueTemplate, EthicsVocab, EthicStance, EventActionType
- **Summary**: General utility or component.

## `engine/camera.ts`
- **Size**: 41 lines
- **Imports**: ../types
- **Functions**: createCamera, centerOnPlayer, clampCamera
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/echoSystem.test.ts`
- **Size**: 176 lines
- **Imports**: vitest, ./echoSystem.ts, ../types/world, ../types
- **Functions**: nextWorld, tile, omen, bloom, bloomVisual, npc, event, ripple, chronicleVisual
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/echoSystem.ts`
- **Size**: 295 lines
- **Imports**: ../types/world, ../utils/rng
- **Functions**: executeEcho, cost, newWorld, applyReinforce, settlement, applyFortify, tile, modifiers, newTiles, applyChronicle, knownEventIds, significantEvents, newKnowledgeLog, rng, randomEvent, applyWhisper, npc, eventId, whisperEvent, applyBloom, newMap, applyOmen, isHolySite
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/ghostLayer.ts`
- **Size**: 131 lines
- **Imports**: pixi.js, ../types, ../types/ui.ts
- **Functions**: strokeDashedEdge, DASH, GAP, horiz, total, len, updateGhostLayer, prevWorld, prevFactionColors, segsByColor, wx, wy, tile, color, sx, sy, edgeCandidates, nx, ny, neighborFaction
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/index.ts`
- **Size**: 8 lines
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/input.ts`
- **Size**: 41 lines
- **Imports**: ../types
- **Functions**: mapKeyToAction, dir
- **Types/Interfaces**: GameAction
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/pixiTypes.ts`
- **Size**: 50 lines
- **Imports**: pixi.js, ./tileMap.ts
- **Types/Interfaces**: Sheets, Layers, SheetKey, TextureSheetKey, CascadeSpriteMeta
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/renderer.ts`
- **Size**: 344 lines
- **Imports**: ../types, ../data/biomes.ts
- **Functions**: renderWorld, zoom, tileSize, canvasW, canvasH, time, factionColors, wx, wy, tile, sx, sy, val, westX, northY, westElev, northElev, slope, brightness, color, bob, glyph, npcBob, prevMap, prevFactionColors, drawClouds, speed, size, x, y, adjustColor, r, g, b, drawMicroTexture, seed, drawGlyph, drawFactionTerritory, neighbors, nx, ny, neighborFaction, nvx, nvy, drawGhostTerritory
- **Types/Interfaces**: RenderContext
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/tileMap.test.ts`
- **Size**: 120 lines
- **Imports**: vitest, ../types
- **Functions**: r, ALLOWED_SHARING, seen, key, prior, pairKey
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/tileMap.ts`
- **Size**: 133 lines
- **Imports**: ../types
- **Functions**: SPRITE_SIZE, SHEET_TERRAIN, SHEET_SETTLEMENT, SHEET_CHARACTER, SHEET_PLAYER, SHEET_TREE, SHEET_ORE, SHEET_ITEM_AMULET, SHEET_ITEM_SCROLL, SHEET_ITEM_KEY, SHEET_RELIGION, SHEET_BOOKS, SHEET_ICONS, SHEET_DECOR
- **Types/Interfaces**: TileRegion, ResourceNodeType
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/tradeLayer.ts`
- **Size**: 68 lines
- **Imports**: pixi.js, ../types, ../types/ui.ts
- **Functions**: updateTradeLayer, pulse, startX, startY, p, alpha, width, flowPos, flowIdx, p1, p2, lerp, fx, fy
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/visualEffects.ts`
- **Size**: 136 lines
- **Imports**: pixi.js, ../types, ../types/ui.ts
- **Functions**: updateVisualEffectsLayer, col, row, screenX, screenY, color, scale, subTick, alpha, flicker, size, breathe, flash, sparkSize, updateModifierLayer, wx, wy, tile, sx, sy, religion, radius
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `engine/worldRenderer.ts`
- **Size**: 345 lines
- **Imports**: pixi.js, ../types, ../types/ui.ts, ./tileMap.ts, ./pixiTypes.ts, ./ghostLayer.ts
- **Functions**: terrainTint, v, r, b, getOrCreateSprite, isAnimated, frameOffset, poolKey, existingChild, removed, animSprite, hideUnusedSprites, rebuildWorldSprites, getSprite, wx, wy, tile, sprite, treeRegion, hash, tintShift, col, row, existingGlowChild, dominantReligion, color, siteReligion, tex, latestId, tech, px, py
- **Types/Interfaces**: at
- **Summary**: Rendering engine logic, PixiJS layers, and camera management.

## `main.tsx`
- **Size**: 11 lines
- **Imports**: react, react-dom/client, ./ui/App.tsx
- **Summary**: General utility or component.

## `simulation/cascade.ts`
- **Size**: 74 lines
- **Imports**: ../types, ../world/events.ts
- **Functions**: calculateCascade, chains, totalScore, totalEvents, maxDepth, tier, longestChain, scoreTier, formatChainAsTree, eventMap, nodeMap, walk, event, indent, arrow, depthLabel, node
- **Types/Interfaces**: CascadeResult, CascadeTier
- **Summary**: General utility or component.

## `simulation/constants.ts`
- **Size**: 56 lines
- **Imports**: ../types, ../utils/rng.ts
- **Functions**: WAR_ANIMOSITY_THRESHOLD, FAMINE_DESERT_THRESHOLD, FAMINE_POPULATION_MIN, REBELLION_STABILITY_MIN, ALLIANCE_OPINION_MIN, CASCADE_SIGNIFICANCE_MIN, CASCADE_LOOKBACK_YEARS, SCHISM_PROBABILITY_BASE, TECH_DIFFUSION_RATE, TRADE_ROUTE_DECAY_RATE, TRADE_ROUTE_GROWTH_RATE, pickMotivation, pool
- **Summary**: General utility or component.

## `simulation/emitEvent.ts`
- **Size**: 13 lines
- **Imports**: ../types, ./storyteller.ts
- **Functions**: emitEvent
- **Summary**: General utility or component.

## `simulation/helpers/spatial.test.ts`
- **Size**: 169 lines
- **Imports**: vitest, ../../types
- **Functions**: makeMap, height, width, makeWorld, makeFaction, mapAB, summary, map, aTiles, tiles, borders, world, neighbors, soloMap
- **Summary**: General utility or component.

## `simulation/helpers/spatial.ts`
- **Size**: 116 lines
- **Imports**: ../../types
- **Functions**: getMapOwnershipSummary, tile, fId, stats, getTilesForFaction, getTilesWithPosForFaction, getBorderTilesOf, neighbors, adjacentToWinner, countSharedBorderTiles, getNeighboringFactions, neighborIds, nId
- **Types/Interfaces**: FactionMapStats, MapOwnershipSummary
- **Summary**: General utility or component.

## `simulation/helpers/stats.test.ts`
- **Size**: 124 lines
- **Imports**: vitest, ./stats.ts, ../../types
- **Functions**: makeFaction, makeWorld, faction, world, fA, fB
- **Summary**: General utility or component.

## `simulation/helpers/stats.ts`
- **Size**: 35 lines
- **Imports**: ../../types
- **Functions**: getFactionStat, setFactionStat, applyStatDeltas, faction, cur, next
- **Summary**: General utility or component.

## `simulation/index.ts`
- **Size**: 6 lines
- **Summary**: General utility or component.

## `simulation/narrative.ts`
- **Size**: 256 lines
- **Imports**: ../types, ../utils/rng.ts
- **Functions**: mutateEvent, mutated, others, assembleNarrativeContext, faction, factionName, settlement, knownEvents, eventSummaries, e, yearStr, desc, accuracyStr, ethicsStr, buildInterrogationPrompt, innovationStr, synthesizeHistoryMonologue, seed, rng, pick, stability, greeting, techId, tech, templates, loggedEventIds, unseenKnowledge, spotlight, displayEvent, accuracyTier, template, action, ethicsComment, subject, object, topKnowledge, getTemplateDialogue
- **Types/Interfaces**: EventActionType, NarrativeContext
- **Summary**: General utility or component.

## `simulation/phases/cascade.ts`
- **Size**: 181 lines
- **Imports**: ../../types, ../../world/events.ts, ../../utils/rng.ts, ../constants.ts, ../storyteller.ts, ../helpers/stats.ts, ../helpers/spatial.ts, ../emitEvent.ts
- **Functions**: phaseCascade, rebelled, lookbackYear, playerEvents, faction, consequence, rel, deriveConsequence, stat, newValue, neighbors, target, targetId, checkThresholdEvents, precursor, cascadeTesting
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/colonization.ts`
- **Size**: 179 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../../data/names.ts, ../constants.ts, ../helpers/spatial.ts
- **Functions**: phaseSettlementGrowth, sId, settlement, npc, rawY, rawX, blockedKeys, y, x, tile, findColonizationSpot, tiles, unclaimed, goodTiles, pool, candidates, validCandidates, prefersResources, adjacentToResource, neighbors, phaseColonization, colProb, spot, id
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/conflict.test.ts`
- **Size**: 295 lines
- **Imports**: vitest, ./conflict.ts, ../../utils/rng.ts, ../../types
- **Functions**: makeFaction, makeMap, height, width, makeWorld, map, fA, fB, world, v, events, winner, loser, rollSequence, faction, result, row, event, rebelId, rebelFaction, rebelSettlements
- **Types/Interfaces**: GameRNG, WorldState, Faction, FactionRelationship
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/conflict.ts`
- **Size**: 293 lines
- **Imports**: ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../storyteller.ts
- **Functions**: phaseConflict, winner, peaceType, peaceEvent, fA, fB, borderTiles, maxAggression, warProb, warEvent, resolveWar, strA, strB, total, fAWins, loser, conqueredEvent, tilesToTransfer, loserSettlementsSet, winnerSettlementsSet, pos, tile, s, fractureEvent, fractureFaction, tiles, capital, d, newFactionId, targetCount, claimed, curr, key, neighbors, originalSettlementsSet
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/ecology.test.ts`
- **Size**: 89 lines
- **Imports**: vitest, ./ecology.ts, ../../utils/rng.ts, ../../types, ../helpers/spatial.ts
- **Functions**: makeWorldWithFactionTiles, height, width, tiles, makeFaction, faction, world, summary, events
- **Types/Interfaces**: GameRNG, WorldState, Faction, Biome
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/ecology.ts`
- **Size**: 61 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../constants.ts, ../helpers/spatial.ts
- **Functions**: phaseEcology, stats, biomes, biomeTypes, popDelta, harshTiles, harshness, isFamine
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/economics.test.ts`
- **Size**: 103 lines
- **Imports**: vitest, ./economics.ts, ../../utils/rng.ts, ../../types, ../helpers/spatial.ts
- **Functions**: makeFaction, makeWorld, height, width, tiles, faction, world, summary, events, yieldEvent
- **Types/Interfaces**: GameRNG, WorldState, Faction
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/economics.ts`
- **Size**: 108 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../constants.ts, ../helpers/spatial.ts, ./succession.ts
- **Functions**: phaseEconomics, stats, biomes, ruler, upkeep, netWealth, applyResourceNodeBonuses, controlledNodes, tile, collapsed
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/interestGroups.test.ts`
- **Size**: 108 lines
- **Imports**: vitest, ./interestGroups.ts, ../../utils/rng.ts, ../../types
- **Functions**: makeFaction, makeWorld, faction, world, events
- **Types/Interfaces**: GameRNG, WorldState, Faction
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/interestGroups.ts`
- **Size**: 45 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts
- **Functions**: phaseInterestGroups, entry
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/knowledge.test.ts`
- **Size**: 91 lines
- **Imports**: vitest, ../../types, ./knowledge.ts
- **Functions**: makeWorld, fakeRng, world, n1, n2, shared, diffusionRng, n3
- **Types/Interfaces**: GameEvent, WorldState
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/knowledge.ts`
- **Size**: 122 lines
- **Imports**: ../../types, ../storyteller.ts, ../../utils/rng.ts
- **Functions**: seedEventKnowledge, npcsByFaction, list, witnessNpcs, accuracy, phaseGossip, npcMap, settlementNpcs, npcA, npcB, gossipProb, knowledgeToShare, phaseDiffusion, potentialSourceNpcs, localNpcs, targetNpc, settlementNpcIds, sourceNpcs, sourceNpc, runKnowledgePipeline
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseReligion.test.ts`
- **Size**: 205 lines
- **Imports**: vitest, ./phaseReligion.ts, ../../types, ../../utils/rng.ts
- **Functions**: rng, s1, lightFaith, events, faction, settlement
- **Types/Interfaces**: GameRNG
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseReligion.ts`
- **Size**: 298 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../helpers/stats.ts, ../storyteller.ts, ../constants.ts
- **Functions**: phaseReligion, settlements, holySites, dx, dy, distSq, tile, s1, s2, basePressure, pressure, oldDominant, religion, hasOmen, conversionEvent, faction, ig, dominantFaith, dominantPressure, persecution, checkSchism, contested, schismProb, relA, relB, schismEvent, milIG, checkMartyrdom, recentDeaths, figure, primaryReligion, martyrdomEvent, settlement, applyPressure, resistance, existing, shareFaith, updateSettlementDominance, best, shiftTowardEmbraced
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseTech.test.ts`
- **Size**: 137 lines
- **Imports**: vitest, ./phaseTech, ../../types, ../../utils/rng
- **Functions**: events, tech
- **Types/Interfaces**: GameRNG
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseTech.ts`
- **Size**: 206 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../helpers/stats.ts, ../storyteller.ts, ../constants.ts
- **Functions**: phaseTech, faction, chance, availableTechs, type, tech, discoveryEvent, recentWhisperedInnovations, e, knownBySettlements, dx, dy, distSq, diffusionRate, route, hasRecentWhisper, adoptionEvent
- **Types/Interfaces**: for
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseTrade.test.ts`
- **Size**: 185 lines
- **Imports**: vitest, ./phaseTrade.ts, ../../utils/rng.ts, ../../types
- **Functions**: makeFaction, makeWorld, makeSettlement, fA, fB, sA, sB, world, prevInsight, v, events
- **Types/Interfaces**: GameRNG, WorldState, Faction, TradeRoute
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/phaseTrade.ts`
- **Size**: 159 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../constants.ts
- **Functions**: phaseTrade, settlements, settlementMap, factionMap, relMap, key, route, start, end, relKey, rel, oldVolume, decayRate, growthRate, wealthDelta, faction, activeCount, s1, s2, dx, dy, dist, path, commodity, generateSimplePath
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/politics.test.ts`
- **Size**: 77 lines
- **Imports**: vitest, ./politics.ts, ../../utils/rng.ts, ../../types
- **Functions**: makeFaction, makeWorld, fA, fB, world, events, faction
- **Types/Interfaces**: GameRNG, WorldState, Faction, FactionRelationship
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/politics.ts`
- **Size**: 81 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../../world/factions.ts, ../emitEvent.ts, ../constants.ts, ./succession.ts, ../storyteller.ts
- **Functions**: phasePolitics, fA, fB, rulerA, rulerB, divergence, allianceEvent, ruler
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/stability.test.ts`
- **Size**: 114 lines
- **Imports**: vitest, ./stability.ts, ../../utils/rng.ts, ../../types, ../helpers/spatial.ts
- **Functions**: makeFaction, makeWorld, height, width, tiles, faction, world, summary, events
- **Types/Interfaces**: GameRNG, WorldState, Faction
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/stability.ts`
- **Size**: 156 lines
- **Imports**: ../../types, ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../constants.ts, ../helpers/spatial.ts, ./conflict.ts, ../storyteller.ts
- **Functions**: phaseStability, currentFactions, stats, collapseEvent, affectedSettlements, npc, neighbors, target, atWar, fractureEvent, atWarThisTick
- **Types/Interfaces**: MapOwnershipSummary
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/succession.test.ts`
- **Size**: 125 lines
- **Imports**: vitest, ./succession.ts, ../../utils/rng.ts, ../../types
- **Functions**: makeFaction, makeRuler, makeWorld, ruler, world, faction, events
- **Types/Interfaces**: GameRNG, WorldState, Faction, HistoricalFigure
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/phases/succession.ts`
- **Size**: 104 lines
- **Imports**: ../../utils/rng.ts, ../../world/events.ts, ../emitEvent.ts, ../../data/names.ts, ./conflict.ts, ../storyteller.ts
- **Functions**: getRulerForFaction, faction, hasTrait, spawnNewRuler, name, phaseSuccession, ruler, age, deathChance, deathEvent, fractureEvent, newRuler, ascensionEvent
- **Summary**: Phase logic for the simulation tick engine. Mutates world state.

## `simulation/storyteller.perf.test.ts`
- **Size**: 103 lines
- **Imports**: vitest, ../types, ../utils/rng.ts
- **Functions**: makeState, makeWorld, createEvent, eventCount, causedBy, world, state, startTension, endTension, startDebt, endDebt, intervention, rng, startIntervention, endIntervention
- **Types/Interfaces**: WorldState, GameEvent, StorytellerState
- **Summary**: General utility or component.

## `simulation/storyteller.test.ts`
- **Size**: 483 lines
- **Imports**: vitest, ../types, ../utils/rng.ts
- **Functions**: makeState, makeWorld, makeEvent, state, world, clio, ares, threshold, event, result, events, chronicler
- **Types/Interfaces**: WorldState, GameEvent, StorytellerState
- **Summary**: General utility or component.

## `simulation/storyteller.ts`
- **Size**: 426 lines
- **Imports**: ../types, ../utils/rng.ts
- **Functions**: computeTension, eventMap, thresholdYear, e, actionPressure, depthCache, chainDepth, cached, event, d, depthPressure, avgInstability, instabilityPressure, raw, decayTension, pruneCooldowns, shouldSuppressEvent, registerHighSigEvent, duration, setSpotlight, getCascadeThreshold, BASE, elapsed, decayFraction, bonus, getGossipBoost, accumulateDebt, entry, fireDebtIntervention, debt, knownIds, MAX_PER_TYPE, applyIntervention, playerPos, n, distance, playerSettlement, dx, dy, witnessId, eventIds
- **Types/Interfaces**: StorytellerIntervention, fires
- **Summary**: General utility or component.

## `simulation/tick.test.ts`
- **Size**: 266 lines
- **Imports**: vitest, ./tick.ts, ../utils/rng.ts
- **Functions**: makeFaction, makeRelationship, makeWorld, makeEvent, world, result, rel, make50Triggers, makeTestSettlement, makeSettlementGrowthTestState, faction, baseTile, rng, hadArrayProto, prevArrayProto, hadObjectProto, prevObjectProto
- **Types/Interfaces**: Faction, FactionRelationship, Settlement, WorldState, GameEvent, StatDelta, StorytellerState, pollution, as
- **Summary**: General utility or component.

## `simulation/tick.ts`
- **Size**: 164 lines
- **Imports**: ../types, ../utils/rng.ts, ./helpers/stats.ts, ./phases/cascade.ts, ./phases/knowledge.ts, ./phases/ecology.ts, ./phases/economics.ts, ./phases/interestGroups.ts, ./phases/politics.ts, ./phases/conflict.ts, ./phases/stability.ts, ./phases/succession.ts, ./phases/colonization.ts, ./phases/phaseReligion.ts, ./phases/phaseTrade.ts, ./phases/phaseTech.ts, ./helpers/spatial.ts
- **Functions**: runSimulation, rng, year, mapSummary, col, gro, eco, econ, trd, rel, tch, ig, pol, con, stab, succ, priorEvents, cas, allYearEvents, gos, yearEvents, intervention, tile, _forTesting
- **Summary**: General utility or component.

## `simulation/worker.ts`
- **Size**: 50 lines
- **Imports**: ./tick.ts, ../world/events.ts, ../types
- **Functions**: newEvents
- **Types/Interfaces**: SimulationMessage, SimulationResult
- **Summary**: General utility or component.

## `store/index.ts`
- **Size**: 44 lines
- **Imports**: zustand, zustand/middleware, ./types, ./slices/world, ./slices/camera, ./slices/ui, ./slices/config
- **Functions**: useGameStore, getGameState, dispatchGameAction
- **Summary**: Zustand global state slice.

## `store/slices/camera.ts`
- **Size**: 20 lines
- **Imports**: zustand, ../types, ../../types
- **Summary**: Zustand global state slice.

## `store/slices/config.ts`
- **Size**: 10 lines
- **Imports**: zustand, ../types, ../../types
- **Summary**: Zustand global state slice.

## `store/slices/ui.ts`
- **Size**: 62 lines
- **Imports**: zustand, ../types
- **Summary**: Zustand global state slice.

## `store/slices/world.ts`
- **Size**: 34 lines
- **Imports**: zustand, ../types
- **Summary**: Zustand global state slice.

## `store/types.ts`
- **Size**: 51 lines
- **Types/Interfaces**: WorldSlice, CameraSlice, UISlice, ConfigSlice, GameStore
- **Summary**: Zustand global state slice.

## `types/index.ts`
- **Size**: 6 lines
- **Summary**: General utility or component.

## `types/simulation.ts`
- **Size**: 31 lines
- **Imports**: ./world.ts
- **Types/Interfaces**: GameEvent, CausalChain, CausalNode
- **Summary**: General utility or component.

## `types/storyteller.ts`
- **Size**: 51 lines
- **Functions**: defaultStorytellerState
- **Types/Interfaces**: StorytellerMode, CooldownEntry, StorytellerState
- **Summary**: General utility or component.

## `types/test.ts`
- **Size**: 12 lines
- **Imports**: ./index
- **Types/Interfaces**: TestAction
- **Summary**: General utility or component.

## `types/ui.ts`
- **Size**: 47 lines
- **Imports**: ./world.ts, ./storyteller.ts
- **Functions**: TILE_SIZE, VIEWPORT_TILES, MAX_ACTIONS_PER_ERA
- **Types/Interfaces**: GamePhase, Camera, GameStore
- **Summary**: General utility or component.

## `types/world.ts`
- **Size**: 310 lines
- **Imports**: ./storyteller.ts, ./simulation.ts
- **Types/Interfaces**: Position, Biome, Tile, TileModifier, GameMap, EthicStance, FactionEthics, Faction, InterestGroup, DiplomaticState, FactionRelationship, HistoricalFigure, RulerTrait, Entity, NPC, NPCKnowledge, NPCPersonality, Player, EchoType, TemporalEcho, Item, ItemHistoryEntry, ItemType, KnowledgeEntry, FactionStatKey, StatDelta, Settlement, Ruin, ResourceNode, TradeRoute, Religion, FaithPressure, HolySite, InnovationType, Innovation, VisualEffect, WorldState, SimConfig, WorldConfig
- **Summary**: General utility or component.

## `ui/ActionMenu.tsx`
- **Size**: 144 lines
- **Imports**: ../store/index, ../types, ../world/events.ts, ../simulation/storyteller.ts
- **Functions**: ActionMenu, activeItem, world, updateWorld, closeAction, factions, actionsUsed, actionsLeft, exhausted, handleGiveToFaction, faction, sig, event, updatedFactions, updated, cur
- **Summary**: React UI component.

## `ui/App.tsx`
- **Size**: 209 lines
- **Imports**: react, ../store/index, ./TitleScreen.tsx, ./PixiViewport.tsx, ./DialoguePanel.tsx, ./KnowledgeLog.tsx, ./ActionMenu.tsx, ./CascadeScore.tsx, ./HUD.tsx, ./InterventionMenu.tsx, ./GlobalLedger.tsx, ./OraclesEye.tsx, ../data/db.ts, ./simulationResult.ts, ../simulation/worker.ts
- **Functions**: TemporalOverlay, duration, startTime, animate, elapsed, progress, ease, App, phase, world, config, notification, showLedger, showOraclesEye, setWorld, setPhase, showNotification, clearNotification, toggleOraclesEye, toggleLedger, handleKeyDown, worldRef, timer, worker, JUMP_YEARS, MAX_GAME_YEARS, result, pendingNotification
- **Summary**: React UI component.

## `ui/CascadeMap.tsx`
- **Size**: 127 lines
- **Imports**: react, ../types
- **Functions**: buildFlowData, visited, X_GAP, Y_GAP, event, children, childX, childY, CascadeMap
- **Types/Interfaces**: Node, Edge, CascadeMapProps
- **Summary**: React UI component.

## `ui/CascadeScore.tsx`
- **Size**: 72 lines
- **Imports**: ../store/index, ../simulation/cascade.ts, ./CascadeMap.tsx
- **Functions**: CascadeScore, world, reset, result
- **Summary**: React UI component.

## `ui/DialoguePanel.tsx`
- **Size**: 230 lines
- **Imports**: ../store/index, react, ../engine/echoSystem.ts, ../types, ../simulation/narrative.ts
- **Functions**: DialoguePanel, activeNpc, world, updateWorld, closeDialogue, showNotification, gainInsight, setWorld, simText, faction, factionName, settlement, loggedEventIds, unseenKnowledge, eA, eB, spotlightEvent, handleLearnEvent, handleWhisper, newWorld, handleAskForDepth, config, narrativeCtx, prompt, depthText, rel
- **Summary**: React UI component.

## `ui/GameCanvas.tsx`
- **Size**: 182 lines
- **Imports**: react, ../store/index, ../engine/renderer.ts, ../engine/input.ts, ../engine/camera.ts, ../types
- **Functions**: GameCanvas, canvasRef, world, camera, previousWorld, phase, updateCamera, setCamera, updateWorld, setPreviousWorld, setPhase, openDialogue, closeDialogue, openAction, closeAction, zoom, canvasWidth, canvasHeight, handleKey, canvas, ctx, handleKeyDown, action, player, newX, newY, npcAtTarget, newCamera, playerPos, itemAtPlayer
- **Summary**: React UI component.

## `ui/GlobalLedger.tsx`
- **Size**: 127 lines
- **Imports**: ../store/index
- **Functions**: GlobalLedger, world, toggleLedger, origin, start, end, founder
- **Summary**: React UI component.

## `ui/HUD.tsx`
- **Size**: 77 lines
- **Imports**: ../store/index, ../types
- **Functions**: HUD, world, notification, phase, config, setPhase, eraYear, actionsUsed, actionsLeft, heldItem
- **Summary**: React UI component.

## `ui/InterventionMenu.tsx`
- **Size**: 163 lines
- **Imports**: ../store/index, ../engine/echoSystem.ts
- **Functions**: InterventionMenu, activeTile, world, setWorld, closeIntervention, showNotification, holySite, settlement, insight, hasMetallurgy, hasEngineering, hasScholarship, hasAgriculture, handleIntervention, echo, newWorld, isHolySite, omenCost, bloomCost
- **Summary**: React UI component.

## `ui/KnowledgeLog.tsx`
- **Size**: 39 lines
- **Imports**: ../store/index.ts
- **Functions**: KnowledgeLog, world, entries
- **Summary**: React UI component.

## `ui/OraclesEye.tsx`
- **Size**: 130 lines
- **Imports**: ../store/index, react
- **Functions**: OraclesEye, world, toggleOraclesEye, st, playerEvents, avgStability, totalTradeVolume
- **Summary**: React UI component.

## `ui/PixiViewport.tsx`
- **Size**: 518 lines
- **Imports**: react, pixi.js, ../store/index, ../engine/input.ts, ../engine/camera.ts, ../types, ../engine/pixiTypes.ts, ../engine/worldRenderer.ts, ../engine/tradeLayer.ts, ../engine/visualEffects.ts
- **Functions**: PixiViewportInner, containerRef, appRef, sheetsRef, layersRef, texPoolRef, lastPerfUpdateRef, phase, world, previousWorld, camera, zoom, openIntervention, animStateRef, canvasWidth, canvasHeight, app, load, tex, terrain, settlement, character, player, tree, ore, itemAmulet, itemScroll, itemKey, religion, books, icons, canvas, terrainLayer, midLayer, resourcesLayer, itemsLayer, religionLayer, innovationLayer, tradeLayer, modifiersLayer, visualsLayer, topLayer, ghostLayer, tickerCallback, now, delta, tileDisplay, animTime, rendererW, rendererH, sprite, meta, baseRegion, frameOffset, poolKey, handleKey, handlerRef, state, isModalOpen, action, newX, newY, npcAtTarget, newCamera, playerPos, itemAtPlayer, handleMouseMove, rect, col, row, wx, wy, tile, biomeName, faction, holySite, ruin, resource, rel, handleViewportClick, handleMouseLeave, PixiViewport
- **Types/Interfaces**: in
- **Summary**: React UI component.

## `ui/simulationResult.test.ts`
- **Size**: 129 lines
- **Imports**: vitest, ../types, ./simulationResult.ts
- **Functions**: makeWorld, cloneWorld, newWorld, sourceWorld, result, baseWorld, worldA, worldB, source, aKnowledge, bKnowledge
- **Types/Interfaces**: GameEvent, WorldState
- **Summary**: React UI component.

## `ui/simulationResult.ts`
- **Size**: 117 lines
- **Imports**: ../types, ../utils/rng.ts
- **Functions**: YEAR_SEED_MULTIPLIER, formatNotificationValue, trimmed, parsed, msg, obj, pushKnowledge, createJumpKnowledgeRng, distributeCascadeKnowledge, cascadeEvents, toLearn, appendInventoryHistory, processSimulationResult, rng, insightDelta, rawNotification, headline, insightMsg
- **Summary**: React UI component.

## `ui/TitleScreen.tsx`
- **Size**: 147 lines
- **Imports**: react, ../store/index, ../world/worldgen.ts, ../engine/camera.ts, ../data/db.ts, ../types
- **Functions**: TitleScreen, configState, setPhase, setConfig, setCamera, setWorld, handleResume, world, camera, handleNewGame, newConfig, handleSaveSettings, info, active
- **Summary**: React UI component.

## `utils/noise.test.ts`
- **Size**: 76 lines
- **Imports**: vitest, ./noise.ts
- **Functions**: noise, v, a, b, x, y, coords, aVals, bVals, fbm, fbm1, fbm4, samples, vals1, vals4
- **Summary**: General utility or component.

## `utils/noise.ts`
- **Size**: 113 lines
- **Functions**: createNoise2D, perm, noise2D, xi, yi, xf, yf, u, v, aa, ab, ba, bb, g1, g2, g3, g4, x1, x2, createFBM2D, fbm2D, generatePermutation, p, j, fade, lerp, grad, h
- **Summary**: General utility or component.

## `utils/rng.test.ts`
- **Size**: 87 lines
- **Imports**: vitest, ./rng.ts
- **Functions**: a, b, aVals, bVals, rng, v, max, arr, shuffled, input, result
- **Summary**: General utility or component.

## `utils/rng.ts`
- **Size**: 52 lines
- **Functions**: j
- **Types/Interfaces**: GameRNG
- **Summary**: General utility or component.

## `window.d.ts`
- **Size**: 12 lines
- **Imports**: ./types, ./store/types
- **Types/Interfaces**: Window
- **Summary**: General utility or component.

## `world/entities.test.ts`
- **Size**: 165 lines
- **Imports**: vitest, ./entities.ts, ../types
- **Functions**: npcs, player, items, settlementItems, ruinItems
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/entities.ts`
- **Size**: 172 lines
- **Imports**: ../data/names.ts, ../utils/rng.ts
- **Functions**: generateNPCs, rng, faction, nameIndex, position, createPlayer, generateItems, template, highSigTemplates, findItemPosition, x, y, findNearbyWalkableTile
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/events.perf.test.ts`
- **Size**: 43 lines
- **Imports**: vitest, ./events, ../types
- **Functions**: rootCount, chainDepth, root, child, start, chains, end
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/events.ts`
- **Size**: 116 lines
- **Imports**: ../types
- **Functions**: secondsOffset, createEvent, id, buildCausalChains, eventMap, childMap, children, playerRoots, buildChainFromRoot, visited, walk, score, event, resetEventIds, initEventIds
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/factions.ts`
- **Size**: 253 lines
- **Imports**: ../data/names.ts, ../utils/rng.ts
- **Functions**: generateEthics, pick, jitter, generateFactions, rng, centers, template, archetype, settlements, relationships, generateInterestGroups, count, type, getEthicsBiasForType, pickFactionCenters, minDist, x, y, tooClose, assignTerritory, tile, dist, placeSettlements, center, pos, findNearbyWalkable, generateRelationships, a, b, initialAnimosity, computeEthicsDivergence, stanceValue, keys, totalDivergence
- **Types/Interfaces**: that
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/index.ts`
- **Size**: 12 lines
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/terrain.test.ts`
- **Size**: 93 lines
- **Imports**: vitest, ./terrain.ts
- **Functions**: size, map, map1, map2, validBiomes, tile, isWater, isMountain, biomes
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/terrain.ts`
- **Size**: 148 lines
- **Imports**: ../types, ../utils/noise.ts, ../utils/rng.ts
- **Functions**: generateTerrain, rng, elevationNoise, numPlates, plates, baseElevation, dx, dy, dist, dist1, dist2, boundary, intensity, elevation, moistureNoise, tile, prevX, elevationGain, precipitation, localMoisture, classifyBiome, normalize
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/worldgen.test.ts`
- **Size**: 47 lines
- **Imports**: vitest, ./worldgen.ts, ../types
- **Functions**: world, religion, originSettlement
- **Summary**: World generation, terrain, factions, and initial state setup.

## `world/worldgen.ts`
- **Size**: 343 lines
- **Imports**: ./terrain.ts, ./factions.ts, ./entities.ts, ./events.ts, ../simulation/tick.ts, ../types, ../data/names.ts, ../utils/rng.ts
- **Functions**: generateWorld, seed, rng, map, resourceNodes, historicalFigures, faction, npcs, npcPositions, religions, holySites, startPos, player, items, generateResourceNodes, count, x, y, tile, type, spawnRulers, usedNames, findPlayerStart, center, assignKnowledgeToNPCs, eventIndex, event, generateReligions, RELIGION_NAMES, RELIGION_COLORS, nameIndex, name, settlement, ethics, spawnHolySites, SEARCH_RADIUS, nx, ny, dist, scoreA, scoreB, getScenicScore, buildSimConfig
- **Summary**: World generation, terrain, factions, and initial state setup.
