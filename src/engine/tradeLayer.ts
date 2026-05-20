// ─── Trade Route Layer ───────────────────────────────────────────────────
// Draws animated golden pulsing trade route lines on a Graphics layer.
// Extracted from PixiViewport.tsx for maintainability.

import { Graphics } from 'pixi.js';
import type { WorldState } from '../types';
import type { Camera } from '../types/ui.ts';

/**
 * Redraw all active trade routes onto the given Graphics layer.
 * Called every ticker frame — the layer is cleared and redrawn.
 *
 * @param tradeG      - The PixiJS Graphics object used for trade lines.
 * @param world       - Current world state.
 * @param camera      - Current viewport camera.
 * @param tileDisplay - Pixel size of one tile (TILE_SIZE * zoom).
 * @param canvasWidth - Canvas width in pixels (used for culling).
 * @param canvasHeight - Canvas height in pixels (used for culling).
 * @param animTime    - Monotonic animation time in ms (from ticker accumulator).
 */
export function updateTradeLayer(
  tradeG: Graphics,
  world: WorldState,
  camera: Camera,
  tileDisplay: number,
  canvasWidth: number,
  canvasHeight: number,
  animTime: number,
): void {
  tradeG.clear();
  const pulse = (Math.sin(animTime / 1000) + 1) / 2;

  for (const route of world.tradeRoutes) {
    if (!route.active || route.path.length < 2) continue;

    const startX = (route.path[0].x - camera.x) * tileDisplay + tileDisplay / 2;
    const startY = (route.path[0].y - camera.y) * tileDisplay + tileDisplay / 2;

    // Culling — skip off-screen routes
    if (startX < -100 || startY < -100 || startX > canvasWidth + 100 || startY > canvasHeight + 100) continue;

    tradeG.moveTo(startX, startY);
    for (let i = 1; i < route.path.length; i++) {
      const p = route.path[i];
      tradeG.lineTo(
        (p.x - camera.x) * tileDisplay + tileDisplay / 2,
        (p.y - camera.y) * tileDisplay + tileDisplay / 2,
      );
    }
    const alpha = Math.max(0.2, (route.volume / 100) * (0.5 + pulse * 0.3));
    const width = 1 + (route.volume / 40);
    tradeG.stroke({ color: 0xffcc00, width, alpha });

    // Flow particle — a small dot moving along the route
    const flowPos = (animTime / 2000) % 1;
    const flowIdx = Math.floor(flowPos * (route.path.length - 1));
    const p1 = route.path[flowIdx];
    const p2 = route.path[flowIdx + 1];
    if (p1 && p2) {
      const lerp = (flowPos * (route.path.length - 1)) % 1;
      const fx = ((p1.x + (p2.x - p1.x) * lerp) - camera.x) * tileDisplay + tileDisplay / 2;
      const fy = ((p1.y + (p2.y - p1.y) * lerp) - camera.y) * tileDisplay + tileDisplay / 2;
      tradeG.fill({ color: 0xffffff, alpha: alpha * 0.8 });
      tradeG.circle(fx, fy, 2);
    }
  }
}
