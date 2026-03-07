// ─── Name Generation Tables ─────────────────────────────────────────────
// Static data for faction names, NPC names, and item templates.

import type { ItemType } from '../types.ts';

/** Faction templates — name + territory color. */
export const FACTION_TEMPLATES = [
  { name: 'Ashvale',   color: '#e05555' },  // red
  { name: 'Thornhold', color: '#5588dd' },  // blue
  { name: 'Duskmere',  color: '#55bb55' },  // green
  { name: 'Ironpeak',  color: '#cc9933' },  // gold
  { name: 'Frostfen',  color: '#8866cc' },  // purple
];

/** NPC first names — mix of fantasy styles. */
export const NPC_NAMES: string[] = [
  'Aldric', 'Brenna', 'Corwin', 'Dara', 'Elias',
  'Fenna', 'Gareth', 'Halla', 'Idris', 'Jora',
  'Kael', 'Lyra', 'Maren', 'Nessa', 'Orin',
  'Petra', 'Quinn', 'Rowan', 'Sable', 'Theron',
];

/** Item templates for interactable objects. */
export const ITEM_TEMPLATES: {
  name: string;
  description: string;
  type: ItemType;
  significance: number;
}[] = [
  {
    name: 'Crown of Ashvale',
    description: 'A tarnished crown claimed by multiple factions. Whoever holds it claims legitimacy.',
    type: 'artifact',
    significance: 8,
  },
  {
    name: 'Sealed Treaty',
    description: 'A letter bearing the seal of a fallen king. Its contents could reshape alliances.',
    type: 'letter',
    significance: 6,
  },
  {
    name: 'Prison Key',
    description: 'An iron key to the cells beneath the old keep. Someone important is locked away.',
    type: 'key',
    significance: 5,
  },
  {
    name: 'Shattered Crown',
    description: 'A broken symbol of authority found in the ruins of a forgotten empire.',
    type: 'artifact',
    significance: 9,
  },
  {
    name: 'Obsidian Seal',
    description: 'A dark, heavy seal used to authenticate decrees of the ancient high command.',
    type: 'artifact',
    significance: 7,
  },
  {
    name: 'Ancestral Blade',
    description: 'A rusted sword that still hums with the memory of a hundred battles.',
    type: 'artifact',
    significance: 6,
  },
];
