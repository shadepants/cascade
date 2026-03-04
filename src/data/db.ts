// ─── IndexedDB Persistence (Dexie) ──────────────────────────────────────
// Manages save slots and high-volume historical event storage.

import Dexie, { type Table } from 'dexie';
import type { WorldState } from '../types.ts';

export interface SaveSlot {
  id?: number;
  name: string;
  lastUpdated: number;
  currentYear: number;
  worldState: WorldState;
}

export class CascadeDatabase extends Dexie {
  saves!: Table<SaveSlot>;
  
  constructor() {
    super('CascadeDatabase');
    this.version(1).stores({
      saves: '++id, name, lastUpdated, currentYear'
    });
  }
}

export const db = new CascadeDatabase();

/** Save the current world state to a slot. */
export async function saveGame(name: string, world: WorldState) {
  const existing = await db.saves.where('name').equals(name).first();
  
  const data: SaveSlot = {
    name,
    lastUpdated: Date.now(),
    currentYear: world.currentYear,
    worldState: world
  };

  if (existing?.id) {
    data.id = existing.id;
    return await db.saves.put(data);
  } else {
    return await db.saves.add(data);
  }
}

/** Load the most recent save slot. */
export async function loadMostRecentSave(): Promise<WorldState | null> {
  const latest = await db.saves.orderBy('lastUpdated').reverse().first();
  return latest?.worldState ?? null;
}

/** List all available save slots. */
export async function getSaveSlots() {
  return await db.saves.orderBy('lastUpdated').reverse().toArray();
}
