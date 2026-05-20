import type { WorldState, GameEvent, Innovation, InnovationType, StatDelta } from '../../types';
import type { GameRNG } from '../../utils/rng.ts';
import { createEvent } from '../../world/events.ts';
import { emitEvent } from '../emitEvent.ts';
import { applyStatDeltas } from '../helpers/stats.ts';
import { shouldSuppressEvent } from '../storyteller.ts';
import { TECH_DIFFUSION_RATE } from '../constants.ts';

const INNOVATIONS: Record<InnovationType, { name: string; description: string; impact: string }> = {
  agriculture: {
    name: 'Advanced Irrigation',
    description: 'Sophisticated water management systems that increase crop yields.',
    impact: 'Increases population growth and stability.'
  },
  metallurgy: {
    name: 'Blast Furnaces',
    description: 'High-temperature furnaces for producing superior steel.',
    impact: 'Increases military power and wealth.'
  },
  navigation: {
    name: 'Lateen Sails',
    description: 'Triangular sails that allow for better maneuverability at sea.',
    impact: 'Increases trade volume and wealth.'
  },
  scholarship: {
    name: 'Printing Press',
    description: 'Mechanized movable type for rapid dissemination of knowledge.',
    impact: 'Increases culture and spread of innovations.'
  },
  engineering: {
    name: 'Fortification Architecture',
    description: 'Modern defensive structures designed to withstand sieges.',
    impact: 'Increases military and stability.'
  }
};

/**
 * Phase Tech: Manages the discovery and spread of innovations.
 * Innovations emerge in high-culture/high-wealth settlements and spread through contact.
 */
export function phaseTech(
  world: WorldState,
  year: number,
  rng: GameRNG
): GameEvent[] {
  const events: GameEvent[] = [];

  // 1. Innovation Discovery
  // Settlements with high culture/wealth have a chance to "spark" a new innovation.
  for (const settlement of world.settlements) {
    const faction = world.factions.find(f => f.id === settlement.factionId);
    if (!faction) continue;

    // Base chance depends on culture and wealth
    const chance = (faction.culture + faction.wealth) / 5000; // e.g., (50+50)/5000 = 2% chance

    if (rng.nextFloat() < chance) {
      const availableTechs = (Object.keys(INNOVATIONS) as InnovationType[]).filter(
        t => !world.innovations.some(i => i.type === t)
      );

      if (availableTechs.length > 0) {
        const type = availableTechs[Math.floor(rng.nextFloat() * availableTechs.length)];
        const tech = INNOVATIONS[type];
        
        const discoveryEvent = createEvent({
          tick: 0, year,
          subject: settlement.id, action: 'tech_discovery', object: type,
          causedBy: null, playerCaused: false,
          description: `The scholars of ${settlement.name} have discovered ${tech.name}: ${tech.description}`,
          significance: 6
        });

        if (!shouldSuppressEvent(world.storyteller, year, discoveryEvent.significance)) {
          const newInnovation: Innovation = {
            id: `tech_${type}_${year}`,
            name: tech.name,
            type: type,
            description: tech.description,
            originYear: year,
            originSettlementId: settlement.id
          };

          world.innovations.push(newInnovation);
          settlement.innovations.push(newInnovation.id);
          faction.innovations.push(newInnovation.id);

          emitEvent(world, events, discoveryEvent, year);

          // Discovery bonus to faction
          applyStatDeltas(world, [{ factionId: faction.id, stat: 'culture', delta: 10 }]);
        }
      }
    }
  }

  // 2. Innovation Spread (Diffusion)
  // Innovations spread between nearby settlements and along trade routes.
  const recentWhisperedInnovations = new Set<string>();
  // To avoid N+1 query overhead in the loops, we precalculate recent whisper entries
  for (let i = world.events.length - 1; i >= 0; i--) {
    const e = world.events[i];
    if (e.year < year - 5) break; // Events are typically chronological
    if (e.action === 'whisper' && e.object) {
      recentWhisperedInnovations.add(e.object);
    }
  }

  for (const innovation of world.innovations) {
    const knownBySettlements = world.settlements.filter(s => s.innovations.includes(innovation.id));
    
    for (const knownS of knownBySettlements) {
      for (const targetS of world.settlements) {
        if (targetS.innovations.includes(innovation.id)) continue;

        const dx = knownS.position.x - targetS.position.x;
        const dy = knownS.position.y - targetS.position.y;
        const distSq = dx * dx + dy * dy;

        // Spread by proximity (within 15 tiles)
        let spreadChance = 0;
        if (distSq < 225) {
          const diffusionRate = world.simConfig?.techDiffusionRate ?? TECH_DIFFUSION_RATE;
          spreadChance = diffusionRate * (1 - Math.sqrt(distSq) / 15);
        }

        // Spread by trade route
        const route = world.tradeRoutes?.find(r => 
          r.active && 
          ((r.startSettlementId === knownS.id && r.endSettlementId === targetS.id) ||
           (r.startSettlementId === targetS.id && r.endSettlementId === knownS.id))
        );
        if (route) {
          spreadChance += (route.volume / 200); // Up to 0.5 additional chance
        }

        // Check for 'Whisper' influence (Scholar's Ledger hook)
        // If the player has whispered about this innovation, spread is much faster.
        const hasRecentWhisper = recentWhisperedInnovations.has(innovation.type);
        if (hasRecentWhisper) {
          spreadChance *= 3;
        }

        if (rng.nextFloat() < spreadChance) {
          const adoptionEvent = createEvent({
            tick: 0, year,
            subject: targetS.id, action: 'tech_adoption', object: innovation.type,
            causedBy: innovation.id, playerCaused: hasRecentWhisper,
            description: `${targetS.name} has adopted the knowledge of ${innovation.name}.`,
            significance: 3
          });

          if (!shouldSuppressEvent(world.storyteller, year, adoptionEvent.significance)) {
            targetS.innovations.push(innovation.id);
            const faction = world.factions.find(f => f.id === targetS.factionId);
            if (faction && !faction.innovations.includes(innovation.id)) {
              faction.innovations.push(innovation.id);
              emitEvent(world, events, adoptionEvent, year);
              // Small stat boost for adoption
              applyStatDeltas(world, [{ factionId: faction.id, stat: 'culture', delta: 2 }]);
            }
          }
        }
      }
    }
  }

  // 3. Apply Innovation Impacts
  // Every year, factions get passive bonuses based on their known innovations.
  for (const faction of world.factions) {
    const techDeltas: StatDelta[] = [];
    
    for (const techId of faction.innovations) {
      const tech = world.innovations.find(i => i.id === techId);
      if (!tech) continue;

      switch (tech.type) {
        case 'agriculture':
          techDeltas.push({ factionId: faction.id, stat: 'population', delta: 2 });
          techDeltas.push({ factionId: faction.id, stat: 'stability', delta: 1 });
          break;
        case 'metallurgy':
          techDeltas.push({ factionId: faction.id, stat: 'military', delta: 2 });
          techDeltas.push({ factionId: faction.id, stat: 'wealth', delta: 1 });
          break;
        case 'navigation':
          techDeltas.push({ factionId: faction.id, stat: 'wealth', delta: 3 });
          break;
        case 'scholarship':
          techDeltas.push({ factionId: faction.id, stat: 'culture', delta: 3 });
          break;
        case 'engineering':
          techDeltas.push({ factionId: faction.id, stat: 'military', delta: 1 });
          techDeltas.push({ factionId: faction.id, stat: 'stability', delta: 2 });
          break;
      }
    }

    if (techDeltas.length > 0) {
      applyStatDeltas(world, techDeltas);
    }
  }

  return events;
}
