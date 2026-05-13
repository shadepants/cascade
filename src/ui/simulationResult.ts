import type { GameEvent, NPCKnowledge, WorldState } from '../types';
import { SeededRNG } from '../utils/rng.ts';

// Large prime multiplier helps spread year offsets and reduce seed collisions.
const YEAR_SEED_MULTIPLIER = 9973;

export function formatNotificationValue(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        const msg = parsed.message ?? parsed.text ?? parsed.description;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const msg = obj.message ?? obj.text ?? obj.description;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function pushKnowledge(npcKnowledge: NPCKnowledge[], eventId: string, year: number): void {
  if (npcKnowledge.some(k => k.eventId === eventId)) return;
  npcKnowledge.push({
    eventId,
    discoveredYear: year,
    accuracy: 0.8,
    sourceId: 'history',
  });
}

function createJumpKnowledgeRng(world: WorldState): SeededRNG {
  return new SeededRNG(world.seed + world.currentYear * YEAR_SEED_MULTIPLIER);
}

function distributeCascadeKnowledge(world: WorldState, events: GameEvent[], rng: SeededRNG): void {
  const cascadeEvents = events.filter(e => e.playerCaused);
  if (cascadeEvents.length === 0) return;

  for (const npc of world.npcs) {
    if (!npc.alive) continue;

    const toLearn = cascadeEvents.filter(() => rng.nextFloat() < 0.5);
    for (const event of toLearn) {
      pushKnowledge(npc.knowledge, event.id, world.currentYear);
    }
  }
}

function appendInventoryHistory(world: WorldState, sourceWorld: WorldState): void {
  for (const item of world.player.inventory) {
    if (!item.history) item.history = [];
    item.history.push({
      year: sourceWorld.currentYear,
      ownerName: sourceWorld.player.name,
    });
  }
}

export function processSimulationResult(
  newWorld: WorldState,
  newEvents: GameEvent[],
  sourceWorld: WorldState,
): { notification: string | null } {
  const rng = createJumpKnowledgeRng(newWorld);
  distributeCascadeKnowledge(newWorld, newEvents, rng);
  appendInventoryHistory(newWorld, sourceWorld);

  // Compute insight gained during this jump for notification
  const insightDelta = newWorld.player.insight - (sourceWorld.player.insight ?? 0);

  newWorld.player.actionsThisEra = [];

  // Prioritise storyteller notification; append insight info if gained
  const rawNotification = formatNotificationValue(newWorld.storyteller.pendingNotification);
  newWorld.storyteller.pendingNotification = undefined;

  let notification = rawNotification;
  if (insightDelta > 0) {
    const insightMsg = `+${insightDelta} Insight from flourishing trade routes`;
    notification = notification ? `${notification} | ${insightMsg}` : insightMsg;
  }

  return { notification };
}
