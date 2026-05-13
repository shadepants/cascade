import { describe, it, expect } from 'vitest';
import { generateNPCs, createPlayer, generateItems } from './entities.ts';
import type { Settlement, Faction, GameMap, Position, Ruin } from '../types';

describe('Entity Creation', () => {
  describe('generateNPCs', () => {
    it('generates the correct number of NPCs for valid settlements', () => {
      // Setup mock data
      const mockMap: GameMap = {
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({
          biome: 'grassland',
          elevation: 1,
          rainfall: 1,
          factionId: null,
          settlementId: null,
          walkable: true,
        }))),
      };

      const factions: Faction[] = [
        {
          id: 'faction_1',
          name: 'Faction 1',
          color: '#ffffff',
          aggression: 50,
          settlements: ['settlement_1'],
          population: 100,
          stability: 50,
          wealth: 50,
          military: 50,
          culture: 50,
          ethics: { violence: 'neutral', expansion: 'neutral', trade: 'neutral', tradition: 'neutral', mercy: 'neutral' },
          leaderId: null,
          interestGroups: [],
        }
      ];

      const settlements: Settlement[] = [
        {
          id: 'settlement_1',
          name: 'Settlement 1',
          position: { x: 5, y: 5 },
          factionId: 'faction_1',
          npcs: [],
          items: [],
          faith: [],
          dominantReligionId: null,
        }
      ];

      // Generate NPCs
      const npcs = generateNPCs(settlements, factions, 3, mockMap, 12345);

      // Verify
      expect(npcs).toHaveLength(3);
      expect(settlements[0].npcs).toHaveLength(3);

      npcs.forEach(npc => {
        expect(npc.id).toMatch(/^npc_settlement_1_\d+$/);
        expect(npc.factionId).toBe('faction_1');
        expect(npc.alive).toBe(true);
        expect(npc.knowledge).toEqual([]);
        expect(npc.dialogueKey).toBe('default');
        expect(npc.name).toBeDefined();
        expect(npc.personality).toBeDefined();
        expect(npc.position).toBeDefined();
      });
    });

    it('skips settlements with invalid factionIds', () => {
      const mockMap: GameMap = { width: 10, height: 10, tiles: [] };
      const factions: Faction[] = [];
      const settlements: Settlement[] = [
        { id: 's_1', name: 'S1', position: { x: 0, y: 0 }, factionId: 'invalid_faction', npcs: [], items: [], faith: [], dominantReligionId: null }
      ];

      const npcs = generateNPCs(settlements, factions, 2, mockMap, 12345);
      expect(npcs).toHaveLength(0);
      expect(settlements[0].npcs).toHaveLength(0);
    });

    it('returns an empty array if there are no settlements', () => {
      const mockMap: GameMap = { width: 10, height: 10, tiles: [] };
      const npcs = generateNPCs([], [], 5, mockMap, 12345);
      expect(npcs).toHaveLength(0);
    });
  });

  describe('createPlayer', () => {
    it('creates a valid player entity at the starting position', () => {
      const startPos: Position = { x: 2, y: 3 };
      const player = createPlayer(startPos);

      expect(player.id).toBe('player');
      expect(player.name).toBe('Traveler');
      expect(player.position).toEqual({ x: 2, y: 3 });
      expect(player.position).not.toBe(startPos); // Ensure it's a copy
      expect(player.inventory).toEqual([]);
      expect(player.knowledgeLog).toEqual([]);
      expect(player.actionsThisEra).toEqual([]);
      expect(player.insight).toBe(0);
    });
  });

  describe('generateItems', () => {
    it('generates items at settlements and ruins based on RNG', () => {
      const mockMap: GameMap = {
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({
          biome: 'grassland',
          elevation: 1,
          rainfall: 1,
          factionId: null,
          settlementId: null,
          walkable: true,
        }))),
      };

      const settlements: Settlement[] = Array.from({ length: 10 }, (_, i) => ({
        id: `s_${i}`,
        name: `Settlement ${i}`,
        position: { x: i, y: i },
        factionId: 'f1',
        npcs: [],
        items: [],
        faith: [],
        dominantReligionId: null,
      }));

      const ruins: Ruin[] = Array.from({ length: 10 }, (_, i) => ({
        id: `r_${i}`,
        name: `Ruin ${i}`,
        position: { x: i, y: 9 - i },
        formerFactionId: 'f2',
        collapsedYear: 100 + i,
      }));

      const items = generateItems(settlements, ruins, mockMap, [], 12345);

      // Given the RNG seed, it should generate some items, up to the max possible (20).
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(20);

      const settlementItems = items.filter(i => i.id.startsWith('item_s_'));
      const ruinItems = items.filter(i => i.id.startsWith('item_r_'));

      expect(settlementItems.length).toBeGreaterThan(0);
      expect(ruinItems.length).toBeGreaterThan(0);

      ruinItems.forEach(item => {
        expect(item.history).toHaveLength(1);
        expect(item.history[0].ownerName).toMatch(/The Fallen of/);
        expect(item.significance).toBeGreaterThan(5); // High significance templates + 1
      });
    });
  });
});
