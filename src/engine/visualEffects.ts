// ─── Visual Effects Layer ────────────────────────────────────────────────
// Draws animated echo system effects (ripples, sparkles, auras, tech sparks)
// and persistent tile modifier overlays (blooms, omens) and the religion
// faith-pressure heatmap. Extracted from PixiViewport.tsx for maintainability.

import { Graphics } from 'pixi.js';
import type { WorldState } from '../types';
import type { Camera } from '../types/ui.ts';

/**
 * Redraw per-tile visual effects (VisualEffect objects on world.visuals)
 * onto the given Graphics layer. Called every ticker frame.
 *
 * @param vG       - The PixiJS Graphics layer for echo visual effects.
 * @param world    - Current world state.
 * @param camera   - Current viewport camera.
 * @param tileDisplay - Pixel size of one tile (TILE_SIZE * zoom).
 * @param animTime - Monotonic animation time in ms.
 */
export function updateVisualEffectsLayer(
  vG: Graphics,
  world: WorldState,
  camera: Camera,
  tileDisplay: number,
  animTime: number,
): void {
  vG.clear();
  for (const effect of world.visuals || []) {
    const { x, y } = effect.position;
    const col = x - camera.x;
    const row = y - camera.y;
    if (col < -4 || row < -4 || col >= camera.viewportWidth + 4 || row >= camera.viewportHeight + 4) continue;

    const screenX = col * tileDisplay + tileDisplay / 2;
    const screenY = row * tileDisplay + tileDisplay / 2;
    const color = effect.color ? parseInt(effect.color.replace('#', ''), 16) : 0xFFFFFF;

    if (effect.type === 'ripple') {
      const scale = 0.5 + (1 - effect.duration / 5) * 2.5;
      const subTick = (Math.sin(animTime / 150) + 1) / 2;
      const alpha = (effect.duration / 5) * (0.4 + subTick * 0.4);
      vG.stroke({ width: 3, color, alpha });
      vG.circle(screenX, screenY, (tileDisplay * 0.8) * scale);
    } else if (effect.type === 'sparkle') {
      const flicker = (Math.sin(animTime / 50) + 1) / 2;
      vG.fill({ color, alpha: 0.6 + flicker * 0.4 });
      const size = (tileDisplay / 4) * (0.8 + flicker * 0.4);
      vG.rect(screenX - 1, screenY - size, 2, size * 2);
      vG.rect(screenX - size, screenY - 1, size * 2, 2);
    } else if (effect.type === 'aura') {
      const breathe = (Math.sin(animTime / 800) + 1) / 2;
      const alpha = 0.15 + breathe * 0.15;
      vG.fill({ color, alpha });
      vG.circle(screenX, screenY, tileDisplay * 1.2);
      vG.stroke({ width: 1.5, color, alpha: alpha * 0.5 });
      vG.circle(screenX, screenY, tileDisplay * (1.2 + breathe * 0.2));
    } else if (effect.type === 'tech_spark') {
      const flash = (Math.sin(animTime / 100) + 1) / 2;
      vG.fill({ color: 0xffffff, alpha: 0.8 * flash });
      const sparkSize = (tileDisplay / 2) * (1 + (1 - effect.duration / 4) * 2);
      vG.rect(screenX - sparkSize / 2, screenY - sparkSize / 2, sparkSize, sparkSize);
      vG.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
      vG.rect(screenX - sparkSize, screenY - sparkSize, sparkSize * 2, sparkSize * 2);
    }
  }
}

/**
 * Redraw tile modifier overlays (bloom, omen) and, optionally, the religion
 * faith-pressure heatmap onto the given Graphics layer.
 *
 * @param modG            - The PixiJS Graphics layer for modifiers.
 * @param world           - Current world state.
 * @param camera          - Current viewport camera.
 * @param tileDisplay     - Pixel size of one tile (TILE_SIZE * zoom).
 * @param animTime        - Monotonic animation time in ms.
 * @param showReligionOverlay - Whether to render the faith heatmap.
 */
export function updateModifierLayer(
  modG: Graphics,
  world: WorldState,
  camera: Camera,
  tileDisplay: number,
  animTime: number,
  showReligionOverlay: boolean,
): void {
  modG.clear();
  const breathe = (Math.sin(animTime / 1500) + 1) / 2;

  // Tile Modifiers
  for (let row = 0; row < camera.viewportHeight; row++) {
    for (let col = 0; col < camera.viewportWidth; col++) {
      const wx = camera.x + col;
      const wy = camera.y + row;
      if (wx < 0 || wy < 0 || wx >= world.map.width || wy >= world.map.height) continue;
      const tile = world.map.tiles[wy][wx];
      if (!tile.modifiers || tile.modifiers.length === 0) continue;

      const sx = col * tileDisplay + tileDisplay / 2;
      const sy = row * tileDisplay + tileDisplay / 2;

      for (const mod of tile.modifiers) {
        if (mod.type === 'bloom') {
          modG.fill({ color: 0x4ade80, alpha: 0.15 + breathe * 0.1 });
          modG.circle(sx, sy, tileDisplay * (0.6 + breathe * 0.1));
        } else if (mod.type === 'omen') {
          modG.stroke({ width: 2, color: 0x00ccff, alpha: 0.4 + breathe * 0.2 });
          modG.circle(sx, sy, tileDisplay * (0.4 - breathe * 0.1));
        }
      }
    }
  }

  // Religion Heatmap
  if (showReligionOverlay) {
    for (const settlement of world.settlements) {
      const col = settlement.position.x - camera.x;
      const row = settlement.position.y - camera.y;
      if (col < -2 || row < -2 || col >= camera.viewportWidth + 2 || row >= camera.viewportHeight + 2) continue;
      const sx = col * tileDisplay + tileDisplay / 2;
      const sy = row * tileDisplay + tileDisplay / 2;

      for (const f of settlement.faith) {
        const religion = world.religions.find(r => r.id === f.religionId);
        if (religion) {
          const color = parseInt(religion.color.replace('#', ''), 16);
          const alpha = (f.pressure / 100) * (0.2 + breathe * 0.1);
          const radius = (tileDisplay * 2.5) * (f.pressure / 100);
          modG.fill({ color, alpha });
          modG.circle(sx, sy, radius);
        }
      }
    }
  }
}
