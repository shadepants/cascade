// ─── Camera ─────────────────────────────────────────────────────────────
// Manages the viewport position. Centers on the player, clamps to map edges.

import type { Camera, Position, GameMap } from '../types.ts';
import { VIEWPORT_TILES } from '../types.ts';

/** Create initial camera centered on a position. */
export function createCamera(center: Position, map: GameMap): Camera {
  return clampCamera(
    {
      x: center.x - Math.floor(VIEWPORT_TILES / 2),
      y: center.y - Math.floor(VIEWPORT_TILES / 2),
      viewportWidth: VIEWPORT_TILES,
      viewportHeight: VIEWPORT_TILES,
      zoom: 1.0,
    },
    map,
  );
}

/** Re-center camera on the player. Call after every move. */
export function centerOnPlayer(camera: Camera, player: Position, map: GameMap): Camera {
  return clampCamera(
    {
      ...camera,
      x: player.x - Math.floor(camera.viewportWidth / 2),
      y: player.y - Math.floor(camera.viewportHeight / 2),
    },
    map,
  );
}

/** Clamp camera so it never shows outside the map bounds. */
function clampCamera(camera: Camera, map: GameMap): Camera {
  return {
    ...camera,
    x: Math.max(0, Math.min(camera.x, map.width - camera.viewportWidth)),
    y: Math.max(0, Math.min(camera.y, map.height - camera.viewportHeight)),
  };
}
