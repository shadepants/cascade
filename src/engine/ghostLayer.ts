// ─── Ghost of History Layer ──────────────────────────────────────────────
// Draws dashed faction-border overlays representing previousWorld territory.
// Extracted from PixiViewport.tsx for maintainability.

import { Graphics, Container } from 'pixi.js';
import type { WorldState } from '../types';
import type { Camera } from '../types/ui.ts';

/**
 * Accumulate moveTo/lineTo pairs for one tile-edge as a dashed line,
 * matching Canvas renderer's setLineDash([4, 4]) ghost territory effect.
 * Does NOT call g.stroke() — the caller batches multiple edges per faction
 * color and strokes them all in one call for efficiency.
 */
export function strokeDashedEdge(
  g: Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  const DASH = 4;
  const GAP  = 4;
  const horiz = y1 === y2;
  const total = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  let pos  = 0;
  let draw = true;
  while (pos < total) {
    const len = Math.min(draw ? DASH : GAP, total - pos);
    if (draw) {
      if (horiz) {
        g.moveTo(x1 + pos, y1).lineTo(x1 + pos + len, y1);
      } else {
        g.moveTo(x1, y1 + pos).lineTo(x1, y1 + pos + len);
      }
    }
    pos  += len;
    draw = !draw;
  }
}

/**
 * Rebuild the ghost overlay container for one frame.
 * Reuses existing Graphics children from the pool instead of creating new ones.
 *
 * @param ghost       - The PixiJS Container holding ghost graphics objects.
 * @param previousWorld - The world snapshot to render borders from.
 * @param camera      - Current viewport camera.
 * @param tileDisplay - Pixel size of one tile (TILE_SIZE * zoom).
 * @param showHistory - Whether the ghost overlay is currently visible.
 */
export function updateGhostLayer(
  ghost: Container,
  previousWorld: WorldState | null,
  camera: Camera,
  tileDisplay: number,
  showHistory: boolean,
): void {
  let ghostIdx = 0;

  if (showHistory && previousWorld) {
    const prevWorld = previousWorld;

    // Build color lookup: faction id → 0xRRGGBB integer (PixiJS format)
    const prevFactionColors = new Map<string, number>();
    for (const f of prevWorld.factions) {
      prevFactionColors.set(f.id, parseInt(f.color.replace('#', ''), 16));
    }

    // Collect border edge segments grouped by faction color
    const segsByColor = new Map<number, Array<[number, number, number, number]>>();

    for (let row = 0; row < camera.viewportHeight; row++) {
      for (let col = 0; col < camera.viewportWidth; col++) {
        const wx = camera.x + col;
        const wy = camera.y + row;
        if (wx < 0 || wy < 0 || wx >= prevWorld.map.width || wy >= prevWorld.map.height) continue;
        const tile = prevWorld.map.tiles[wy][wx];
        if (!tile.factionId) continue;

        const color = prevFactionColors.get(tile.factionId) ?? 0xffffff;
        const sx = col * tileDisplay;
        const sy = row * tileDisplay;

        // Check all 4 edges — emit border where neighbor belongs to a different faction
        const edgeCandidates = [
          { dx: 0, dy: -1, x1: sx,              y1: sy,               x2: sx + tileDisplay, y2: sy               },
          { dx: 0, dy:  1, x1: sx,              y1: sy + tileDisplay,  x2: sx + tileDisplay, y2: sy + tileDisplay  },
          { dx: -1, dy: 0, x1: sx,              y1: sy,               x2: sx,               y2: sy + tileDisplay  },
          { dx:  1, dy: 0, x1: sx + tileDisplay, y1: sy,              x2: sx + tileDisplay, y2: sy + tileDisplay  },
        ];

        for (const e of edgeCandidates) {
          const nx = wx + e.dx;
          const ny = wy + e.dy;
          const neighborFaction = (nx >= 0 && ny >= 0 && nx < prevWorld.map.width && ny < prevWorld.map.height)
            ? prevWorld.map.tiles[ny][nx].factionId
            : null;
          if (neighborFaction !== tile.factionId) {
            if (!segsByColor.has(color)) segsByColor.set(color, []);
            segsByColor.get(color)!.push([e.x1, e.y1, e.x2, e.y2]);
          }
        }
      }
    }

    // Draw all edges — one Graphics object, batched per faction color
    if (segsByColor.size > 0) {
      let g: Graphics;
      if (ghostIdx < ghost.children.length && ghost.children[ghostIdx] instanceof Graphics) {
        g = ghost.children[ghostIdx] as Graphics;
        g.visible = true;
      } else {
        g = new Graphics();
        ghost.addChild(g);
      }
      g.clear();
      for (const [color, segs] of segsByColor) {
        for (const [x1, y1, x2, y2] of segs) {
          strokeDashedEdge(g, x1, y1, x2, y2);
        }
        g.stroke({ color, width: 2, alpha: 0.4 });
      }
      ghostIdx++;
    }
  }

  // Hide unused pool entries
  for (let i = ghostIdx; i < ghost.children.length; i++) {
    ghost.children[i].visible = false;
  }
}
